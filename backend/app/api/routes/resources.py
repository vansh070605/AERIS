"""
Flood Resource Management API Routes
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func

from app.database import get_db
from app.models.resource import Resource
from app.schemas import ResourceCreate, ResourceUpdate, ResourceResponse

router = APIRouter(prefix="/resources", tags=["Flood Resources"])


@router.get("", response_model=list[ResourceResponse])
async def list_resources(
    resource_type: Optional[str] = None,
    status: Optional[str] = None,
    zone_id: Optional[int] = None,
    can_operate_in_water: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
):
    """List flood rescue resources with filters."""
    query = select(Resource).where(Resource.is_active == True)

    if resource_type:
        query = query.where(Resource.resource_type == resource_type)
    if status:
        query = query.where(Resource.status == status)
    if zone_id:
        query = query.where(Resource.zone_id == zone_id)
    if can_operate_in_water is not None:
        query = query.where(Resource.can_operate_in_water == can_operate_in_water)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{resource_id}", response_model=ResourceResponse)
async def get_resource(resource_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


@router.post("", response_model=ResourceResponse)
async def create_resource(
    data: ResourceCreate,
    db: AsyncSession = Depends(get_db),
):
    resource = Resource(
        name=data.name,
        resource_type=data.resource_type.value,
        latitude=data.latitude,
        longitude=data.longitude,
        base_station=data.base_station,
        capacity=data.capacity,
        crew_count=data.crew_count,
        passenger_capacity=data.passenger_capacity,
        vehicle_id=data.vehicle_id,
        zone_id=data.zone_id,
        can_operate_in_water=data.can_operate_in_water,
        max_water_depth_m=data.max_water_depth_m,
        status="available",
        is_active=True,
    )
    db.add(resource)
    await db.flush()
    return resource


@router.put("/{resource_id}", response_model=ResourceResponse)
async def update_resource(
    resource_id: int,
    data: ResourceUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    update_data = data.model_dump(exclude_none=True)
    if update_data:
        await db.execute(
            update(Resource).where(Resource.id == resource_id).values(**update_data)
        )
    await db.refresh(resource)
    return resource


@router.get("/allocation-matrix", response_model=None)
async def get_allocation_matrix(db: AsyncSession = Depends(get_db)):
    """Get current resource allocation overview."""
    from app.services.resource_allocation_service import resource_allocation_service
    from app.models.emergency import FloodIncident

    inc_result = await db.execute(
        select(FloodIncident).where(FloodIncident.status == "pending")
    )
    res_result = await db.execute(
        select(Resource).where(Resource.status == "available", Resource.is_active == True)
    )

    incidents = inc_result.scalars().all()
    resources = res_result.scalars().all()

    inc_dicts = [{"id": i.id, "latitude": i.latitude, "longitude": i.longitude,
                  "water_level_m": i.water_level_m or 0, "predicted_severity": i.predicted_severity or "moderate",
                  "people_stranded": i.people_stranded or 0} for i in incidents]
    res_dicts = [{"id": r.id, "latitude": r.latitude, "longitude": r.longitude,
                  "resource_type": r.resource_type, "name": r.name,
                  "can_operate_in_water": r.can_operate_in_water,
                  "max_water_depth_m": r.max_water_depth_m} for r in resources]

    return resource_allocation_service.compute_allocation(inc_dicts, res_dicts)
