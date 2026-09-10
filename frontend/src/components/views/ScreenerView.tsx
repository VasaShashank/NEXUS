"use client";

import React, { useState, useEffect } from "react";
import { Filter, ArrowUpDown, Search, Sparkles, Check, ChevronRight, HelpCircle } from "lucide-react";
import { api } from "@/lib/api";
import { InfoTooltip } from "@/components/common/InfoTooltip";

interface ScreenerViewProps {
  onSelectStock: (symbol: string) => void;
}

export const ScreenerView: React.FC<ScreenerViewProps> = ({ onSelectStock }) => {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter States
  const [minMcap, setMinMcap] = useState<string>("");
  const [maxPe, setMaxPe] = useState<string>("");
  const [minRoe, setMinRoe] = useState<string>("");
  const [maxDebtEquity, setMaxDebtEquity] = useState<string>("");
  const [minRsi, setMinRsi] = useState<string>("");
  const [maxRsi, setMaxRsi] = useState<string>("");
  const [sector, setSector] = useState<string>("");

  const runScreen = async () => {
    setIsLoading(true);
    try {
      const filters: Record<string, any> = {};
      if (minMcap) filters.min_market_cap = parseFloat(minMcap);
      if (maxPe) filters.max_pe = parseFloat(maxPe);
      if (minRoe) filters.min_roe = parseFloat(minRoe);
      if (maxDebtEquity) filters.max_debt_equity = parseFloat(maxDebtEquity);
      if (minRsi) filters.min_rsi = parseFloat(minRsi);
      if (maxRsi) filters.max_rsi = parseFloat(maxRsi);
      if (sector) filters.sector = sector;

      const data = await api.runScreener(filters);
      setResults(data);
    } catch (err) {
      console.error("Screener failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runScreen();
  }, []);

  const applyPreset = (preset: "quality" | "low_debt" | "oversold") => {
    if (preset === "quality") {
      setMinMcap("50000");
      setMinRoe("15");
      setMaxDebtEquity("1");
      setMaxPe("35");
      setMinRsi("");
      setMaxRsi("");
    } else if (preset === "low_debt") {
      setMaxDebtEquity("0.5");
      setMinRoe("18");
      setMinMcap("");
      setMaxPe("");
      setMinRsi("");
      setMaxRsi("");
    } else if (preset === "oversold") {
      setMaxRsi("45");
      setMinRsi("");
      setMinMcap("");
      setMaxPe("");
      setMinRoe("");
      setMaxDebtEquity("");
    }
  };

  return (
    <div className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.05] animate-float-up">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
              Stock Screener
            </h1>
            <InfoTooltip
              title="Quantitative Stock Screener"
              definition="Multi-factor quantitative filtering engine across valuation, return on equity, capital structure, and price momentum."
              decisionImpact="Removes human emotional bias and cuts research time. Surfaces only the top 1% of equities meeting institutional-grade fundamentals."
            />
          </div>
          <p className="text-[13px] text-slate-400 mt-1 font-light">
            Multi-factor quantitative filtering across valuation, return ratios, debt, and momentum.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center space-x-2">
          <span className="text-[12px] text-slate-400 font-medium">Strategy Presets:</span>
          <button
            onClick={() => {
              applyPreset("quality");
              setTimeout(runScreen, 50);
            }}
            className="px-3 py-1.5 text-[12px] font-semibold rounded-xl glass-pill text-slate-300 hover:text-accent-cyan hover:border-accent-cyan/30 transition-all duration-300 flex items-center gap-1"
          >
            <span>Quality Compounders</span>
            <InfoTooltip
              title="Quality Compounders Preset"
              definition="Filters for large-cap equities (M-Cap > ₹50,000 Cr) with ROE > 15%, Debt/Equity < 1.0, and reasonable valuation (P/E < 35)."
              decisionImpact="Ideal for long-term defensive wealth compounding with low drawdown risk."
            />
          </button>
          <button
            onClick={() => {
              applyPreset("low_debt");
              setTimeout(runScreen, 50);
            }}
            className="px-3 py-1.5 text-[12px] font-semibold rounded-xl glass-pill text-slate-300 hover:text-accent-cyan hover:border-accent-cyan/30 transition-all duration-300 flex items-center gap-1"
          >
            <span>Zero / Low Debt</span>
            <InfoTooltip
              title="Low Debt / Solvency Preset"
              definition="Isolates companies with Debt/Equity < 0.5 and ROE > 18%."
              decisionImpact="Protects capital in high-interest-rate or recessionary environments by eliminating balance-sheet bankruptcy risk."
            />
          </button>
          <button
            onClick={() => {
              applyPreset("oversold");
              setTimeout(runScreen, 50);
            }}
            className="px-3 py-1.5 text-[12px] font-semibold rounded-xl glass-pill text-slate-300 hover:text-accent-cyan hover:border-accent-cyan/30 transition-all duration-300 flex items-center gap-1"
          >
            <span>RSI Pullbacks</span>
            <InfoTooltip
              title="Oversold Pullbacks Preset"
              definition="Screens for equities where the 14-period RSI has dropped below 45."
              decisionImpact="Mean-reversion strategy. Exploits temporary market panic to enter quality equities at a technical discount."
            />
          </button>
        </div>
      </div>

      {/* Filter Parameters Bar */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-slate-400 font-semibold tracking-wide">
                Min M-Cap (₹ Cr)
              </label>
              <InfoTooltip
                title="Market Capitalization"
                definition="Total equity value calculated as share price multiplied by total outstanding shares."
                decisionImpact="Filter > ₹20,000-50,000 Cr for large caps with deep liquidity, institutional backing, and low bid-ask slippage."
              />
            </div>
            <input
              type="number"
              placeholder="e.g. 50000"
              value={minMcap}
              onChange={(e) => setMinMcap(e.target.value)}
              className="w-full px-3 py-2 text-[13px] rounded-xl glass-input text-foreground placeholder-slate-600 focus:outline-none focus:border-accent-cyan/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-slate-400 font-semibold tracking-wide">
                Max P/E Ratio
              </label>
              <InfoTooltip
                title="Price-to-Earnings Ratio (P/E)"
                definition="Current market price divided by trailing 12-month Earnings Per Share (EPS)."
                decisionImpact="Sets your valuation ceiling. Filter P/E < 30 to avoid paying speculative premiums unless projected profit growth exceeds 25%."
              />
            </div>
            <input
              type="number"
              placeholder="e.g. 30"
              value={maxPe}
              onChange={(e) => setMaxPe(e.target.value)}
              className="w-full px-3 py-2 text-[13px] rounded-xl glass-input text-foreground placeholder-slate-600 focus:outline-none focus:border-accent-cyan/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-slate-400 font-semibold tracking-wide">
                Min ROE (%)
              </label>
              <InfoTooltip
                title="Return on Equity (ROE)"
                definition="Net income divided by total shareholders' equity. Measures capital efficiency."
                decisionImpact="Filter ROE > 15-20%. High sustained ROE indicates pricing power and a competitive moat against rivals."
              />
            </div>
            <input
              type="number"
              placeholder="e.g. 15"
              value={minRoe}
              onChange={(e) => setMinRoe(e.target.value)}
              className="w-full px-3 py-2 text-[13px] rounded-xl glass-input text-foreground placeholder-slate-600 focus:outline-none focus:border-accent-cyan/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-slate-400 font-semibold tracking-wide">
                Max Debt / Equity
              </label>
              <InfoTooltip
                title="Debt-to-Equity Ratio (D/E)"
                definition="Total short-term and long-term liabilities divided by total shareholder equity."
                decisionImpact="Filter D/E < 0.5-1.0. Low debt insulates corporate earnings from interest-rate spikes and credit crunches."
              />
            </div>
            <input
              type="number"
              placeholder="e.g. 1.0"
              value={maxDebtEquity}
              onChange={(e) => setMaxDebtEquity(e.target.value)}
              className="w-full px-3 py-2 text-[13px] rounded-xl glass-input text-foreground placeholder-slate-600 focus:outline-none focus:border-accent-cyan/50"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-slate-400 font-semibold tracking-wide">
                Max RSI (14)
              </label>
              <InfoTooltip
                title="Relative Strength Index (RSI)"
                definition="14-period momentum oscillator measuring the magnitude and velocity of directional price moves."
                decisionImpact="Filter RSI < 45-50 for dip buying into oversold conditions; avoid buying new positions when RSI > 70 (overbought risk)."
              />
            </div>
            <input
              type="number"
              placeholder="e.g. 60"
              value={maxRsi}
              onChange={(e) => setMaxRsi(e.target.value)}
              className="w-full px-3 py-2 text-[13px] rounded-xl glass-input text-foreground placeholder-slate-600 focus:outline-none focus:border-accent-cyan/50"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={runScreen}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-blue text-white font-bold text-[13px] hover:shadow-glow-md transition-all duration-300 flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(14,165,233,0.3)]"
            >
              <Filter className="w-4 h-4" />
              <span>Filter Equities</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="p-5 rounded-2xl glass-card overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.05] mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-display font-bold text-foreground">
              Matched Stocks ({results.length} found)
            </span>
            <span className="text-[11px] text-slate-400 font-light">
              Click any stock row to open deep research
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-8">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded-xl skeleton animate-pulse" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <p className="text-sm font-semibold">No stocks matched your filter criteria.</p>
            <p className="text-xs text-slate-500">
              Try loosening your filters or click one of the quick presets above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/[0.05] text-[11px] uppercase tracking-wider text-slate-400 font-display">
                  <th className="py-2.5 font-semibold">Stock</th>
                  <th className="py-2.5 font-semibold">Sector</th>
                  <th className="py-2.5 font-semibold text-right">Price</th>
                  <th className="py-2.5 font-semibold text-right">P/E Ratio</th>
                  <th className="py-2.5 font-semibold text-right">ROE %</th>
                  <th className="py-2.5 font-semibold text-right">Debt / Eq</th>
                  <th className="py-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {results.map((stock) => (
                  <tr
                    key={stock.symbol}
                    className="table-row-hover group cursor-pointer"
                    onClick={() => onSelectStock(stock.symbol)}
                  >
                    <td className="py-3.5 font-bold text-foreground">
                      <div>{stock.symbol}</div>
                      <div className="text-[11px] text-slate-400 font-light truncate max-w-[160px]">
                        {stock.company_name}
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-400 text-xs">{stock.sector || "N/A"}</td>
                    <td className="py-3.5 text-right font-semibold tabular-nums text-foreground">
                      ₹{stock.current_price?.toFixed(2)}
                    </td>
                    <td className="py-3.5 text-right tabular-nums text-slate-300">
                      {stock.pe_ratio ? stock.pe_ratio.toFixed(1) : "—"}
                    </td>
                    <td className="py-3.5 text-right tabular-nums text-accent-emerald font-semibold">
                      {stock.roe ? `${stock.roe.toFixed(1)}%` : "—"}
                    </td>
                    <td className="py-3.5 text-right tabular-nums text-slate-400">
                      {stock.debt_to_equity !== undefined ? stock.debt_to_equity.toFixed(2) : "—"}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStock(stock.symbol);
                        }}
                        className="px-3 py-1.5 text-[11px] font-semibold rounded-lg btn-research"
                      >
                        Deep Analysis
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
