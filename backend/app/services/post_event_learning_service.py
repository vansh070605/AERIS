"""
Post-Event Learning Service — learns from past flood responses to improve future decisions.
Stores outcomes, computes error analysis, and adjusts zone risk scores adaptively.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, update

from app.models.emergency import FloodIncident
from app.models.dispatch import DispatchLog
from app.models.flood_zone import FloodZone

logger = logging.getLogger(__name__)


class PostEventLearningService:
    """
    Analyzes completed flood response operations and adaptively adjusts
    zone risk scores and resource pre-positioning recommendations.
    """

    # Exponential moving average factor for risk score updates
    EMA_ALPHA = 0.3

    async def analyze_event(self, db: AsyncSession, hours_back: int = 48) -> Dict[str, Any]:
        """
        Analyze recent flood event outcomes:
        - Actual vs predicted severity
        - Response time deviations
        - Underserved zones
        - Resource effectiveness
        """
        since = datetime.utcnow() - timedelta(hours=hours_back)

        # Get completed incidents with dispatch data
        result = await db.execute(
            select(
                FloodIncident.id,
                FloodIncident.zone_id,
                FloodIncident.predicted_severity,
                FloodIncident.water_level_m,
                FloodIncident.people_stranded,
                FloodIncident.status,
                FloodIncident.reported_at,
                FloodIncident.resolved_at,
                DispatchLog.estimated_travel_time_min,
                DispatchLog.actual_travel_time_min,
                DispatchLog.water_depth_at_scene_m,
                DispatchLog.route_flood_penalty,
            )
            .outerjoin(DispatchLog, DispatchLog.incident_id == FloodIncident.id)
            .where(FloodIncident.reported_at >= since)
        )
        rows = result.all()

        if not rows:
            return {"message": "No recent incidents to analyze", "lessons": []}

        # Per-zone analysis
        zone_stats = {}
        severity_accuracy = {"correct": 0, "total": 0}
        response_deviations = []

        for row in rows:
            z_id = row.zone_id or 0
            if z_id not in zone_stats:
                zone_stats[z_id] = {
                    "incident_count": 0,
                    "avg_water_level": 0,
                    "total_stranded": 0,
                    "response_times": [],
                    "response_deviations": [],
                    "severities": [],
                }

            stats = zone_stats[z_id]
            stats["incident_count"] += 1
            stats["avg_water_level"] += row.water_level_m or 0
            stats["total_stranded"] += row.people_stranded or 0
            stats["severities"].append(row.predicted_severity or "unknown")

            if row.estimated_travel_time_min and row.actual_travel_time_min:
                deviation = row.actual_travel_time_min - row.estimated_travel_time_min
                stats["response_times"].append(row.actual_travel_time_min)
                stats["response_deviations"].append(deviation)
                response_deviations.append(deviation)

        # Compute zone-level summaries
        lessons = []
        for z_id, stats in zone_stats.items():
            stats["avg_water_level"] /= max(stats["incident_count"], 1)
            avg_resp = sum(stats["response_times"]) / max(len(stats["response_times"]), 1)
            avg_dev = sum(stats["response_deviations"]) / max(len(stats["response_deviations"]), 1)

            lesson = {
                "zone_id": z_id,
                "incidents": stats["incident_count"],
                "avg_water_level_m": round(stats["avg_water_level"], 2),
                "people_rescued": stats["total_stranded"],
                "avg_response_time_min": round(avg_resp, 2),
                "avg_response_deviation_min": round(avg_dev, 2),
                "most_common_severity": max(set(stats["severities"]), key=stats["severities"].count)
                    if stats["severities"] else "unknown",
            }

            # Recommendations
            if avg_dev > 5:
                lesson["recommendation"] = "Response predictions too optimistic — increase flood penalties"
            elif stats["avg_water_level"] > 1.5 and stats["incident_count"] > 3:
                lesson["recommendation"] = "Chronic flooding zone — pre-position boats"
            elif stats["incident_count"] > 5:
                lesson["recommendation"] = "High-frequency zone — increase resource allocation"
            else:
                lesson["recommendation"] = "Adequate response"

            lessons.append(lesson)

        overall_avg_deviation = sum(response_deviations) / max(len(response_deviations), 1)

        return {
            "period_hours": hours_back,
            "total_incidents_analyzed": len(rows),
            "zones_affected": len(zone_stats),
            "overall_avg_response_deviation_min": round(overall_avg_deviation, 2),
            "lessons": sorted(lessons, key=lambda x: x["incidents"], reverse=True),
            "generated_at": datetime.utcnow().isoformat(),
        }

    async def update_zone_risk_scores(self, db: AsyncSession, hours_back: int = 48) -> Dict[str, Any]:
        """
        Adaptively update flood zone risk scores based on actual event data.
        Uses exponential moving average to weight recent observations.
        """
        analysis = await self.analyze_event(db, hours_back)

        updated_zones = []
        for lesson in analysis.get("lessons", []):
            z_id = lesson["zone_id"]
            if z_id == 0:
                continue

            result = await db.execute(select(FloodZone).where(FloodZone.id == z_id))
            zone = result.scalar_one_or_none()
            if not zone:
                continue

            # Compute observed risk from recent data
            observed_risk = min(1.0, (
                lesson["avg_water_level_m"] / 3.0 * 0.4 +
                lesson["incidents"] / 10.0 * 0.3 +
                (lesson["avg_response_time_min"] / 30.0) * 0.3
            ))

            # EMA update
            old_risk = zone.flood_risk_score or 0.5
            new_risk = self.EMA_ALPHA * observed_risk + (1 - self.EMA_ALPHA) * old_risk
            new_risk = round(min(1.0, max(0.0, new_risk)), 4)

            # Update max water level
            new_max = max(zone.max_recorded_water_level_m or 0, lesson["avg_water_level_m"])

            await db.execute(
                update(FloodZone)
                .where(FloodZone.id == z_id)
                .values(
                    flood_risk_score=new_risk,
                    max_recorded_water_level_m=new_max,
                )
            )

            updated_zones.append({
                "zone_id": z_id,
                "zone_name": zone.name,
                "old_risk_score": old_risk,
                "new_risk_score": new_risk,
                "change": round(new_risk - old_risk, 4),
            })

        return {
            "updated_zones": updated_zones,
            "total_updated": len(updated_zones),
        }


post_event_service = PostEventLearningService()
