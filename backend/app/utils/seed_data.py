"""
Seed data for development — Chennai zones, hospitals, and emergency resources.
Works with SQLite (no PostGIS required).
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.resource import Resource
from app.models.zone import Zone
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

# ── Chennai Zones ───────────────────────────────────────────────────────────
ZONES = [
    {"name": "Royapuram",      "code": "RPM", "center_latitude": 13.1130, "center_longitude": 80.2940, "population": 539900, "area_km2": 26.0, "total_resources": 6, "risk_level": "high",   "underserved_score": 0.55},
    {"name": "Tondiarpet",     "code": "TDP", "center_latitude": 13.1275, "center_longitude": 80.2830, "population": 607000, "area_km2": 23.0, "total_resources": 5, "risk_level": "high",   "underserved_score": 0.62},
    {"name": "Anna Nagar",     "code": "ANG", "center_latitude": 13.0850, "center_longitude": 80.2100, "population": 465000, "area_km2": 22.0, "total_resources": 8, "risk_level": "medium"},
    {"name": "T. Nagar",       "code": "TNG", "center_latitude": 13.0418, "center_longitude": 80.2341, "population": 530000, "area_km2": 15.5, "total_resources": 9, "risk_level": "medium"},
    {"name": "Adyar",          "code": "ADR", "center_latitude": 13.0012, "center_longitude": 80.2565, "population": 380000, "area_km2": 20.0, "total_resources": 7, "risk_level": "high",   "underserved_score": 0.48},
    {"name": "Mylapore",       "code": "MYP", "center_latitude": 13.0368, "center_longitude": 80.2676, "population": 420000, "area_km2": 12.0, "total_resources": 8, "risk_level": "medium"},
    {"name": "Egmore",         "code": "EGM", "center_latitude": 13.0732, "center_longitude": 80.2609, "population": 310000, "area_km2": 10.0, "total_resources": 10, "risk_level": "low"},
    {"name": "Velachery",      "code": "VLR", "center_latitude": 12.9815, "center_longitude": 80.2180, "population": 550000, "area_km2": 28.0, "total_resources": 5, "risk_level": "high",   "underserved_score": 0.70},
    {"name": "Tambaram",       "code": "TMB", "center_latitude": 12.9249, "center_longitude": 80.1278, "population": 420000, "area_km2": 42.0, "total_resources": 4, "risk_level": "high",   "underserved_score": 0.68},
    {"name": "Sholinganallur", "code": "SGL", "center_latitude": 12.9010, "center_longitude": 80.2279, "population": 350000, "area_km2": 35.0, "total_resources": 6, "risk_level": "medium"},
    {"name": "Ambattur",       "code": "AMB", "center_latitude": 13.1143, "center_longitude": 80.1548, "population": 480000, "area_km2": 45.0, "total_resources": 5, "risk_level": "medium", "underserved_score": 0.50},
    {"name": "Avadi",          "code": "AVD", "center_latitude": 13.1145, "center_longitude": 80.1010, "population": 345000, "area_km2": 65.0, "total_resources": 4, "risk_level": "high",   "underserved_score": 0.72},
]

# ── Chennai Resources ───────────────────────────────────────────────────────
RESOURCES = [
    # ── Ambulances ──────────────────────────────────────────────────────────
    {"name": "Rajiv Gandhi GH Ambulance",    "resource_type": "ambulance",  "latitude": 13.0604, "longitude": 80.2780, "base_station": "Rajiv Gandhi Government General Hospital", "vehicle_id": "AMB-EGM-001"},
    {"name": "Stanley Hospital Ambulance",   "resource_type": "ambulance",  "latitude": 13.1145, "longitude": 80.2890, "base_station": "Stanley Medical College Hospital",          "vehicle_id": "AMB-RPM-001"},
    {"name": "Kilpauk MC Ambulance",         "resource_type": "ambulance",  "latitude": 13.0843, "longitude": 80.2429, "base_station": "Kilpauk Medical College Hospital",          "vehicle_id": "AMB-ANG-001"},
    {"name": "Apollo Chennai Ambulance",     "resource_type": "ambulance",  "latitude": 13.0067, "longitude": 80.2206, "base_station": "Apollo Hospitals Greams Road",              "vehicle_id": "AMB-TNG-001"},
    {"name": "SRMC Ambulance",               "resource_type": "ambulance",  "latitude": 12.9850, "longitude": 80.2270, "base_station": "Sri Ramachandra Medical Centre Porur",       "vehicle_id": "AMB-VLR-001"},
    {"name": "CMC Vellore-Chennai Ambulance", "resource_type": "ambulance", "latitude": 12.9550, "longitude": 80.1410, "base_station": "CMC Vellore-Chennai Campus",                "vehicle_id": "AMB-TMB-001"},
    {"name": "Adyar Cancer Institute Ambulance", "resource_type": "ambulance", "latitude": 13.0032, "longitude": 80.2572, "base_station": "Adyar Cancer Institute",                 "vehicle_id": "AMB-ADR-001"},
    {"name": "108 Emergency Ambulance OMR",  "resource_type": "ambulance",  "latitude": 12.9100, "longitude": 80.2300, "base_station": "OMR 108 Base",                              "vehicle_id": "AMB-SGL-001"},
    {"name": "Fortis Malar Ambulance",       "resource_type": "ambulance",  "latitude": 13.0145, "longitude": 80.2598, "base_station": "Fortis Malar Hospital",                     "vehicle_id": "AMB-MYP-001"},

    # ── Fire Trucks ─────────────────────────────────────────────────────────
    {"name": "Kilpauk Fire Station Truck",   "resource_type": "fire_truck", "latitude": 13.0860, "longitude": 80.2430, "base_station": "Kilpauk Fire Station",                      "vehicle_id": "FTK-ANG-001"},
    {"name": "Teynampet Fire Station Truck", "resource_type": "fire_truck", "latitude": 13.0400, "longitude": 80.2480, "base_station": "Teynampet Fire Station",                    "vehicle_id": "FTK-TNG-001"},
    {"name": "Mylapore Fire Station Truck",  "resource_type": "fire_truck", "latitude": 13.0340, "longitude": 80.2700, "base_station": "Mylapore Fire Station",                     "vehicle_id": "FTK-MYP-001"},
    {"name": "Tondiarpet Fire Station Truck","resource_type": "fire_truck", "latitude": 13.1250, "longitude": 80.2820, "base_station": "Tondiarpet Fire Station",                   "vehicle_id": "FTK-TDP-001"},
    {"name": "Tambaram Fire Station Truck",  "resource_type": "fire_truck", "latitude": 12.9260, "longitude": 80.1290, "base_station": "Tambaram Fire Station",                     "vehicle_id": "FTK-TMB-001"},

    # ── Police Units ────────────────────────────────────────────────────────
    {"name": "Chennai City PCR Central",     "resource_type": "police_unit","latitude": 13.0606, "longitude": 80.2610, "base_station": "Chennai Commissioner Office",               "vehicle_id": "PCR-EGM-001"},
    {"name": "Adyar Police PCR",             "resource_type": "police_unit","latitude": 13.0020, "longitude": 80.2560, "base_station": "Adyar Police Station",                      "vehicle_id": "PCR-ADR-001"},
    {"name": "Anna Nagar Police PCR",        "resource_type": "police_unit","latitude": 13.0870, "longitude": 80.2130, "base_station": "Anna Nagar Police Station",                 "vehicle_id": "PCR-ANG-002"},
    {"name": "Velachery Police PCR",         "resource_type": "police_unit","latitude": 12.9830, "longitude": 80.2200, "base_station": "Velachery Police Station",                   "vehicle_id": "PCR-VLR-001"},
    {"name": "Ambattur Police PCR",          "resource_type": "police_unit","latitude": 13.1160, "longitude": 80.1560, "base_station": "Ambattur Police Station",                    "vehicle_id": "PCR-AMB-001"},

    # ── Rescue Teams ────────────────────────────────────────────────────────
    {"name": "NDRF Chennai Alpha Team",     "resource_type": "rescue_team", "latitude": 13.0700, "longitude": 80.2500, "base_station": "NDRF Camp Egmore",                          "vehicle_id": "RSC-EGM-001"},
    {"name": "SDMA Chennai Rescue",         "resource_type": "rescue_team", "latitude": 12.9400, "longitude": 80.1350, "base_station": "SDMA Tambaram Base",                        "vehicle_id": "RSC-TMB-001"},
    {"name": "Coast Guard Rescue",          "resource_type": "rescue_team", "latitude": 13.1050, "longitude": 80.2950, "base_station": "Indian Coast Guard Station Chennai",         "vehicle_id": "RSC-RPM-001"},

    # ── Hazmat ──────────────────────────────────────────────────────────────
    {"name": "Manali Industrial Hazmat",    "resource_type": "hazmat_unit", "latitude": 13.1650, "longitude": 80.2630, "base_station": "SIPCOT Manali Industrial Estate",            "vehicle_id": "HZM-RPM-001"},
]

# ── Users ───────────────────────────────────────────────────────────────────
USERS = [
    {"username": "admin",       "email": "admin@aeiras.gov.in",       "full_name": "System Administrator", "role": "admin",      "password": "Admin@AEIRAS2024"},
    {"username": "dispatcher1", "email": "dispatcher1@aeiras.gov.in", "full_name": "Senior Dispatcher",    "role": "dispatcher", "password": "Dispatch@123"},
    {"username": "dispatcher2", "email": "dispatcher2@aeiras.gov.in", "full_name": "Night Shift Dispatcher","role": "dispatcher", "password": "Dispatch@456"},
    {"username": "viewer1",     "email": "viewer1@aeiras.gov.in",     "full_name": "Monitoring Officer",   "role": "viewer",     "password": "Viewer@123"},
]


async def seed_database(db: AsyncSession):
    # Check if already seeded
    existing_user = await db.execute(select(User).limit(1))
    if existing_user.scalar_one_or_none():
        logger.info("Database already seeded — skipping")
        return

    logger.info("Seeding database with Chennai data...")

    # Zones
    zone_objs = []
    for z in ZONES:
        zone = Zone(
            name=z["name"],
            code=z["code"],
            center_latitude=z["center_latitude"],
            center_longitude=z["center_longitude"],
            population=z.get("population", 400000),
            area_km2=z.get("area_km2", 30.0),
            population_density=z.get("population", 400000) / max(z.get("area_km2", 30.0), 1),
            total_resources=z.get("total_resources", 5),
            risk_level=z.get("risk_level", "medium"),
            underserved_score=z.get("underserved_score", 0.2),
            equity_score=1.0 - z.get("underserved_score", 0.2),
        )
        db.add(zone)
        zone_objs.append(zone)

    await db.flush()
    zone_map = {z.code: z for z in zone_objs}

    # Resources
    for r in RESOURCES:
        zone_id = None
        vid = r.get("vehicle_id", "")
        for code, zone_obj in zone_map.items():
            if code in vid:
                zone_id = zone_obj.id
                break

        resource = Resource(
            name=r["name"],
            resource_type=r["resource_type"],
            latitude=r["latitude"],
            longitude=r["longitude"],
            base_station=r.get("base_station"),
            vehicle_id=r["vehicle_id"],
            crew_count=2,
            capacity=1,
            status="available",
            is_active=True,
            zone_id=zone_id,
        )
        db.add(resource)

    # Users
    for u in USERS:
        user = User(
            username=u["username"],
            email=u["email"],
            full_name=u["full_name"],
            role=u["role"],
            hashed_password=get_password_hash(u["password"]),
            is_active=True,
        )
        db.add(user)

    await db.flush()
    logger.info(
        f"Seeded: {len(ZONES)} zones, {len(RESOURCES)} resources, {len(USERS)} users"
    )
