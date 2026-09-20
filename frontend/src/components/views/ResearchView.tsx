"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  BarChart2,
  FileText,
  Newspaper,
  Brain,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import {
  api,
  StockQuote,
  HistoricalCandle,
  TechnicalIndicatorsResponse,
  FundamentalData,
  StockScoreResponse,
} from "@/lib/api";
import { TradingViewChart } from "../charts/TradingViewChart";
import { InfoTooltip } from "@/components/common/InfoTooltip";

import { ComplianceDisclaimer } from "@/components/common/ComplianceDisclaimer";

interface ResearchViewProps {
  symbol: string;
  onSelectStock: (symbol: string) => void;
  onOpenAiStudio?: (query: string, symbol: string) => void;
  onTradeSuccess?: () => void;
}

export const ResearchView: React.FC<ResearchViewProps> = ({
  symbol,
  onSelectStock,
  onOpenAiStudio,
  onTradeSuccess,
}) => {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [candles, setCandles] = useState<HistoricalCandle[]>([]);
  const [technicals, setTechnicals] = useState<TechnicalIndicatorsResponse | null>(null);
  const [fundamentals, setFundamentals] = useState<FundamentalData | null>(null);
  const [stockScore, setStockScore] = useState<StockScoreResponse | null>(null);
  const [news, setNews] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [corporateActions, setCorporateActions] = useState<any[]>([]);
  const [bulkDeals, setBulkDeals] = useState<any[]>([]);
  const [insiderTrades, setInsiderTrades] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<string>("1M");
  const [activeTab, setActiveTab] = useState<"technicals" | "fundamentals" | "actions" | "news" | "trade">(
    "technicals"
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const tradeTicketRef = useRef<HTMLDivElement>(null);

  // When the Paper Trade ticket tab activates (from the header button or the
  // research card), bring the ticket into view.
  useEffect(() => {
    if (activeTab === "trade" && tradeTicketRef.current) {
      window.setTimeout(() => {
        tradeTicketRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, [activeTab]);

  // Trade Ticket State
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderQty, setOrderQty] = useState<number>(10);
  const [tradeStatus, setTradeStatus] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const fetchStockData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [q, c, t, f, score, n, d, ca, bd, it] = await Promise.all([
        api.getQuote(symbol),
        api.getHistory(symbol, timeframe),
        api.getTechnicals(symbol),
        api.getFundamentals(symbol),
        api.getStockScore(symbol).catch(() => null),
        api.getNews(symbol),
        api.getDocuments(symbol),
        api.getCorporateActions(symbol).catch(() => []),
        api.getBulkDeals(symbol).catch(() => []),
        api.getInsiderTrades(symbol).catch(() => []),
      ]);
      setQuote(q);
      setCandles(c);
      setTechnicals(t);
      setFundamentals(f);
      setStockScore(score);
      setNews(n);
      setDocuments(d);
      setCorporateActions(ca || []);
      setBulkDeals(bd || []);
      setInsiderTrades(it || []);
    } catch (err) {
      console.error("Error fetching stock research data:", err);
      setLoadError(
        `Could not reach the NEXUS data service for ${symbol}. This is usually a transient backend issue rather than a missing symbol — retry below.`
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, [symbol, timeframe]);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quote || orderQty <= 0) return;
    setIsExecuting(true);
    setTradeStatus(null);
    try {
      const res = await api.executeOrder({
        symbol: quote.symbol,
        side: orderSide,
        quantity: orderQty,
      });
      setTradeStatus(res.message);
      if (onTradeSuccess) onTradeSuccess();
    } catch (err: any) {
      setTradeStatus(`Failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  if (isLoading && !quote) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-32 rounded-2xl skeleton" />
        <div className="h-96 rounded-xl bg-white/[0.03]" />
      </div>
    );
  }

  if (!quote && loadError) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-4">
          <span>{loadError}</span>
          <button
            onClick={fetchStockData}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-rose-500/15 border border-rose-500/30 text-rose-200 hover:bg-rose-500/25 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="p-12 text-center text-slate-400">
        <p>Stock symbol {symbol} not found.</p>
      </div>
    );
  }

  const isUp = (quote.change_1d_pct ?? 0) >= 0;

  return (
    <div className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Bar: Identity, Price & Metrics */}
      <div className="p-5 rounded-2xl glass-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                {quote.company_name}
              </h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-white/[0.04] text-slate-300">
                {quote.symbol}
              </span>
              <span className="text-xs text-slate-400 font-medium">{quote.sector}</span>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">{quote.description}</p>
          </div>

          {/* Price Box */}
          <div className="flex items-center space-x-6">
            <div className="text-right tabular-nums">
              <div className="text-3xl sm:text-4xl font-display font-extrabold text-foreground tracking-tight">
                <span className="rupee">₹</span>{quote.current_price?.toFixed(2)}
              </div>
              <div
                className={`text-[13px] font-bold flex items-center justify-end space-x-1 ${
                  isUp ? "text-accent-emerald" : "text-accent-rose"
                }`}
              >
                <span>
                  {isUp ? "+" : ""}
                  <span className="rupee">₹</span>{quote.change_1d != null ? quote.change_1d.toFixed(2) : "—"}
                </span>
                <span>
                  {quote.change_1d_pct != null ? (
                    <>({isUp ? "+" : ""}{quote.change_1d_pct.toFixed(2)}%)</>
                  ) : (
                    "(—)"
                  )}
                </span>
              </div>
            </div>

            {/* Quick Action Button */}
            <button
              onClick={() => setActiveTab("trade")}
              className="px-4 py-2.5 rounded-xl bg-accent-cyan text-slate-950 font-bold text-xs hover:bg-sky-400 transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Paper Trade</span>
            </button>
          </div>
        </div>

        {/* OHLC & 52W Range Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-white/[0.05] text-[13px] tabular-nums text-slate-400">
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Open</span>
              <InfoTooltip
                title="Session Open"
                definition="First executed transaction price of the active trading session (09:15 IST)."
                decisionImpact="Compare vs Previous Close to identify institutional overnight gap-ups/gap-downs driven by earnings or global macro events."
              />
            </div>
            <span className="font-semibold text-foreground"><span className="rupee">₹</span>{quote.open_price?.toFixed(2)}</span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">High</span>
              <InfoTooltip
                title="Session High"
                definition="Highest transacted price printed during the current session."
                decisionImpact="Defines intraday supply resistance. Prices holding near session highs into the market close indicate strong institutional demand."
              />
            </div>
            <span className="font-semibold text-foreground"><span className="rupee">₹</span>{quote.high_price?.toFixed(2)}</span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Low</span>
              <InfoTooltip
                title="Session Low"
                definition="Lowest transacted price printed during the current session."
                decisionImpact="Defines intraday demand support. Breaching session lows often triggers automated stop-loss liquidation cascades."
              />
            </div>
            <span className="font-semibold text-foreground"><span className="rupee">₹</span>{quote.low_price?.toFixed(2)}</span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">Prev Close</span>
              <InfoTooltip
                title="Previous Close"
                definition="The official closing price established at the end of the previous trading day."
                decisionImpact="The reference price against which daily percentage performance, index weighting, and exchange circuit filters are calibrated."
              />
            </div>
            <span className="font-semibold text-foreground">
              <span className="rupee">₹</span>{quote.previous_close?.toFixed(2)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Volume</span>
              <InfoTooltip
                title="Trading Volume"
                definition="Total cumulative quantity of shares traded during the active session."
                decisionImpact="Volume validates price action. High volume on upside advances confirms institutional accumulation; breakouts on low volume frequently fail."
              />
            </div>
            <span className="font-semibold text-foreground">
              {quote.volume != null ? `${(quote.volume / 1000000).toFixed(2)}M` : "—"}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">52W High / Low</span>
              <InfoTooltip
                title="52-Week Range"
                definition="The lowest and highest execution prices achieved over the trailing 52-week calendar window."
                decisionImpact="Equities breaking out to new 52-week highs have zero overhead supply resistance; stocks hitting 52-week lows carry heightened risk of ongoing structural decline."
              />
            </div>
            <span className="font-semibold text-foreground">
              ₹{quote.week_52_high?.toFixed(0)} / ₹{quote.week_52_low?.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive TradingView Chart */}
      <TradingViewChart
        candles={candles}
        symbol={quote.symbol}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        supportResistance={technicals?.support_resistance}
        technicalResponse={technicals ?? undefined}
        sma20={technicals?.sma_20}
        sma50={technicals?.sma_50}
        dataSource={quote?.data_source}
        asOf={quote?.as_of}
        height={440}
      />

      {/* 3. Multi-Tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-white/[0.05] overflow-x-auto">
        {[
          { id: "technicals", label: "Technical Indicators & S/R", icon: Layers, desc: "Support, Resistance, SMA, RSI & MACD momentum" },
          { id: "fundamentals", label: "Fundamental Research", icon: BarChart2, desc: "Audited multiples, margins, and promoter pledge" },
          { id: "actions", label: "Corporate Actions & Filings", icon: FileText, desc: "Dividends, bonus issues, splits, bulk deals & insider trades" },
          { id: "news", label: "News & Filings (RAG)", icon: Newspaper, desc: "Corporate exchange filings and financial press" },
          { id: "trade", label: "Paper Trade Ticket", icon: ShoppingBag, desc: "Execute simulated orders with live market fills" },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                isActive
                  ? "border-accent-cyan text-accent-cyan shadow-[inset_0_-2px_0_0_rgba(14,165,233,1)]"
                  : "border-transparent text-slate-400 hover:text-foreground"
              }`}
              title={tab.desc}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Tab Content */}
      {/* TAB 1: TECHNICAL INDICATORS */}
      {activeTab === "technicals" && technicals && (
        <div className="space-y-6">
          {/* Top Confluence Signal Banner */}
          <div className="p-4 rounded-2xl glass-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  technicals.overall_signal.includes("BUY")
                    ? "bg-accent-emerald animate-pulse"
                    : "bg-accent-rose"
                }`}
              />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400 uppercase font-semibold">
                    Confluence Signal
                  </span>
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded ${
                      technicals.overall_signal.includes("BUY")
                        ? "bg-accent-emerald/15 text-accent-emerald"
                        : "bg-accent-rose/15 text-accent-rose"
                    }`}
                  >
                    {technicals.overall_signal.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculated from multi-timeframe moving averages, MACD momentum, RSI levels, and
                  pivot confluence.
                </p>
              </div>
            </div>

            {onOpenAiStudio && (
              <button
                onClick={() =>
                  onOpenAiStudio(
                    `Analyze ${quote.symbol} technical momentum and support/resistance breakdown`,
                    quote.symbol
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs font-semibold text-accent-cyan hover:bg-white/[0.04] transition-all flex items-center space-x-1.5"
              >
                <Brain className="w-3.5 h-3.5" />
                <span>AI Technical Diagnosis</span>
              </button>
            )}
          </div>

          {/* Pivot Points & S/R Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Classic Pivots */}
            <div className="p-5 rounded-2xl glass-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Classic Pivot Levels
                </h3>
                <span className="text-[11px] text-slate-400">Current: ₹{quote.current_price}</span>
              </div>
              <div className="space-y-1.5 text-xs tabular-nums">
                <div className="flex justify-between p-1.5 rounded bg-accent-rose/10 text-accent-rose font-medium">
                  <span>Resistance 3 (R3)</span>
                  <span>₹{technicals.support_resistance.classic.r3}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-accent-rose/5 text-accent-rose">
                  <span>Resistance 2 (R2)</span>
                  <span>₹{technicals.support_resistance.classic.r2}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-accent-rose/5 text-accent-rose">
                  <span>Resistance 1 (R1)</span>
                  <span>₹{technicals.support_resistance.classic.r1}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-white/[0.04] font-bold text-foreground">
                  <span>Central Pivot (P)</span>
                  <span>₹{technicals.support_resistance.classic.pivot}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-accent-emerald/5 text-accent-emerald">
                  <span>Support 1 (S1)</span>
                  <span>₹{technicals.support_resistance.classic.s1}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-accent-emerald/5 text-accent-emerald">
                  <span>Support 2 (S2)</span>
                  <span>₹{technicals.support_resistance.classic.s2}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-accent-emerald/10 text-accent-emerald font-medium">
                  <span>Support 3 (S3)</span>
                  <span>₹{technicals.support_resistance.classic.s3}</span>
                </div>
              </div>
            </div>

            {/* Fibonacci Pivots */}
            <div className="p-5 rounded-2xl glass-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Fibonacci Pivot Levels
                </h3>
                <span className="text-[11px] text-slate-400">Dynamic Golden Ratios</span>
              </div>
              <div className="space-y-1.5 text-xs tabular-nums">
                <div className="flex justify-between p-1.5 rounded bg-accent-rose/10 text-accent-rose font-medium">
                  <span>Fib R3 (1.000)</span>
                  <span>₹{technicals.support_resistance.fibonacci.r3}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-accent-rose/5 text-accent-rose">
                  <span>Fib R2 (0.618)</span>
                  <span>₹{technicals.support_resistance.fibonacci.r2}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-accent-rose/5 text-accent-rose">
                  <span>Fib R1 (0.382)</span>
                  <span>₹{technicals.support_resistance.fibonacci.r1}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-white/[0.04] font-bold text-foreground">
                  <span>Central Pivot</span>
                  <span>₹{technicals.support_resistance.fibonacci.pivot}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-accent-emerald/5 text-accent-emerald">
                  <span>Fib S1 (0.382)</span>
                  <span>₹{technicals.support_resistance.fibonacci.s1}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-accent-emerald/5 text-accent-emerald">
                  <span>Fib S2 (0.618)</span>
                  <span>₹{technicals.support_resistance.fibonacci.s2}</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-accent-emerald/10 text-accent-emerald font-medium">
                  <span>Fib S3 (1.000)</span>
                  <span>₹{technicals.support_resistance.fibonacci.s3}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Oscillators: MACD, RSI, Bollinger Bands */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* MACD Card */}
            <div className="p-4 rounded-2xl glass-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">MACD (12, 26, 9)</span>
                <span
                  className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    technicals.macd.trend === "BULLISH"
                      ? "bg-accent-emerald/15 text-accent-emerald"
                      : "bg-accent-rose/15 text-accent-rose"
                  }`}
                >
                  {technicals.macd.trend}
                </span>
              </div>
              <div className="space-y-1 text-xs tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-400">MACD Line</span>
                  <span className="font-semibold text-foreground">{technicals.macd.macd}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Signal Line</span>
                  <span className="font-semibold text-foreground">{technicals.macd.signal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Histogram</span>
                  <span
                    className={`font-bold ${
                      technicals.macd.histogram >= 0 ? "text-accent-emerald" : "text-accent-rose"
                    }`}
                  >
                    {technicals.macd.histogram}
                  </span>
                </div>
              </div>
            </div>

            {/* RSI Meter Card */}
            <div className="p-4 rounded-2xl glass-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">RSI (14-Period)</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-300">
                  {technicals.rsi_status}
                </span>
              </div>
              <div className="text-2xl font-black text-foreground tabular-nums mb-2">
                {technicals.rsi_14}
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden relative">
                <div
                  style={{ width: `${technicals.rsi_14}%` }}
                  className={`h-full ${
                    technicals.rsi_14 > 70
                      ? "bg-accent-rose"
                      : technicals.rsi_14 < 30
                      ? "bg-accent-emerald"
                      : "bg-accent-cyan"
                  }`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Oversold &lt; 30</span>
                <span>Neutral 50</span>
                <span>Overbought &gt; 70</span>
              </div>
            </div>

            {/* Bollinger Bands Card */}
            <div className="p-4 rounded-2xl glass-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">Bollinger Bands (20, 2)</span>
                <span className="text-[10px] text-slate-400 tabular-nums">
                  Bandwidth: {technicals.bollinger_bands.bandwidth}%
                </span>
              </div>
              <div className="space-y-1 text-xs tabular-nums">
                <div className="flex justify-between">
                  <span className="text-slate-400">Upper Band</span>
                  <span className="font-semibold text-accent-rose">
                    ₹{technicals.bollinger_bands.upper}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Middle Band (SMA 20)</span>
                  <span className="font-semibold text-foreground">
                    ₹{technicals.bollinger_bands.middle}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lower Band</span>
                  <span className="font-semibold text-accent-emerald">
                    ₹{technicals.bollinger_bands.lower}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FUNDAMENTALS */}
      {activeTab === "fundamentals" && fundamentals && (
        <div className="space-y-6">
          {stockScore && (
            <div className="p-5 rounded-2xl glass-card space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Explainable Stock Score</h3>
                  <p className="text-[11px] text-slate-500 mt-1">Threshold-based decision support from available observations.</p>
                </div>
                <span className="text-2xl font-bold text-accent-cyan tabular-nums">{stockScore.overall_score}/100</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.entries(stockScore.categories).map(([category, value]) => (
                  <div key={category} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="text-[10px] uppercase tracking-wide text-slate-500">{category.replace("_", " ")}</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{value}/100</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div><span className="text-accent-emerald font-semibold">Strengths:</span> {stockScore.strengths.join(" ")}</div>
                <div><span className="text-accent-amber font-semibold">Risks:</span> {stockScore.risks.join(" ")}</div>
              </div>
              <p className="text-[10px] text-slate-500">{stockScore.disclaimer}</p>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl glass-card">
              <span className="text-xs text-slate-400 block mb-1">Market Capitalization</span>
              <span className="text-lg font-bold text-foreground tabular-nums">
                ₹{fundamentals.market_cap?.toLocaleString()} Cr
              </span>
            </div>
            <div className="p-4 rounded-2xl glass-card">
              <span className="text-xs text-slate-400 block mb-1">P/E Ratio</span>
              <span className="text-lg font-bold text-foreground tabular-nums">
                {fundamentals.pe_ratio}x
              </span>
            </div>
            <div className="p-4 rounded-2xl glass-card">
              <span className="text-xs text-slate-400 block mb-1">Return on Equity (ROE)</span>
              <span className="text-lg font-bold text-accent-emerald tabular-nums">
                {fundamentals.roe}%
              </span>
            </div>
            <div className="p-4 rounded-2xl glass-card">
              <span className="text-xs text-slate-400 block mb-1">Debt to Equity</span>
              <span className="text-lg font-bold text-foreground tabular-nums">
                {fundamentals.debt_to_equity}x
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Financial Performance */}
            <div className="p-5 rounded-2xl glass-card space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                Financial Performance & Margins
              </h3>
              <div className="flex justify-between text-xs py-1 border-b border-white/[0.05]">
                <span className="text-slate-400">Revenue Growth (YoY)</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {fundamentals.revenue_growth_yoy}%
                </span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-white/[0.05]">
                <span className="text-slate-400">Profit Growth (YoY)</span>
                <span className="font-semibold text-accent-emerald tabular-nums">
                  {fundamentals.profit_growth_yoy}%
                </span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-white/[0.05]">
                <span className="text-slate-400">Operating Margin</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {fundamentals.operating_margin}%
                </span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-white/[0.05]">
                <span className="text-slate-400">Net Profit Margin</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {fundamentals.net_margin}%
                </span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-400">EPS (Earnings Per Share)</span>
                <span className="font-semibold text-foreground tabular-nums">
                  ₹{fundamentals.eps}
                </span>
              </div>
            </div>

            {/* Ownership & Solvency */}
            <div className="p-5 rounded-2xl glass-card space-y-3">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                Ownership Pattern & Balance Sheet
              </h3>
              <div className="flex justify-between text-xs py-1 border-b border-white/[0.05]">
                <span className="text-slate-400">Promoter Holding</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {fundamentals.promoter_holding}%
                </span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-white/[0.05]">
                <span className="text-slate-400">Foreign Institutional (FII)</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {fundamentals.fii_holding}%
                </span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-white/[0.05]">
                <span className="text-slate-400">Domestic Institutional (DII)</span>
                <span className="font-semibold text-foreground tabular-nums">
                  {fundamentals.dii_holding}%
                </span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-white/[0.05]">
                <span className="text-slate-400">Total Borrowings / Debt</span>
                <span className="font-semibold text-foreground tabular-nums">
                  ₹{fundamentals.total_debt?.toLocaleString()} Cr
                </span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-white/[0.05]">
                <span className="text-slate-400">Promoter Pledge %</span>
                <span
                  className={`font-semibold tabular-nums ${
                    (fundamentals.promoter_pledge_pct || 0) > 0
                      ? "text-accent-rose"
                      : "text-accent-emerald"
                  }`}
                >
                  {fundamentals.promoter_pledge_pct !== undefined && fundamentals.promoter_pledge_pct !== null
                    ? `${fundamentals.promoter_pledge_pct}%`
                    : "0.0%"}
                </span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-slate-400">Free Cash Flow</span>
                <span className="font-semibold text-accent-emerald tabular-nums">
                  ₹{fundamentals.free_cash_flow?.toLocaleString()} Cr
                </span>
              </div>
            </div>
          </div>

          {/* Source Attribution */}
          <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
            <span>
              Source: {fundamentals.source || "MCA / Company Annual Reports / Audited Financials"}
            </span>
            <span>
              As of: {fundamentals.as_of_date || quote.as_of || "Latest Audited Fiscal"}
            </span>
          </div>
        </div>
      )}

      {/* TAB: CORPORATE ACTIONS & INSIDER TRADES */}
      {activeTab === "actions" && (
        <div className="space-y-6">
          {/* Corporate Actions Table */}
          <div className="p-5 rounded-2xl glass-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Corporate Actions
                </h3>
                <p className="text-[11px] text-slate-400">
                  Dividends, bonus issues, stock splits, and rights offerings.
                </p>
              </div>
              <span className="text-[10px] text-slate-400 bg-white/[0.04] px-2.5 py-1 rounded-md">
                {corporateActions.length} Actions Logged
              </span>
            </div>
            {corporateActions.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4">No recent corporate actions recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="text-[11px] text-slate-400 border-b border-white/[0.05]">
                      <th className="py-2">Ex-Date</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Description</th>
                      <th className="py-2 text-right">Value / Ratio</th>
                      <th className="py-2 text-right">Record Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {corporateActions.map((action, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.01]">
                        <td className="py-2.5 font-mono text-slate-300">{action.ex_date}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-cyan/15 text-accent-cyan">
                            {action.action_type}
                          </span>
                        </td>
                        <td className="py-2.5 text-foreground">{action.description}</td>
                        <td className="py-2.5 text-right font-semibold text-accent-emerald">
                          {action.value ? `₹${action.value}` : action.ratio || "—"}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-400">
                          {action.record_date || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bulk & Block Deals */}
            <div className="p-5 rounded-2xl glass-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Bulk & Block Deals
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Institutional trades exceeding 0.5% of total paid-up share capital.
                  </p>
                </div>
              </div>
              {bulkDeals.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No recent bulk or block deals reported to exchange.</p>
              ) : (
                <div className="space-y-3">
                  {bulkDeals.map((deal, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-foreground">{deal.client_name}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            deal.deal_type === "BUY"
                              ? "bg-accent-emerald/15 text-accent-emerald"
                              : "bg-accent-rose/15 text-accent-rose"
                          }`}
                        >
                          {deal.deal_type}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 tabular-nums">
                        <span>Quantity: {deal.quantity?.toLocaleString()} ({deal.pct_of_shares}% eq)</span>
                        <span>Trade Price: ₹{deal.trade_price}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 font-mono">{deal.date}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Insider Trades (PIT Regulations) */}
            <div className="p-5 rounded-2xl glass-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    SEBI PIT Insider Trades
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Promoter and KMP share transactions filed under SEBI Prohibition of Insider Trading.
                  </p>
                </div>
              </div>
              {insiderTrades.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No insider trade filings in the recent window.</p>
              ) : (
                <div className="space-y-3">
                  {insiderTrades.map((trade, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-foreground">{trade.person_name}</span>
                        <span className="text-[10px] text-slate-400">{trade.category}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] tabular-nums">
                        <span
                          className={`font-semibold ${
                            trade.transaction_type?.includes("BUY") || trade.transaction_type?.includes("Acquisition")
                              ? "text-accent-emerald"
                              : "text-accent-rose"
                          }`}
                        >
                          {trade.transaction_type}: {trade.shares_traded?.toLocaleString()} shares
                        </span>
                        <span className="text-slate-400">
                          ₹{((trade.shares_traded * trade.price) / 10000000).toFixed(2)} Cr
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                        <span>Mode: {trade.mode}</span>
                        <span>Date: {trade.date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NEWS & FILINGS */}
      {activeTab === "news" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* News Stream */}
            <div className="p-5 rounded-2xl glass-card">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                Verified News Catalysts
              </h3>
              <div className="space-y-4">
                {news.length === 0 && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-slate-400 leading-relaxed">
                    No news catalysts available for {quote.symbol} right now. The news feed sources
                    verified exchange announcements and provider headlines; it will populate when a
                    catalyst is detected.
                  </div>
                )}
                {news.map((item, idx) => (
                  <div key={idx} className="pb-4 border-b border-white/[0.05]/60 last:border-none">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[10px] font-semibold text-slate-400">
                        {item.source}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                          item.sentiment === "POSITIVE"
                            ? "bg-accent-emerald/15 text-accent-emerald"
                            : item.sentiment === "NEGATIVE"
                            ? "bg-accent-rose/15 text-accent-rose"
                            : "bg-white/[0.04] text-slate-400"
                        }`}
                      >
                        {item.sentiment}
                      </span>
                    </div>
                    <a
                      href={item.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-foreground hover:text-accent-cyan transition-colors"
                    >
                      {item.headline}
                    </a>
                    {item.summary && (
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {item.summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Filings / RAG */}
            <div className="p-5 rounded-2xl glass-card">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
                Financial Filings & Document RAG Excerpts
              </h3>
              <div className="space-y-4">
                {documents.length === 0 && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[11px] text-slate-400 leading-relaxed">
                    No issuer filings retrieved for {quote.symbol} from the BSE corporate-filings API
                    right now. Document excerpts are sourced only from exchange disclosures — NEXUS
                    does not fabricate filing content.
                  </div>
                )}
                {documents.map((doc, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-foreground">{doc.title}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/[0.04] text-slate-300">
                        {doc.fiscal_year}
                      </span>
                    </div>
                    <pre className="text-[11px] font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">
                      {doc.content}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PAPER TRADE TICKET */}
      {activeTab === "trade" && (
        <div ref={tradeTicketRef} className="max-w-xl mx-auto p-6 rounded-2xl glass-card">
          <h2 className="text-base font-bold text-foreground mb-1">
            Simulated Order Ticket: {quote.symbol}
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Execute paper trade orders risk-free using your ₹10,00,000 virtual cash balance.
          </p>

          <form onSubmit={handleOrderSubmit} className="space-y-4">
            {/* Buy / Sell Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-white/[0.03] p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setOrderSide("BUY")}
                className={`py-2 text-xs font-bold rounded-md transition-all ${
                  orderSide === "BUY"
                    ? "bg-accent-emerald text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-foreground"
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setOrderSide("SELL")}
                className={`py-2 text-xs font-bold rounded-md transition-all ${
                  orderSide === "SELL"
                    ? "bg-accent-rose text-white shadow-sm"
                    : "text-slate-400 hover:text-foreground"
                }`}
              >
                SELL
              </button>
            </div>

            {/* Quantity Input */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Quantity (Shares)
              </label>
              <input
                type="number"
                min="1"
                value={orderQty}
                onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 text-xs font-medium rounded-xl bg-white/[0.02] border border-white/[0.05] text-foreground focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              />
            </div>

            {/* Estimated Total Calculation */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1 text-xs tabular-nums">
              <div className="flex justify-between text-slate-400">
                <span>Execution Price</span>
                <span className="text-foreground font-medium">₹{quote.current_price?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Order Value</span>
                <span className="text-foreground font-bold">
                  ₹{(quote.current_price * orderQty)?.toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* Message Feedback */}
            {tradeStatus && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
                  tradeStatus.startsWith("Executed")
                    ? "bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20"
                    : "bg-accent-rose/10 text-accent-rose border border-accent-rose/20"
                }`}
              >
                {tradeStatus}
              </div>
            )}

            <button
              type="submit"
              disabled={isExecuting}
              className={`w-full py-2.5 rounded-lg text-xs font-bold text-slate-950 transition-all ${
                orderSide === "BUY" ? "bg-accent-emerald hover:bg-emerald-400" : "bg-accent-rose text-white hover:bg-rose-500"
              }`}
            >
              {isExecuting
                ? "Executing Order..."
                : `Confirm ${orderSide} (${orderQty} Shares)`}
            </button>
          </form>
        </div>
      )}

      {/* Regulatory & Institutional Compliance Disclaimer */}
      <ComplianceDisclaimer moduleName="NEXUS Equity Research & Analytics" />
    </div>
  );
};
