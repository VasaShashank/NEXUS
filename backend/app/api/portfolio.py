"""
Portfolio and Paper Trading API routes.
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.session import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.portfolio import (
    OrderCreateRequest,
    OrderResponse,
    PortfolioSummaryResponse,
    PortfolioAnalyticsResponse,
    PortfolioRiskResponse
)
from app.services.trading_service import TradingService
from app.services.portfolio_analytics import PortfolioAnalyticsService

router = APIRouter(prefix="/portfolio", tags=["Portfolio Intelligence & Paper Trading"])


class RebalanceRequest(BaseModel):
    target_allocations: Dict[str, float]  # e.g. {"RELIANCE": 25.0, "TCS": 25.0, "HDFCBANK": 25.0, "INFY": 25.0}


@router.get("/summary", response_model=PortfolioSummaryResponse)
def get_portfolio_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve portfolio valuation, holdings with live prices, cash, and P&L breakdown."""
    return TradingService.get_portfolio_summary(db, current_user)


@router.post("/order", response_model=OrderResponse)
def execute_order(
    order: OrderCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Execute simulated paper trade Buy or Sell order."""
    return TradingService.execute_order(db, current_user, order)


@router.get("/analytics", response_model=PortfolioAnalyticsResponse)
def get_portfolio_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Calculate institutional performance metrics: CAGR, XIRR, Sharpe, Beta, Drawdown, Equity Curve."""
    return PortfolioAnalyticsService.calculate_analytics(db, current_user)


@router.get("/risk", response_model=PortfolioRiskResponse)
def get_portfolio_risk(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Diagnose concentration risk, sector exposures, and diversification health."""
    return PortfolioAnalyticsService.calculate_risk(db, current_user)


@router.get("/stress-test", response_model=Dict[str, Any])
def get_stress_testing(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Run stress testing across market crashes, crude surges, and rate hike scenarios."""
    return PortfolioAnalyticsService.calculate_stress_testing(db, current_user)


@router.get("/hidden-exposure", response_model=Dict[str, Any])
def get_hidden_exposure(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Look-through exposure across direct stocks and ETF constituent wrappers."""
    return PortfolioAnalyticsService.calculate_hidden_exposure(db, current_user)


@router.post("/rebalance-simulate", response_model=Dict[str, Any])
def simulate_rebalancing(
    payload: RebalanceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Simulate portfolio rebalancing to target allocations with hypothetical trade requirements."""
    return PortfolioAnalyticsService.simulate_rebalancing(db, current_user, payload.target_allocations)


@router.post("/reset", response_model=PortfolioSummaryResponse)
def reset_virtual_portfolio(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reset virtual cash balance to ₹10,00,000 and clear all positions."""
    return TradingService.reset_virtual_portfolio(db, current_user)
