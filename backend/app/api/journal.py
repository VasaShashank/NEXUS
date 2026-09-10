"""
Investment Journal API routes.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.journal import JournalCreateRequest, JournalResponse, JournalSummaryResponse
from app.services.journal_service import JournalService

router = APIRouter(prefix="/journal", tags=["Investment Journal"])


@router.get("/entries", response_model=JournalSummaryResponse)
def get_journal(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve logged investment theses, trade associations, and strategy win rates."""
    return JournalService.get_user_journal(db, current_user)


@router.post("/entries", response_model=JournalResponse)
def create_journal_entry(
    entry_in: JournalCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Log an investment hypothesis and trade rationale."""
    return JournalService.create_entry(db, current_user, entry_in)
