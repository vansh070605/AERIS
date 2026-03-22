"""
Flood Analytics Service — flood-specific metrics and dashboards.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text
from collections import defaultdict

from app.models.emergency import FloodIncident
from app.models.resource import Resource
from app.models.dispatch import DispatchLog
from app.models.flood_zone import FloodZone
from app.models.shelter import Shelter
from app.models.water_level import WaterLevel

logger = logging.getLogger(__name__)


class FloodAnalyticsService:

    async def get_flood_heatmap(
        self,
        db: AsyncSession,
        hours: int = 24,
    ) -> List[Dict[str, Any]]:
        """Water depth heatmap — zone-level flood visualization."""
        zones_result = await db.execute(select(FloodZone).where(FloodZone.is_active == True))
        zones = zones_result.scalars().all()

        # Also get recent incidents for overlay
        since = datetime.utcnow() - timedelta(hours=hours)
        inc_result = await db.execute(
            select(FloodIncident).where(FloodIncident.reported_at >= since)
        )
        incidents = inc_result.scalars().all()

        # Zone water level map
        heatmap = []
        for z in zones:
            severity = "low"
            wl = z.current_water_level_m or 0
            if wl > 2.0:
                severity = "catastrophic"
            elif wl > 1.0:
                severity = "severe"
            elif wl > 0.5:
                severity = "moderate"

            heatmap.append({
                "zone_id": z.id,
                "zone_name": z.name,
                "lat": z.center_latitude,
                "lon": z.center_longitude,
                "water_level_m": round(wl, 2),
                "flood_risk_score": round(z.flood_risk_score or 0, 3),
                "severity": severity,
                "population": z.population or 0,
                "elevation_m": z.elevation_m or 5,
            })

        return heatmap

    async def get_response_efficiency(self, db: AsyncSession, days: int = 7) -> Dict[str, Any]:
        """Response time vs flood severity analysis."""
        since = datetime.utcnow() - timedelta(days=days)
        result = await db.execute(
            select(
                FloodIncident.predicted_severity,
                FloodIncident.water_level_m,
                DispatchLog.estimated_travel_time_min,
                DispatchLog.actual_travel_time_min,
                DispatchLog.route_flood_penalty,
                DispatchLog.dispatch_type,
            )
            .join(DispatchLog, DispatchLog.incident_id == FloodIncident.id)
            .where(DispatchLog.dispatched_at >= since)
        )
        rows = result.all()

        by_severity = defaultdict(list)
        by_type = defaultdict(list)

        for row in rows:
            sev = row.predicted_severity or "unknown"
            t = row.estimated_travel_time_min or 0
            by_severity[sev].append(t)
            dtype = row.dispatch_type or "rescue"
            by_type[dtype].append(t)

        def stats(vals):
            if not vals:
                return {"avg": 0, "min": 0, "max": 0, "count": 0}
            return {
                "avg": round(sum(vals) / len(vals), 2),
                "min": round(min(vals), 2),
                "max": round(max(vals), 2),
                "count": len(vals),
            }

        return {
            "period_days": days,
            "by_severity": {k: stats(v) for k, v in by_severity.items()},
            "by_dispatch_type": {k: stats(v) for k, v in by_type.items()},
            "total_dispatches": len(rows),
        }

    async def get_resource_utilization(self, db: AsyncSession) -> Dict[str, Any]:
        """Resource usage breakdown by type."""
        result = await db.execute(
            select(Resource.resource_type, Resource.status, func.count(Resource.id))
            .group_by(Resource.resource_type, Resource.status)
        )
        rows = result.all()

        utilization = {}
        for rtype, status, count in rows:
            if rtype not in utilization:
                utilization[rtype] = {"available": 0, "busy": 0, "maintenance": 0, "total": 0}
            utilization[rtype][status] = count
            utilization[rtype]["total"] += count

        # Compute utilization rate
        for rtype, data in utilization.items():
            total = data["total"]
            data["utilization_pct"] = round(data["busy"] / max(total, 1) * 100, 1)

        return {"resource_utilization": utilization}

    async def get_zone_risk_metrics(self, db: AsyncSession) -> Dict[str, Any]:
        """Zone-level flood risk with resource coverage analysis."""
        zones_result = await db.execute(select(FloodZone))
        zones = zones_result.scalars().all()

        metrics = []
        for z in zones:
            # Count dispatches to this zone
            disp_result = await db.execute(
                select(func.count(DispatchLog.id), func.avg(DispatchLog.estimated_travel_time_min))
                .join(FloodIncident, FloodIncident.id == DispatchLog.incident_id)
                .where(FloodIncident.zone_id == z.id)
            )
            disp_row = disp_result.first()
            dispatch_count = disp_row[0] or 0
            avg_resp = float(disp_row[1] or 0)

            is_underserved = (z.flood_risk_score or 0) > 0.6 and (z.total_resources or 0) < 5

            metrics.append({
                "zone_id": z.id,
                "zone_name": z.name,
                "code": z.code,
                "center_lat": z.center_latitude,
                "center_lon": z.center_longitude,
                "flood_risk_score": round(z.flood_risk_score or 0, 3),
                "current_water_level_m": round(z.current_water_level_m or 0, 2),
                "elevation_m": z.elevation_m or 5,
                "drainage_capacity_m3s": z.drainage_capacity_m3s or 50,
                "avg_response_time_min": round(avg_resp, 2),
                "total_dispatches": dispatch_count,
                "total_resources": z.total_resources or 0,
                "shelter_capacity": z.shelter_capacity or 0,
                "population": z.population or 0,
                "underserved_score": round(z.underserved_score or 0, 3),
                "is_underserved": is_underserved,
            })

        return {"zone_metrics": metrics}

    async def get_flood_timeline(self, db: AsyncSession, hours: int = 48) -> Dict[str, Any]:
        """Water level time-series across zones."""
        since = datetime.utcnow() - timedelta(hours=hours)
        result = await db.execute(
            select(WaterLevel)
            .where(WaterLevel.recorded_at >= since)
            .order_by(WaterLevel.recorded_at)
        )
        readings = result.scalars().all()

        timeline = defaultdict(list)
        for r in readings:
            timeline[r.zone_id].append({
                "time": r.recorded_at.isoformat() if r.recorded_at else None,
                "water_level_m": round(r.water_level_m, 3),
                "rainfall_mmph": round(r.rainfall_intensity_mmph or 0, 1),
                "rate_of_rise": round(r.rate_of_rise_m_per_hr or 0, 3),
            })

        return {
            "period_hours": hours,
            "zones": dict(timeline),
            "total_readings": len(readings),
        }

    async def get_dashboard_stats(self, db: AsyncSession) -> Dict[str, Any]:
        """Flood operations dashboard stats."""
        now = datetime.utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        last_hour = now - timedelta(hours=1)

        # Incidents
        total_q = await db.execute(select(func.count(FloodIncident.id)))
        active_q = await db.execute(
            select(func.count(FloodIncident.id)).where(
                FloodIncident.status.in_(["pending", "dispatched", "in_progress", "evacuating"])
            )
        )
        today_q = await db.execute(
            select(func.count(FloodIncident.id)).where(FloodIncident.reported_at >= today)
        )
        catastrophic_q = await db.execute(
            select(func.count(FloodIncident.id)).where(
                and_(
                    FloodIncident.predicted_severity == "catastrophic",
                    FloodIncident.status.in_(["pending", "dispatched", "in_progress"])
                )
            )
        )
        stranded_q = await db.execute(
            select(func.sum(FloodIncident.people_stranded)).where(
                FloodIncident.status.in_(["pending", "dispatched", "in_progress", "evacuating"])
            )
        )

        # Resources
        resource_q = await db.execute(
            select(Resource.resource_type, Resource.status, func.count(Resource.id))
            .group_by(Resource.resource_type, Resource.status)
        )
        resource_data = {}
        for rtype, status, count in resource_q.all():
            if rtype not in resource_data:
                resource_data[rtype] = {"available": 0, "busy": 0, "total": 0}
            resource_data[rtype][status] = count
            resource_data[rtype]["total"] += count

        total_available = sum(d.get("available", 0) for d in resource_data.values())
        total_busy = sum(d.get("busy", 0) for d in resource_data.values())

        # Shelters
        shelter_q = await db.execute(
            select(
                func.count(Shelter.id),
                func.sum(Shelter.total_capacity),
                func.sum(Shelter.current_occupancy),
            ).where(Shelter.is_active == True)
        )
        s_row = shelter_q.first()
        shelter_count = s_row[0] or 0
        shelter_capacity = s_row[1] or 0
        shelter_occupancy = s_row[2] or 0

        # Performance
        resp_q = await db.execute(
            select(func.avg(DispatchLog.estimated_travel_time_min)).where(
                DispatchLog.dispatched_at >= last_hour
            )
        )

        # Flooded zones
        flooded_q = await db.execute(
            select(func.count(FloodZone.id)).where(FloodZone.current_water_level_m > 0.3)
        )

        return {
            "flood_incidents": {
                "total": total_q.scalar() or 0,
                "active": active_q.scalar() or 0,
                "today": today_q.scalar() or 0,
                "catastrophic_active": catastrophic_q.scalar() or 0,
                "people_stranded": stranded_q.scalar() or 0,
            },
            "resources": {
                "available": total_available,
                "busy": total_busy,
                "total": total_available + total_busy,
                "by_type": resource_data,
            },
            "shelters": {
                "active_count": shelter_count,
                "total_capacity": shelter_capacity,
                "current_occupancy": shelter_occupancy,
                "occupancy_pct": round(shelter_occupancy / max(shelter_capacity, 1) * 100, 1),
            },
            "performance": {
                "avg_response_time_min": round(float(resp_q.scalar() or 0), 2),
            },
            "water_levels": {
                "zones_flooded": flooded_q.scalar() or 0,
            },
        }

    def _gini_coefficient(self, values: List[float]) -> float:
        if not values or len(values) < 2:
            return 0.0
        arr = sorted(values)
        n = len(arr)
        total = sum(arr)
        if total == 0:
            return 0.0
        gini = (2 * sum(i * v for i, v in zip(range(1, n + 1), arr))) / (n * total) - (n + 1) / n
        return max(0.0, min(1.0, gini))


analytics_service = FloodAnalyticsService()
