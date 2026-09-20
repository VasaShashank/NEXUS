"use client";

import React, { useState, useEffect } from "react";
import { api, MutualFundItem, ETFItem } from "@/lib/api";
import {
  PieChart,
  Layers,
  ArrowLeftRight,
  TrendingUp,
  Percent,
  Search,
  ExternalLink,
  ShieldAlert,
  Info
} from "lucide-react";
import { ComplianceDisclaimer } from "@/components/common/ComplianceDisclaimer";

interface FundsViewProps {
  onSelectStock?: (symbol: string) => void;
}

export const FundsView: React.FC<FundsViewProps> = ({ onSelectStock }) => {
  const [activeTab, setActiveTab] = useState<"funds" | "overlap" | "etfs">("funds");
  const [funds, setFunds] = useState<MutualFundItem[]>([]);
  const [etfs, setEtfs] = useState<ETFItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Overlap Calculator state
  const [selectedFundA, setSelectedFundA] = useState<string>("PPFC-FLEXI");
  const [selectedFundB, setSelectedFundB] = useState<string>("HDFC-TOP100");
  const [overlapResult, setOverlapResult] = useState<any | null>(null);
  const [overlapLoading, setOverlapLoading] = useState<boolean>(false);

  // ETF Look-Through state
  const [selectedEtf, setSelectedEtf] = useState<string>("NIFTYBEES");
  const [etfLookThrough, setEtfLookThrough] = useState<any | null>(null);

  // Live Scheme Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadData();
      return;
    }
    setIsSearching(true);
    try {
      const results = await api.getMutualFunds(query);
      if (results && results.length > 0) {
        setFunds(results);
      }
    } catch (err) {
      console.warn("Fund search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [fundsData, etfsData] = await Promise.all([
        api.getMutualFunds(),
        api.getEtfs(),
      ]);
      setFunds(fundsData);
      setEtfs(etfsData);
    } catch (err) {
      console.warn("Failed to load funds/etfs:", err);
      setError(
        "Could not reach the NEXUS data service for mutual funds & ETFs. This is usually a transient backend cold-start or network issue — retry below."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunOverlap = async () => {
    setOverlapLoading(true);
    try {
      const res = await api.calculateFundOverlap(selectedFundA, selectedFundB);
      setOverlapResult(res);
    } catch (err) {
      console.warn("Overlap calculation failed:", err);
    } finally {
      setOverlapLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overlap") {
      handleRunOverlap();
    }
  }, [activeTab, selectedFundA, selectedFundB]);

  useEffect(() => {
    const loadEtfLookThrough = async () => {
      try {
        const res = await api.getEtfLookThrough(selectedEtf);
        setEtfLookThrough(res);
      } catch (err) {
        console.warn("Failed to load ETF look-through:", err);
      }
    };
    if (activeTab === "etfs" && selectedEtf) {
      loadEtfLookThrough();
    }
  }, [activeTab, selectedEtf]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <PieChart className="w-5 h-5 text-accent-cyan" />
            <h1 className="text-xl font-bold font-display text-foreground tracking-tight">
              Mutual Funds & ETF Intelligence
            </h1>
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
              Multi-Asset Wrapper
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Institutional scheme explorer, documented portfolio overlap calculator, and ETF underlying look-through.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1 p-1 bg-surface-50 border border-border rounded-xl">
          <button
            onClick={() => setActiveTab("funds")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "funds"
                ? "bg-accent-blue/20 text-accent-cyan border border-accent-blue/30 shadow-sm"
                : "text-slate-400 hover:text-foreground"
            }`}
          >
            Fund Explorer
          </button>
          <button
            onClick={() => setActiveTab("overlap")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "overlap"
                ? "bg-accent-blue/20 text-accent-cyan border border-accent-blue/30 shadow-sm"
                : "text-slate-400 hover:text-foreground"
            }`}
          >
            Overlap Calculator
          </button>
          <button
            onClick={() => setActiveTab("etfs")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "etfs"
                ? "bg-accent-blue/20 text-accent-cyan border border-accent-blue/30 shadow-sm"
                : "text-slate-400 hover:text-foreground"
            }`}
          >
            ETFs & Look-Through
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-4">
          <span>{error}</span>
          <button
            onClick={loadData}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-rose-500/15 border border-rose-500/30 text-rose-200 hover:bg-rose-500/25 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading mutual funds & ETF portfolios...
        </div>
      )}

      {/* Tab 1: Mutual Funds Explorer */}
      {!loading && !error && activeTab === "funds" && (
        <div className="space-y-4">
          {/* Live Search and AMFI status bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-50 border border-border">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search scheme name or AMC (e.g. Parag Parikh, Axis, Quant, HDFC)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder-slate-500 focus:outline-none focus:border-accent-cyan transition-colors"
              />
            </div>
            <div className="text-[11px] text-slate-400 flex items-center space-x-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
              <span className="font-medium text-slate-300">Live AMFI NAV Feed Active</span>
              {isSearching && <span className="text-accent-cyan animate-pulse">Searching...</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {funds.map((fund) => (
              <div
                key={fund.id}
                className="p-5 rounded-xl bg-surface-50 border border-border space-y-4 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-accent-cyan px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/20">
                      {fund.category}
                    </span>
                    <h3 className="text-sm font-bold text-foreground mt-2">{fund.scheme_name}</h3>
                    <p className="text-[11px] text-slate-400">{fund.amc}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Direct NAV</span>
                    <span className="text-base font-bold font-mono text-foreground">{fund.nav !== null ? `₹${fund.nav.toFixed(2)}` : "Data unavailable"}</span>
                  </div>
                </div>

                {/* Returns grid */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-center text-[11px]">
                  <div>
                    <span className="text-slate-500 block">1Y Return</span>
                    <span className="font-bold text-accent-emerald">{fund.cagr_1y !== null && fund.cagr_1y !== undefined ? `+${fund.cagr_1y}%` : "Data unavailable"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">3Y CAGR</span>
                    <span className="font-bold text-accent-emerald">{fund.cagr_3y !== null && fund.cagr_3y !== undefined ? `+${fund.cagr_3y}%` : "Data unavailable"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">5Y CAGR</span>
                    <span className="font-bold text-accent-emerald">{fund.cagr_5y !== null && fund.cagr_5y !== undefined ? `+${fund.cagr_5y}%` : "Data unavailable"}</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 block">AUM</span>
                    <span className="font-semibold text-slate-200">{fund.aum_crores ? `₹${(fund.aum_crores / 1000).toFixed(1)}k Cr` : "Data unavailable"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Expense Ratio</span>
                    <span className="font-semibold text-slate-200">{fund.expense_ratio ? `${fund.expense_ratio}%` : "Data unavailable"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Risk Grade</span>
                    <span className="font-semibold text-amber-400">{fund.risk_grade ?? "Data unavailable"}</span>
                  </div>
                </div>

                {/* Top Holdings preview */}
                <div className="pt-2 border-t border-white/[0.04] space-y-1.5">
                  <span className="text-[11px] font-medium text-slate-400 block">Top Scheme Holdings:</span>
                  {fund.top_holdings && fund.top_holdings.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {fund.top_holdings.map((h) => (
                        <button
                          key={h.symbol}
                          onClick={() => onSelectStock && onSelectStock(h.symbol)}
                          className="px-2 py-0.5 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[10px] text-slate-300 transition-colors"
                        >
                          {h.name} <span className="text-slate-500 font-mono">({h.weight}%)</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500">Data unavailable — no live scheme-level holdings feed is configured.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Overlap Calculator */}
      {!loading && activeTab === "overlap" && (
        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <ArrowLeftRight className="w-4 h-4 text-accent-cyan" />
              <span>Select Funds for Portfolio Overlap Analysis</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Fund A</label>
                <select
                  value={selectedFundA}
                  onChange={(e) => setSelectedFundA(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white/[0.04] border border-border text-foreground focus:outline-none focus:border-accent-cyan"
                >
                  {funds.map((f) => (
                    <option key={f.id} value={f.id} className="bg-[#0A0D14]">
                      {f.scheme_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Fund B</label>
                <select
                  value={selectedFundB}
                  onChange={(e) => setSelectedFundB(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white/[0.04] border border-border text-foreground focus:outline-none focus:border-accent-cyan"
                >
                  {funds.map((f) => (
                    <option key={f.id} value={f.id} className="bg-[#0A0D14]">
                      {f.scheme_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {overlapResult && (
            <div className="space-y-4">
              {/* Overlap Summary Card */}
              <div className="p-6 rounded-xl bg-surface-50 border border-border flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-1">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                    Calculated Portfolio Overlap
                  </span>
                  <div className="flex items-baseline space-x-3">
                    <span className="text-4xl font-extrabold font-mono text-accent-cyan">
                      {overlapResult.overlap_percentage}%
                    </span>
                    <span className="text-xs text-slate-400">
                      across {overlapResult.common_holdings_count} intersecting common positions
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 pt-1">{overlapResult.interpretation}</p>
                </div>

                <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.05] max-w-sm text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5 text-slate-300 font-semibold mb-1">
                    <Info className="w-3.5 h-3.5 text-accent-cyan" />
                    <span>Documented Methodology</span>
                  </div>
                  {overlapResult.methodology}
                </div>
              </div>

              {/* Intersecting Holdings Table */}
              <div className="rounded-xl bg-surface-50 border border-border overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Intersecting Stock Holdings & Minimum Weight Contribution
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.02] text-slate-400 text-[11px]">
                        <th className="py-2.5 px-4 font-semibold">Holding Name</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Weight in Fund A</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Weight in Fund B</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Overlap Contribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {overlapResult.common_holdings.map((h: any) => (
                        <tr key={h.symbol} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-4 font-medium text-slate-200">
                            <button
                              onClick={() => onSelectStock && onSelectStock(h.symbol)}
                              className="hover:text-accent-cyan transition-colors"
                            >
                              {h.name} <span className="text-slate-500 font-mono">({h.symbol})</span>
                            </button>
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-slate-400">{h.weight_fund_a}%</td>
                          <td className="py-2.5 px-4 text-center font-mono text-slate-400">{h.weight_fund_b}%</td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-accent-cyan">
                            {h.overlap_weight}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: ETFs & Look-Through */}
      {!loading && !error && activeTab === "etfs" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {etfs.map((etf) => (
              <div
                key={etf.symbol}
                onClick={() => setSelectedEtf(etf.symbol)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedEtf === etf.symbol
                    ? "bg-accent-blue/10 border-accent-blue/40 shadow-sm"
                    : "bg-surface-50 border-border hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm">{etf.symbol}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.05] text-slate-400">
                    {etf.asset_class}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{etf.name}</p>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-lg font-bold font-mono text-foreground">₹{etf.nav.toFixed(2)}</span>
                  <span className="text-[11px] text-slate-500">Exp: {etf.expense_ratio}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* ETF Look-Through Constituent Breakdown */}
          {etfLookThrough && (
            <div className="rounded-xl bg-surface-50 border border-border p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {etfLookThrough.symbol} Underlying Basket Look-Through
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Benchmark Index: <strong className="text-slate-200">{etfLookThrough.underlying_index}</strong>
                  </p>
                </div>
                <span className="text-[11px] text-slate-500 italic">
                  {etfLookThrough.freshness_caveat}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
                {etfLookThrough.top_constituents.map((c: any) => (
                  <div
                    key={c.symbol}
                    className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center justify-between cursor-pointer hover:border-white/20 transition-all"
                    onClick={() => onSelectStock && onSelectStock(c.symbol)}
                  >
                    <span className="text-xs font-semibold text-slate-200 hover:text-accent-cyan">
                      {c.symbol}
                    </span>
                    <span className="text-xs font-mono font-bold text-accent-cyan">
                      {c.weight}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Regulatory Compliance */}
      <ComplianceDisclaimer moduleName="Mutual Funds & ETFs" />
    </div>
  );
};
