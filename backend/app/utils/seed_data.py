"""
Seed data for development — Delhi NCR zones and resources.
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

ZONES = [
    {"name": "Central Delhi", "code": "CDL", "center_latitude": 28.6562, "center_longitude": 77.2410, "population": 582320, "area_km2": 24.6, "total_resources": 8, "risk_level": "high"},
    {"name": "North Delhi", "code": "NDL", "center_latitude": 28.7041, "center_longitude": 77.0787, "population": 887978, "area_km2": 60.1, "total_resources": 6, "risk_level": "medium"},
    {"name": "South Delhi", "code": "SDL", "center_latitude": 28.5244, "center_longitude": 77.2066, "population": 2731929, "area_km2": 250.0, "total_resources": 10, "risk_level": "medium"},
    {"name": "East Delhi", "code": "EDL", "center_latitude": 28.6602, "center_longitude": 77.3120, "population": 1709346, "area_km2": 64.0, "total_resources": 5, "risk_level": "high", "underserved_score": 0.65},
    {"name": "West Delhi", "code": "WDL", "center_latitude": 28.6542, "center_longitude": 77.0955, "population": 2543243, "area_km2": 129.0, "total_resources": 7, "risk_level": "medium"},
    {"name": "Gurgaon", "code": "GGN", "center_latitude": 28.4595, "center_longitude": 77.0266, "population": 1514432, "area_km2": 739.0, "total_resources": 9, "risk_level": "low"},
    {"name": "Noida", "code": "NDA", "center_latitude": 28.5355, "center_longitude": 77.3910, "population": 642381, "area_km2": 205.0, "total_resources": 7, "risk_level": "low"},
    {"name": "Faridabad", "code": "FBD", "center_latitude": 28.4089, "center_longitude": 77.3178, "population": 1404653, "area_km2": 742.0, "total_resources": 4, "risk_level": "high", "underserved_score": 0.72},
]

RESOURCES = [
    # Ambulances
    {"name": "AIIMS Ambulance 1", "resource_type": "ambulance", "latitude": 28.5672, "longitude": 77.2100, "base_station": "AIIMS Hospital", "vehicle_id": "AMB-CDL-001"},
    {"name": "Ram Manohar Lohia Ambulance", "resource_type": "ambulance", "latitude": 28.6356, "longitude": 77.2058, "base_station": "RML Hospital", "vehicle_id": "AMB-CDL-002"},
    {"name": "Safdarjung Ambulance", "resource_type": "ambulance", "latitude": 28.5688, "longitude": 77.2033, "base_station": "Safdarjung Hospital", "vehicle_id": "AMB-SDL-001"},
    {"name": "GTB Ambulance", "resource_type": "ambulance", "latitude": 28.6850, "longitude": 77.3046, "base_station": "GTB Hospital", "vehicle_id": "AMB-EDL-001"},
    {"name": "Fortis Gurgaon Ambulance", "resource_type": "ambulance", "latitude": 28.4425, "longitude": 77.0280, "base_station": "Fortis Gurgaon", "vehicle_id": "AMB-GGN-001"},
    {"name": "Apollo Noida Ambulance", "resource_type": "ambulance", "latitude": 28.5454, "longitude": 77.3886, "base_station": "Apollo Noida", "vehicle_id": "AMB-NDA-001"},
    # Fire trucks
    {"name": "Connaught Place Fire Station", "resource_type": "fire_truck", "latitude": 28.6315, "longitude": 77.2167, "base_station": "CP Fire Station", "vehicle_id": "FTK-CDL-001"},
    {"name": "Rohini Fire Station", "resource_type": "fire_truck", "latitude": 28.7370, "longitude": 77.0677, "base_station": "Rohini Fire Station", "vehicle_id": "FTK-NDL-001"},
    {"name": "Lajpat Nagar Fire Station", "resource_type": "fire_truck", "latitude": 28.5677, "longitude": 77.2430, "base_station": "Lajpat Nagar FS", "vehicle_id": "FTK-SDL-001"},
    {"name": "Gurgaon Fire Station", "resource_type": "fire_truck", "latitude": 28.4636, "longitude": 77.0308, "base_station": "Sector 14 Fire Station Gurgaon", "vehicle_id": "FTK-GGN-001"},
    # Police units
    {"name": "Delhi Police PCR 1", "resource_type": "police_unit", "latitude": 28.6508, "longitude": 77.2345, "base_station": "HQ Police Station", "vehicle_id": "PCR-CDL-001"},
    {"name": "Noida Police PCR", "resource_type": "police_unit", "latitude": 28.5355, "longitude": 77.3968, "base_station": "Sector 24 Police Station", "vehicle_id": "PCR-NDA-001"},
    {"name": "Gurgaon Police PCR", "resource_type": "police_unit", "latitude": 28.4595, "longitude": 77.0200, "base_station": "DLF Police Station", "vehicle_id": "PCR-GGN-001"},
    # Rescue teams
    {"name": "NDRF Rescue Team Alpha", "resource_type": "rescue_team", "latitude": 28.6529, "longitude": 77.2090, "base_station": "NDRF Camp Delhi", "vehicle_id": "RSC-CDL-001"},
    {"name": "SDMA Rescue Team", "resource_type": "rescue_team", "latitude": 28.6800, "longitude": 77.0800, "base_station": "SDMA Rohini Base", "vehicle_id": "RSC-NDL-001"},
    # Hazmat
    {"name": "Delhi Hazmat Unit", "resource_type": "hazmat_unit", "latitude": 28.6300, "longitude": 77.2190, "base_station": "Industrial Area Base", "vehicle_id": "HZM-CDL-001"},
]

USERS = [
    {"username": "admin", "email": "admin@aeiras.gov.in", "full_name": "System Administrator", "role": "admin", "password": "Admin@AEIRAS2024"},
    {"username": "dispatcher1", "email": "dispatcher1@aeiras.gov.in", "full_name": "Senior Dispatcher", "role": "dispatcher", "password": "Dispatch@123"},
    {"username": "dispatcher2", "email": "dispatcher2@aeiras.gov.in", "full_name": "Night Shift Dispatcher", "role": "dispatcher", "password": "Dispatch@456"},
    {"username": "viewer1", "email": "viewer1@aeiras.gov.in", "full_name": "Monitoring Officer", "role": "viewer", "password": "Viewer@123"},
]


async def seed_database(db: AsyncSession):
    # Check if already seeded
    existing_user = await db.execute(select(User).limit(1))
    if existing_user.scalar_one_or_none():
        logger.info("Database already seeded — skipping")
        return

    logger.info("Seeding database with initial data...")

    # Zones
    zone_objs = []
    for z in ZONES:
        zone = Zone(
            name=z["name"],
            code=z["code"],
            center_latitude=z["center_latitude"],
            center_longitude=z["center_longitude"],
            population=z.get("population", 500000),
            area_km2=z.get("area_km2", 100.0),
            total_resources=z.get("total_resources", 5),
            risk_level=z.get("risk_level", "medium"),
            underserved_score=z.get("underserved_score", 0.2),
            equity_score=1.0 - z.get("underserved_score", 0.2),
        )
        db.add(zone)
        zone_objs.append(zone)

    await db.flush()
    zone_map = {z.code: z for z in zone_objs}

    code_to_prefix = {"CDL": "CDL", "NDL": "NDL", "SDL": "SDL", "EDL": "EDL",
                      "WDL": "WDL", "GGN": "GGN", "NDA": "NDA", "FBD": "FBD"}

    # Resources
    for r in RESOURCES:
        # Assign zone by vehicle ID prefix
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
