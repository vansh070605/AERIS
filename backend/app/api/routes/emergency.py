"""
Flood Incident API Routes — report, query, and manage flood incidents.
"""

import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.database import get_db
from app.models.emergency import FloodIncident
from app.models.flood_zone import FloodZone
from app.services.ml_service import ml_service
from app.schemas import (
    FloodIncidentCreate, CrowdFloodReport,
    FloodIncidentResponse, FloodIncidentListResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/flood", tags=["Flood Incidents"])


def _find_zone_id(lat: float, lon: float, zones) -> Optional[int]:
    """Find nearest zone for a coordinate."""
    best_id = None
    best_dist = float("inf")
    for z in zones:
        d = (z.center_latitude - lat) ** 2 + (z.center_longitude - lon) ** 2
        if d < best_dist:
            best_dist = d
            best_id = z.id
    return best_id


@router.post("/report", response_model=FloodIncidentResponse)
async def report_flood_incident(
    data: FloodIncidentCreate,
    db: AsyncSession = Depends(get_db),
):
    """Report a new flood incident with ML severity prediction."""
    # Find zone
    zones_result = await db.execute(select(FloodZone))
    zones = zones_result.scalars().all()
    zone_id = _find_zone_id(data.latitude, data.longitude, zones)

    # Get zone data for ML
    zone = next((z for z in zones if z.id == zone_id), None)
    elevation = zone.elevation_m if zone else 6.0
    drainage_cap = zone.drainage_capacity_m3s if zone else 50.0
    prox_water = zone.proximity_to_river_km if zone else 3.0
    pop_density = (zone.population_density or 20000) / 1000 if zone else 20.0
    hist_freq = zone.historical_flood_frequency if zone else 3.0

    # Drainage ratio
    drainage_ratio_map = {
        "functional": 0.8, "partial": 0.5, "overwhelmed": 0.2, "collapsed": 0.05
    }
    drainage_ratio = drainage_ratio_map.get(data.drainage_status.value, 0.5)

    now = datetime.utcnow()

    # ML prediction
    try:
        ml_result = ml_service.predict(
            rainfall_intensity_mmph=data.rainfall_intensity_mmph,
            cumulative_rainfall_24h_mm=data.rainfall_intensity_mmph * 6,
            elevation_m=elevation,
            drainage_capacity_ratio=drainage_ratio,
            soil_saturation_index=0.7,
            proximity_to_waterbody_km=prox_water or 3.0,
            population_density_k=pop_density,
            hour_of_day=now.hour,
            month=now.month,
            historical_flood_freq=hist_freq or 3.0,
            current_water_level_m=data.water_level_m,
            rate_of_rise_m_per_hr=0.3,
            flood_type=data.flood_type.value,
            drainage_status=data.drainage_status.value,
        )
    except Exception as e:
        logger.error(f"ML prediction failed: {e}")
        ml_result = {
            "severity": "moderate", "confidence": 0.5,
            "inundation_risk_score": 0.5,
            "predicted_water_level_1h": data.water_level_m,
            "predicted_water_level_6h": data.water_level_m,
            "risk_hotspot_score": 0.5,
            "shap_values": {},
        }

    incident = FloodIncident(
        latitude=data.latitude,
        longitude=data.longitude,
        address=data.address,
        zone_id=zone_id,
        flood_type=data.flood_type.value,
        water_level_m=data.water_level_m,
        rainfall_intensity_mmph=data.rainfall_intensity_mmph,
        drainage_status=data.drainage_status.value,
        people_stranded=data.people_stranded,
        people_affected=data.people_affected,
        structures_affected=data.structures_affected,
        is_road_blocked=data.is_road_blocked,
        description=data.description,
        predicted_severity=ml_result["severity"],
        severity_confidence=ml_result["confidence"],
        inundation_risk_score=ml_result.get("inundation_risk_score"),
        predicted_water_level_1h=ml_result.get("predicted_water_level_1h"),
        predicted_water_level_6h=ml_result.get("predicted_water_level_6h"),
        risk_hotspot_score=ml_result.get("risk_hotspot_score"),
        shap_values=ml_result.get("shap_values"),
        status="pending",
        reporter_name=data.reporter_name,
        reporter_phone=data.reporter_phone,
        is_crowd_sourced=False,
    )
    db.add(incident)
    await db.flush()

    return incident


@router.post("/crowd-report", response_model=FloodIncidentResponse)
async def crowd_flood_report(
    data: CrowdFloodReport,
    db: AsyncSession = Depends(get_db),
):
    """Citizen-reported flood observation."""
    zones_result = await db.execute(select(FloodZone))
    zones = zones_result.scalars().all()
    zone_id = _find_zone_id(data.latitude, data.longitude, zones)

    incident = FloodIncident(
        latitude=data.latitude,
        longitude=data.longitude,
        zone_id=zone_id,
        flood_type="pluvial",
        water_level_m=data.water_level_m,
        is_road_blocked=data.is_road_blocked,
        description=data.description,
        people_stranded=0,
        people_affected=1,
        status="pending",
        reporter_name=data.reporter_name,
        reporter_phone=data.reporter_phone,
        is_crowd_sourced=True,
        predicted_severity="moderate",
    )
    db.add(incident)
    await db.flush()
    return incident


@router.get("/{incident_id}", response_model=FloodIncidentResponse)
async def get_flood_incident(
    incident_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(FloodIncident).where(FloodIncident.id == incident_id))
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Flood incident not found")
    return incident


@router.get("s", response_model=FloodIncidentListResponse)
async def list_flood_incidents(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    zone_id: Optional[int] = None,
    flood_type: Optional[str] = None,
    min_water_level: Optional[float] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(FloodIncident)

    if severity:
        query = query.where(FloodIncident.predicted_severity == severity)
    if status:
        query = query.where(FloodIncident.status == status)
    if zone_id:
        query = query.where(FloodIncident.zone_id == zone_id)
    if flood_type:
        query = query.where(FloodIncident.flood_type == flood_type)
    if min_water_level:
        query = query.where(FloodIncident.water_level_m >= min_water_level)

    total_q = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = total_q.scalar() or 0

    query = query.order_by(FloodIncident.reported_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }
