"""
Dispatch API Routes — SQLite compatible.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import logging

from app.database import get_db
from app.models.dispatch import DispatchLog
from app.models.emergency import Emergency
from app.models.resource import Resource
from app.schemas import DispatchRequest, DispatchLogResponse
from app.services.dispatch_service import dispatch_service
from app.websocket_manager import ws_manager
from app.core.security import require_dispatcher, require_viewer

router = APIRouter(prefix="/dispatch", tags=["Dispatch"])
logger = logging.getLogger(__name__)


@router.post("", response_model=dict, status_code=status.HTTP_200_OK)
async def trigger_dispatch(
    payload: DispatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_dispatcher),
):
    try:
        result = await dispatch_service.auto_dispatch(
            emergency_id=payload.emergency_id,
            db=db,
            dispatcher_id=current_user.id,
            algorithm=payload.algorithm or "dijkstra",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if result.get("success") and result.get("dispatch_log_id"):
        await ws_manager.broadcast_to_room(
            "main",
            {
                "type": "dispatch_update",
                "data": {
                    "emergency_id": payload.emergency_id,
                    "resource_id": result.get("resource", {}).get("id"),
                    "resource": result.get("resource"),
                    "route": result.get("route"),
                    "severity": result.get("severity"),
                },
            }
        )

    return result


@router.get("", response_model=dict)
async def list_dispatch_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=100),
    emergency_id: int = Query(default=None),
    resource_id: int = Query(default=None),
    dispatch_status: str = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_viewer),
):
    query = select(DispatchLog).order_by(DispatchLog.dispatched_at.desc())
    if emergency_id:
        query = query.where(DispatchLog.emergency_id == emergency_id)
    if resource_id:
        query = query.where(DispatchLog.resource_id == resource_id)
    if dispatch_status:
        query = query.where(DispatchLog.dispatch_status == dispatch_status)

    total_q = await db.execute(select(func.count()).select_from(query.subquery()))
    total = total_q.scalar()

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "items": [DispatchLogResponse.model_validate(log) for log in logs],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{log_id}", response_model=DispatchLogResponse)
async def get_dispatch_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_viewer),
):
    result = await db.execute(select(DispatchLog).where(DispatchLog.id == log_id))
    log = result.scalar_one_or_none()
    if not log:
        raise HTTPException(status_code=404, detail="Dispatch log not found")
    return DispatchLogResponse.model_validate(log)


@router.patch("/{log_id}/complete")
async def complete_dispatch(
    log_id: int,
    actual_time_min: float = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_dispatcher),
):
    try:
        result = await dispatch_service.complete_dispatch(log_id, db, actual_time_min)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return result
