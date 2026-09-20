"""
Market Overview and Indices API routes.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Query
from app.core.cache import ttl_cache
from app.schemas.stock import MarketOverviewResponse, IndexQuote, NewsItem
from app.services.market_service import MarketService
from app.services.reference_data_service import ReferenceDataService

router = APIRouter(prefix="/market", tags=["Market Intelligence"])


@router.get("/overview", response_model=MarketOverviewResponse)
def get_market_overview():
    """Retrieve top indices, movers, market breadth advance/decline, and sector performance."""
    return MarketService.get_market_overview()


@router.get("/news", response_model=List[NewsItem])
@ttl_cache(ttl_seconds=300)
def get_top_market_news(limit: int = Query(6, ge=1, le=12)):
    """Aggregate recent headlines for today's market movers (live provider news)."""
    overview = MarketService.get_market_overview()

    movers: List[str] = []
    for bucket in (overview.top_gainers, overview.top_losers, overview.most_active):
        for quote in bucket:
            if len(movers) >= 9:
                break
            if quote.symbol not in movers:
                movers.append(quote.symbol)

    items: List[NewsItem] = []
    for symbol in movers:
        for news in MarketService.get_news(symbol)[:3]:
            items.append(NewsItem(
                id=news.id,
                symbol=news.symbol,
                headline=news.headline,
                summary=news.summary,
                source=news.source,
                url=news.url,
                sentiment=news.sentiment,
                sentiment_score=news.sentiment_score,
                published_at=news.published_at,
            ))
    items.sort(key=lambda n: n.published_at or "", reverse=True)
    return items[:limit]


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
