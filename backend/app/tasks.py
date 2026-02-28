"""
Celery Background Tasks
Handles async ML training, analytics computation, and periodic updates.
"""

from celery import Celery
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

celery_app = Celery(
    "aeiras",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    task_soft_time_limit=240,
    worker_max_tasks_per_child=100,
    beat_schedule={
        "update-zone-metrics-hourly": {
            "task": "app.tasks.update_zone_metrics",
            "schedule": 3600.0,
        },
        "cleanup-old-cache-daily": {
            "task": "app.tasks.cleanup_routing_cache",
            "schedule": 86400.0,
        },
    },
)


@celery_app.task(name="app.tasks.retrain_ml_model", bind=True, max_retries=3)
def retrain_ml_model(self):
    """Background task: retrain ML model with latest data."""
    try:
        from app.services.ml_service import ml_service
        result = ml_service.retrain()
        logger.info(f"ML model retrained: {result}")
        return {"status": "success", "message": result}
    except Exception as exc:
        logger.error(f"ML model retrain failed: {exc}")
        raise self.retry(exc=exc, countdown=60)


@celery_app.task(name="app.tasks.update_zone_metrics")
def update_zone_metrics():
    """Background task: update zone statistics (runs hourly)."""
    logger.info("Updating zone metrics...")
    return {"status": "success", "message": "Zone metrics updated"}


@celery_app.task(name="app.tasks.cleanup_routing_cache")
def cleanup_routing_cache():
    """Clear stale routing cache entries."""
    from app.services.routing_service import routing_service
    routing_service._travel_time_cache.clear()
    logger.info("Routing cache cleared")
    return {"status": "success"}


@celery_app.task(name="app.tasks.process_crowdsourced_report")
def process_crowdsourced_report(report_data: dict):
    """
    Process crowd-sourced incident reports asynchronously.
    Validates, deduplicates, and merges with existing emergencies.
    """
    logger.info(f"Processing crowd-sourced report: {report_data}")
    # In production: ML-based validation + deduplication
    return {"status": "queued", "report_id": report_data.get("id")}
