"""
Analytics Service — SQLite compatible version.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, text
from collections import defaultdict

from app.models.emergency import Emergency
from app.models.resource import Resource
from app.models.dispatch import DispatchLog
from app.models.zone import Zone

logger = logging.getLogger(__name__)


class AnalyticsService:

    async def get_heatmap_data(
        self,
        db: AsyncSession,
        hours: int = 24,
        emergency_type: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        since = datetime.utcnow() - timedelta(hours=hours)
        query = select(Emergency).where(Emergency.reported_at >= since)

        if emergency_type:
            query = query.where(Emergency.emergency_type == emergency_type)
        if severity:
            query = query.where(Emergency.predicted_severity == severity)

        result = await db.execute(query)
        emergencies = result.scalars().all()

        intensity_map = {"low": 0.25, "medium": 0.5, "high": 0.75, "critical": 1.0}
        heatmap = []
        for e in emergencies:
            sev = e.predicted_severity or "medium"
            heatmap.append({
                "id": e.id,
                "lat": e.latitude,
                "lon": e.longitude,
                "intensity": intensity_map.get(sev, 0.5),
                "type": e.emergency_type,
                "severity": sev,
                "status": e.status,
                "people_affected": e.people_affected,
                "reported_at": e.reported_at.isoformat() if e.reported_at else None,
            })
        return heatmap

    async def get_equity_metrics(self, db: AsyncSession) -> Dict[str, Any]:
        zones_result = await db.execute(select(Zone))
        zones = zones_result.scalars().all()

        dispatch_result = await db.execute(
            select(
                Emergency.zone_id,
                func.count(DispatchLog.id).label("dispatch_count"),
                func.avg(DispatchLog.estimated_travel_time_min).label("avg_response_time"),
                func.avg(DispatchLog.actual_travel_time_min).label("avg_actual_time"),
            )
            .join(DispatchLog, DispatchLog.emergency_id == Emergency.id, isouter=True)
            .group_by(Emergency.zone_id)
        )
        zone_stats = {row.zone_id: row for row in dispatch_result.all()}

        zone_metrics = []
        response_times = []

        for zone in zones:
            stats = zone_stats.get(zone.id)
            avg_resp = float(stats.avg_response_time or 0) if stats else 0
            actual_resp = float(stats.avg_actual_time or 0) if stats else 0
            dispatch_count = int(stats.dispatch_count or 0) if stats else 0

            if avg_resp > 0:
                response_times.append(avg_resp)

            zone_metrics.append({
                "zone_id": zone.id,
                "zone_name": zone.name,
                "zone_code": zone.code,
                "center_lat": zone.center_latitude,
                "center_lon": zone.center_longitude,
                "avg_response_time_min": round(avg_resp, 2),
                "avg_actual_time_min": round(actual_resp, 2),
                "total_dispatches": dispatch_count,
                "total_resources": zone.total_resources or 0,
                "population": zone.population or 0,
                "equity_score": round(zone.equity_score or 1.0, 3),
                "underserved_score": round(zone.underserved_score or 0.0, 3),
                "risk_level": zone.risk_level or "low",
                "is_underserved": (zone.underserved_score or 0) > 0.6,
            })

        global_avg = sum(response_times) / len(response_times) if response_times else 0
        max_resp = max(response_times) if response_times else 0
        min_resp = min(response_times) if response_times else 0
        under_served = [z for z in zone_metrics if z["is_underserved"]]
        gini = self._gini_coefficient(response_times) if response_times else 0

        return {
            "zone_metrics": zone_metrics,
            "summary": {
                "global_avg_response_time_min": round(global_avg, 2),
                "max_response_time_min": round(max_resp, 2),
                "min_response_time_min": round(min_resp, 2),
                "underserved_zones_count": len(under_served),
                "total_zones": len(zones),
                "fairness_gini": round(gini, 4),
                "equity_rating": "Good" if gini < 0.2 else "Fair" if gini < 0.4 else "Poor",
            },
            "underserved_zones": under_served,
        }

    async def get_response_time_analytics(self, db: AsyncSession, days: int = 30) -> Dict[str, Any]:
        since = datetime.utcnow() - timedelta(days=days)
        result = await db.execute(
            select(
                Emergency.emergency_type,
                Emergency.predicted_severity,
                DispatchLog.estimated_travel_time_min,
                DispatchLog.actual_travel_time_min,
                DispatchLog.dispatched_at,
            )
            .join(DispatchLog, DispatchLog.emergency_id == Emergency.id)
            .where(DispatchLog.dispatched_at >= since)
        )
        rows = result.all()

        by_type = defaultdict(list)
        by_severity = defaultdict(list)
        by_hour = defaultdict(list)

        for row in rows:
            etype = row.emergency_type or "unknown"
            sev = row.predicted_severity or "unknown"
            t = row.estimated_travel_time_min or 0
            by_type[etype].append(t)
            by_severity[sev].append(t)
            if row.dispatched_at:
                by_hour[row.dispatched_at.hour].append(t)

        def stats(vals):
            if not vals:
                return {"avg": 0, "min": 0, "max": 0, "count": 0}
            return {
                "avg": round(sum(vals) / len(vals), 2),
                "min": round(min(vals), 2),
                "max": round(max(vals), 2),
                "count": len(vals)
            }

        return {
            "period_days": days,
            "by_emergency_type": {k: stats(v) for k, v in by_type.items()},
            "by_severity": {k: stats(v) for k, v in by_severity.items()},
            "by_hour_of_day": {str(h): stats(v) for h, v in sorted(by_hour.items())},
            "total_dispatches": len(rows),
        }

    async def get_dashboard_stats(self, db: AsyncSession) -> Dict[str, Any]:
        now = datetime.utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        last_hour = now - timedelta(hours=1)

        total_q = await db.execute(select(func.count(Emergency.id)))
        active_q = await db.execute(
            select(func.count(Emergency.id)).where(Emergency.status.in_(["pending", "dispatched", "in_progress"]))
        )
        today_q = await db.execute(
            select(func.count(Emergency.id)).where(Emergency.reported_at >= today)
        )
        resource_q = await db.execute(
            select(Resource.status, func.count(Resource.id)).group_by(Resource.status)
        )
        resp_q = await db.execute(
            select(func.avg(DispatchLog.estimated_travel_time_min)).where(
                DispatchLog.dispatched_at >= last_hour
            )
        )
        critical_q = await db.execute(
            select(func.count(Emergency.id)).where(
                and_(
                    Emergency.predicted_severity == "critical",
                    Emergency.status.in_(["pending", "dispatched", "in_progress"])
                )
            )
        )

        resource_stats = {row[0]: row[1] for row in resource_q.all()}

        return {
            "emergencies": {
                "total": total_q.scalar() or 0,
                "active": active_q.scalar() or 0,
                "today": today_q.scalar() or 0,
                "critical_active": critical_q.scalar() or 0,
            },
            "resources": {
                "available": resource_stats.get("available", 0),
                "busy": resource_stats.get("busy", 0),
                "maintenance": resource_stats.get("maintenance", 0),
                "total": sum(resource_stats.values()),
            },
            "performance": {
                "avg_response_time_min": round(float(resp_q.scalar() or 0), 2),
            },
        }

    async def get_early_warning_predictions(self, db: AsyncSession) -> Dict[str, Any]:
        last_48h = datetime.utcnow() - timedelta(hours=48)
        result = await db.execute(
            select(Emergency.zone_id, func.count(Emergency.id).label("count"))
            .where(Emergency.reported_at >= last_48h)
            .group_by(Emergency.zone_id)
            .order_by(text("count DESC"))
        )
        zone_activity = result.all()

        warnings = []
        for row in zone_activity:
            if row.count > 5:
                risk_score = min(1.0, row.count / 20)
                warnings.append({
                    "zone_id": row.zone_id,
                    "incident_count_48h": row.count,
                    "risk_score": round(risk_score, 3),
                    "alert_level": "HIGH" if risk_score > 0.6 else "MEDIUM",
                    "recommendation": "Consider pre-positioning additional resources"
                })

        return {
            "warnings": warnings,
            "generated_at": datetime.utcnow().isoformat(),
            "model": "frequency_analysis_v1",
            "note": "Early warning stub — integrate time-series ML model for production"
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


analytics_service = AnalyticsService()
