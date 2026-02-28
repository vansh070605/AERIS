"""
Resource API Routes — SQLite compatible.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
import logging

from app.database import get_db
from app.models.resource import Resource
from app.schemas import ResourceCreate, ResourceResponse, ResourceUpdate
from app.services.dispatch_service import dispatch_service
from app.core.security import require_viewer, require_dispatcher, require_admin

router = APIRouter(prefix="/resources", tags=["Resources"])
logger = logging.getLogger(__name__)


@router.get("", response_model=dict)
async def list_resources(
    resource_type: str = Query(default=None),
    status: str = Query(default=None),
    zone_id: int = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_viewer),
):
    query = select(Resource).where(Resource.is_active == True)
    if resource_type:
        query = query.where(Resource.resource_type == resource_type)
    if status:
        query = query.where(Resource.status == status)
    if zone_id:
        query = query.where(Resource.zone_id == zone_id)

    total_q = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_q.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    resources = result.scalars().all()

    return {
        "items": [ResourceResponse.model_validate(r) for r in resources],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/availability", response_model=dict)
async def get_resource_availability(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_viewer),
):
    return await dispatch_service.get_resource_availability(db)


@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_viewer),
):
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail=f"Resource {resource_id} not found")
    return ResourceResponse.model_validate(resource)


@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED)
async def create_resource(
    payload: ResourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin),
):
    resource = Resource(
        name=payload.name,
        resource_type=payload.resource_type.value,
        latitude=payload.latitude,
        longitude=payload.longitude,
        base_station=payload.base_station,
        capacity=payload.capacity,
        crew_count=payload.crew_count,
        vehicle_id=payload.vehicle_id,
        zone_id=payload.zone_id,
        status="available",
    )
    db.add(resource)
    await db.flush()
    return ResourceResponse.model_validate(resource)


@router.patch("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: int,
    payload: ResourceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_dispatcher),
):
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    if payload.status is not None:
        resource.status = payload.status.value
    if payload.latitude is not None:
        resource.latitude = payload.latitude
    if payload.longitude is not None:
        resource.longitude = payload.longitude
    resource.updated_at = datetime.utcnow()
    await db.flush()
    return ResourceResponse.model_validate(resource)


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin),
):
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    resource.is_active = False
    await db.flush()
