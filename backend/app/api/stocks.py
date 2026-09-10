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

router = APIRouter(prefix="/stocks", tags=["Stock Research & Analytics"])


@router.get("/health", response_model=ProviderHealthResponse)
def get_market_data_health():
    """Check health and connectivity status of market data feeds."""
    return market_data_provider.get_health_status()


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

    # 2. Key ETFs
    etf_list = [
        {"symbol": "NIFTYBEES", "name": "Nippon India ETF Nifty 50 BeES", "cat": "Large Cap Equity ETF", "price": 272.50, "chg": 0.52},
        {"symbol": "GOLDBEES", "name": "Nippon India ETF Gold BeES", "cat": "Commodities Gold ETF", "price": 64.80, "chg": 0.35},
        {"symbol": "BANKBEES", "name": "Nippon India ETF Bank BeES", "cat": "Banking Sector ETF", "price": 512.40, "chg": -0.22},
        {"symbol": "LIQUIDBEES", "name": "Nippon India ETF Liquid BeES", "cat": "Money Market / Cash", "price": 1000.00, "chg": 0.02},
        {"symbol": "JUNIORBEES", "name": "Nippon India ETF Nifty Next 50", "cat": "Next 50 Large Cap", "price": 745.20, "chg": 0.65},
    ]
    for etf in etf_list:
        if q_norm in etf["symbol"] or q_norm in etf["name"].upper() or q_norm in etf["cat"].upper():
            results.append(UnifiedSearchResult(
                symbol=etf["symbol"],
                name=etf["name"],
                asset_class="ETF",
                sector_or_category=etf["cat"],
                exchange="NSE",
                current_price=etf["price"],
                change_1d_pct=etf["chg"]
            ))

    # 3. Sovereign Bonds
    bond_list = [
        {"symbol": "GS2033-7.18", "name": "7.18% Government of India Sovereign Bond 2033", "cat": "G-Sec 10Y Benchmark", "price": 100.85, "chg": 0.05},
        {"symbol": "GS2034-7.10", "name": "7.10% Government of India Sovereign Bond 2034", "cat": "G-Sec Benchmark", "price": 100.20, "chg": 0.03},
        {"symbol": "NABARD-7.65", "name": "NABARD AAA Corporate Infrastructure Bond 2029", "cat": "AAA Corporate / PSU", "price": 101.40, "chg": 0.02},
    ]
    for b in bond_list:
        if q_norm in b["symbol"] or q_norm in b["name"].upper() or q_norm in b["cat"].upper():
            results.append(UnifiedSearchResult(
                symbol=b["symbol"],
                name=b["name"],
                asset_class="BOND",
                sector_or_category=b["cat"],
                exchange="NSE / CCIL",
                current_price=b["price"],
                change_1d_pct=b["chg"]
            ))

    # 4. Mutual Funds
    mf_list = [
        {"symbol": "PPFC-FLEXI", "name": "Parag Parikh Flexi Cap Fund", "cat": "Flexi Cap Equity", "price": 84.50, "chg": 0.45},
        {"symbol": "HDFC-TOP100", "name": "HDFC Top 100 Large Cap Fund", "cat": "Large Cap Equity", "price": 1120.30, "chg": 0.50},
        {"symbol": "SBI-SMALLCAP", "name": "SBI Small Cap Fund Active Growth", "cat": "Small Cap Equity", "price": 178.40, "chg": 0.72},
    ]
    for m in mf_list:
        if q_norm in m["symbol"] or q_norm in m["name"].upper() or q_norm in m["cat"].upper():
            results.append(UnifiedSearchResult(
                symbol=m["symbol"],
                name=m["name"],
                asset_class="MUTUAL_FUND",
                sector_or_category=m["cat"],
                exchange="Direct NAV",
                current_price=m["price"],
                change_1d_pct=m["chg"]
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
        "as_of": "Q1 FY26"
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
    return MarketService.get_technical_indicators(symbol)


@router.get("/{symbol}/fundamentals", response_model=FundamentalData)
def get_stock_fundamentals(symbol: str):
    """Retrieve audited valuation multiples, margins, promoter pledge, and balance sheet metrics."""
    fund = MarketService.get_fundamentals(symbol)
    if not fund:
        raise HTTPException(status_code=404, detail=f"Fundamentals not found for '{symbol}'.")
    return fund


@router.get("/{symbol}/corporate-actions", response_model=List[CorporateActionItem])
def get_corporate_actions(symbol: str):
    """Retrieve corporate actions: dividends, bonus issues, splits, rights, buybacks."""
    return MarketService.get_corporate_actions(symbol)


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
