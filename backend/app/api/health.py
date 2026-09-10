"""
Health and Monitoring API endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database.session import get_db

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
