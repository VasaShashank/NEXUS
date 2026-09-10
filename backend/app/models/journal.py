"""
Investment Journal model for recording theses, strategies, and post-trade reviews.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    symbol = Column(String, index=True, nullable=False)
    thesis = Column(Text, nullable=False)
    strategy_tag = Column(String, default="SWING")  # VALUE, GROWTH, BREAKOUT, SWING, MOMENTUM
    target_price = Column(Float, nullable=True)
    stop_loss = Column(Float, nullable=True)
    expected_timeframe = Column(String, default="1-3 Months")
    notes = Column(Text, nullable=True)
    outcome_pnl = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="journal_entries")
    transaction = relationship("Transaction", back_populates="journal_entry")
