"""Persisted AMFI scheme metadata and NAV observations."""
from datetime import datetime, timezone
from sqlalchemy import Column, Date, DateTime, Float, Integer, String, UniqueConstraint
from app.database.session import Base


class MutualFundScheme(Base):
    __tablename__ = "mutual_fund_schemes"

    scheme_code = Column(String, primary_key=True)
    scheme_name = Column(String, nullable=False, index=True)
    source = Column(String, default="AMFI via mftool")
    retrieved_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class MutualFundNavObservation(Base):
    __tablename__ = "mutual_fund_nav_observations"
    __table_args__ = (UniqueConstraint("scheme_code", "nav_date", name="uq_mf_nav_scheme_date"),)

    id = Column(Integer, primary_key=True, index=True)
    scheme_code = Column(String, nullable=False, index=True)
    nav_date = Column(Date, nullable=False, index=True)
    nav = Column(Float, nullable=False)
    source = Column(String, default="AMFI via mftool")
    retrieved_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
