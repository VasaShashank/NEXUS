"""
Quant Research Lab Backtesting & Factor Research API.
"""
from typing import Dict, Any, List
from fastapi import APIRouter, Query
from pydantic import BaseModel
from app.services.backtesting_service import BacktestService
from app.services.quant_research_service import QuantResearchService

router = APIRouter(prefix="/backtest", tags=["Quant Research Lab"])


class SMAStrategyRequest(BaseModel):
    symbol: str = "RELIANCE"
    fast_period: int = 20
    slow_period: int = 50
    initial_capital: float = 1000000.0
    slippage_bps: float = 10.0
    in_sample_ratio: float = 0.70


class WalkForwardRequest(BaseModel):
    symbol: str = "RELIANCE"
    fast_periods: List[int] = [10, 20, 30]
    slow_periods: List[int] = [50, 100, 150]
    train_window: int = 252
    test_window: int = 63
    step: int = 63


@router.post("/sma-crossover", response_model=Dict[str, Any])
def run_sma_backtest(payload: SMAStrategyRequest):
    """
    Run quantitative dual SMA crossover backtest with In-Sample and Out-of-Sample separation.
    """
    return BacktestService.run_sma_crossover(
        symbol=payload.symbol,
        fast_period=payload.fast_period,
        slow_period=payload.slow_period,
        initial_capital=payload.initial_capital,
        slippage_bps=payload.slippage_bps,
        in_sample_ratio=payload.in_sample_ratio
    )


@router.get("/factors", response_model=List[Dict[str, Any]])
def get_factors():
    """Retrieve descriptive quantitative factor intelligence profiles."""
    return BacktestService.get_factor_research()


@router.get("/similarity", response_model=Dict[str, Any])
def get_similarity(symbols: str = Query(..., description="Comma-separated symbols"), correlation_threshold: float = Query(0.7, ge=-1, le=1)):
    """Compare historical return similarity and form descriptive correlation clusters."""
    return QuantResearchService.similarity_and_clusters(symbols.split(","), correlation_threshold)


@router.get("/anomalies/{symbol}", response_model=Dict[str, Any])
def get_anomalies(symbol: str, z_threshold: float = Query(3.0, ge=1.0, le=10.0)):
    """Identify unusual historical return or volume observations."""
    return QuantResearchService.anomalies(symbol, z_threshold)


@router.post("/walk-forward", response_model=Dict[str, Any])
def run_walk_forward(payload: WalkForwardRequest):
    """Run leakage-aware rolling train/test evaluation for SMA parameters."""
    return QuantResearchService.walk_forward(
        payload.symbol,
        payload.fast_periods,
        payload.slow_periods,
        payload.train_window,
        payload.test_window,
        payload.step,
    )
