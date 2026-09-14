"""Local provenance persistence and freshness reporting."""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from app.database.session import SessionLocal
from app.models.provider_observation import ProviderObservation


def record_observation(provider: str, resource: str, symbol: Optional[str], source_url: Optional[str], payload: Any, status: str = "SUCCESS") -> None:
    db = SessionLocal()
    try:
        db.add(ProviderObservation(
            provider=provider,
            resource=resource,
            symbol=symbol,
            source_url=source_url,
            status=status,
            payload=payload,
        ))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def stale_report(max_age_minutes: int = 1440) -> Dict[str, Any]:
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=max_age_minutes)
    db = SessionLocal()
    try:
        observations = db.query(ProviderObservation).order_by(ProviderObservation.retrieved_at.desc()).all()
        latest_by_resource: Dict[str, ProviderObservation] = {}
        for observation in observations:
            key = f"{observation.provider}:{observation.resource}:{observation.symbol or '*'}"
            if key not in latest_by_resource:
                latest_by_resource[key] = observation
        rows = []
        for key, observation in latest_by_resource.items():
            retrieved_at = observation.retrieved_at
            if retrieved_at.tzinfo is None:
                retrieved_at = retrieved_at.replace(tzinfo=timezone.utc)
            rows.append({
                "key": key,
                "provider": observation.provider,
                "resource": observation.resource,
                "symbol": observation.symbol,
                "source_url": observation.source_url,
                "retrieved_at": retrieved_at.isoformat(),
                "status": observation.status,
                "stale": retrieved_at < cutoff,
            })
        return {
            "max_age_minutes": max_age_minutes,
            "observations": rows,
            "stale_count": sum(1 for row in rows if row["stale"]),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    finally:
        db.close()