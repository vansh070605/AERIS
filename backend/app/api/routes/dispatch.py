"""
Flood Dispatch API Routes
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func

from app.database import get_db
from app.services.dispatch_service import dispatch_service
from app.services.resource_allocation_service import resource_allocation_service
from app.models.emergency import FloodIncident
from app.models.resource import Resource
from app.schemas import DispatchRequest, DispatchResponse

router = APIRouter(prefix="/dispatch", tags=["Flood Dispatch"])


@router.post("", response_model=DispatchResponse)
async def dispatch_resource(
    data: DispatchRequest,
    db: AsyncSession = Depends(get_db),
):
    """Dispatch a resource to a flood incident using flood-aware routing."""
    try:
        result = await dispatch_service.auto_dispatch(
            incident_id=data.incident_id,
            db=db,
            algorithm=data.algorithm,
            dispatch_type=data.dispatch_type.value if data.dispatch_type else "rescue",
            shelter_id=data.shelter_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/optimal")
async def optimal_dispatch(db: AsyncSession = Depends(get_db)):
    """Run Hungarian-algorithm optimal allocation for all pending incidents."""
    # Get pending incidents
    inc_result = await db.execute(
        select(FloodIncident).where(FloodIncident.status == "pending")
    )
    incidents = inc_result.scalars().all()

    # Get available resources
    res_result = await db.execute(
        select(Resource).where(
            and_(Resource.status == "available", Resource.is_active == True)
        )
    )
    resources = res_result.scalars().all()

    if not incidents:
        return {"message": "No pending incidents", "assignments": []}

    inc_dicts = [
        {
            "id": i.id, "latitude": i.latitude, "longitude": i.longitude,
            "water_level_m": i.water_level_m or 0,
            "predicted_severity": i.predicted_severity or "moderate",
            "people_stranded": i.people_stranded or 0,
        }
        for i in incidents
    ]
    res_dicts = [
        {
            "id": r.id, "latitude": r.latitude, "longitude": r.longitude,
            "resource_type": r.resource_type, "name": r.name,
            "can_operate_in_water": r.can_operate_in_water,
            "max_water_depth_m": r.max_water_depth_m,
        }
        for r in resources
    ]

    allocation = resource_allocation_service.compute_allocation(inc_dicts, res_dicts)
    return allocation


@router.post("/evacuate", response_model=DispatchResponse)
async def evacuate(
    data: DispatchRequest,
    db: AsyncSession = Depends(get_db),
):
    """Dispatch resource for evacuation with shelter assignment."""
    try:
        result = await dispatch_service.auto_dispatch(
            incident_id=data.incident_id,
            db=db,
            algorithm=data.algorithm,
            dispatch_type="evacuate",
            shelter_id=data.shelter_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{dispatch_id}/complete")
async def complete_dispatch(
    dispatch_id: int,
    actual_time_min: float = None,
    db: AsyncSession = Depends(get_db),
):
    """Mark a dispatch as completed."""
    try:
        result = await dispatch_service.complete_dispatch(dispatch_id, db, actual_time_min)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/logs")
async def list_dispatch_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    incident_id: Optional[int] = None,
    resource_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve dispatch history logs with pagination."""
    return await dispatch_service.list_dispatch_logs(
        db, page=page, page_size=page_size,
        incident_id=incident_id, resource_id=resource_id
    )


@router.get("/availability")
async def get_resource_availability(db: AsyncSession = Depends(get_db)):
    """Get current resource availability summary."""
    return await dispatch_service.get_resource_availability(db)
