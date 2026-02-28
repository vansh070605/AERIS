"""
Dispatch Service — SQLite compatible version.
Manages emergency resource assignment, status tracking, and dispatch orchestration.
"""

import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_

from app.models.emergency import Emergency
from app.models.resource import Resource
from app.models.dispatch import DispatchLog
from app.services.routing_service import routing_service
from app.services.ml_service import ml_service

logger = logging.getLogger(__name__)


class DispatchService:
    """Orchestrates emergency dispatch: ML prediction → routing → resource assignment."""

    async def auto_dispatch(
        self,
        emergency_id: int,
        db: AsyncSession,
        dispatcher_id: Optional[int] = None,
        algorithm: str = "dijkstra"
    ) -> Dict[str, Any]:
        """Full dispatch pipeline."""
        result = await db.execute(select(Emergency).where(Emergency.id == emergency_id))
        emergency = result.scalar_one_or_none()
        if not emergency:
            raise ValueError(f"Emergency {emergency_id} not found")

        if emergency.status == "dispatched":
            raise ValueError(f"Emergency {emergency_id} already dispatched")

        # Run ML prediction if needed
        if not emergency.predicted_severity:
            now = datetime.utcnow()
            ml_result = ml_service.predict(
                emergency_type=emergency.emergency_type,
                injury_level=emergency.injury_level or 0,
                people_affected=emergency.people_affected or 1,
                hazard_level=emergency.hazard_level or 0,
                hour_of_day=now.hour,
                day_of_week=now.weekday(),
            )
            emergency.predicted_severity = ml_result["severity"]
            emergency.severity_confidence = ml_result["confidence"]
            emergency.shap_values = ml_result["shap_values"]

        severity = emergency.predicted_severity or "medium"

        # Find available resources
        avail_result = await db.execute(
            select(Resource).where(
                and_(Resource.status == "available", Resource.is_active == True)
            )
        )
        available_resources = avail_result.scalars().all()

        if not available_resources:
            return {
                "success": False,
                "message": "No available resources",
                "emergency_id": emergency_id
            }

        resource_dicts = [
            {
                "id": r.id,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "resource_type": r.resource_type,
                "name": r.name,
            }
            for r in available_resources
        ]

        # Route and find optimal resource
        route_result = routing_service.find_optimal_resource(
            emergency_lat=emergency.latitude,
            emergency_lon=emergency.longitude,
            emergency_type=emergency.emergency_type,
            severity=severity,
            available_resources=resource_dicts,
            algorithm=algorithm
        )

        if not route_result:
            return {
                "success": False,
                "message": "Could not compute route",
                "emergency_id": emergency_id
            }

        # Load selected resource
        res_result = await db.execute(
            select(Resource).where(Resource.id == route_result.resource_id)
        )
        resource = res_result.scalar_one()

        now = datetime.utcnow()

        # Update emergency status
        await db.execute(
            update(Emergency)
            .where(Emergency.id == emergency_id)
            .values(
                status="dispatched",
                dispatched_at=now,
                predicted_severity=emergency.predicted_severity,
                severity_confidence=emergency.severity_confidence,
                shap_values=emergency.shap_values,
            )
        )

        # Update resource status
        await db.execute(
            update(Resource)
            .where(Resource.id == resource.id)
            .values(status="busy", current_emergency_id=emergency_id)
        )

        # Create dispatch log
        dispatch_log = DispatchLog(
            emergency_id=emergency_id,
            resource_id=resource.id,
            dispatcher_id=dispatcher_id,
            route_distance_km=route_result.distance_km,
            estimated_travel_time_min=route_result.estimated_time_min,
            routing_algorithm=algorithm,
            dispatch_status="dispatched",
            dispatched_at=now,
        )
        db.add(dispatch_log)
        await db.flush()

        logger.info(
            f"Dispatched {resource.name} ({resource.resource_type}) "
            f"to emergency {emergency_id} | ETA: {route_result.estimated_time_min:.1f} min"
        )

        return {
            "success": True,
            "emergency_id": emergency_id,
            "severity": severity,
            "confidence": emergency.severity_confidence,
            "resource": {
                "id": resource.id,
                "name": resource.name,
                "type": resource.resource_type,
                "latitude": resource.latitude,
                "longitude": resource.longitude,
            },
            "route": {
                "distance_km": route_result.distance_km,
                "estimated_time_min": route_result.estimated_time_min,
                "algorithm": route_result.algorithm,
                "dispatch_score": route_result.score,
            },
            "dispatch_log_id": dispatch_log.id,
        }

    async def complete_dispatch(
        self,
        dispatch_log_id: int,
        db: AsyncSession,
        actual_travel_time_min: Optional[float] = None
    ) -> Dict[str, Any]:
        """Mark a dispatch as completed and free the resource."""
        result = await db.execute(
            select(DispatchLog).where(DispatchLog.id == dispatch_log_id)
        )
        log = result.scalar_one_or_none()
        if not log:
            raise ValueError(f"Dispatch log {dispatch_log_id} not found")

        now = datetime.utcnow()

        await db.execute(
            update(DispatchLog)
            .where(DispatchLog.id == dispatch_log_id)
            .values(
                dispatch_status="completed",
                completed_at=now,
                actual_travel_time_min=actual_travel_time_min,
            )
        )

        await db.execute(
            update(Resource)
            .where(Resource.id == log.resource_id)
            .values(status="available", current_emergency_id=None)
        )

        await db.execute(
            update(Emergency)
            .where(Emergency.id == log.emergency_id)
            .values(status="resolved", resolved_at=now)
        )

        return {"success": True, "dispatch_log_id": dispatch_log_id}

    async def get_resource_availability(self, db: AsyncSession) -> Dict[str, Any]:
        """Get current resource availability summary."""
        result = await db.execute(select(Resource).where(Resource.is_active == True))
        resources = result.scalars().all()

        summary = {
            "total": len(resources),
            "available": 0, "busy": 0, "maintenance": 0,
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


dispatch_service = DispatchService()
