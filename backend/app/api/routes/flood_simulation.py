"""
Flood Simulation API Routes
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.flood_zone import FloodZone
from app.services.flood_simulation_service import flood_simulation_service
from app.services.routing_service import routing_service
from app.schemas import FloodSimulationRequest

router = APIRouter(prefix="/simulation", tags=["Flood Simulation"])


@router.post("/start")
async def start_simulation(
    params: FloodSimulationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Start a flood simulation with specified rainfall parameters."""
    # Load zones
    zones_result = await db.execute(select(FloodZone))
    zones = zones_result.scalars().all()

    zone_dicts = [
        {
            "id": z.id,
            "name": z.name,
            "elevation_m": z.elevation_m,
            "drainage_capacity_m3s": z.drainage_capacity_m3s,
            "area_km2": z.area_km2,
            "population": z.population,
            "center_latitude": z.center_latitude,
            "center_longitude": z.center_longitude,
        }
        for z in zones
    ]

    flood_simulation_service.initialize_zones(zone_dicts)
    result = flood_simulation_service.run_full_simulation(
        scenario=params.scenario,
        duration_hours=params.duration_hours,
    )

    # Update routing service with flood conditions
    flood_data = flood_simulation_service.get_flood_data_for_routing()
    routing_service.update_flood_conditions(flood_data)

    return result


@router.get("/status")
async def get_simulation_status():
    """Get current simulation state."""
    return flood_simulation_service.get_current_status()


@router.get("/road-blocks")
async def get_road_blocks():
    """Get currently blocked roads from simulation."""
    return {"road_blocks": flood_simulation_service.get_road_blocks()}


@router.get("/water-levels")
async def get_water_levels():
    """Get current water levels per zone from simulation."""
    status = flood_simulation_service.get_current_status()
    return {"water_levels": status.get("water_levels", [])}


@router.post("/reset")
async def reset_simulation():
    """Reset flood conditions."""
    routing_service.reset_flood_conditions()
    return {"message": "Flood conditions reset"}
