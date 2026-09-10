"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  BarChart3,
  Layers,
  Sparkles,
  Target,
} from "lucide-react";
import { api, MarketOverviewResponse, StockQuote, IndexQuote } from "@/lib/api";
import { InfoTooltip } from "@/components/common/InfoTooltip";

interface OverviewViewProps {
  onSelectStock: (symbol: string) => void;
  onNavigate: (view: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onSelectStock, onNavigate }) => {
  const [data, setData] = useState<MarketOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"gainers" | "losers" | "active">("gainers");

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await api.getMarketOverview();
        setData(res);
      } catch (err) {
        console.error("Failed to load market overview:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl skeleton animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-2xl skeleton animate-pulse" />
      </div>
    );
  }

  const { indices, top_gainers, top_losers, most_active, market_breadth, sector_performance } = data;

  const moverList =
    activeTab === "gainers" ? top_gainers : activeTab === "losers" ? top_losers : most_active;

  return (
    <div className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.05] animate-float-up">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
              Market Overview
            </h1>
            <InfoTooltip
              title="Market Overview & Macro Diagnostics"
              definition="Synthesizes real-time benchmark index movements, liquidity breadth, and sectoral capital allocation across Indian equity exchanges."
              decisionImpact="Establishes intraday and swing trading bias. Determines whether market conditions favor aggressive risk-on positions or defensive hedging."
            />
          </div>
          <p className="text-[14px] text-slate-400 mt-1 font-light">
            Real-time Indian equities intelligence, benchmark movements, and market breadth.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate("ai-research")}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl btn-ai text-[13.5px] font-semibold shadow-[0_0_15px_rgba(14,165,233,0.25)]"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Market Brief</span>
          </button>
        </div>
      </div>

      {/* 1. Benchmark Indices Strip */}
      <div>
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold uppercase tracking-wider text-[12px] font-display">
            <span>Benchmark Indices</span>
            <InfoTooltip
              title="Benchmark Indices"
              definition="Market-cap-weighted baskets representing sovereign equity performance (NIFTY 50 = top 50 NSE blue chips; SENSEX = top 30 BSE blue chips)."
              decisionImpact="Provides the institutional hurdle rate. If your portfolio fails to generate alpha over Nifty 50, reallocate into low-cost index ETFs."
            />
          </div>
          <span className="text-[12px] text-slate-500 font-mono">Real-time Tick Feeds</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {indices.map((idx, i) => {
            const isUp = idx.change_1d_pct >= 0;
            return (
              <div
                key={idx.symbol}
                className={`p-5 rounded-2xl glass-card animate-float-up animate-float-up-delay-${i + 1} relative group`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13.5px] font-semibold text-slate-300 tracking-wide flex items-center gap-1">
                    {idx.name}
                  </span>
                  <span
                    className={`inline-flex items-center text-[12.5px] font-bold tabular-nums px-2 py-0.5 rounded-lg ${
                      isUp ? "text-accent-emerald bg-accent-emerald/10" : "text-accent-rose bg-accent-rose/10"
                    }`}
                  >
                    {isUp ? (
                      <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                    )}
                    {isUp ? "+" : ""}
                    {idx.change_1d_pct?.toFixed(2)}%
                  </span>
                </div>
                <div className="text-[26px] font-display font-bold text-foreground tabular-nums tracking-tight flex items-baseline">
                  <span className="rupee">₹</span>
                  <span>{idx.current_value?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between text-[12px] text-slate-400 mt-3 pt-3 border-t border-white/[0.05] tabular-nums">
                  <span>Day Low: <span className="rupee">₹</span>{idx.low?.toFixed(1)}</span>
                  <span>Day High: <span className="rupee">₹</span>{idx.high?.toFixed(1)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Middle Row: Market Breadth & Movers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Market Movers */}
        <div className="lg:col-span-2 p-5 rounded-2xl glass-card">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.05] mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-cyan/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-accent-cyan" />
              </div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-[16px] font-display font-bold text-foreground">Market Movers</h2>
                <InfoTooltip
                  title="Market Movers & Liquidity Flow"
                  definition="Identifies equities experiencing the largest percentage expansions, pullbacks, and institutional turnover during the active trading session."
                  decisionImpact="Focus on stocks exhibiting high relative volume (RVOL > 2.0). High volume on breakouts confirms institutional accumulation rather than retail traps."
                />
              </div>
            </div>
            {/* Tabs */}
            <div className="flex items-center space-x-1 bg-white/[0.03] p-1 rounded-xl text-[13px]">
              <button
                onClick={() => setActiveTab("gainers")}
                className={`px-3.5 py-1.5 font-semibold rounded-lg transition-all duration-300 ${
                  activeTab === "gainers"
                    ? "bg-accent-emerald/15 text-accent-emerald shadow-sm border border-accent-emerald/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Top Gainers
              </button>
              <button
                onClick={() => setActiveTab("losers")}
                className={`px-3.5 py-1.5 font-semibold rounded-lg transition-all duration-300 ${
                  activeTab === "losers"
                    ? "bg-accent-rose/15 text-accent-rose shadow-sm border border-accent-rose/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Top Losers
              </button>
              <button
                onClick={() => setActiveTab("active")}
                className={`px-3.5 py-1.5 font-semibold rounded-lg transition-all duration-300 ${
                  activeTab === "active"
                    ? "bg-accent-cyan/15 text-accent-cyan shadow-sm border border-accent-cyan/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Most Active
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-white/[0.05] text-[12px] uppercase tracking-wider text-slate-400 font-display">
                  <th className="py-2.5 font-semibold">Symbol</th>
                  <th className="py-2.5 font-semibold">Company</th>
                  <th className="py-2.5 font-semibold text-right">Last Price</th>
                  <th className="py-2.5 font-semibold text-right">24h Change</th>
                  <th className="py-2.5 font-semibold text-right">Volume</th>
                  <th className="py-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {moverList.map((stock) => {
                  const isUp = stock.change_1d_pct >= 0;
                  return (
                    <tr
                      key={stock.symbol}
                      className="table-row-hover group cursor-pointer"
                      onClick={() => onSelectStock(stock.symbol)}
                    >
                      <td className="py-3.5 font-bold text-foreground text-[14.5px]">{stock.symbol}</td>
                      <td className="py-3.5 text-slate-300 text-[13.5px] max-w-[180px] truncate">
                        {stock.company_name}
                      </td>
                      <td className="py-3.5 text-right font-semibold tabular-nums text-foreground text-[14px]">
                        <span className="rupee">₹</span>{stock.current_price?.toFixed(2)}
                      </td>
                      <td
                        className={`py-3.5 text-right font-bold tabular-nums text-[13.5px] ${
                          isUp ? "text-accent-emerald" : "text-accent-rose"
                        }`}
                      >
                        {isUp ? "+" : ""}
                        {stock.change_1d_pct?.toFixed(2)}%
                      </td>
                      <td className="py-3.5 text-right text-slate-400 tabular-nums">
                        {(stock.volume / 1000000).toFixed(2)}M
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStock(stock.symbol);
                          }}
                          className="px-3 py-1.5 text-[11px] font-semibold rounded-lg btn-research"
                        >
                          Research
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Market Breadth & Health */}
        <div className="space-y-5">
          {/* Breadth Card */}
          <div className="p-5 rounded-2xl glass-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[15px] font-display font-bold text-foreground">Market Breadth</h3>
                <InfoTooltip
                  title="Market Breadth & Advance/Decline Ratio"
                  definition="The ratio of advancing stocks vs declining stocks across the exchange. Gauges underlying internal market participation."
                  decisionImpact="Crucial decision metric: A rally with A/D > 1.5 confirms genuine broad participation. An A/D < 1.0 during an index rise indicates a divergence trap led by 2-3 index heavyweights; avoid chasing longs."
                />
              </div>
              <span className="text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20 tracking-wider">
                {market_breadth.regime}
              </span>
            </div>

            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl font-display font-extrabold text-foreground tabular-nums glow-text-cyan">
                {market_breadth.advance_decline_ratio}x
              </span>
              <span className="text-[12px] text-slate-400 font-medium">A/D Ratio</span>
            </div>

            {/* Breadth Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex breadth-bar">
              <div
                style={{
                  width: `${(market_breadth.advancing / (market_breadth.advancing + market_breadth.declining || 1)) * 100}%`,
                }}
                className="bg-gradient-to-r from-accent-emerald to-accent-emerald/80 h-full transition-all duration-500 rounded-l-full"
              />
              <div
                style={{
                  width: `${(market_breadth.declining / (market_breadth.advancing + market_breadth.declining || 1)) * 100}%`,
                }}
                className="bg-gradient-to-r from-accent-rose/80 to-accent-rose h-full transition-all duration-500 rounded-r-full"
              />
            </div>

            <div className="flex items-center justify-between text-[12px] text-slate-400 mt-4 pt-3 border-t border-white/[0.05]">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-emerald" />
                <span>Advancing ({market_breadth.advancing})</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-accent-rose" />
                <span>Declining ({market_breadth.declining})</span>
              </div>
            </div>
          </div>

          {/* Regime Decision Rule */}
          <div className="p-4 rounded-2xl glass-card border-accent-cyan/20 space-y-2">
            <div className="flex items-center space-x-2 text-accent-cyan">
              <Target className="w-4 h-4" />
              <span className="text-xs font-display font-bold">Regime Trading Decision</span>
            </div>
            <p className="text-[12px] text-slate-300 leading-relaxed font-light">
              Current regime is{" "}
              <strong className="text-accent-emerald font-semibold">{market_breadth.regime}</strong>.
              When breadth is expansive (A/D &gt; 1.5x), increase position sizing on swing breakouts. When A/D drops below 0.8x, tighten trailing stop-losses across long equity positions.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Sector Performance */}
      <div className="p-5 rounded-2xl glass-card">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.05] mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-purple/10 flex items-center justify-center">
              <Layers className="w-4 h-4 text-accent-purple" />
            </div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-[15px] font-display font-bold text-foreground">
                Sector Performance & Industry Heatmap
              </h2>
              <InfoTooltip
                title="Sector Performance"
                definition="Tracks daily price change across standard industry classifications (Banking, IT, Auto, Metals, Pharma, Energy)."
                decisionImpact="Enables top-down relative strength trading. Institutional capital rotates into leading sectors first; allocate to individual stocks in the top 2 outperforming sectors."
              />
            </div>
          </div>
          <span className="text-xs text-slate-400 font-mono">1D Return %</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {sector_performance.map((sector) => {
            const isUp = (sector.average_change_pct ?? 0) >= 0;
            return (
              <div
                key={sector.sector}
                className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-accent-cyan/30 hover:bg-white/[0.04] transition-all duration-300 text-center"
              >
                <div className="text-xs text-slate-300 font-semibold truncate mb-1">
                  {sector.sector}
                </div>
                <div
                  className={`text-sm font-display font-bold tabular-nums ${
                    isUp ? "text-accent-emerald" : "text-accent-rose"
                  }`}
                >
                  {isUp ? "+" : ""}
                  {sector.average_change_pct?.toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
