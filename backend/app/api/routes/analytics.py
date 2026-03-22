"""
Flood Analytics API Routes
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.analytics_service import analytics_service
from app.services.post_event_learning_service import post_event_service

router = APIRouter(prefix="/analytics", tags=["Flood Analytics"])


@router.get("/flood-heatmap")
async def get_flood_heatmap(
    hours: int = Query(24, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
):
    """Water depth heatmap visualization data."""
    return await analytics_service.get_flood_heatmap(db, hours=hours)


@router.get("/response-efficiency")
async def get_response_efficiency(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Response time vs flood severity analysis."""
    return await analytics_service.get_response_efficiency(db, days=days)


@router.get("/resource-utilization")
async def get_resource_utilization(db: AsyncSession = Depends(get_db)):
    """Resource usage breakdown by type."""
    return await analytics_service.get_resource_utilization(db)


@router.get("/zone-risk")
async def get_zone_risk(db: AsyncSession = Depends(get_db)):
    """Zone flood risk metrics with resource coverage."""
    return await analytics_service.get_zone_risk_metrics(db)


@router.get("/flood-timeline")
async def get_flood_timeline(
    hours: int = Query(48, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
):
    """Water level time-series across zones."""
    return await analytics_service.get_flood_timeline(db, hours=hours)


@router.get("/dashboard")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Flood operations dashboard statistics."""
    return await analytics_service.get_dashboard_stats(db)


@router.get("/post-event-analysis")
async def get_post_event_analysis(
    hours: int = Query(48, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
):
    """Post-event learning analysis with zone-level lessons."""
    return await post_event_service.analyze_event(db, hours_back=hours)


@router.post("/update-risk-scores")
async def update_risk_scores(
    hours: int = Query(48, ge=1, le=168),
    db: AsyncSession = Depends(get_db),
):
    """Adaptively update zone flood risk scores based on recent events."""
    return await post_event_service.update_zone_risk_scores(db, hours_back=hours)
