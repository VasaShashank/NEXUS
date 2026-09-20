"""
Agentic AI and Observability schemas.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class AgentQueryRequest(BaseModel):
    query: str
    symbol: Optional[str] = None
    stream: Optional[bool] = False


class ToolCallLog(BaseModel):
    tool_name: str
    tool_input: Dict[str, Any]
    tool_output: Any
    latency_ms: float
    status: str


class EvidenceCitation(BaseModel):
    source_type: str  # MARKET_DATA, FUNDAMENTALS, NEWS, FILING, TECHNICALS
    title: str
    reference: str
    snippet: str


class AgentRunResponse(BaseModel):
    run_id: str
    query: str
    agent_type: str
    state: str
    executive_summary: str
    structured_findings: Dict[str, Any]
    bull_case: List[str]
    bear_case: List[str]
    risks_to_monitor: List[str]
    evidence_citations: List[EvidenceCitation]
    tool_calls: List[ToolCallLog]
    tokens_estimated: int
    latency_ms: float


class WhyMovedFactor(BaseModel):
    factor_name: str
    category: str  # SECTOR, NEWS, VOLUME, MACRO, TECHNICAL
    impact: str  # POSITIVE, NEGATIVE, NEUTRAL
    description: str


class WhyMovedResponse(BaseModel):
    symbol: str
    company_name: str
    change_1d_pct: float
    volume_surge_ratio: Optional[float] = None
    sector_change_pct: float
    market_change_pct: float
    observed_factors: List[WhyMovedFactor]
    interpretation: str
    confidence_rating: str  # HIGH, MEDIUM, LOW
    data_points: Dict[str, Any]


class PortfolioDoctorResponse(BaseModel):
    overall_health: str  # EXCELLENT, BALANCED, VULNERABLE, CRITICAL
    concentration_summary: str
    sector_tilt_summary: str
    primary_risks: List[str]
    suggested_actions: List[str]
    supporting_metrics: Dict[str, Any]
