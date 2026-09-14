"""
Portfolio, Paper Trading, Performance Analytics, and Risk Schemas.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class OrderCreateRequest(BaseModel):
    symbol: str
    side: str  # BUY or SELL
    order_type: str = "MARKET"
    quantity: int
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    validity: str = "DAY"
    idempotency_key: Optional[str] = None


class OrderResponse(BaseModel):
    id: int
    portfolio_id: int
    symbol: str
    side: str
    quantity: int
    price: float
    total_amount: float
    realized_pnl: float
    executed_at: str
    message: str
    order_type: str = "MARKET"
    status: str = "EXECUTED"


class HoldingResponse(BaseModel):
    id: int
    symbol: str
    company_name: str
    sector: Optional[str] = None
    quantity: int
    average_buy_price: float
    current_price: float
    invested_value: float
    current_value: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    allocation_pct: float


class PortfolioSummaryResponse(BaseModel):
    total_value: float
    invested_value: float
    cash_balance: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    realized_pnl: float
    daily_pnl: float
    daily_pnl_pct: float
    holdings_count: int
    holdings: List[HoldingResponse]


class PortfolioAnalyticsResponse(BaseModel):
    cagr: float
    xirr: float
    annualized_volatility: float
    sharpe_ratio: float
    max_drawdown: float
    beta_vs_nifty: float
    alpha: float
    win_rate: float
    equity_curve: List[Dict[str, Any]]
    benchmark_comparison: List[Dict[str, Any]]
    observation_count: Optional[int] = None
    long_history_metrics_ready: Optional[bool] = None
    metrics_disclaimer: Optional[str] = None


class RiskConcentration(BaseModel):
    top_holding_pct: float
    top_3_holdings_pct: float
    top_sector_pct: float
    is_concentrated: bool
    description: str


class SectorExposureItem(BaseModel):
    sector: str
    value: float
    percentage: float
    risk_rating: str  # BALANCED, OVERWEIGHT, HEAVY


class PortfolioRiskResponse(BaseModel):
    overall_risk_score: str  # LOW, MODERATE, ELEVATED, HIGH
    concentration_risk: RiskConcentration
    sector_exposures: List[SectorExposureItem]
    volatility_metric: float
    max_drawdown_metric: float
    diversification_score: float  # 0 to 100
    actionable_warnings: List[str]
    strengths: List[str]
