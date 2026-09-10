"""
Stock, Market, Screener, Technical Indicator, Corporate Actions, and Unified Search schemas.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class StockQuote(BaseModel):
    symbol: str
    company_name: str
    sector: Optional[str] = None
    industry: Optional[str] = None
    current_price: float
    change_1d: float
    change_1d_pct: float
    open_price: float
    high_price: float
    low_price: float
    previous_close: float
    volume: float
    week_52_high: float
    week_52_low: float
    market_cap: Optional[float] = None
    description: Optional[str] = None
    data_source: Optional[str] = "NSE/BSE Delayed 15m"
    as_of: Optional[str] = None


class IndexQuote(BaseModel):
    symbol: str
    name: str
    current_value: float
    change_1d: float
    change_1d_pct: float
    high: float
    low: float
    previous_close: float


class HistoricalCandle(BaseModel):
    time: str  # YYYY-MM-DD or ISO timestamp for TradingView
    open: float
    high: float
    low: float
    close: float
    volume: float


class PivotPoints(BaseModel):
    pivot: float
    r1: float
    r2: float
    r3: float
    s1: float
    s2: float
    s3: float


class SupportResistanceLevels(BaseModel):
    classic: PivotPoints
    fibonacci: PivotPoints
    key_support_zone: List[float]
    key_resistance_zone: List[float]
    nearest_support: float
    nearest_resistance: float


class MACDIndicator(BaseModel):
    macd: float
    signal: float
    histogram: float
    trend: str  # BULLISH, BEARISH


class BollingerBandsIndicator(BaseModel):
    upper: float
    middle: float
    lower: float
    bandwidth: float
    percent_b: float


class StochasticIndicator(BaseModel):
    k: float
    d: float
    status: str  # OVERBOUGHT, OVERSOLD, NEUTRAL


class IchimokuCloudIndicator(BaseModel):
    tenkan_sen: float
    kijun_sen: float
    senkou_span_a: float
    senkou_span_b: float
    chikou_span: float
    cloud_signal: str  # BULLISH_CLOUD, BEARISH_CLOUD, NEUTRAL


class CandlestickPatternAnnotation(BaseModel):
    time: str
    candle_index: int
    pattern_name: str
    pattern_type: str  # REVERSAL_BULLISH, REVERSAL_BEARISH, CONTINUATION, INDECISION
    price: float
    candle_structure: str
    historical_observation: str  # Strictly non-predictive observation of past occurrences


class TechnicalIndicatorsResponse(BaseModel):
    symbol: str
    current_price: float
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    sma_200: Optional[float] = None
    ema_9: Optional[float] = None
    ema_21: Optional[float] = None
    ema_50: Optional[float] = None
    vwap: Optional[float] = None
    rsi_14: float
    rsi_status: str  # OVERBOUGHT, OVERSOLD, NEUTRAL
    macd: MACDIndicator
    bollinger_bands: BollingerBandsIndicator
    atr_14: float
    adx_14: Optional[float] = None
    stochastic: Optional[StochasticIndicator] = None
    ichimoku: Optional[IchimokuCloudIndicator] = None
    patterns: List[CandlestickPatternAnnotation] = []
    support_resistance: SupportResistanceLevels
    overall_signal: str  # STRONG_BUY, BUY, NEUTRAL, SELL, STRONG_SELL
    bullish_factors: List[str]
    bearish_factors: List[str]


class FundamentalData(BaseModel):
    symbol: str
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    ev_to_ebitda: Optional[float] = None
    roe: Optional[float] = None
    roce: Optional[float] = None
    debt_to_equity: Optional[float] = None
    dividend_yield: Optional[float] = None
    revenue_growth_yoy: Optional[float] = None
    profit_growth_yoy: Optional[float] = None
    eps: Optional[float] = None
    operating_margin: Optional[float] = None
    net_margin: Optional[float] = None
    total_debt: Optional[float] = None
    free_cash_flow: Optional[float] = None
    promoter_holding: Optional[float] = None
    promoter_pledge_pct: Optional[float] = 0.0
    fii_holding: Optional[float] = None
    dii_holding: Optional[float] = None
    rsi_14: Optional[float] = None
    source: str = "Audited Annual Reports & BSE/NSE Filings"
    as_of_date: Optional[str] = "Q1 FY26"
    shareholding_trend: Optional[List[Dict[str, Any]]] = None


class CorporateActionItem(BaseModel):
    symbol: str
    company_name: str
    action_type: str  # DIVIDEND, SPLIT, BONUS, RIGHTS, BUYBACK
    ex_date: str
    record_date: Optional[str] = None
    details: str
    impact_summary: str


class BulkBlockDealItem(BaseModel):
    symbol: str
    company_name: str
    deal_type: str  # BULK or BLOCK
    trade_date: str
    client_name: str
    deal_side: str  # BUY or SELL
    quantity: int
    trade_price: float
    value_in_cr: float


class InsiderTradeItem(BaseModel):
    symbol: str
    insider_name: str
    designation: str
    regulation: str  # SEBI PIT Reg 7(2)
    transaction_type: str  # MARKET_PURCHASE, ESOP_ALLOTMENT, SALE
    quantity: int
    value_in_lakhs: float
    filing_date: str


class IndexConstituentChange(BaseModel):
    index_name: str
    effective_date: str
    added_symbol: Optional[str] = None
    removed_symbol: Optional[str] = None
    reason: str


class UnifiedSearchResult(BaseModel):
    symbol: str
    name: str
    asset_class: str  # EQUITY, MUTUAL_FUND, ETF, BOND, COMMODITY, SECTOR
    sector_or_category: Optional[str] = None
    exchange: Optional[str] = "NSE"
    current_price: Optional[float] = None
    change_1d_pct: Optional[float] = None


class ProviderHealthResponse(BaseModel):
    status: str  # OPERATIONAL, DEGRADED, OFFLINE
    provider_name: str
    latency_ms: int
    last_sync: str
    active_endpoints: int
    offline_fallback_ready: bool


class NewsItem(BaseModel):
    id: Optional[int] = None
    symbol: Optional[str] = None
    headline: str
    summary: Optional[str] = None
    source: str
    url: Optional[str] = None
    sentiment: str
    sentiment_score: float
    published_at: str


class DocumentItem(BaseModel):
    id: int
    symbol: str
    title: str
    doc_type: str
    fiscal_year: Optional[str] = None
    content: str
    created_at: str


class MarketOverviewResponse(BaseModel):
    indices: List[IndexQuote]
    top_gainers: List[StockQuote]
    top_losers: List[StockQuote]
    most_active: List[StockQuote]
    market_breadth: Dict[str, Any]
    sector_performance: List[Dict[str, Any]]


class ScreenerFilterRequest(BaseModel):
    min_market_cap: Optional[float] = None
    max_market_cap: Optional[float] = None
    min_pe: Optional[float] = None
    max_pe: Optional[float] = None
    min_roe: Optional[float] = None
    max_debt_equity: Optional[float] = None
    min_dividend_yield: Optional[float] = None
    min_rsi: Optional[float] = None
    max_rsi: Optional[float] = None
    sector: Optional[str] = None
    sort_by: Optional[str] = "market_cap"
    sort_dir: Optional[str] = "desc"
    limit: Optional[int] = 50
