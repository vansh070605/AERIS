"""
Analytics API Routes
GET /analytics/heatmap
GET /analytics/equity
GET /analytics/dashboard
GET /analytics/response-times
GET /analytics/early-warning
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import logging

from app.database import get_db
from app.services.analytics_service import analytics_service
from app.core.security import require_viewer

router = APIRouter(prefix="/analytics", tags=["Analytics"])
logger = logging.getLogger(__name__)


@router.get("/heatmap")
async def get_heatmap(
    hours: int = Query(default=24, ge=1, le=720,
                       description="Time window in hours"),
    emergency_type: Optional[str] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_viewer),
):
    """
    Get geo-heatmap data for emergency incidents.
    Intensity scaled by severity (Low=0.25, Medium=0.5, High=0.75, Critical=1.0).
    """
    data = await analytics_service.get_heatmap_data(
        db=db,
        hours=hours,
        emergency_type=emergency_type,
        severity=severity,
    )
    return {
        "count": len(data),
        "time_window_hours": hours,
        "points": data,
    }


@router.get("/equity")
async def get_equity_metrics(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_viewer),
):
    """
    Equity and fairness metrics per zone.
    Highlights underserved areas based on response time disparity (Gini coefficient).
    """
    return await analytics_service.get_equity_metrics(db)


@router.get("/dashboard")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_viewer),
):
    """Comprehensive dashboard statistics for admin panel."""
    return await analytics_service.get_dashboard_stats(db)


@router.get("/response-times")
async def get_response_times(
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_viewer),
):
    """Response time analytics broken down by type, severity, and hour of day."""
    return await analytics_service.get_response_time_analytics(db, days=days)


@router.get("/early-warning")
async def get_early_warnings(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_viewer),
):
    """
    Early warning prediction stub.
    Identifies zones at elevated risk based on recent incident frequency patterns.
    """
    return await analytics_service.get_early_warning_predictions(db)
