"""
Investment Journal Schemas.
"""
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class JournalCreateRequest(BaseModel):
    symbol: str
    thesis: str
    strategy_tag: str = "SWING"  # VALUE, GROWTH, BREAKOUT, SWING, MOMENTUM
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    expected_timeframe: str = "1-3 Months"
    notes: Optional[str] = None
    transaction_id: Optional[int] = None


class JournalResponse(BaseModel):
    id: int
    user_id: int
    symbol: str
    thesis: str
    strategy_tag: str
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    expected_timeframe: str
    notes: Optional[str] = None
    outcome_pnl: Optional[float] = None
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class StrategyMetric(BaseModel):
    strategy: str
    total_trades: int
    winning_trades: int
    win_rate_pct: float
    total_pnl: float
    avg_return_pct: float


class JournalSummaryResponse(BaseModel):
    entries: List[JournalResponse]
    strategy_breakdown: List[StrategyMetric]
    overall_win_rate: float
    total_journaled_pnl: float
