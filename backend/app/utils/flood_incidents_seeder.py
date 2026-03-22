"""
Flood Incident Seeder — generates synthetic flood incidents for Chennai.
Based on monsoon patterns (Oct-Dec) with Adyar/Cooum river overflow scenarios.
"""

import logging
import random
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.emergency import FloodIncident
from app.models.flood_zone import FloodZone

logger = logging.getLogger(__name__)

# Chennai flood incident patterns
FLOOD_TYPES = ["pluvial", "riverine", "coastal", "storm_surge"]
FLOOD_TYPE_WEIGHTS = [0.45, 0.25, 0.2, 0.1]
DRAINAGE_STATUSES = ["functional", "partial", "overwhelmed", "collapsed"]
SEVERITIES = ["low", "moderate", "severe", "catastrophic"]

DESCRIPTIONS = [
    "Heavy waterlogging in residential area. Multiple families stranded.",
    "Road completely submerged. Vehicles abandoned.",
    "Adyar river overflow affecting nearby colonies.",
    "Storm drain overflowing. Basement flooding in apartments.",
    "Coastal surge flooding in low-lying fishermen area.",
    "Severe waterlogging near railway underpass. Train services halted.",
    "Flooding in school compound. Students and staff stranded.",
    "Water entering ground floor of hospital. Patients need evacuation.",
    "Bridge submerged. Traffic completely disrupted.",
    "Sewage water mixing with floodwater. Health hazard reported.",
    "Slum area inundated. Elderly residents need immediate rescue.",
    "Power substation flooded. Large area without electricity.",
    "Water level rising rapidly near Cooum river bank.",
    "Market area flooded. Shops damaged. Traders need assistance.",
    "Housing board flats waterlogged. Ground floor evacuated.",
]


async def seed_flood_incidents(db: AsyncSession, n: int = 2000):
    """Generate synthetic flood incidents across Chennai zones."""
    existing = await db.execute(select(func.count(FloodIncident.id)))
    if (existing.scalar() or 0) > 100:
        logger.info("Flood incidents already seeded — skipping")
        return

    # Load zones
    zones_result = await db.execute(select(FloodZone))
    zones = zones_result.scalars().all()

    if not zones:
        logger.warning("No flood zones found — skipping incident seeding")
        return

    logger.info(f"Seeding {n} synthetic flood incidents for Chennai...")
    np.random.seed(42)

    now = datetime.utcnow()
    incidents_created = 0

    for i in range(n):
        # Pick zone weighted by flood risk
        risk_weights = [z.flood_risk_score or 0.5 for z in zones]
        total_w = sum(risk_weights)
        probs = [w / total_w for w in risk_weights]
        zone = np.random.choice(zones, p=probs)

        # Location jitter around zone center
        lat = zone.center_latitude + np.random.normal(0, 0.01)
        lon = zone.center_longitude + np.random.normal(0, 0.01)

        # Flood type
        flood_type = np.random.choice(FLOOD_TYPES, p=FLOOD_TYPE_WEIGHTS)

        # Water level based on zone risk and random variation
        base_wl = (zone.flood_risk_score or 0.5) * 2 + np.random.exponential(0.3)
        water_level = round(min(5.0, max(0, base_wl)), 2)

        # Rainfall
        rainfall = round(np.random.exponential(30) + 10, 1)

        # Drainage status correlated with water level
        if water_level > 2.0:
            drainage = np.random.choice(DRAINAGE_STATUSES, p=[0.0, 0.1, 0.4, 0.5])
        elif water_level > 1.0:
            drainage = np.random.choice(DRAINAGE_STATUSES, p=[0.05, 0.25, 0.5, 0.2])
        elif water_level > 0.5:
            drainage = np.random.choice(DRAINAGE_STATUSES, p=[0.1, 0.5, 0.3, 0.1])
        else:
            drainage = np.random.choice(DRAINAGE_STATUSES, p=[0.5, 0.3, 0.15, 0.05])

        # People affected
        people_stranded = max(0, int(np.random.exponential(water_level * 5)))
        people_affected = max(1, int(np.random.exponential(water_level * 20)))
        structures = max(0, int(np.random.exponential(water_level * 3)))

        # Severity based on water level
        if water_level > 2.5:
            severity = np.random.choice(SEVERITIES, p=[0.0, 0.1, 0.4, 0.5])
        elif water_level > 1.5:
            severity = np.random.choice(SEVERITIES, p=[0.05, 0.2, 0.5, 0.25])
        elif water_level > 0.8:
            severity = np.random.choice(SEVERITIES, p=[0.1, 0.4, 0.35, 0.15])
        else:
            severity = np.random.choice(SEVERITIES, p=[0.4, 0.35, 0.2, 0.05])

        # Status (most resolved, some active)
        status = np.random.choice(
            ["resolved", "pending", "dispatched", "in_progress"],
            p=[0.7, 0.1, 0.1, 0.1]
        )

        # Timestamp: spread over past 30 days, concentrated in monsoon months
        days_ago = np.random.exponential(5)
        reported_at = now - timedelta(days=days_ago, hours=np.random.randint(0, 24))

        incident = FloodIncident(
            latitude=round(lat, 6),
            longitude=round(lon, 6),
            zone_id=zone.id,
            flood_type=flood_type,
            water_level_m=water_level,
            rainfall_intensity_mmph=rainfall,
            drainage_status=drainage,
            people_stranded=people_stranded,
            people_affected=people_affected,
            structures_affected=structures,
            is_road_blocked=water_level > 0.5,
            description=random.choice(DESCRIPTIONS),
            predicted_severity=severity,
            severity_confidence=round(np.random.uniform(0.6, 0.95), 3),
            inundation_risk_score=round(min(1.0, water_level / 3), 3),
            status=status,
            reported_at=reported_at,
            dispatched_at=reported_at + timedelta(minutes=np.random.randint(5, 45)) if status != "pending" else None,
            resolved_at=reported_at + timedelta(hours=np.random.randint(1, 12)) if status == "resolved" else None,
        )
        db.add(incident)
        incidents_created += 1

    await db.flush()
    logger.info(f"Seeded {incidents_created} flood incidents across {len(zones)} zones")
