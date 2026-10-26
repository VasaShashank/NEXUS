"""
NEXUS 2.0 Document Intelligence, Canonical Financial Facts, Forensics, and Guidance Models.
Provides immutable source provenance, layout-aware extracted tables, accounting findings,
and longitudinal management statement tracking.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database.session import Base


class DocumentFiling(Base):
    __tablename__ = "document_filings"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, ForeignKey("stocks.symbol"), index=True, nullable=False)
    company_name = Column(String, nullable=False)
    title = Column(String, nullable=False)
    doc_type = Column(String, index=True, nullable=False)  # ANNUAL_REPORT, QUARTERLY_RESULTS, INVESTOR_PRESENTATION, CONCALL_TRANSCRIPT, DISCLOSURE
    fiscal_year = Column(String, index=True, nullable=True)  # e.g. FY2024, FY2023
    reporting_period = Column(String, nullable=True)  # Q1, Q2, Q3, Q4, FY
    source_url = Column(String, nullable=True)
    filing_date = Column(DateTime, nullable=True)
    file_hash = Column(String, index=True, nullable=True)  # SHA-256 fingerprint for idempotency
    file_size_bytes = Column(Integer, default=0)
    page_count = Column(Integer, default=0)
    ingestion_status = Column(String, default="COMPLETED", index=True)  # PENDING, PROCESSING, COMPLETED, FAILED
    extraction_version = Column(String, default="2.0")
    error_details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    tables = relationship("ExtractedTable", back_populates="filing", cascade="all, delete-orphan")
    facts = relationship("CanonicalFinancialFact", back_populates="filing", cascade="all, delete-orphan")
    guidance = relationship("ManagementGuidanceStatement", back_populates="filing", cascade="all, delete-orphan")


class ExtractedTable(Base):
    __tablename__ = "extracted_tables"

    id = Column(Integer, primary_key=True, index=True)
    filing_id = Column(Integer, ForeignKey("document_filings.id"), index=True, nullable=False)
    page_number = Column(Integer, nullable=False)
    statement_type = Column(String, index=True, nullable=False)  # BALANCE_SHEET, INCOME_STATEMENT, CASH_FLOW, NOTES, SEGMENT
    consolidation_scope = Column(String, default="CONSOLIDATED", index=True)  # CONSOLIDATED, STANDALONE
    reporting_period = Column(String, nullable=True)  # FY2024, 31-Mar-2024
    currency = Column(String, default="INR")
    units = Column(String, default="CRORES")  # CRORES, LAKHS, MILLIONS
    headers_json = Column(JSON, nullable=False)  # List of column header names / periods
    rows_json = Column(JSON, nullable=False)  # List of {label, level, values: {period: float}, note_ref}
    raw_markdown = Column(Text, nullable=True)
    extraction_confidence = Column(Float, default=1.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    filing = relationship("DocumentFiling", back_populates="tables")


class CanonicalFinancialFact(Base):
    __tablename__ = "canonical_financial_facts"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, ForeignKey("stocks.symbol"), index=True, nullable=False)
    filing_id = Column(Integer, ForeignKey("document_filings.id"), index=True, nullable=True)
    metric_id = Column(String, index=True, nullable=False)  # REVENUE, EBITDA, EBIT, PAT, CFO, CAPEX, FCF, TOTAL_DEBT, RECEIVABLES, INVENTORY, CASH, NET_WORTH
    metric_name = Column(String, nullable=False)
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=False, index=True)
    fiscal_year = Column(String, index=True, nullable=False)  # e.g. FY2024
    period_type = Column(String, default="ANNUAL")  # ANNUAL, QUARTERLY, TTM
    consolidation_scope = Column(String, default="CONSOLIDATED", index=True)  # CONSOLIDATED, STANDALONE
    value = Column(Float, nullable=False)
    unit = Column(String, default="INR_CRORES")
    statement_type = Column(String, nullable=False)  # BALANCE_SHEET, INCOME_STATEMENT, CASH_FLOW
    source_page = Column(Integer, nullable=True)
    validation_status = Column(String, default="VERIFIED")  # VERIFIED, FLAGGED, ESTIMATED, REVISED
    restatement_note = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    filing = relationship("DocumentFiling", back_populates="facts")


class ForensicFinding(Base):
    __tablename__ = "forensic_findings"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, ForeignKey("stocks.symbol"), index=True, nullable=False)
    rule_id = Column(String, index=True, nullable=False)  # e.g. RULE_CFO_PAT_DIVERGENCE
    title = Column(String, nullable=False)
    severity = Column(String, index=True, nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
    confidence = Column(String, default="HIGH")  # HIGH, MEDIUM, LOW
    observation_summary = Column(Text, nullable=False)
    metric_breakdown = Column(JSON, nullable=False)  # {metric, periods, values, formula_applied}
    why_it_matters = Column(Text, nullable=False)
    benign_explanations = Column(JSON, nullable=False)  # List of plausible legitimate reasons
    recommended_checks = Column(JSON, nullable=False)  # Actionable follow-up verification steps
    citations = Column(JSON, nullable=False)  # List of {filing_id, doc_title, page, period}
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ManagementGuidanceStatement(Base):
    __tablename__ = "management_guidance_statements"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, ForeignKey("stocks.symbol"), index=True, nullable=False)
    filing_id = Column(Integer, ForeignKey("document_filings.id"), index=True, nullable=False)
    fiscal_period = Column(String, index=True, nullable=False)  # e.g. Q4_FY24, FY24
    statement_category = Column(String, index=True, nullable=False)  # REVENUE_GROWTH, MARGIN_OUTLOOK, CAPEX_PLAN, DEBT_REDUCTION, CAPACITY_EXPANSION
    raw_quote = Column(Text, nullable=False)
    speaker_title = Column(String, nullable=True)  # e.g. Managing Director, CFO
    numeric_target = Column(Float, nullable=True)
    target_unit = Column(String, nullable=True)  # %, INR_CRORES, MW, MTPA
    target_period = Column(String, nullable=True)  # e.g. FY25, H2_FY25
    modality = Column(String, default="EXPECTED")  # COMMITTED, EXPECTED, CONDITIONAL, ASPIRATIONAL
    extraction_confidence = Column(Float, default=0.95)
    source_page = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    filing = relationship("DocumentFiling", back_populates="guidance")


class CorporateDisclosureEvent(Base):
    __tablename__ = "corporate_disclosure_events"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, ForeignKey("stocks.symbol"), index=True, nullable=False)
    event_type = Column(String, index=True, nullable=False)  # INSIDER_TRADE, SAST_TAKEOVER, PLEDGE_CHANGE, BULK_DEAL, AUDITOR_RESIGNATION, LITIGATION
    event_date = Column(DateTime, index=True, nullable=False)
    entity_name = Column(String, nullable=False)
    entity_category = Column(String, nullable=True)  # PROMOTER, DIRECTOR, FII, DII, AUDITOR
    action_type = Column(String, nullable=True)  # ACQUISITION, DISPOSAL, PLEDGE, REVOKE, INVOCATION
    shares_count = Column(Float, nullable=True)
    percentage_stake = Column(Float, nullable=True)
    transaction_value_inr = Column(Float, nullable=True)
    source_exchange = Column(String, default="BSE")  # BSE, NSE, SEBI
    source_url = Column(String, nullable=True)
    provenance_reference = Column(String, nullable=True)
    anomaly_flag = Column(Boolean, default=False)
    anomaly_rationale = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
