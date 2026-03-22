"""
Seed data — Chennai flood-prone zones, shelters, and rescue resources.
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.resource import Resource
from app.models.flood_zone import FloodZone
from app.models.shelter import Shelter
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

# ── Chennai Flood Zones (with hydrology data) ──────────────────────────────
ZONES = [
    {"name": "Velachery",      "code": "VLR", "center_latitude": 12.9815, "center_longitude": 80.2180, "population": 550000, "area_km2": 28.0, "elevation_m": 3.5, "drainage_capacity_m3s": 30.0, "soil_permeability": 0.2, "proximity_to_coast_km": 8.0, "proximity_to_river_km": 1.5, "historical_flood_frequency": 7.0, "flood_risk_score": 0.85, "total_resources": 5, "shelter_capacity": 800, "underserved_score": 0.70},
    {"name": "Tambaram",       "code": "TMB", "center_latitude": 12.9249, "center_longitude": 80.1278, "population": 420000, "area_km2": 42.0, "elevation_m": 4.0, "drainage_capacity_m3s": 35.0, "soil_permeability": 0.25, "proximity_to_coast_km": 15.0, "proximity_to_river_km": 2.0, "historical_flood_frequency": 6.0, "flood_risk_score": 0.78, "total_resources": 4, "shelter_capacity": 600, "underserved_score": 0.68},
    {"name": "Adyar",          "code": "ADR", "center_latitude": 13.0012, "center_longitude": 80.2565, "population": 380000, "area_km2": 20.0, "elevation_m": 3.0, "drainage_capacity_m3s": 25.0, "soil_permeability": 0.15, "proximity_to_coast_km": 3.0, "proximity_to_river_km": 0.5, "historical_flood_frequency": 8.0, "flood_risk_score": 0.92, "total_resources": 7, "shelter_capacity": 500, "underserved_score": 0.48},
    {"name": "Royapuram",      "code": "RPM", "center_latitude": 13.1130, "center_longitude": 80.2940, "population": 539900, "area_km2": 26.0, "elevation_m": 4.5, "drainage_capacity_m3s": 40.0, "soil_permeability": 0.2, "proximity_to_coast_km": 1.0, "proximity_to_river_km": 3.0, "historical_flood_frequency": 5.0, "flood_risk_score": 0.72, "total_resources": 6, "shelter_capacity": 700, "underserved_score": 0.55},
    {"name": "Tondiarpet",     "code": "TDP", "center_latitude": 13.1275, "center_longitude": 80.2830, "population": 607000, "area_km2": 23.0, "elevation_m": 5.0, "drainage_capacity_m3s": 38.0, "soil_permeability": 0.2, "proximity_to_coast_km": 2.0, "proximity_to_river_km": 2.5, "historical_flood_frequency": 4.0, "flood_risk_score": 0.65, "total_resources": 5, "shelter_capacity": 600, "underserved_score": 0.62},
    {"name": "T. Nagar",       "code": "TNG", "center_latitude": 13.0418, "center_longitude": 80.2341, "population": 530000, "area_km2": 15.5, "elevation_m": 8.0, "drainage_capacity_m3s": 55.0, "soil_permeability": 0.1, "proximity_to_coast_km": 7.0, "proximity_to_river_km": 3.0, "historical_flood_frequency": 3.0, "flood_risk_score": 0.45, "total_resources": 9, "shelter_capacity": 400},
    {"name": "Anna Nagar",     "code": "ANG", "center_latitude": 13.0850, "center_longitude": 80.2100, "population": 465000, "area_km2": 22.0, "elevation_m": 10.0, "drainage_capacity_m3s": 60.0, "soil_permeability": 0.3, "proximity_to_coast_km": 10.0, "proximity_to_river_km": 4.0, "historical_flood_frequency": 2.0, "flood_risk_score": 0.35, "total_resources": 8, "shelter_capacity": 500},
    {"name": "Mylapore",       "code": "MYP", "center_latitude": 13.0368, "center_longitude": 80.2676, "population": 420000, "area_km2": 12.0, "elevation_m": 5.5, "drainage_capacity_m3s": 35.0, "soil_permeability": 0.15, "proximity_to_coast_km": 4.0, "proximity_to_river_km": 2.0, "historical_flood_frequency": 4.0, "flood_risk_score": 0.58, "total_resources": 8, "shelter_capacity": 350},
    {"name": "Egmore",         "code": "EGM", "center_latitude": 13.0732, "center_longitude": 80.2609, "population": 310000, "area_km2": 10.0, "elevation_m": 9.0, "drainage_capacity_m3s": 50.0, "soil_permeability": 0.2, "proximity_to_coast_km": 8.0, "proximity_to_river_km": 3.5, "historical_flood_frequency": 2.0, "flood_risk_score": 0.30, "total_resources": 10, "shelter_capacity": 400},
    {"name": "Sholinganallur", "code": "SGL", "center_latitude": 12.9010, "center_longitude": 80.2279, "population": 350000, "area_km2": 35.0, "elevation_m": 4.0, "drainage_capacity_m3s": 28.0, "soil_permeability": 0.2, "proximity_to_coast_km": 5.0, "proximity_to_river_km": 3.0, "historical_flood_frequency": 5.0, "flood_risk_score": 0.70, "total_resources": 6, "shelter_capacity": 500, "underserved_score": 0.45},
    {"name": "Ambattur",       "code": "AMB", "center_latitude": 13.1143, "center_longitude": 80.1548, "population": 480000, "area_km2": 45.0, "elevation_m": 12.0, "drainage_capacity_m3s": 65.0, "soil_permeability": 0.35, "proximity_to_coast_km": 15.0, "proximity_to_river_km": 5.0, "historical_flood_frequency": 2.0, "flood_risk_score": 0.25, "total_resources": 5, "shelter_capacity": 400, "underserved_score": 0.50},
    {"name": "Avadi",          "code": "AVD", "center_latitude": 13.1145, "center_longitude": 80.1010, "population": 345000, "area_km2": 65.0, "elevation_m": 15.0, "drainage_capacity_m3s": 70.0, "soil_permeability": 0.4, "proximity_to_coast_km": 20.0, "proximity_to_river_km": 6.0, "historical_flood_frequency": 1.0, "flood_risk_score": 0.15, "total_resources": 4, "shelter_capacity": 300, "underserved_score": 0.72},
    {"name": "Mudichur",       "code": "MDC", "center_latitude": 12.9050, "center_longitude": 80.0680, "population": 180000, "area_km2": 30.0, "elevation_m": 3.0, "drainage_capacity_m3s": 20.0, "soil_permeability": 0.15, "proximity_to_coast_km": 25.0, "proximity_to_river_km": 1.0, "historical_flood_frequency": 8.0, "flood_risk_score": 0.88, "total_resources": 3, "shelter_capacity": 300, "underserved_score": 0.80},
    {"name": "Perungudi",      "code": "PGD", "center_latitude": 12.9630, "center_longitude": 80.2420, "population": 280000, "area_km2": 18.0, "elevation_m": 3.5, "drainage_capacity_m3s": 22.0, "soil_permeability": 0.15, "proximity_to_coast_km": 6.0, "proximity_to_river_km": 2.0, "historical_flood_frequency": 7.0, "flood_risk_score": 0.82, "total_resources": 4, "shelter_capacity": 350, "underserved_score": 0.65},
    {"name": "Palavakkam",     "code": "PLK", "center_latitude": 12.9540, "center_longitude": 80.2570, "population": 150000, "area_km2": 10.0, "elevation_m": 2.5, "drainage_capacity_m3s": 15.0, "soil_permeability": 0.1, "proximity_to_coast_km": 0.5, "proximity_to_river_km": 5.0, "historical_flood_frequency": 6.0, "flood_risk_score": 0.80, "total_resources": 3, "shelter_capacity": 200, "underserved_score": 0.75},
]

# ── Flood Rescue Resources ──────────────────────────────────────────────────
RESOURCES = [
    # Rescue Boats
    {"name": "NDRF Inflatable Boat Alpha", "resource_type": "rescue_boat", "latitude": 13.0700, "longitude": 80.2500, "base_station": "NDRF Camp Egmore", "vehicle_id": "RB-EGM-001", "can_operate_in_water": True, "max_water_depth_m": 999, "passenger_capacity": 12},
    {"name": "SDRF Rescue Boat Tambaram", "resource_type": "rescue_boat", "latitude": 12.9400, "longitude": 80.1350, "base_station": "SDRF Tambaram Base", "vehicle_id": "RB-TMB-001", "can_operate_in_water": True, "max_water_depth_m": 999, "passenger_capacity": 10},
    {"name": "Navy Rescue Boat Marina", "resource_type": "rescue_boat", "latitude": 13.0500, "longitude": 80.2850, "base_station": "INS Adyar Naval Base", "vehicle_id": "RB-MYP-001", "can_operate_in_water": True, "max_water_depth_m": 999, "passenger_capacity": 15},
    {"name": "Fire Dept Rescue Boat Velachery", "resource_type": "rescue_boat", "latitude": 12.9830, "longitude": 80.2200, "base_station": "Velachery Fire Station", "vehicle_id": "RB-VLR-001", "can_operate_in_water": True, "max_water_depth_m": 999, "passenger_capacity": 8},
    {"name": "NDRF Boat Adyar", "resource_type": "rescue_boat", "latitude": 13.0020, "longitude": 80.2560, "base_station": "Adyar NDRF Sub-station", "vehicle_id": "RB-ADR-001", "can_operate_in_water": True, "max_water_depth_m": 999, "passenger_capacity": 10},

    # Motorized Rafts
    {"name": "Motorized Raft Mudichur", "resource_type": "motorized_raft", "latitude": 12.9050, "longitude": 80.0700, "base_station": "Mudichur Relief Hub", "vehicle_id": "MR-MDC-001", "can_operate_in_water": True, "max_water_depth_m": 999, "passenger_capacity": 6},
    {"name": "Motorized Raft Perungudi", "resource_type": "motorized_raft", "latitude": 12.9630, "longitude": 80.2420, "base_station": "Perungudi Fire Station", "vehicle_id": "MR-PGD-001", "can_operate_in_water": True, "max_water_depth_m": 999, "passenger_capacity": 6},

    # Ambulances
    {"name": "Rajiv Gandhi GH Ambulance", "resource_type": "ambulance", "latitude": 13.0604, "longitude": 80.2780, "base_station": "Rajiv Gandhi Government General Hospital", "vehicle_id": "AMB-EGM-001", "can_operate_in_water": False, "max_water_depth_m": 0.4, "passenger_capacity": 4},
    {"name": "Apollo Chennai Ambulance", "resource_type": "ambulance", "latitude": 13.0067, "longitude": 80.2206, "base_station": "Apollo Hospitals Greams Road", "vehicle_id": "AMB-TNG-001", "can_operate_in_water": False, "max_water_depth_m": 0.4, "passenger_capacity": 4},
    {"name": "108 Emergency Ambulance OMR", "resource_type": "ambulance", "latitude": 12.9100, "longitude": 80.2300, "base_station": "OMR 108 Base", "vehicle_id": "AMB-SGL-001", "can_operate_in_water": False, "max_water_depth_m": 0.4, "passenger_capacity": 4},
    {"name": "Stanley Hospital Ambulance", "resource_type": "ambulance", "latitude": 13.1145, "longitude": 80.2890, "base_station": "Stanley Medical College Hospital", "vehicle_id": "AMB-RPM-001", "can_operate_in_water": False, "max_water_depth_m": 0.4, "passenger_capacity": 4},

    # Relief Trucks
    {"name": "GCC Relief Truck Anna Nagar", "resource_type": "relief_truck", "latitude": 13.0860, "longitude": 80.2130, "base_station": "GCC Zone Depot Anna Nagar", "vehicle_id": "RT-ANG-001", "can_operate_in_water": False, "max_water_depth_m": 0.5, "passenger_capacity": 20},
    {"name": "GCC Relief Truck Tambaram", "resource_type": "relief_truck", "latitude": 12.9260, "longitude": 80.1290, "base_station": "GCC Tambaram Depot", "vehicle_id": "RT-TMB-001", "can_operate_in_water": False, "max_water_depth_m": 0.5, "passenger_capacity": 20},
    {"name": "Red Cross Relief Truck", "resource_type": "relief_truck", "latitude": 13.0400, "longitude": 80.2480, "base_station": "Red Cross Chennai Chapter", "vehicle_id": "RT-TNG-001", "can_operate_in_water": False, "max_water_depth_m": 0.5, "passenger_capacity": 15},

    # Pump Units
    {"name": "GCC Dewatering Pump Velachery", "resource_type": "pump_unit", "latitude": 12.9830, "longitude": 80.2190, "base_station": "GCC Pump Station Velachery", "vehicle_id": "PU-VLR-001", "can_operate_in_water": False, "max_water_depth_m": 0.3, "passenger_capacity": 0},
    {"name": "GCC Dewatering Pump Adyar", "resource_type": "pump_unit", "latitude": 13.0030, "longitude": 80.2550, "base_station": "GCC Pump Station Adyar", "vehicle_id": "PU-ADR-001", "can_operate_in_water": False, "max_water_depth_m": 0.3, "passenger_capacity": 0},
    {"name": "GCC Pump Mudichur", "resource_type": "pump_unit", "latitude": 12.9060, "longitude": 80.0700, "base_station": "GCC Pump Mudichur", "vehicle_id": "PU-MDC-001", "can_operate_in_water": False, "max_water_depth_m": 0.3, "passenger_capacity": 0},

    # Rescue Teams
    {"name": "NDRF Chennai Alpha Team", "resource_type": "rescue_team", "latitude": 13.0700, "longitude": 80.2500, "base_station": "NDRF Camp Egmore", "vehicle_id": "RSC-EGM-001", "can_operate_in_water": True, "max_water_depth_m": 1.5, "passenger_capacity": 0},
    {"name": "SDMA Chennai Rescue", "resource_type": "rescue_team", "latitude": 12.9400, "longitude": 80.1350, "base_station": "SDMA Tambaram Base", "vehicle_id": "RSC-TMB-001", "can_operate_in_water": True, "max_water_depth_m": 1.5, "passenger_capacity": 0},
    {"name": "Coast Guard Rescue", "resource_type": "rescue_team", "latitude": 13.1050, "longitude": 80.2950, "base_station": "Indian Coast Guard Station Chennai", "vehicle_id": "RSC-RPM-001", "can_operate_in_water": True, "max_water_depth_m": 2.0, "passenger_capacity": 0},
    {"name": "Civil Defence Velachery", "resource_type": "rescue_team", "latitude": 12.9810, "longitude": 80.2170, "base_station": "Civil Defence Velachery Unit", "vehicle_id": "RSC-VLR-001", "can_operate_in_water": True, "max_water_depth_m": 1.0, "passenger_capacity": 0},
]

# ── Flood Shelters (schools, community halls) ───────────────────────────────
SHELTERS = [
    {"name": "Govt Higher Secondary School, Velachery", "latitude": 12.9790, "longitude": 80.2200, "zone_code": "VLR", "total_capacity": 500, "elevation_m": 5.0, "has_medical_facility": True, "has_food_supply": True, "has_power_backup": True},
    {"name": "Corporation Community Hall, Tambaram", "latitude": 12.9260, "longitude": 80.1300, "zone_code": "TMB", "total_capacity": 400, "elevation_m": 6.0, "has_medical_facility": False, "has_food_supply": True, "has_power_backup": False},
    {"name": "IIT Madras Campus Shelter", "latitude": 12.9916, "longitude": 80.2336, "zone_code": "ADR", "total_capacity": 800, "elevation_m": 12.0, "has_medical_facility": True, "has_food_supply": True, "has_power_backup": True},
    {"name": "Anna University Convention Centre", "latitude": 13.0107, "longitude": 80.2350, "zone_code": "ADR", "total_capacity": 600, "elevation_m": 10.0, "has_medical_facility": False, "has_food_supply": True, "has_power_backup": True},
    {"name": "Pachaiyappa's College Hall", "latitude": 13.0780, "longitude": 80.2590, "zone_code": "EGM", "total_capacity": 350, "elevation_m": 9.0, "has_medical_facility": False, "has_food_supply": True, "has_power_backup": False},
    {"name": "Hindu College Multipurpose Hall", "latitude": 13.1280, "longitude": 80.2810, "zone_code": "TDP", "total_capacity": 300, "elevation_m": 6.0, "has_medical_facility": False, "has_food_supply": True, "has_power_backup": False},
    {"name": "GCC Relief Camp Mudichur", "latitude": 12.9070, "longitude": 80.0720, "zone_code": "MDC", "total_capacity": 250, "elevation_m": 5.0, "has_medical_facility": True, "has_food_supply": True, "has_power_backup": False},
    {"name": "Perungudi Corporation School", "latitude": 12.9620, "longitude": 80.2400, "zone_code": "PGD", "total_capacity": 300, "elevation_m": 5.5, "has_medical_facility": False, "has_food_supply": True, "has_power_backup": False},
    {"name": "Palavakkam Community Centre", "latitude": 12.9550, "longitude": 80.2560, "zone_code": "PLK", "total_capacity": 200, "elevation_m": 4.0, "has_medical_facility": False, "has_food_supply": True, "has_power_backup": False},
    {"name": "Anna Nagar Tower Park Shelter", "latitude": 13.0870, "longitude": 80.2120, "zone_code": "ANG", "total_capacity": 400, "elevation_m": 11.0, "has_medical_facility": True, "has_food_supply": True, "has_power_backup": True},
    {"name": "Sholinganallur Govt School", "latitude": 12.9020, "longitude": 80.2260, "zone_code": "SGL", "total_capacity": 350, "elevation_m": 5.0, "has_medical_facility": False, "has_food_supply": True, "has_power_backup": False},
]

USERS = [
    {"username": "admin",       "email": "admin@aeris.gov.in",       "full_name": "System Administrator", "role": "admin",      "password": "Admin@AEIRAS2024"},
    {"username": "dispatcher1", "email": "dispatcher1@aeris.gov.in", "full_name": "Senior Dispatcher",    "role": "dispatcher", "password": "Dispatch@123"},
    {"username": "dispatcher2", "email": "dispatcher2@aeris.gov.in", "full_name": "Flood Ops Dispatcher", "role": "dispatcher", "password": "Dispatch@456"},
    {"username": "viewer1",     "email": "viewer1@aeris.gov.in",     "full_name": "Monitoring Officer",   "role": "viewer",     "password": "Viewer@123"},
]


async def seed_database(db: AsyncSession):
    existing = await db.execute(select(User).limit(1))
    if existing.scalar_one_or_none():
        logger.info("Database already seeded — skipping")
        return

    logger.info("Seeding database with Chennai flood response data...")

    # Zones
    zone_objs = []
    for z in ZONES:
        zone = FloodZone(
            name=z["name"], code=z["code"],
            center_latitude=z["center_latitude"], center_longitude=z["center_longitude"],
            population=z.get("population", 300000),
            area_km2=z.get("area_km2", 20.0),
            population_density=z.get("population", 300000) / max(z.get("area_km2", 20.0), 1),
            elevation_m=z.get("elevation_m", 5.0),
            drainage_capacity_m3s=z.get("drainage_capacity_m3s", 40.0),
            soil_permeability=z.get("soil_permeability", 0.2),
            proximity_to_coast_km=z.get("proximity_to_coast_km", 10.0),
            proximity_to_river_km=z.get("proximity_to_river_km", 3.0),
            historical_flood_frequency=z.get("historical_flood_frequency", 3.0),
            flood_risk_score=z.get("flood_risk_score", 0.5),
            total_resources=z.get("total_resources", 5),
            shelter_capacity=z.get("shelter_capacity", 300),
            underserved_score=z.get("underserved_score", 0.3),
            equity_score=1.0 - z.get("underserved_score", 0.3),
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
            name=r["name"], resource_type=r["resource_type"],
            latitude=r["latitude"], longitude=r["longitude"],
            base_station=r.get("base_station"), vehicle_id=r["vehicle_id"],
            crew_count=4 if "boat" in r["resource_type"] else 2,
            capacity=1, passenger_capacity=r.get("passenger_capacity", 6),
            can_operate_in_water=r.get("can_operate_in_water", False),
            max_water_depth_m=r.get("max_water_depth_m", 0.5),
            status="available", is_active=True, zone_id=zone_id,
        )
        db.add(resource)

    # Shelters
    for s in SHELTERS:
        zone_id = None
        if s.get("zone_code") and s["zone_code"] in zone_map:
            zone_id = zone_map[s["zone_code"]].id

        shelter = Shelter(
            name=s["name"], latitude=s["latitude"], longitude=s["longitude"],
            zone_id=zone_id, total_capacity=s.get("total_capacity", 300),
            current_occupancy=0, elevation_m=s.get("elevation_m", 6.0),
            has_medical_facility=s.get("has_medical_facility", False),
            has_food_supply=s.get("has_food_supply", True),
            has_water_supply=True,
            has_power_backup=s.get("has_power_backup", False),
            is_active=True,
        )
        db.add(shelter)

    # Users
    for u in USERS:
        user = User(
            username=u["username"], email=u["email"], full_name=u["full_name"],
            role=u["role"], hashed_password=get_password_hash(u["password"]),
            is_active=True,
        )
        db.add(user)

    await db.flush()
    logger.info(f"Seeded: {len(ZONES)} flood zones, {len(RESOURCES)} resources, {len(SHELTERS)} shelters, {len(USERS)} users")
