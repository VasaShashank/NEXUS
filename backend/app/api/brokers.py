"""Read-only broker adapter discovery and health."""
from typing import Any, Dict, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.services.broker_adapters import PaperBrokerAdapter, adapter_health

router = APIRouter(prefix="/brokers", tags=["Broker Adapters"])


@router.get("/health", response_model=List[Dict[str, Any]])
def get_broker_health():
    """Report paper and disabled external adapter health without contacting brokers."""
    return adapter_health()


@router.get("/paper/positions", response_model=List[Dict[str, Any]])
def get_paper_positions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Expose the local paper portfolio through the read-only adapter contract."""
    return PaperBrokerAdapter().get_positions(db, current_user)
