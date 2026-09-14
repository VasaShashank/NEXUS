"""Persisted provenance records for external provider observations."""
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, JSON, String
from app.database.session import Base


class ProviderObservation(Base):
    __tablename__ = "provider_observations"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, nullable=False, index=True)
    resource = Column(String, nullable=False, index=True)
    symbol = Column(String, nullable=True, index=True)
    source_url = Column(String, nullable=True)
    status = Column(String, nullable=False, default="SUCCESS")
    retrieved_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    payload = Column(JSON, nullable=True)
