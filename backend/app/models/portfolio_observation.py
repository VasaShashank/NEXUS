"""Observed portfolio marks used for historical risk analytics."""
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from app.database.session import Base


class PortfolioObservation(Base):
    __tablename__ = "portfolio_observations"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    observed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    portfolio_value = Column(Float, nullable=False)
    benchmark_value = Column(Float, nullable=True)
    benchmark_source = Column(String, nullable=True)
