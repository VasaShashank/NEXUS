"""
Pydantic contracts for NEXUS 2.0 Document Intelligence, Normalized Facts, Forensics, Guidance, and Valuation.
"""
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict, Field


class DocumentFilingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    company_name: str
    title: str
    doc_type: str
    fiscal_year: Optional[str] = None
    reporting_period: Optional[str] = None
    source_url: Optional[str] = None
    filing_date: Optional[datetime] = None
    file_hash: Optional[str] = None
    file_size_bytes: int = 0
    page_count: int = 0
    ingestion_status: str
    extraction_version: str
    created_at: datetime


class ExtractedTableRow(BaseModel):
    label: str
    level: int = 0  # Indentation level (0 = header/category, 1 = item, 2 = sub-item)
    values: Dict[str, Optional[float]]  # e.g. {"FY24": 901064.0, "FY23": 892809.0}
    note_ref: Optional[str] = None
    is_total: bool = False


class ExtractedTableResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filing_id: int
    page_number: int
    statement_type: str  # BALANCE_SHEET, INCOME_STATEMENT, CASH_FLOW, NOTES
    consolidation_scope: str  # CONSOLIDATED, STANDALONE
    reporting_period: Optional[str] = None
    currency: str = "INR"
    units: str = "CRORES"
    headers: List[str]
    rows: List[ExtractedTableRow]
    raw_markdown: Optional[str] = None
    extraction_confidence: float = 1.0


class CanonicalFactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    filing_id: Optional[int] = None
    metric_id: str
    metric_name: str
    period_start: Optional[datetime] = None
    period_end: datetime
    fiscal_year: str
    period_type: str
    consolidation_scope: str
    value: float
    unit: str
    statement_type: str
    source_page: Optional[int] = None
    validation_status: str
    restatement_note: Optional[str] = None


class ForensicFindingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    rule_id: str
    title: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
    confidence: str  # HIGH, MEDIUM, LOW
    observation_summary: str
    metric_breakdown: Dict[str, Any]
    why_it_matters: str
    benign_explanations: List[str]
    recommended_checks: List[str]
    citations: List[Dict[str, Any]]
    created_at: datetime


class GuidanceStatementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    filing_id: int
    fiscal_period: str
    statement_category: str
    raw_quote: str
    speaker_title: Optional[str] = None
    numeric_target: Optional[float] = None
    target_unit: Optional[str] = None
    target_period: Optional[str] = None
    modality: str  # COMMITTED, EXPECTED, CONDITIONAL, ASPIRATIONAL
    extraction_confidence: float
    source_page: Optional[int] = None
    created_at: datetime


class GuidanceDriftComparison(BaseModel):
    category: str
    historical_period: str
    historical_statement: str
    historical_target: Optional[float] = None
    historical_modality: str
    current_period: str
    current_statement: str
    current_target: Optional[float] = None
    current_modality: str
    drift_type: str  # TARGET_INCREASED, TARGET_REDUCED, TIMELINE_DELAYED, NEW_CONDITIONALITY, WITHDRAWN, UNCHANGED
    explanation: str


class CorporateDisclosureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    symbol: str
    event_type: str
    event_date: datetime
    entity_name: str
    entity_category: Optional[str] = None
    action_type: Optional[str] = None
    shares_count: Optional[float] = None
    percentage_stake: Optional[float] = None
    transaction_value_inr: Optional[float] = None
    source_exchange: str
    source_url: Optional[str] = None
    provenance_reference: Optional[str] = None
    anomaly_flag: bool = False
    anomaly_rationale: Optional[str] = None


class DCFAssumptionInput(BaseModel):
    symbol: str
    base_revenue: Optional[float] = None  # in Cr
    revenue_growth_y1_5: float = Field(default=12.0, description="Revenue CAGR for years 1-5 (%)")
    terminal_growth_rate: float = Field(default=4.5, description="Terminal growth rate (%)")
    operating_margin: float = Field(default=18.0, description="Target operating margin EBIT (%)")
    effective_tax_rate: float = Field(default=25.0, description="Effective corporate tax rate (%)")
    reinvestment_rate: float = Field(default=20.0, description="Net capex & working capital reinvestment rate (% of NOPAT)")
    wacc: float = Field(default=11.5, description="Weighted average cost of capital (%)")
    net_debt: Optional[float] = None  # in Cr
    diluted_shares: Optional[float] = None  # in Cr shares


class DCFSensitivityCell(BaseModel):
    wacc: float
    terminal_growth: float
    intrinsic_value_per_share: float


class DCFValuationResult(BaseModel):
    symbol: str
    historical_revenue: float
    projected_fcf: List[Dict[str, Any]]
    present_value_fcf: float
    terminal_value: float
    present_value_terminal_value: float
    enterprise_value: float
    net_debt: float
    equity_value: float
    diluted_shares: float
    intrinsic_value_per_share: float
    current_market_price: float
    margin_of_safety_pct: float
    sensitivity_matrix: List[DCFSensitivityCell]
    reverse_valuation: Dict[str, Any]  # Implied growth to justify current price
    provenance_notes: List[str]
