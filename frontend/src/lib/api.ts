/**
 * NEXUS API Client
 * Connects to FastAPI backend with typed multi-asset endpoints and resilient fallbacks.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? "/api/v1"
    : "http://localhost:8000/api/v1");

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new Error(errorBody.detail || `Request failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    console.warn(`[API] fetch failed for ${endpoint}:`, err.message);
    throw err;
  }
}

export interface IndexQuote {
  symbol: string;
  name: string;
  current_value: number;
  change_1d: number;
  change_1d_pct: number;
  high: number;
  low: number;
  previous_close: number;
}

export interface StockQuote {
  symbol: string;
  company_name: string;
  sector?: string;
  industry?: string;
  current_price: number;
  change_1d: number;
  change_1d_pct: number;
  open_price: number;
  high_price: number;
  low_price: number;
  previous_close: number;
  volume: number;
  week_52_high: number;
  week_52_low: number;
  market_cap?: number;
  description?: string;
  data_source?: string;
  as_of?: string;
}

export interface FinanceLibraryCapability {
  library: string;
  installed: boolean;
  status: "active" | "active_optional" | "planned";
  purpose: string;
}

export interface HistoricalCandle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PivotPoints {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface SupportResistanceLevels {
  classic: PivotPoints;
  fibonacci: PivotPoints;
  key_support_zone: number[];
  key_resistance_zone: number[];
  nearest_support: number;
  nearest_resistance: number;
}

export interface MACDIndicator {
  macd: number;
  signal: number;
  histogram: number;
  trend: "BULLISH" | "BEARISH";
}

export interface BollingerBandsIndicator {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percent_b: number;
}

export interface CandlestickPatternAnnotation {
  time: string;
  candle_index: number;
  pattern_name: string;
  pattern_type: string;
  price: number;
  candle_structure: string;
  historical_observation: string;
}

export interface TechnicalIndicatorsResponse {
  symbol: string;
  current_price: number;
  sma_20?: number;
  sma_50?: number;
  sma_200?: number;
  ema_9?: number;
  ema_21?: number;
  ema_50?: number;
  vwap?: number;
  rsi_14: number;
  rsi_status: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL";
  macd: MACDIndicator;
  bollinger_bands: BollingerBandsIndicator;
  atr_14: number;
  adx_14?: number;
  stochastic?: {
    k: number;
    d: number;
    status: string;
  };
  ichimoku?: {
    tenkan_sen: number;
    kijun_sen: number;
    senkou_span_a: number;
    senkou_span_b: number;
    chikou_span: number;
    cloud_signal: string;
  };
  patterns?: CandlestickPatternAnnotation[];
  support_resistance: SupportResistanceLevels;
  overall_signal: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
  bullish_factors: string[];
  bearish_factors: string[];
}

export interface FundamentalData {
  symbol: string;
  market_cap?: number;
  pe_ratio?: number;
  pb_ratio?: number;
  ev_to_ebitda?: number;
  roe?: number;
  roce?: number;
  debt_to_equity?: number;
  dividend_yield?: number;
  revenue_growth_yoy?: number;
  profit_growth_yoy?: number;
  eps?: number;
  operating_margin?: number;
  net_margin?: number;
  total_debt?: number;
  free_cash_flow?: number;
  promoter_holding?: number;
  promoter_pledge_pct?: number;
  fii_holding?: number;
  dii_holding?: number;
  rsi_14?: number;
  source?: string;
  as_of_date?: string;
}

export interface HistoricalFundamentals {
  symbol: string;
  annual: Record<string, Array<{ period: string; value: number }>>;
  cagr: Record<string, number | null>;
  working_capital: {
    inventory_days: number | null;
    debtor_days: number | null;
    payable_days: number | null;
    cash_cycle_days: number | null;
  };
  source: string;
  as_of: string;
  methodology: string;
}

export interface AlertItem {
  id: number;
  symbol: string;
  condition: string;
  threshold?: number;
  active: boolean;
  triggered: boolean;
  current_value?: number;
  current_change_pct?: number;
  created_at?: string;
  last_triggered_at?: string;
}

export interface StockScoreResponse {
  symbol: string;
  overall_score: number;
  categories: Record<string, number>;
  strengths: string[];
  risks: string[];
  methodology: string;
  disclaimer: string;
}

export interface CorporateActionItem {
  symbol: string;
  company_name: string;
  action_type: string;
  ex_date: string;
  record_date?: string;
  details: string;
  impact_summary: string;
}

export interface BulkBlockDealItem {
  symbol: string;
  company_name: string;
  deal_type: string;
  trade_date: string;
  client_name: string;
  deal_side: string;
  quantity: number;
  trade_price: number;
  value_in_cr: number;
}

export interface InsiderTradeItem {
  symbol: string;
  insider_name: string;
  designation: string;
  regulation: string;
  transaction_type: string;
  quantity: number;
  value_in_lakhs: number;
  filing_date: string;
}

export interface UnifiedSearchResult {
  symbol: string;
  name: string;
  asset_class: "EQUITY" | "MUTUAL_FUND" | "ETF" | "BOND" | "COMMODITY" | "SECTOR";
  sector_or_category?: string;
  exchange?: string;
  current_price?: number;
  change_1d_pct?: number;
}

export interface ProviderHealthResponse {
  status: string;
  provider_name: string;
  latency_ms: number;
  last_sync: string;
  active_endpoints: number;
  offline_fallback_ready: boolean;
}

export interface StockCompareResponse {
  symbols: string[];
  quotes: StockQuote[];
  fundamentals: FundamentalData[];
  normalized_performance: Array<Record<string, any>>;
  as_of: string;
}

export interface MarketOverviewResponse {
  indices: IndexQuote[];
  top_gainers: StockQuote[];
  top_losers: StockQuote[];
  most_active: StockQuote[];
  market_breadth: {
    advancing: number;
    declining: number;
    unchanged: number;
    advance_decline_ratio: number;
    regime: "BULLISH" | "BEARISH" | "NEUTRAL";
  };
  sector_performance: Array<{
    sector: string;
    average_change_pct: number;
    constituents_count: number;
  }>;
}

export interface HoldingResponse {
  id: number;
  symbol: string;
  company_name: string;
  sector?: string;
  quantity: number;
  average_buy_price: number;
  current_price: number;
  invested_value: number;
  current_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  allocation_pct: number;
}

export interface PortfolioSummaryResponse {
  total_value: number;
  invested_value: number;
  cash_balance: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  realized_pnl: number;
  daily_pnl: number;
  daily_pnl_pct: number;
  holdings_count: number;
  holdings: HoldingResponse[];
}

export interface PortfolioAnalyticsResponse {
  cagr: number;
  xirr: number;
  annualized_volatility: number;
  sharpe_ratio: number;
  max_drawdown: number;
  beta_vs_nifty: number;
  alpha: number;
  win_rate: number;
  equity_curve: Array<{ date: string; portfolio_value: number; return_pct: number }>;
  benchmark_comparison: Array<{ date: string; benchmark_value: number; return_pct: number }>;
}

export interface PortfolioRiskResponse {
  overall_risk_score: "LOW" | "MODERATE" | "ELEVATED" | "HIGH";
  concentration_risk: {
    top_holding_pct: number;
    top_3_holdings_pct: number;
    top_sector_pct: number;
    is_concentrated: boolean;
    description: string;
  };
  sector_exposures: Array<{
    sector: string;
    value: number;
    percentage: number;
    risk_rating: string;
  }>;
  volatility_metric: number;
  max_drawdown_metric: number;
  diversification_score: number;
  actionable_warnings: string[];
  strengths: string[];
}

export interface StressTestResponse {
  total_portfolio_value: number;
  equity_capital_at_risk: number;
  cash_buffer: number;
  portfolio_beta: number;
  scenarios: Array<{
    id: string;
    scenario_name: string;
    category: string;
    market_shock_pct: number;
    portfolio_drawdown_pct: number;
    estimated_portfolio_pnl: number;
    post_shock_value: number;
    description: string;
    mitigating_factor: string;
  }>;
  compliance_label: string;
}

export interface HiddenExposureResponse {
  total_effective_exposure: number;
  look_through_holdings: Array<{
    symbol: string;
    company_name: string;
    direct_value: number;
    etf_indirect_value: number;
    total_effective_value: number;
    effective_weight_pct: number;
  }>;
  summary_note: string;
}

export interface WatchlistItem {
  id: number;
  name: string;
  symbols_count: number;
  symbols: string[];
  quotes: StockQuote[];
  created_at: string;
}

export interface TaxSummaryResponse {
  assessment_year: string;
  jurisdiction: string;
  realized_stcg: number;
  realized_ltcg: number;
  estimated_stcg_tax: number;
  estimated_ltcg_tax: number;
  total_estimated_tax_liability: number;
  ltcg_exemption_annual_limit: number;
  ltcg_exemption_remaining: number;
  unrealized_stcg: number;
  unrealized_ltcg: number;
  estimated_dividend_income: number;
  tax_lots: Array<{
    symbol: string;
    sell_date: string;
    quantity: number;
    sell_price: number;
    realized_pnl: number;
    holding_period: string;
    classification: string;
  }>;
  disclaimer: string;
}

export interface MutualFundItem {
  id: string;
  scheme_name: string;
  amc: string;
  category: string;
  aum_crores: number;
  expense_ratio: number;
  nav: number;
  cagr_1y: number;
  cagr_3y: number;
  cagr_5y: number;
  benchmark: string;
  risk_grade: string;
  min_sip: number;
  exit_load: string;
  top_holdings: Array<{ symbol: string; name: string; weight: number }>;
}

export interface ETFItem {
  symbol: string;
  name: string;
  underlying_index: string;
  nav: number;
  aum_crores: number;
  expense_ratio: number;
  tracking_error_pct: number;
  volume_daily: number;
  asset_class: string;
  constituents: Array<{ symbol: string; weight: number }>;
}

export interface BondItem {
  isin: string;
  symbol: string;
  name: string;
  issuer: string;
  bond_type: string;
  face_value: number;
  market_price: number;
  coupon_rate: number;
  payment_frequency: string;
  ytm: number;
  macauley_duration_years: number;
  modified_duration_years: number;
  maturity_date: string;
  credit_rating: string;
  seniority: string;
  taxation: string;
}

export interface CommodityFxItem {
  symbol: string;
  name: string;
  asset_class: string;
  unit: string;
  current_price: number;
  change_1d: number;
  change_1d_pct: number;
  week_52_high: number;
  week_52_low: number;
  annualized_volatility: number;
  as_of: string;
  macro_impact: string;
}

export interface MacroIndicatorItem {
  id: string;
  name: string;
  current_value: number | null;
  unit: string;
  frequency: string;
  trend: string;
  target_band: string;
  last_updated: string | null;
  historical_series: Array<{ period: string; value: number }>;
  sector_linkage: string;
  data_status?: string;
  source_url?: string;
}

export interface SMABacktestResponse {
  strategy_name: string;
  symbol: string;
  slippage_bps: number;
  in_sample_results: {
    start_date: string;
    end_date: string;
    initial_capital: number;
    ending_equity: number;
    total_return_pct: number;
    benchmark_return_pct: number;
    cagr_pct: number;
    annualized_volatility_pct: number;
    sharpe_ratio: number;
    max_drawdown_pct: number;
    total_trades: number;
    win_rate_pct: number;
    equity_curve: Array<{ date: string; equity: number; benchmark: number }>;
  };
  out_of_sample_results: {
    start_date: string;
    end_date: string;
    initial_capital: number;
    ending_equity: number;
    total_return_pct: number;
    benchmark_return_pct: number;
    cagr_pct: number;
    annualized_volatility_pct: number;
    sharpe_ratio: number;
    max_drawdown_pct: number;
    total_trades: number;
    win_rate_pct: number;
    equity_curve: Array<{ date: string; equity: number; benchmark: number }>;
  };
  survivorship_bias_note: string;
  disclaimer: string;
}

export interface AgentRunResponse {
  run_id: string;
  query: string;
  agent_type: string;
  state: string;
  executive_summary: string;
  structured_findings: {
    verified_facts: Record<string, any>;
    interpretation: string;
    uncertainties: string;
  };
  bull_case: string[];
  bear_case: string[];
  risks_to_monitor: string[];
  evidence_citations: Array<{
    source_type: string;
    title: string;
    reference: string;
    snippet: string;
  }>;
  tool_calls: Array<{
    tool_name: string;
    tool_input: Record<string, any>;
    tool_output: any;
    latency_ms: number;
    status: string;
  }>;
  tokens_estimated: number;
  latency_ms: number;
}

export interface WhyMovedResponse {
  symbol: string;
  company_name: string;
  change_1d_pct: number;
  volume_surge_ratio: number;
  sector_change_pct: number;
  market_change_pct: number;
  observed_factors: Array<{
    factor_name: string;
    category: string;
    impact: string;
    description: string;
  }>;
  interpretation: string;
  confidence_rating: "HIGH" | "MEDIUM" | "LOW";
  data_points: Record<string, any>;
}

export interface PortfolioDoctorResponse {
  overall_health: string;
  concentration_summary: string;
  sector_tilt_summary: string;
  primary_risks: string[];
  suggested_actions: string[];
  supporting_metrics: Record<string, any>;
}

export interface JournalResponse {
  id: number;
  user_id: number;
  symbol: string;
  thesis: string;
  strategy_tag: string;
  target_price?: number;
  stop_loss?: number;
  expected_timeframe: string;
  notes?: string;
  outcome_pnl?: number;
  created_at: string;
}

export interface JournalSummaryResponse {
  entries: JournalResponse[];
  strategy_breakdown: Array<{
    strategy: string;
    total_trades: number;
    winning_trades: number;
    win_rate_pct: number;
    total_pnl: number;
    avg_return_pct: number;
  }>;
  overall_win_rate: number;
  total_journaled_pnl: number;
}

export const api = {
  // Market
  getMarketOverview: () => fetchJson<MarketOverviewResponse>("/market/overview"),
  getIndices: () => fetchJson<IndexQuote[]>("/market/indices"),
  getProviderHealth: () => fetchJson<ProviderHealthResponse>("/stocks/health"),
  getBrokerHealth: () => fetchJson<any[]>("/brokers/health"),
  getPaperBrokerPositions: () => fetchJson<any[]>("/brokers/paper/positions"),
  getFinanceLibraryCapabilities: () => fetchJson<FinanceLibraryCapability[]>("/stocks/capabilities"),
  
  // Stocks
  searchStocks: (q: string) => fetchJson<StockQuote[]>(`/stocks/search?q=${encodeURIComponent(q)}`),
  searchUnified: (q: string) => fetchJson<UnifiedSearchResult[]>(`/stocks/search/unified?q=${encodeURIComponent(q)}`),
  getQuote: (symbol: string) => fetchJson<StockQuote>(`/stocks/${symbol}/quote`),
  getHistory: (symbol: string, timeframe: string = "1M") =>
    fetchJson<HistoricalCandle[]>(`/stocks/${symbol}/history?timeframe=${timeframe}`),
  getTechnicals: (symbol: string) => fetchJson<TechnicalIndicatorsResponse>(`/stocks/${symbol}/technicals`),
  getForecast: (symbol: string, days: number = 5) => fetchJson<any>(`/stocks/${symbol}/forecast?days=${days}`),
  getFundamentals: (symbol: string) => fetchJson<FundamentalData>(`/stocks/${symbol}/fundamentals`),
  getHistoricalFundamentals: (symbol: string) => fetchJson<HistoricalFundamentals>(`/stocks/${symbol}/fundamentals/history`),
  getValuationBands: (symbol: string) => fetchJson<any>(`/stocks/${symbol}/valuation-bands`),
  getStockScore: (symbol: string) => fetchJson<StockScoreResponse>(`/stocks/${symbol}/score`),
  compareStocks: (symbols: string[]) => fetchJson<StockCompareResponse>(`/stocks/compare?symbols=${encodeURIComponent(symbols.join(","))}`),
  getCorporateActions: (symbol?: string) => fetchJson<CorporateActionItem[]>(symbol ? `/stocks/${symbol}/corporate-actions` : "/stocks/RELIANCE/corporate-actions"),
  getSourcedEvents: (symbol: string) => fetchJson<any[]>(`/stocks/${symbol}/sourced-events`),
  getBulkDeals: (symbol?: string) => fetchJson<BulkBlockDealItem[]>(symbol ? `/stocks/${symbol}/bulk-deals` : "/stocks/RELIANCE/bulk-deals"),
  getInsiderTrades: (symbol?: string) => fetchJson<InsiderTradeItem[]>(symbol ? `/stocks/${symbol}/insider-trades` : "/stocks/RELIANCE/insider-trades"),
  getNews: (symbol?: string) => fetchJson<any[]>(symbol ? `/stocks/${symbol}/news` : "/stocks/RELIANCE/news"),
  getDocuments: (symbol?: string) => fetchJson<any[]>(symbol ? `/stocks/${symbol}/documents` : "/stocks/RELIANCE/documents"),
  runScreener: (filters: Record<string, any>) =>
    fetchJson<any[]>("/stocks/screener", {
      method: "POST",
      body: JSON.stringify(filters),
    }),
  parseScreenerQuery: (query: string) =>
    fetchJson<{ filters: Record<string, any>; matched_conditions: string[]; unparsed: boolean; disclaimer: string }>(
      `/stocks/screener/parse?q=${encodeURIComponent(query)}`
    ),

  // Multi-Asset
  getMutualFunds: (query?: string) =>
    fetchJson<MutualFundItem[]>(query ? `/assets/mutual-funds?q=${encodeURIComponent(query)}` : "/assets/mutual-funds"),
  getMutualFundCatalog: (query?: string, limit: number = 250) =>
    fetchJson<Array<{ scheme_code: string; scheme_name: string; source: string; retrieved_at?: string }>>(
      `/assets/mutual-funds/catalog?limit=${limit}${query ? `&q=${encodeURIComponent(query)}` : ""}`
    ),
  getMutualFundDetail: (id: string) => fetchJson<MutualFundItem>(`/assets/mutual-funds/${id}`),
  getMutualFundNavHistory: (schemeCode: string) => fetchJson<any[]>(`/assets/mutual-funds/${schemeCode}/nav-history`),
  getMutualFundAnalytics: (schemeCode: string) => fetchJson<any>(`/assets/mutual-funds/${schemeCode}/analytics`),
  calculateFundOverlap: (fundA: string, fundB: string) =>
    fetchJson<any>("/assets/mutual-funds/overlap", {
      method: "POST",
      body: JSON.stringify({ fund_id_a: fundA, fund_id_b: fundB }),
    }),
  getEtfs: () => fetchJson<ETFItem[]>("/assets/etfs"),
  getEtfLookThrough: (symbol: string) => fetchJson<any>(`/assets/etfs/${symbol}/look-through`),
  getEtfTrackingDifference: (symbol: string) => fetchJson<any>(`/assets/etfs/${symbol}/tracking-difference`),
  getBonds: () => fetchJson<BondItem[]>("/assets/bonds"),
  simulateBondLadder: (payload: { total_investment: number; target_tenor_years: number; risk_preference?: string }) =>
    fetchJson<any>("/assets/bonds/ladder-simulator", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getCommoditiesFx: () => fetchJson<CommodityFxItem[]>("/assets/commodities-fx"),
  getMacroIndicators: () => fetchJson<MacroIndicatorItem[]>("/assets/macro"),

  // Watchlists
  getWatchlists: () => fetchJson<WatchlistItem[]>("/watchlists"),
  createWatchlist: (name: string, symbols: string[] = []) =>
    fetchJson<any>("/watchlists", {
      method: "POST",
      body: JSON.stringify({ name, symbols }),
    }),
  addSymbolToWatchlist: (watchlistId: number, symbol: string) =>
    fetchJson<any>(`/watchlists/${watchlistId}/symbols`, {
      method: "POST",
      body: JSON.stringify({ symbol }),
    }),
  removeSymbolFromWatchlist: (watchlistId: number, symbol: string) =>
    fetchJson<any>(`/watchlists/${watchlistId}/symbols/${symbol}`, {
      method: "DELETE",
    }),
  deleteWatchlist: (watchlistId: number) =>
    fetchJson<any>(`/watchlists/${watchlistId}`, {
      method: "DELETE",
    }),

  // Alerts
  getAlerts: () => fetchJson<AlertItem[]>("/alerts"),
  createAlert: (payload: { symbol: string; condition: string; threshold?: number }) =>
    fetchJson<AlertItem>("/alerts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  evaluateAlerts: () => fetchJson<AlertItem[]>("/alerts/evaluate", { method: "POST" }),
  deleteAlert: (alertId: number) => fetchJson<{ deleted: number }>(`/alerts/${alertId}`, { method: "DELETE" }),

  // Portfolio & Trading
  getPortfolioSummary: () => fetchJson<PortfolioSummaryResponse>("/portfolio/summary"),
  executeOrder: (payload: { symbol: string; side: "BUY" | "SELL"; quantity: number; order_type?: string; idempotency_key?: string }) =>
    fetchJson<any>("/portfolio/order", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAnalytics: () => fetchJson<PortfolioAnalyticsResponse>("/portfolio/analytics"),
  getRisk: () => fetchJson<PortfolioRiskResponse>("/portfolio/risk"),
  getStressTesting: () => fetchJson<StressTestResponse>("/portfolio/stress-test"),
  getHiddenExposure: () => fetchJson<HiddenExposureResponse>("/portfolio/hidden-exposure"),
  simulateRebalancing: (targetAllocations: Record<string, number>) =>
    fetchJson<any>("/portfolio/rebalance-simulate", {
      method: "POST",
      body: JSON.stringify({ target_allocations: targetAllocations }),
    }),
  optimizePortfolio: (symbols: string[] = [], transactionCostBps: number = 10) =>
    fetchJson<any>("/portfolio/optimize", {
      method: "POST",
      body: JSON.stringify({ symbols, transaction_cost_bps: transactionCostBps }),
    }),
  resetPortfolio: () =>
    fetchJson<PortfolioSummaryResponse>("/portfolio/reset", {
      method: "POST",
    }),

  // Tax Analytics
  getTaxSummary: () => fetchJson<TaxSummaryResponse>("/tax/summary"),

  // Quant Lab
  runSmaBacktest: (payload: { symbol: string; fast_period: number; slow_period: number; initial_capital?: number; slippage_bps?: number }) =>
    fetchJson<SMABacktestResponse>("/backtest/sma-crossover", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getSimilarity: (symbols: string[], correlationThreshold: number = 0.7) =>
    fetchJson<any>(`/backtest/similarity?symbols=${encodeURIComponent(symbols.join(","))}&correlation_threshold=${correlationThreshold}`),
  getAnomalies: (symbol: string, zThreshold: number = 3) =>
    fetchJson<any>(`/backtest/anomalies/${symbol}?z_threshold=${zThreshold}`),
  runWalkForward: (payload: { symbol: string; fast_periods?: number[]; slow_periods?: number[]; train_window?: number; test_window?: number; step?: number }) =>
    fetchJson<any>("/backtest/walk-forward", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getFactorResearch: () => fetchJson<any[]>("/backtest/factors"),

  // AI
  runAiResearch: (query: string, symbol?: string) =>
    fetchJson<AgentRunResponse>("/ai/research", {
      method: "POST",
      body: JSON.stringify({ query, symbol }),
    }),
  getWhyMoved: (symbol: string) => fetchJson<WhyMovedResponse>(`/ai/why-moved/${symbol}`),
  getPortfolioDoctor: () => fetchJson<PortfolioDoctorResponse>("/ai/portfolio-doctor"),
  getAgentRuns: () => fetchJson<any[]>("/ai/runs"),

  // Journal
  getJournal: () => fetchJson<JournalSummaryResponse>("/journal/entries"),
  createJournalEntry: (entry: {
    symbol: string;
    thesis: string;
    strategy_tag: string;
    target_price?: number;
    stop_loss?: number;
    expected_timeframe?: string;
    notes?: string;
  }) =>
    fetchJson<JournalResponse>("/journal/entries", {
      method: "POST",
      body: JSON.stringify(entry),
    }),
};
