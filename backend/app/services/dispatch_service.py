"""
Flood Dispatch Service — orchestrates rescue dispatch with optimal allocation.
Pipeline: ML flood prediction → flood-aware routing → resource assignment.
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_

from app.models.emergency import FloodIncident
from app.models.resource import Resource
from app.models.dispatch import DispatchLog
from app.models.shelter import Shelter
from app.services.routing_service import routing_service
from app.services.ml_service import ml_service

logger = logging.getLogger(__name__)


class FloodDispatchService:
    """Orchestrates flood rescue dispatch: ML prediction → flood routing → resource assignment."""

    async def auto_dispatch(
        self,
        incident_id: int,
        db: AsyncSession,
        dispatcher_id: Optional[int] = None,
        algorithm: str = "flood_dijkstra",
        dispatch_type: str = "rescue",
        shelter_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Full flood dispatch pipeline."""
        result = await db.execute(select(FloodIncident).where(FloodIncident.id == incident_id))
        incident = result.scalar_one_or_none()
        if not incident:
            raise ValueError(f"Flood incident {incident_id} not found")

        if incident.status == "dispatched":
            raise ValueError(f"Incident {incident_id} already dispatched")

        # Determine zone data for ML prediction
        zone_elevation = 6.0
        zone_drainage = 50.0
        zone_prox_water = 3.0
        zone_pop_density = 20.0
        zone_hist_freq = 3.0

        # Run ML flood prediction if needed
        if not incident.predicted_severity:
            now = datetime.utcnow()
            ml_result = ml_service.predict(
                rainfall_intensity_mmph=incident.rainfall_intensity_mmph or 30,
                cumulative_rainfall_24h_mm=(incident.rainfall_intensity_mmph or 30) * 6,
                elevation_m=zone_elevation,
                drainage_capacity_ratio=0.5 if incident.drainage_status == "partial"
                    else 0.2 if incident.drainage_status == "overwhelmed"
                    else 0.05 if incident.drainage_status == "collapsed"
                    else 0.8,
                soil_saturation_index=0.7,
                proximity_to_waterbody_km=zone_prox_water,
                population_density_k=zone_pop_density,
                hour_of_day=now.hour,
                month=now.month,
                historical_flood_freq=zone_hist_freq,
                current_water_level_m=incident.water_level_m or 0,
                rate_of_rise_m_per_hr=0.3,
                flood_type=incident.flood_type or "pluvial",
                drainage_status=incident.drainage_status or "partial",
            )
            incident.predicted_severity = ml_result["severity"]
            incident.severity_confidence = ml_result["confidence"]
            incident.inundation_risk_score = ml_result["inundation_risk_score"]
            incident.predicted_water_level_1h = ml_result["predicted_water_level_1h"]
            incident.predicted_water_level_6h = ml_result["predicted_water_level_6h"]
            incident.risk_hotspot_score = ml_result["risk_hotspot_score"]
            incident.shap_values = ml_result["shap_values"]

        severity = incident.predicted_severity or "moderate"
        water_depth = incident.water_level_m or 0

        # Find available resources
        avail_result = await db.execute(
            select(Resource).where(
                and_(Resource.status == "available", Resource.is_active == True)
            )
        )
        available = avail_result.scalars().all()

        if not available:
            return {
                "success": False,
                "message": "No available resources",
                "incident_id": incident_id,
            }

        resource_dicts = [
            {
                "id": r.id,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "resource_type": r.resource_type,
                "name": r.name,
                "can_operate_in_water": r.can_operate_in_water,
                "max_water_depth_m": r.max_water_depth_m,
            }
            for r in available
        ]

        # Find optimal resource using flood-aware routing
        route_result = routing_service.find_optimal_resource(
            incident_lat=incident.latitude,
            incident_lon=incident.longitude,
            water_depth_at_scene=water_depth,
            severity=severity,
            available_resources=resource_dicts,
            algorithm=algorithm,
        )

        if not route_result:
            return {
                "success": False,
                "message": "No reachable resource for current flood conditions",
                "incident_id": incident_id,
            }

        # Load selected resource
        res_result = await db.execute(
            select(Resource).where(Resource.id == route_result.resource_id)
        )
        resource = res_result.scalar_one()

        now = datetime.utcnow()

        # Handle shelter assignment for evacuations
        shelter_info = None
        if dispatch_type == "evacuate":
            if shelter_id:
                s_result = await db.execute(select(Shelter).where(Shelter.id == shelter_id))
                shelter = s_result.scalar_one_or_none()
                if shelter:
                    shelter_info = {
                        "id": shelter.id,
                        "name": shelter.name,
                        "capacity_remaining": shelter.total_capacity - shelter.current_occupancy,
                    }
            else:
                # Find nearest shelter
                shelters_result = await db.execute(
                    select(Shelter).where(and_(Shelter.is_active == True))
                )
                all_shelters = shelters_result.scalars().all()
                shelter_dicts = [
                    {"id": s.id, "name": s.name, "latitude": s.latitude, "longitude": s.longitude,
                     "total_capacity": s.total_capacity, "current_occupancy": s.current_occupancy,
                     "is_active": s.is_active}
                    for s in all_shelters
                ]
                nearest = routing_service.find_nearest_shelter(
                    incident.latitude, incident.longitude, shelter_dicts
                )
                if nearest:
                    shelter_id = nearest["shelter_id"]
                    shelter_info = nearest

        # Update incident status
        await db.execute(
            update(FloodIncident)
            .where(FloodIncident.id == incident_id)
            .values(
                status="dispatched" if dispatch_type != "evacuate" else "evacuating",
                dispatched_at=now,
                predicted_severity=incident.predicted_severity,
                severity_confidence=incident.severity_confidence,
                inundation_risk_score=incident.inundation_risk_score,
                predicted_water_level_1h=incident.predicted_water_level_1h,
                predicted_water_level_6h=incident.predicted_water_level_6h,
                risk_hotspot_score=incident.risk_hotspot_score,
                shap_values=incident.shap_values,
            )
        )

        # Update resource status
        await db.execute(
            update(Resource)
            .where(Resource.id == resource.id)
            .values(status="busy", current_incident_id=incident_id)
        )

        # Create dispatch log
        dispatch_log = DispatchLog(
            incident_id=incident_id,
            resource_id=resource.id,
            dispatcher_id=dispatcher_id,
            route_distance_km=route_result.distance_km,
            estimated_travel_time_min=route_result.estimated_time_min,
            routing_algorithm=algorithm,
            water_depth_at_scene_m=water_depth,
            route_flood_penalty=route_result.flood_penalty,
            shelter_id=shelter_id,
            dispatch_status="dispatched",
            dispatch_type=dispatch_type,
            dispatched_at=now,
        )
        db.add(dispatch_log)
        await db.flush()

        logger.info(
            f"Dispatched {resource.name} ({resource.resource_type}) "
            f"to flood incident {incident_id} | Water: {water_depth}m | "
            f"ETA: {route_result.estimated_time_min:.1f} min"
        )

        return {
            "success": True,
            "incident_id": incident_id,
            "severity": severity,
            "confidence": incident.severity_confidence,
            "resource": {
                "id": resource.id,
                "name": resource.name,
                "type": resource.resource_type,
                "can_operate_in_water": resource.can_operate_in_water,
                "latitude": resource.latitude,
                "longitude": resource.longitude,
            },
            "route": {
                "distance_km": route_result.distance_km,
                "estimated_time_min": route_result.estimated_time_min,
                "algorithm": route_result.algorithm,
                "flood_penalty": route_result.flood_penalty,
                "dispatch_score": route_result.score,
            },
            "dispatch_log_id": dispatch_log.id,
            "shelter": shelter_info,
        }

    async def complete_dispatch(
        self,
        dispatch_log_id: int,
        db: AsyncSession,
        actual_travel_time_min: Optional[float] = None
    ) -> Dict[str, Any]:
        result = await db.execute(
            select(DispatchLog).where(DispatchLog.id == dispatch_log_id)
        )
        log = result.scalar_one_or_none()
        if not log:
            raise ValueError(f"Dispatch log {dispatch_log_id} not found")

        now = datetime.utcnow()

        await db.execute(
            update(DispatchLog).where(DispatchLog.id == dispatch_log_id)
            .values(dispatch_status="completed", completed_at=now, actual_travel_time_min=actual_travel_time_min)
        )
        await db.execute(
            update(Resource).where(Resource.id == log.resource_id)
            .values(status="available", current_incident_id=None)
        )
        await db.execute(
            update(FloodIncident).where(FloodIncident.id == log.incident_id)
            .values(status="resolved", resolved_at=now)
        )

        return {"success": True, "dispatch_log_id": dispatch_log_id}

    async def get_resource_availability(self, db: AsyncSession) -> Dict[str, Any]:
        result = await db.execute(select(Resource).where(Resource.is_active == True))
        resources = result.scalars().all()

        summary = {
            "total": len(resources), "available": 0, "busy": 0, "maintenance": 0,
            "by_type": {}
        }

        for r in resources:
            st = r.status
            if st in summary:
                summary[st] += 1
            rt = r.resource_type
            if rt not in summary["by_type"]:
                summary["by_type"][rt] = {"available": 0, "busy": 0, "maintenance": 0}
            if st in summary["by_type"][rt]:
                summary["by_type"][rt][st] += 1

        return summary

    async def list_dispatch_logs(
        self,
        db: AsyncSession,
        page: int = 1,
        page_size: int = 30,
        incident_id: Optional[int] = None,
        resource_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        query = select(DispatchLog)
        if incident_id:
            query = query.where(DispatchLog.incident_id == incident_id)
        if resource_id:
            query = query.where(DispatchLog.resource_id == resource_id)

        # Total count
        from sqlalchemy import func
        count_q = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_q)).scalar() or 0

        # Pagination
        query = query.order_by(DispatchLog.dispatched_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await db.execute(query)
        items = result.scalars().all()

        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
        }


dispatch_service = FloodDispatchService()
