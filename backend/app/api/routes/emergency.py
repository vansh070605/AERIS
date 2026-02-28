"""
Emergency API Routes — SQLite compatible.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
import logging

from app.database import get_db
from app.models.emergency import Emergency
from app.schemas import (
    EmergencyCreate, EmergencyResponse, EmergencyListResponse,
    CrowdSourcedReport, MLPredictionResult
)
from app.services.ml_service import ml_service
from app.websocket_manager import ws_manager
from app.core.security import get_current_user, require_viewer

router = APIRouter(prefix="/emergency", tags=["Emergency"])
logger = logging.getLogger(__name__)


@router.post("/report", response_model=EmergencyResponse, status_code=status.HTTP_201_CREATED)
async def report_emergency(
    payload: EmergencyCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_viewer),
):
    now = datetime.utcnow()

    # ML Prediction
    ml_result = ml_service.predict(
        emergency_type=payload.emergency_type.value,
        injury_level=payload.injury_level,
        people_affected=payload.people_affected,
        hazard_level=payload.hazard_level,
        hour_of_day=now.hour,
        day_of_week=now.weekday(),
    )

    emergency = Emergency(
        emergency_type=payload.emergency_type.value,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address=payload.address,
        injury_level=payload.injury_level,
        people_affected=payload.people_affected,
        hazard_level=payload.hazard_level,
        description=payload.description,
        reporter_name=payload.reporter_name,
        reporter_phone=payload.reporter_phone,
        predicted_severity=ml_result["severity"],
        severity_confidence=ml_result["confidence"],
        shap_values=ml_result["shap_values"],
        is_crowd_sourced=0,
        status="pending",
        reported_at=now,
    )

    db.add(emergency)
    await db.flush()

    logger.info(f"Emergency {emergency.id}: {payload.emergency_type} | {ml_result['severity']} ({ml_result['confidence']:.2%})")

    response_data = {
        "id": emergency.id,
        "emergency_type": emergency.emergency_type,
        "latitude": emergency.latitude,
        "longitude": emergency.longitude,
        "address": emergency.address,
        "injury_level": emergency.injury_level,
        "people_affected": emergency.people_affected,
        "hazard_level": emergency.hazard_level,
        "description": emergency.description,
        "predicted_severity": emergency.predicted_severity,
        "severity_confidence": emergency.severity_confidence,
        "shap_values": emergency.shap_values,
        "status": emergency.status,
        "reporter_name": emergency.reporter_name,
        "reporter_phone": emergency.reporter_phone,
        "is_crowd_sourced": emergency.is_crowd_sourced,
        "zone_id": emergency.zone_id,
        "reported_at": emergency.reported_at,
        "dispatched_at": None,
        "resolved_at": None,
        "ml_prediction": MLPredictionResult(**ml_result),
    }

    background_tasks.add_task(
        ws_manager.broadcast_emergency,
        {
            "id": emergency.id,
            "type": payload.emergency_type.value,
            "severity": ml_result["severity"],
            "lat": payload.latitude,
            "lon": payload.longitude,
            "status": "pending",
        },
        "new_emergency"
    )

    return EmergencyResponse(**response_data)


@router.get("/{emergency_id}", response_model=EmergencyResponse)
async def get_emergency(
    emergency_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_viewer),
):
    result = await db.execute(select(Emergency).where(Emergency.id == emergency_id))
    emergency = result.scalar_one_or_none()
    if not emergency:
        raise HTTPException(status_code=404, detail=f"Emergency {emergency_id} not found")
    return EmergencyResponse.model_validate(emergency)


@router.get("s", response_model=EmergencyListResponse)
async def list_emergencies(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: str = Query(default=None),
    emergency_type: str = Query(default=None),
    severity: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_viewer),
):
    query = select(Emergency).order_by(Emergency.reported_at.desc())
    if status:
        query = query.where(Emergency.status == status)
    if emergency_type:
        query = query.where(Emergency.emergency_type == emergency_type)
    if severity:
        query = query.where(Emergency.predicted_severity == severity)

    total_result = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_result.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    emergencies = result.scalars().all()

    return EmergencyListResponse(
        items=[EmergencyResponse.model_validate(e) for e in emergencies],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/crowd-report", status_code=status.HTTP_202_ACCEPTED)
async def crowd_sourced_report(
    payload: CrowdSourcedReport,
    db: AsyncSession = Depends(get_db),
):
    emergency = Emergency(
        emergency_type=payload.emergency_type.value,
        latitude=payload.latitude,
        longitude=payload.longitude,
        description=payload.description,
        reporter_name=payload.reporter_name,
        reporter_phone=payload.reporter_phone,
        people_affected=payload.people_affected,
        is_crowd_sourced=1,
        status="pending",
        reported_at=datetime.utcnow(),
    )
    db.add(emergency)
    await db.flush()

    return {
        "message": "Report accepted for review",
        "report_id": emergency.id,
        "status": "queued",
    }


@router.patch("/{emergency_id}/status")
async def update_emergency_status(
    emergency_id: int,
    new_status: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_viewer),
):
    result = await db.execute(select(Emergency).where(Emergency.id == emergency_id))
    emergency = result.scalar_one_or_none()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")

    valid_statuses = ["pending", "dispatched", "in_progress", "resolved", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")

    emergency.status = new_status
    await db.flush()
    return {"emergency_id": emergency_id, "new_status": new_status}
