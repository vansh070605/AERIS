"""
Chennai Synthetic Emergency Incident Generator
Generates 5000+ realistic emergency incidents across Chennai with:
  - Geographic clustering around dense areas
  - Time-of-day patterns (accidents peak rush hour, medical at night)
  - Monsoon flood correlation with known flood-prone areas
  - Severity weighted by type, population density, and time
"""

import random
import math
import logging
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models.emergency import Emergency

logger = logging.getLogger(__name__)

# ── Chennai geographic hotspots (lat, lon, weight, label) ────────────────────
# Higher-weight areas generate more incidents
INCIDENT_HOTSPOTS = [
    # Dense commercial / residential areas
    (13.0418, 80.2341, 3.0, "T. Nagar"),
    (13.0850, 80.2100, 2.5, "Anna Nagar"),
    (13.0368, 80.2676, 2.0, "Mylapore"),
    (13.0732, 80.2609, 2.0, "Egmore"),
    (13.0604, 80.2780, 2.5, "Parry's Corner"),

    # IT corridor / OMR
    (12.9600, 80.2420, 2.5, "OMR Thoraipakkam"),
    (12.9010, 80.2279, 2.0, "Sholinganallur"),
    (12.8400, 80.2260, 1.5, "Siruseri IT Park"),

    # Flood-prone areas
    (12.9815, 80.2180, 3.5, "Velachery"),
    (13.0012, 80.2565, 2.0, "Adyar River Basin"),
    (12.9500, 80.1700, 2.5, "Mudichur-Tambaram"),
    (13.0050, 80.2050, 2.0, "Pallikaranai Marsh"),

    # Industrial / port
    (13.1650, 80.2630, 2.0, "Manali Industrial"),
    (13.1130, 80.2940, 1.5, "Chennai Port"),

    # Suburban
    (13.1143, 80.1548, 1.5, "Ambattur"),
    (13.1145, 80.1010, 1.0, "Avadi"),
    (12.9249, 80.1278, 1.5, "Tambaram"),
]

# Emergency type probabilities by time-of-day bracket
# [medical, fire, accident, flood, crime, other]
TIME_TYPE_WEIGHTS = {
    "night":    [0.35, 0.15, 0.10, 0.05, 0.25, 0.10],  # 00:00-05:59
    "morning":  [0.25, 0.10, 0.30, 0.10, 0.10, 0.15],  # 06:00-09:59
    "day":      [0.25, 0.15, 0.20, 0.10, 0.15, 0.15],  # 10:00-15:59
    "evening":  [0.20, 0.10, 0.35, 0.10, 0.10, 0.15],  # 16:00-19:59
    "late":     [0.30, 0.15, 0.15, 0.05, 0.25, 0.10],  # 20:00-23:59
}

EMERGENCY_TYPES = ["medical", "fire", "accident", "flood", "crime", "other"]

# Flood-prone hotspot indices (Velachery, Adyar River, Mudichur, Pallikaranai)
FLOOD_PRONE_INDICES = {8, 9, 10, 11}

# Monsoon months (Oct, Nov, Dec — Chennai receives northeast monsoon)
MONSOON_MONTHS = {10, 11, 12}


def _get_time_bracket(hour: int) -> str:
    if hour < 6:
        return "night"
    elif hour < 10:
        return "morning"
    elif hour < 16:
        return "day"
    elif hour < 20:
        return "evening"
    else:
        return "late"


def _pick_hotspot() -> tuple:
    """Weighted random selection of a geographic hotspot."""
    weights = [h[2] for h in INCIDENT_HOTSPOTS]
    total = sum(weights)
    probs = [w / total for w in weights]
    idx = np.random.choice(len(INCIDENT_HOTSPOTS), p=probs)
    return idx, INCIDENT_HOTSPOTS[idx]


def _jitter_location(lat: float, lon: float, radius_km: float = 1.5) -> tuple:
    """Add random jitter within a given radius (in km)."""
    # Convert km to approximate degrees
    lat_jitter = np.random.normal(0, radius_km / 111.0)
    lon_jitter = np.random.normal(0, radius_km / (111.0 * math.cos(math.radians(lat))))
    return (
        round(lat + lat_jitter, 6),
        round(lon + lon_jitter, 6),
    )


