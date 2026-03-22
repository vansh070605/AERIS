"""
Shelter API Routes — flood relief camps and evacuation shelters.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database import get_db
from app.models.shelter import Shelter
from app.schemas import ShelterResponse, ShelterOccupancyUpdate

router = APIRouter(prefix="/shelters", tags=["Shelters"])


@router.get("", response_model=list[ShelterResponse])
async def list_shelters(db: AsyncSession = Depends(get_db)):
    """List all flood shelters with occupancy data."""
    result = await db.execute(select(Shelter).where(Shelter.is_active == True))
    shelters = result.scalars().all()
    response = []
    for s in shelters:
        data = ShelterResponse.model_validate(s)
        data.occupancy_pct = round(s.current_occupancy / max(s.total_capacity, 1) * 100, 1)
        response.append(data)
    return response


@router.get("/{shelter_id}", response_model=ShelterResponse)
async def get_shelter(shelter_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Shelter).where(Shelter.id == shelter_id))
    shelter = result.scalar_one_or_none()
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter not found")
    resp = ShelterResponse.model_validate(shelter)
    resp.occupancy_pct = round(shelter.current_occupancy / max(shelter.total_capacity, 1) * 100, 1)
    return resp


@router.put("/{shelter_id}/occupancy")
async def update_occupancy(
    shelter_id: int,
    data: ShelterOccupancyUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Shelter).where(Shelter.id == shelter_id))
    shelter = result.scalar_one_or_none()
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter not found")

    await db.execute(
        update(Shelter).where(Shelter.id == shelter_id)
        .values(current_occupancy=data.current_occupancy)
    )

    return {
        "shelter_id": shelter_id,
        "current_occupancy": data.current_occupancy,
        "total_capacity": shelter.total_capacity,
        "occupancy_pct": round(data.current_occupancy / max(shelter.total_capacity, 1) * 100, 1),
    }
