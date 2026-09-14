"""Authenticated, on-demand price and portfolio alert rules."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.stock import Alert
from app.models.user import User
from app.providers.market_data import market_data_provider

router = APIRouter(prefix="/alerts", tags=["Alerts"])


class AlertCreateRequest(BaseModel):
    symbol: str
    condition: str = Field(description="ABOVE, BELOW, CHANGE_PCT_ABOVE, CHANGE_PCT_BELOW, 52W_HIGH, or 52W_LOW")
    threshold: Optional[float] = None


def _serialize(alert: Alert, triggered: bool = False, quote: Any = None) -> Dict[str, Any]:
    return {
        "id": alert.id,
        "symbol": alert.symbol,
        "condition": alert.condition,
        "threshold": alert.threshold,
        "active": alert.active,
        "triggered": triggered,
        "current_value": quote.current_price if quote else None,
        "current_change_pct": quote.change_1d_pct if quote else None,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
        "last_triggered_at": alert.last_triggered_at.isoformat() if alert.last_triggered_at else None,
    }


def _matches(alert: Alert, quote: Any) -> bool:
    if not quote or not alert.active:
        return False
    if alert.condition == "ABOVE":
        return alert.threshold is not None and quote.current_price >= alert.threshold
    if alert.condition == "BELOW":
        return alert.threshold is not None and quote.current_price <= alert.threshold
    if alert.condition == "CHANGE_PCT_ABOVE":
        return alert.threshold is not None and quote.change_1d_pct >= alert.threshold
    if alert.condition == "CHANGE_PCT_BELOW":
        return alert.threshold is not None and quote.change_1d_pct <= alert.threshold
    if alert.condition == "52W_HIGH":
        return quote.current_price >= quote.week_52_high
    if alert.condition == "52W_LOW":
        return quote.current_price <= quote.week_52_low
    return False


@router.get("", response_model=List[Dict[str, Any]])
def list_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alerts = db.query(Alert).filter(Alert.user_id == current_user.id).order_by(Alert.created_at.desc()).all()
    return [_serialize(alert) for alert in alerts]


@router.post("", response_model=Dict[str, Any])
def create_alert(payload: AlertCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    condition = payload.condition.strip().upper()
    valid_conditions = {"ABOVE", "BELOW", "CHANGE_PCT_ABOVE", "CHANGE_PCT_BELOW", "52W_HIGH", "52W_LOW"}
    if condition not in valid_conditions:
        raise HTTPException(status_code=400, detail=f"Unsupported alert condition. Use one of: {', '.join(sorted(valid_conditions))}.")
    if condition in {"ABOVE", "BELOW", "CHANGE_PCT_ABOVE", "CHANGE_PCT_BELOW"} and payload.threshold is None:
        raise HTTPException(status_code=400, detail="This alert condition requires a threshold.")
    symbol = payload.symbol.strip().upper().split(".")[0]
    if not market_data_provider.get_quote(symbol):
        raise HTTPException(status_code=404, detail=f"Symbol '{symbol}' is not available from the market provider.")
    alert = Alert(user_id=current_user.id, symbol=symbol, condition=condition, threshold=payload.threshold)
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return _serialize(alert)


@router.post("/evaluate", response_model=List[Dict[str, Any]])
def evaluate_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alerts = db.query(Alert).filter(Alert.user_id == current_user.id, Alert.active.is_(True)).all()
    results = []
    changed = False
    for alert in alerts:
        quote = market_data_provider.get_quote(alert.symbol)
        triggered = _matches(alert, quote)
        if triggered:
            alert.last_triggered_at = datetime.now(timezone.utc)
            changed = True
        results.append(_serialize(alert, triggered=triggered, quote=quote))
    if changed:
        db.commit()
    return results


@router.delete("/{alert_id}", response_model=Dict[str, Any])
def delete_alert(alert_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alert = db.query(Alert).filter(Alert.id == alert_id, Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found.")
    db.delete(alert)
    db.commit()
    return {"deleted": alert_id}