def generate_chennai_incidents(n: int = 5000) -> List[Dict[str, Any]]:
    """Generate n synthetic emergency incidents for Chennai."""
    np.random.seed(42)
    random.seed(42)

    incidents = []
    # Time range: last 90 days
    now = datetime.utcnow()
    start_date = now - timedelta(days=90)

    for i in range(n):
        # Random timestamp within range
        offset_seconds = random.randint(0, int((now - start_date).total_seconds()))
        reported_at = start_date + timedelta(seconds=offset_seconds)
        hour = reported_at.hour
        month = reported_at.month
        day_of_week = reported_at.weekday()

        # Pick hotspot
        hotspot_idx, (base_lat, base_lon, _, label) = _pick_hotspot()

        # Determine emergency type based on time
        time_bracket = _get_time_bracket(hour)
        type_weights = list(TIME_TYPE_WEIGHTS[time_bracket])

        # Boost flood probability during monsoon in flood-prone areas
        if month in MONSOON_MONTHS and hotspot_idx in FLOOD_PRONE_INDICES:
            type_weights[3] *= 4.0  # Increase flood weight

        # Normalize
        total = sum(type_weights)
        type_probs = [w / total for w in type_weights]
        emergency_type = np.random.choice(EMERGENCY_TYPES, p=type_probs)

        # Jitter location
        lat, lon = _jitter_location(base_lat, base_lon, radius_km=1.2)

        # Clamp to Chennai bounds
        lat = max(12.80, min(13.25, lat))
        lon = max(80.05, min(80.35, lon))

        # Generate severity-related features
        injury_weights = {
            "medical": (5, 3), "fire": (5, 3), "accident": (6, 3),
            "flood": (3, 3), "crime": (3, 3), "other": (2, 2)
        }
        mean_inj, std_inj = injury_weights[emergency_type]
        injury_level = max(0, min(10, int(np.random.normal(mean_inj, std_inj))))
        people_affected = max(1, int(np.random.exponential(5 if emergency_type == "flood" else 3)))
        hazard_level = max(0, min(10, int(np.random.normal(
            6 if emergency_type in ("fire", "flood") else 4, 2.5
        ))))

        # Build address from label
        address = f"Near {label}, Chennai"

        incidents.append({
            "emergency_type": emergency_type,
            "latitude": lat,
            "longitude": lon,
            "address": address,
            "injury_level": injury_level,
            "people_affected": people_affected,
            "hazard_level": hazard_level,
            "description": f"Synthetic {emergency_type} incident near {label}",
            "hour_of_day": hour,
            "day_of_week": day_of_week,
            "reported_at": reported_at,
            "status": random.choice(["pending", "dispatched", "in_progress", "resolved", "resolved", "resolved"]),
        })

    return incidents


def _compute_severity(inc: Dict) -> tuple:
    """Fast severity assignment from composite score — no ML needed for seeding."""
    type_weights = {
        "medical": 1.5, "fire": 2.0, "accident": 1.8,
        "flood": 1.6, "crime": 1.2, "other": 1.0
    }
    w = type_weights.get(inc["emergency_type"], 1.0)
    score = (
        inc["injury_level"] * 0.4 * w +
        min(inc["people_affected"] / 100, 1) * 10 * 0.3 +
        inc["hazard_level"] * 0.3 * w
    )
    if score < 3:
        return "low", round(0.7 + random.random() * 0.2, 2)
    elif score < 6:
        return "medium", round(0.6 + random.random() * 0.3, 2)
    elif score < 9:
        return "high", round(0.7 + random.random() * 0.25, 2)
    else:
        return "critical", round(0.8 + random.random() * 0.15, 2)


async def seed_incidents(db: AsyncSession, n: int = 5000):
    """Bulk-insert synthetic Chennai emergency incidents into the DB."""
    existing = await db.execute(select(func.count(Emergency.id)))
    count = existing.scalar() or 0
    if count > 100:
        logger.info(f"Database already has {count} emergencies — skipping incident seeding")
        return

    logger.info(f"Generating {n} synthetic Chennai emergency incidents...")
    incidents = generate_chennai_incidents(n)

    # Get zone mapping for assignment
    from app.models.zone import Zone
    zones_result = await db.execute(select(Zone))
    zones = zones_result.scalars().all()

    def find_nearest_zone(lat, lon):
        min_dist = float("inf")
        best_zone = None
        for z in zones:
            d = (z.center_latitude - lat) ** 2 + (z.center_longitude - lon) ** 2
            if d < min_dist:
                min_dist = d
                best_zone = z
        return best_zone

    batch_size = 500
    total_created = 0

    for batch_start in range(0, len(incidents), batch_size):
        batch = incidents[batch_start:batch_start + batch_size]

        for inc in batch:
            zone = find_nearest_zone(inc["latitude"], inc["longitude"])
            predicted_severity, severity_confidence = _compute_severity(inc)

            emergency = Emergency(
                emergency_type=inc["emergency_type"],
                latitude=inc["latitude"],
                longitude=inc["longitude"],
                address=inc["address"],
                injury_level=inc["injury_level"],
                people_affected=inc["people_affected"],
                hazard_level=inc["hazard_level"],
                description=inc["description"],
                predicted_severity=predicted_severity,
                severity_confidence=severity_confidence,
                status=inc["status"],
                reporter_name="Simulation System",
                is_crowd_sourced=0,
                zone_id=zone.id if zone else None,
                reported_at=inc["reported_at"],
            )
            db.add(emergency)
            total_created += 1

        await db.flush()
        logger.info(f"  Seeded batch {batch_start + len(batch)}/{len(incidents)}")

    logger.info(f"Seeded {total_created} emergency incidents for Chennai")

