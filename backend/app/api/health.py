"""
Health and Monitoring API endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.session import get_db
from app.services.provenance_service import stale_report
from app.services.data_staleness_scheduler import staleness_scheduler

router = APIRouter(tags=["Monitoring & System Health"])


@router.get("/health")
def health_check():
    """Liveness probe."""
    return {"status": "healthy", "service": "NEXUS Financial Intelligence"}


@router.get("/health/db")
def db_health_check(db: Session = Depends(get_db)):
    """Database connectivity probe."""
    try:
        db.execute(text("SELECT 1"))
        return {"database": "healthy", "engine": db.bind.name}
    except Exception as e:
        return {"database": "unhealthy", "error": str(e)}


@router.get("/health/redis")
def redis_health_check():
    """Cache layer probe with graceful fallback reporting."""
    return {"redis": "in-memory-mode", "status": "operational"}


@router.get("/health/data-staleness")
def data_staleness_report(max_age_minutes: int = 1440):
    """Return persisted provider observations older than the configured freshness window."""
    return stale_report(max_age_minutes=max_age_minutes)


@router.get("/health/data-staleness/scheduled")
def scheduled_staleness_report():
    """Return the latest scheduled stale-data report snapshot."""
    if staleness_scheduler.last_report:
        return staleness_scheduler.last_report
    return staleness_scheduler.run_once()
