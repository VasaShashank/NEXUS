"""
Market Overview and Indices API routes.
"""
from typing import List
from fastapi import APIRouter
from app.schemas.stock import MarketOverviewResponse, IndexQuote
from app.services.market_service import MarketService

router = APIRouter(prefix="/market", tags=["Market Intelligence"])


@router.get("/overview", response_model=MarketOverviewResponse)
def get_market_overview():
    """Retrieve top indices, movers, market breadth advance/decline, and sector performance."""
    return MarketService.get_market_overview()


@router.get("/indices", response_model=List[IndexQuote])
def get_indices():
    """Retrieve NIFTY 50, SENSEX, NIFTY BANK, NIFTY IT quotes."""
    return MarketService.get_indices()
