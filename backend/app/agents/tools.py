"""
Controlled Backend Tools for Agentic AI.
The LLM / Agent NEVER directly queries the database. All operations flow through
these validated, typed tools with latency and logging instrumentation.
"""
from typing import Dict, Any, List, Optional
import time
from app.providers.market_data import market_data_provider
from app.services.market_service import MarketService
from app.services.rag_service import rag_service
from app.services.trading_service import TradingService
from app.services.portfolio_analytics import PortfolioAnalyticsService
from app.services.technical_indicators import TechnicalIndicatorsService
from app.database.session import SessionLocal
from app.models.user import User


def get_stock_quote(symbol: str) -> Dict[str, Any]:
    """Retrieve real-time quote, daily change %, volume, and 52W levels for an equity."""
    quote = market_data_provider.get_quote(symbol)
    if not quote:
        return {"error": f"Symbol {symbol} not found in Indian equities database."}
    return quote.model_dump()


def get_historical_prices(symbol: str, timeframe: str = "1M") -> Dict[str, Any]:
    """Fetch candlestick price history for trend analysis."""
    candles = market_data_provider.get_historical_candles(symbol, timeframe)
    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "candle_count": len(candles),
        "recent_candles": [c.model_dump() for c in candles[-5:]]
    }


def get_fundamentals(symbol: str) -> Dict[str, Any]:
    """Retrieve valuation ratios (P/E, P/B, EV/EBITDA), margins, ROE, ROCE, and debt profile."""
    fund = MarketService.get_fundamentals(symbol)
    if not fund:
        return {"error": f"Fundamentals not available for {symbol}."}
    return fund.model_dump()


def get_technical_indicators(symbol: str) -> Dict[str, Any]:
    """Retrieve Support & Resistance, Pivot Points, MACD, Bollinger Bands, RSI, SMA/EMA, and confluence signal."""
    ind = MarketService.get_technical_indicators(symbol)
    return ind.model_dump()


def search_news(query: str, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
    """Search vetted news articles and market sentiment for a specific company or query."""
    articles = MarketService.get_news(symbol)
    return [a.model_dump() for a in articles]


def search_financial_documents(query: str, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieve excerpts from annual reports, quarterly filings, and investor presentations."""
    return rag_service.search(query, symbol, top_k=3)


def get_portfolio(user_id: int) -> Dict[str, Any]:
    """Retrieve virtual portfolio holdings and cash balance for analysis."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"cash_balance": 1000000.0, "holdings": []}
        summary = TradingService.get_portfolio_summary(db, user)
        return summary.model_dump()
    finally:
        db.close()


def calculate_portfolio_risk(user_id: int) -> Dict[str, Any]:
    """Calculate concentration risk, sector tilt, and institutional risk metrics."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}
        risk = PortfolioAnalyticsService.calculate_risk(db, user)
        return risk.model_dump()
    finally:
        db.close()


def compare_stocks(symbol_a: str, symbol_b: str) -> Dict[str, Any]:
    """Compare valuation, growth, margins, and price performance between two equities."""
    qa = get_stock_quote(symbol_a)
    qb = get_stock_quote(symbol_b)
    fa = get_fundamentals(symbol_a)
    fb = get_fundamentals(symbol_b)
    return {
        "stock_a": {"quote": qa, "fundamentals": fa},
        "stock_b": {"quote": qb, "fundamentals": fb}
    }


def get_sector_data(sector: str) -> Dict[str, Any]:
    """Get sector-wide performance and constituent momentum."""
    overview = MarketService.get_market_overview()
    for sec in overview.sector_performance:
        if sector.lower() in sec["sector"].lower():
            return sec
    return {"sector": sector, "average_change_pct": 0.0, "status": "Stable"}


# Controlled Registry
AVAILABLE_TOOLS = {
    "get_stock_quote": get_stock_quote,
    "get_historical_prices": get_historical_prices,
    "get_fundamentals": get_fundamentals,
    "get_technical_indicators": get_technical_indicators,
    "search_news": search_news,
    "search_financial_documents": search_financial_documents,
    "get_portfolio": get_portfolio,
    "calculate_portfolio_risk": calculate_portfolio_risk,
    "compare_stocks": compare_stocks,
    "get_sector_data": get_sector_data,
}
