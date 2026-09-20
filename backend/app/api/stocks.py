"""
Stock Research, Charts, Technicals, Fundamentals, Comparisons, Corporate Actions, and Screener API routes.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from app.schemas.stock import (
    StockQuote,
    HistoricalCandle,
    TechnicalIndicatorsResponse,
    FundamentalData,
    NewsItem,
    DocumentItem,
    ScreenerFilterRequest,
    CorporateActionItem,
    BulkBlockDealItem,
    InsiderTradeItem,
    IndexConstituentChange,
    UnifiedSearchResult,
    ProviderHealthResponse
)
from app.services.market_service import MarketService
from app.providers.market_data import market_data_provider
from app.providers.multi_asset_data import ETFS_DATA
from app.providers.amfi_provider import amfi_provider
from app.providers.rbi_provider import rbi_provider
from app.schemas.forecast import TrendForecastResponse
from app.services.forecast_service import TrendForecastService
from app.services.library_capabilities import get_library_capabilities
from app.services.screen_parser import parse_screen_query
from app.services.stock_score_service import build_stock_score

router = APIRouter(prefix="/stocks", tags=["Stock Research & Analytics"])


@router.get("/health", response_model=ProviderHealthResponse)
def get_market_data_health():
    """Check health and connectivity status of market data feeds."""
    return market_data_provider.get_health_status()


@router.get("/capabilities", response_model=List[Dict[str, Any]])
def get_finance_library_capabilities():
    """Report installed finance libraries and whether NEXUS actively uses them."""
    return get_library_capabilities()


@router.get("/search", response_model=List[StockQuote])
def search_stocks(q: str = Query(..., min_length=1, description="Symbol or company name search query")):
    """Instant search for Indian equities (supports any NSE/BSE ticker)."""
    return market_data_provider.search_stocks(q)


@router.get("/search/unified", response_model=List[UnifiedSearchResult])
def search_unified(q: str = Query(..., min_length=1, description="Cross-asset search query")):
    """
    Search across Equities, Mutual Funds, ETFs, Sovereign Bonds, and Sectors.
    """
    q_norm = q.strip().upper()
    results: List[UnifiedSearchResult] = []

    # 1. Equities
    quotes = market_data_provider.search_stocks(q)
    for q_item in quotes[:8]:
        results.append(UnifiedSearchResult(
            symbol=q_item.symbol,
            name=q_item.company_name,
            asset_class="EQUITY",
            sector_or_category=q_item.sector,
            exchange="NSE",
            current_price=q_item.current_price,
            change_1d_pct=q_item.change_1d_pct
        ))

    # 2. ETFs with live quotes when available
    for etf in ETFS_DATA:
        searchable = q_norm in etf["symbol"] or q_norm in etf["name"].upper() or q_norm in etf.get("underlying_index", "").upper()
        if searchable:
            quote = market_data_provider.get_quote(etf["symbol"])
            results.append(UnifiedSearchResult(
                symbol=etf["symbol"],
                name=etf["name"],
                asset_class="ETF",
                sector_or_category=etf.get("underlying_index"),
                exchange="NSE",
                current_price=quote.current_price if quote else None,
                change_1d_pct=quote.change_1d_pct if quote else None,
            ))

    # 3. RBI-backed sovereign bonds
    for bond in rbi_provider.get_gsec_bonds():
        searchable = q_norm in bond["symbol"] or q_norm in bond["name"].upper()
        if searchable:
            results.append(UnifiedSearchResult(
                symbol=bond["symbol"],
                name=bond["name"],
                asset_class="BOND",
                sector_or_category=bond.get("bond_type"),
                exchange="RBI / CCIL",
                current_price=bond.get("market_price"),
                change_1d_pct=None,
            ))

    # 4. Mutual funds with live AMFI NAV
    for fund in amfi_provider.get_all_funds(search_query=q)[:5]:
        results.append(UnifiedSearchResult(
            symbol=fund["id"],
            name=fund["scheme_name"],
            asset_class="MUTUAL_FUND",
            sector_or_category=fund.get("category"),
            exchange="Direct NAV",
            current_price=fund.get("nav"),
            change_1d_pct=None,
        ))

    return results[:20]


@router.get("/compare", response_model=Dict[str, Any])
def compare_stocks(symbols: str = Query(..., description="Comma-separated symbols, e.g. RELIANCE,TCS,HINDUNILVR")):
    """
    Multi-stock fundamental comparison, normalized historical performance, and peer ranking.
    """
    sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()][:5]
    if not sym_list:
        raise HTTPException(status_code=400, detail="At least one valid symbol is required.")

    quotes: List[Dict[str, Any]] = []
    fundamentals: List[Dict[str, Any]] = []
    histories: Dict[str, List[HistoricalCandle]] = {}

    for sym in sym_list:
        q = MarketService.get_quote(sym)
        if q:
            quotes.append(q.model_dump())
        f = MarketService.get_fundamentals(sym)
        if f:
            fundamentals.append(f.model_dump())
        h = MarketService.get_historical_candles(sym, "6M")
        if h:
            histories[sym] = h

    # Compute normalized performance (% return from first candle)
    normalized_series: List[Dict[str, Any]] = []
    if histories:
        # Determine common dates
        all_dates = sorted(list(set(c.time for h in histories.values() for c in h)))
        base_prices = {}
        for sym, candles in histories.items():
            if candles:
                base_prices[sym] = candles[0].close

        for d in all_dates:
            row: Dict[str, Any] = {"date": d}
            for sym, candles in histories.items():
                match = next((c for c in candles if c.time == d), None)
                if match and base_prices.get(sym, 0) > 0:
                    pct = ((match.close - base_prices[sym]) / base_prices[sym]) * 100
                    row[sym] = round(pct, 2)
            normalized_series.append(row)

    return {
        "symbols": sym_list,
        "quotes": quotes,
        "fundamentals": fundamentals,
        "normalized_performance": normalized_series,
        "as_of": ""
    }


@router.get("/{symbol}/quote", response_model=StockQuote)
def get_stock_quote(symbol: str):
    """Get real-time quote for a specific equity symbol."""
    quote = MarketService.get_quote(symbol)
    if not quote:
        raise HTTPException(status_code=404, detail=f"Stock symbol '{symbol}' not found.")
    return quote


@router.get("/{symbol}/history", response_model=List[HistoricalCandle])
def get_stock_history(
    symbol: str,
    timeframe: str = Query("1M", pattern="^(1D|1W|1M|6M|1Y|5Y)$", description="TradingView chart timeframe")
):
    """Retrieve OHLCV candle series formatted for TradingView Lightweight Charts."""
    return MarketService.get_historical_candles(symbol, timeframe)


@router.get("/{symbol}/technicals", response_model=TechnicalIndicatorsResponse)
def get_technical_indicators(symbol: str):
    """Retrieve technical indicators and candlestick pattern intelligence."""
    try:
        return MarketService.get_technical_indicators(symbol)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{symbol}/forecast", response_model=TrendForecastResponse)
def get_stock_forecast(
    symbol: str,
    days: int = Query(5, ge=3, le=15, description="Forecast horizon in trading sessions")
):
    """
    Retrieve statistical trend estimation and 95% Gaussian confidence bands via statsmodels ARIMA.
    Strictly educational and non-predictive.
    """
    return TrendForecastService.generate_forecast(symbol, horizon_days=days)


@router.get("/{symbol}/fundamentals", response_model=FundamentalData)
def get_stock_fundamentals(symbol: str):
    """Retrieve audited valuation multiples, margins, promoter pledge, and balance sheet metrics."""
    fund = MarketService.get_fundamentals(symbol)
    if not fund:
        raise HTTPException(status_code=404, detail=f"Fundamentals not found for '{symbol}'.")
    return fund


@router.get("/{symbol}/fundamentals/history", response_model=Dict[str, Any])
def get_historical_fundamentals(symbol: str):
    """Retrieve annual sourced statement series and sales, profit, EPS, and FCF CAGRs."""
    history = MarketService.get_historical_fundamentals(symbol)
    if not history:
        raise HTTPException(status_code=404, detail=f"Historical fundamentals not available for '{symbol}'.")
    return history


@router.get("/{symbol}/valuation-bands", response_model=Dict[str, Any])
def get_valuation_bands(symbol: str):
    """Compare current P/E and P/B with sourced historical observation bands."""
    bands = MarketService.get_valuation_bands(symbol)
    if not bands:
        raise HTTPException(status_code=404, detail=f"Historical valuation bands not available for '{symbol}'.")
    return bands


@router.get("/{symbol}/score", response_model=Dict[str, Any])
def get_stock_score(symbol: str):
    """Return a transparent descriptive score from available data only."""
    fundamentals = MarketService.get_fundamentals(symbol)
    if not fundamentals:
        raise HTTPException(status_code=404, detail=f"Fundamentals not found for '{symbol}'.")
    try:
        technicals = MarketService.get_technical_indicators(symbol)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return build_stock_score(fundamentals, technicals)


@router.get("/{symbol}/corporate-actions", response_model=List[CorporateActionItem])
def get_corporate_actions(symbol: str):
    """Retrieve corporate actions: dividends, bonus issues, splits, rights, buybacks."""
    return MarketService.get_corporate_actions(symbol)


@router.get("/{symbol}/sourced-events", response_model=List[Dict[str, Any]])
def get_sourced_events(symbol: str):
    """Retrieve deduplicated Yahoo Finance earnings, dividends, splits, and news events."""
    return MarketService.get_sourced_events(symbol)


@router.get("/{symbol}/bulk-deals", response_model=List[BulkBlockDealItem])
def get_bulk_block_deals(symbol: str):
    """Retrieve bulk and block deals disclosures from exchanges."""
    return MarketService.get_bulk_block_deals(symbol)


@router.get("/{symbol}/insider-trades", response_model=List[InsiderTradeItem])
def get_insider_trades(symbol: str):
    """Retrieve insider trading filings under SEBI PIT regulations."""
    return MarketService.get_insider_trades(symbol)


@router.get("/indices/constituent-changes", response_model=List[IndexConstituentChange])
def get_index_constituent_changes(index_name: Optional[str] = Query(None, description="e.g. NIFTY 50")):
    """Historical additions and removals from major benchmarks for survivorship bias awareness."""
    return MarketService.get_index_constituent_changes(index_name)


@router.get("/{symbol}/news", response_model=List[NewsItem])
def get_stock_news(symbol: str):
    """Retrieve verified news and market sentiment for equity."""
    return MarketService.get_news(symbol)


@router.get("/{symbol}/documents", response_model=List[DocumentItem])
def get_stock_documents(symbol: str):
    """Retrieve annual reports and filings for RAG exploration."""
    return MarketService.get_documents(symbol)


@router.post("/screener", response_model=List[Dict[str, Any]])
def run_screener(filters: ScreenerFilterRequest):
    """Run institutional multi-factor equity screener."""
    return MarketService.run_screener(filters)


@router.get("/screener/parse", response_model=Dict[str, Any])
def parse_screener_query(q: str = Query(..., min_length=2, description="Explicit screener conditions")):
    """Translate explicit natural-language conditions into reviewable screener filters."""
    return parse_screen_query(q)
