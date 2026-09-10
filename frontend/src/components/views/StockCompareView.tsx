"use client";

import React, { useState, useEffect } from "react";
import { api, StockCompareResponse, StockQuote, FundamentalData } from "@/lib/api";
import {
  ArrowLeftRight,
  Plus,
  X,
  TrendingUp,
  TrendingDown,
  Download,
  Search,
  Layers,
  Scale
} from "lucide-react";
import { ComplianceDisclaimer } from "@/components/common/ComplianceDisclaimer";

interface StockCompareViewProps {
  onSelectStock: (symbol: string) => void;
}

export const StockCompareView: React.FC<StockCompareViewProps> = ({ onSelectStock }) => {
  const [symbols, setSymbols] = useState<string[]>(["RELIANCE", "TCS", "HINDUNILVR", "INFY"]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [compareData, setCompareData] = useState<StockCompareResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadComparison = async (syms: string[]) => {
    if (syms.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.compareStocks(syms);
      setCompareData(data);
    } catch (err: any) {
      setError("Failed to load multi-stock comparison data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparison(symbols);
  }, [symbols]);

  const handleAddSymbol = (sym: string) => {
    const s = sym.trim().toUpperCase();
    if (s && !symbols.includes(s) && symbols.length < 5) {
      setSymbols([...symbols, s]);
      setSearchQuery("");
    }
  };

  const handleRemoveSymbol = (sym: string) => {
    if (symbols.length > 1) {
      setSymbols(symbols.filter((s) => s !== sym));
    }
  };

  const exportCSV = () => {
    if (!compareData) return;
    const headers = ["Metric", ...compareData.symbols];
    const rows = [
      ["Current Price (₹)", ...compareData.quotes.map((q) => q?.current_price ?? "N/A")],
      ["Market Cap (Cr ₹)", ...compareData.fundamentals.map((f) => f?.market_cap ? `₹${f.market_cap.toLocaleString()}` : "N/A")],
      ["P/E Ratio", ...compareData.fundamentals.map((f) => f?.pe_ratio ?? "N/A")],
      ["P/B Ratio", ...compareData.fundamentals.map((f) => f?.pb_ratio ?? "N/A")],
      ["EV / EBITDA", ...compareData.fundamentals.map((f) => f?.ev_to_ebitda ?? "N/A")],
      ["ROE (%)", ...compareData.fundamentals.map((f) => f?.roe ? `${f.roe}%` : "N/A")],
      ["ROCE (%)", ...compareData.fundamentals.map((f) => f?.roce ? `${f.roce}%` : "N/A")],
      ["Debt / Equity", ...compareData.fundamentals.map((f) => f?.debt_to_equity ?? "N/A")],
      ["Dividend Yield (%)", ...compareData.fundamentals.map((f) => f?.dividend_yield ? `${f.dividend_yield}%` : "N/A")],
      ["Operating Margin (%)", ...compareData.fundamentals.map((f) => f?.operating_margin ? `${f.operating_margin}%` : "N/A")],
      ["Net Margin (%)", ...compareData.fundamentals.map((f) => f?.net_margin ? `${f.net_margin}%` : "N/A")],
      ["Promoter Pledge (%)", ...compareData.fundamentals.map((f) => f?.promoter_pledge_pct !== undefined ? `${f.promoter_pledge_pct}%` : "0.0%")],
    ];

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus_stock_comparison_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <Scale className="w-5 h-5 text-accent-cyan" />
            <h1 className="text-xl font-bold font-display text-foreground tracking-tight">
              Stock Comparison Engine
            </h1>
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
              Institutional Multi-Factor
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Side-by-side valuation, financial returns, capital structure, and normalized historical performance.
          </p>
        </div>

        <button
          onClick={exportCSV}
          disabled={!compareData}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-border text-xs font-medium text-slate-300 hover:text-foreground transition-all shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Comparison (CSV)</span>
        </button>
      </div>

      {/* Symbol Pill Selector & Search */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-surface-50 border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {symbols.map((sym, idx) => (
            <div
              key={sym}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-xs font-medium"
            >
              <button
                onClick={() => onSelectStock(sym)}
                className="hover:text-accent-cyan transition-colors"
              >
                {sym}
              </button>
              {symbols.length > 1 && (
                <button
                  onClick={() => handleRemoveSymbol(sym)}
                  className="text-slate-400 hover:text-rose-400 ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {symbols.length < 5 && (
          <div className="flex items-center space-x-1 ml-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Add ticker (e.g. ITC)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery) {
                    handleAddSymbol(searchQuery);
                  }
                }}
                className="w-48 px-3 py-1 text-xs rounded-lg bg-white/[0.03] border border-white/[0.08] text-foreground placeholder-slate-500 focus:outline-none focus:border-accent-cyan"
              />
            </div>
            <button
              onClick={() => handleAddSymbol(searchQuery)}
              className="p-1 rounded-lg bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 border border-accent-cyan/30"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading multi-stock financial statements and historical series...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {!loading && compareData && (
        <>
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {compareData.quotes.map((q, idx) => {
              const fund = compareData.fundamentals[idx];
              const isUp = (q?.change_1d_pct ?? 0) >= 0;
              return (
                <div
                  key={q?.symbol || idx}
                  className="p-4 rounded-xl bg-surface-50 border border-border space-y-3 hover:border-white/20 transition-all cursor-pointer"
                  onClick={() => onSelectStock(q.symbol)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{q.symbol}</h3>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{q.company_name}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center space-x-1 ${
                        isUp ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                      <span>{q.change_1d_pct > 0 ? `+${q.change_1d_pct}%` : `${q.change_1d_pct}%`}</span>
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-2">
                    <span className="text-xl font-bold font-mono text-foreground">
                      ₹{q.current_price?.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Mcap: {fund?.market_cap ? `₹${(fund.market_cap / 1000).toFixed(1)}k Cr` : "N/A"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04] text-[11px]">
                    <div>
                      <span className="text-slate-500 block">P/E</span>
                      <span className="font-semibold text-slate-200">{fund?.pe_ratio ?? "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">ROE</span>
                      <span className="font-semibold text-slate-200">{fund?.roe ? `${fund.roe}%` : "N/A"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Side-by-Side Fundamental Comparison Matrix */}
          <div className="rounded-xl bg-surface-50 border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center space-x-2">
                <Layers className="w-4 h-4 text-accent-cyan" />
                <span>Fundamental Valuation & Solvency Matrix</span>
              </h3>
              <span className="text-[11px] text-slate-500">Source: Audited Annual Reports & BSE/NSE Filings</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02] text-slate-400 text-[11px]">
                    <th className="py-3 px-4 font-semibold w-1/4">Financial Metric</th>
                    {compareData.quotes.map((q) => (
                      <th key={q.symbol} className="py-3 px-4 font-semibold text-foreground text-center">
                        {q.symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {[
                    { label: "P/E Ratio (TTM)", key: "pe_ratio", format: (v: any) => v ?? "Data unavailable" },
                    { label: "P/B Ratio", key: "pb_ratio", format: (v: any) => v ?? "Data unavailable" },
                    { label: "EV / EBITDA", key: "ev_to_ebitda", format: (v: any) => v ?? "Data unavailable" },
                    { label: "Return on Equity (ROE)", key: "roe", format: (v: any) => v ? `${v}%` : "Data unavailable" },
                    { label: "Return on Capital Employed (ROCE)", key: "roce", format: (v: any) => v ? `${v}%` : "Data unavailable" },
                    { label: "Debt to Equity", key: "debt_to_equity", format: (v: any) => v !== undefined ? `${v}x` : "Data unavailable" },
                    { label: "Dividend Yield", key: "dividend_yield", format: (v: any) => v ? `${v}%` : "Data unavailable" },
                    { label: "Operating Margin", key: "operating_margin", format: (v: any) => v ? `${v}%` : "Data unavailable" },
                    { label: "Net Profit Margin", key: "net_margin", format: (v: any) => v ? `${v}%` : "Data unavailable" },
                    { label: "Promoter Holding", key: "promoter_holding", format: (v: any) => v ? `${v}%` : "Data unavailable" },
                    { label: "Promoter Pledge %", key: "promoter_pledge_pct", format: (v: any) => v !== undefined ? `${v}%` : "0.0%" },
                    { label: "FII Institutional Holding", key: "fii_holding", format: (v: any) => v ? `${v}%` : "Data unavailable" },
                    { label: "DII Institutional Holding", key: "dii_holding", format: (v: any) => v ? `${v}%` : "Data unavailable" },
                    { label: "Free Cash Flow (Cr ₹)", key: "free_cash_flow", format: (v: any) => v ? `₹${v.toLocaleString()}` : "Data unavailable" },
                  ].map((row, idx) => (
                    <tr key={row.label} className="hover:bg-white/[0.015] transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-300">{row.label}</td>
                      {compareData.fundamentals.map((f, fIdx) => {
                        const val = f ? (f as any)[row.key] : undefined;
                        return (
                          <td key={`${compareData.symbols[fIdx]}-${row.key}`} className="py-2.5 px-4 text-center font-mono text-slate-200">
                            {row.format(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Normalized 6M Performance Comparison Table */}
          {compareData.normalized_performance && compareData.normalized_performance.length > 0 && (
            <div className="rounded-xl bg-surface-50 border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Normalized Return Trajectory (% Return Over 6 Months)
                </h3>
                <span className="text-[11px] text-slate-500">Base = 0.0% at start of period</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {compareData.symbols.map((sym) => {
                  const lastRow = compareData.normalized_performance[compareData.normalized_performance.length - 1];
                  const returnPct = lastRow ? lastRow[sym] : 0.0;
                  const isPositive = returnPct >= 0;
                  return (
                    <div key={sym} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                      <span className="text-xs text-slate-400 block">{sym} 6M Return</span>
                      <span className={`text-lg font-bold font-mono ${isPositive ? "text-accent-emerald" : "text-accent-rose"}`}>
                        {returnPct > 0 ? `+${returnPct}%` : `${returnPct}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Compliance Disclaimer */}
      <ComplianceDisclaimer moduleName="Stock Comparison Matrix" />
    </div>
  );
};
