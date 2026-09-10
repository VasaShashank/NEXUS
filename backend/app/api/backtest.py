"""
Quant Research Lab Backtesting & Factor Research API.
"""
from typing import Dict, Any, List
from fastapi import APIRouter, Query
from pydantic import BaseModel
from app.services.backtesting_service import BacktestService

router = APIRouter(prefix="/backtest", tags=["Quant Research Lab"])


class SMAStrategyRequest(BaseModel):
    symbol: str = "RELIANCE"
    fast_period: int = 20
    slow_period: int = 50
    initial_capital: float = 1000000.0
    slippage_bps: float = 10.0
    in_sample_ratio: float = 0.70


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
