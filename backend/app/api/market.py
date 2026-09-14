"""
Market Overview and Indices API routes.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from app.schemas.stock import MarketOverviewResponse, IndexQuote
from app.services.market_service import MarketService
from app.services.reference_data_service import ReferenceDataService

router = APIRouter(prefix="/market", tags=["Market Intelligence"])


@router.get("/overview", response_model=MarketOverviewResponse)
def get_market_overview():
    """Retrieve top indices, movers, market breadth advance/decline, and sector performance."""
    return MarketService.get_market_overview()


@router.get("/indices", response_model=List[IndexQuote])
def get_indices():
    """Retrieve NIFTY 50, SENSEX, NIFTY BANK, NIFTY IT quotes."""
    return MarketService.get_indices()


@router.get("/reference", response_model=List[Dict[str, str]])
def list_reference_datasets():
    """List curated reference datasets isolated from current market views."""
    return ReferenceDataService.list_reference_datasets()


@router.get("/reference/{dataset_id}", response_model=List[Dict[str, Any]])
def get_reference_dataset(dataset_id: str, symbol: Optional[str] = Query(None)):
    """Retrieve curated reference fixtures explicitly labeled as non-current data."""
    return ReferenceDataService.get_dataset(dataset_id, symbol=symbol)
