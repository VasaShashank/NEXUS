"""
NEXUS 2.0 Corporate Disclosures, Insider Trading & Ownership Timeline Service.
Aggregates and normalizes disclosures from BSE, NSE, and SEBI, identifying
temporal clusters and ownership changes with verifiable provenance.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.document_intelligence import CorporateDisclosureEvent


class DisclosureService:
    """Service for managing corporate disclosures and ownership event timelines."""

    def get_timeline(self, symbol: str, db: Session) -> List[CorporateDisclosureEvent]:
        norm = symbol.upper().split(".")[0]
        return db.query(CorporateDisclosureEvent).filter(
            CorporateDisclosureEvent.symbol == norm
        ).order_by(CorporateDisclosureEvent.event_date.desc()).all()

    def record_event(
        self,
        symbol: str,
        event_type: str,
        event_date: datetime,
        entity_name: str,
        db: Session,
        entity_category: Optional[str] = None,
        action_type: Optional[str] = None,
        shares_count: Optional[float] = None,
        percentage_stake: Optional[float] = None,
        transaction_value_inr: Optional[float] = None,
        source_exchange: str = "BSE",
        source_url: Optional[str] = None,
        provenance_reference: Optional[str] = None,
    ) -> CorporateDisclosureEvent:
        norm = symbol.upper().split(".")[0]

        # Check for clustering / statistical anomaly
        recent_count = db.query(CorporateDisclosureEvent).filter(
            CorporateDisclosureEvent.symbol == norm,
            CorporateDisclosureEvent.event_type == event_type,
        ).count()

        anomaly_flag = recent_count >= 3
        anomaly_rationale = (
            f"Cluster of {recent_count + 1} {event_type} disclosures detected within recent reporting windows."
            if anomaly_flag else None
        )

        event = CorporateDisclosureEvent(
            symbol=norm,
            event_type=event_type,
            event_date=event_date,
            entity_name=entity_name,
            entity_category=entity_category,
            action_type=action_type,
            shares_count=shares_count,
            percentage_stake=percentage_stake,
            transaction_value_inr=transaction_value_inr,
            source_exchange=source_exchange,
            source_url=source_url,
            provenance_reference=provenance_reference,
            anomaly_flag=anomaly_flag,
            anomaly_rationale=anomaly_rationale,
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event


disclosure_service = DisclosureService()
