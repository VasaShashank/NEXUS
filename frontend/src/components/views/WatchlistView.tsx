"use client";

import React, { useState, useEffect } from "react";
import { api, WatchlistItem } from "@/lib/api";
import {
  Bookmark,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Search,
  FolderPlus
} from "lucide-react";
import { ComplianceDisclaimer } from "@/components/common/ComplianceDisclaimer";

interface WatchlistViewProps {
  onSelectStock: (symbol: string) => void;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({ onSelectStock }) => {
  const [watchlists, setWatchlists] = useState<WatchlistItem[]>([]);
  const [selectedWlId, setSelectedWlId] = useState<number | null>(null);
  const [newListName, setNewListName] = useState<string>("");
  const [newSymbol, setNewSymbol] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadWatchlists = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getWatchlists();
      setWatchlists(data);
      if (data.length > 0 && selectedWlId === null) {
        setSelectedWlId(data[0].id);
      }
    } catch (err) {
      console.warn("Failed to load watchlists:", err);
      setError("Could not reach the NEXUS watchlist service. Retry below.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlists();
  }, []);

  const handleCreateWatchlist = async () => {
    if (!newListName.trim()) return;
    try {
      await api.createWatchlist(newListName.trim(), ["RELIANCE", "TCS"]);
      setNewListName("");
      loadWatchlists();
    } catch (err) {
      console.warn("Failed to create watchlist:", err);
    }
  };

  const handleAddSymbol = async () => {
    if (!selectedWlId || !newSymbol.trim()) return;
    try {
      await api.addSymbolToWatchlist(selectedWlId, newSymbol.trim().toUpperCase());
      setNewSymbol("");
      loadWatchlists();
    } catch (err) {
      console.warn("Failed to add symbol:", err);
    }
  };

  const handleRemoveSymbol = async (sym: string) => {
    if (!selectedWlId) return;
    try {
      await api.removeSymbolFromWatchlist(selectedWlId, sym);
      loadWatchlists();
    } catch (err) {
      console.warn("Failed to remove symbol:", err);
    }
  };

  const currentWl = watchlists.find((w) => w.id === selectedWlId) || watchlists[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <Bookmark className="w-5 h-5 text-accent-cyan" />
            <h1 className="text-xl font-bold font-display text-foreground tracking-tight">
              Watchlists & Asset Monitoring
            </h1>
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
              Personalized Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Organize tickers into focused thematic watchlists with live valuation and 1-click research transitions.
          </p>
        </div>

        {/* Create new list input */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="New list name (e.g. FMCG Leaders)..."
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] border border-border text-foreground placeholder-slate-500 focus:outline-none focus:border-accent-cyan w-56"
          />
          <button
            onClick={handleCreateWatchlist}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-accent-cyan/10 hover:bg-accent-cyan/20 border border-accent-cyan/30 text-xs font-semibold text-accent-cyan transition-all shrink-0"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Create List</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-4">
          <span>{error}</span>
          <button
            onClick={loadWatchlists}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-rose-500/15 border border-rose-500/30 text-rose-200 hover:bg-rose-500/25 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading watchlists...
        </div>
      )}

      {!loading && !error && currentWl && (
        <div className="space-y-4">
          {/* Watchlist Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 border-b border-white/[0.06]">
            {watchlists.map((wl) => (
              <button
                key={wl.id}
                onClick={() => setSelectedWlId(wl.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center space-x-2 ${
                  currentWl.id === wl.id
                    ? "bg-accent-blue/20 text-accent-cyan border border-accent-blue/30 shadow-sm"
                    : "text-slate-400 hover:text-foreground hover:bg-white/[0.02]"
                }`}
              >
                <span>{wl.name}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-white/[0.08] text-slate-300">
                  {wl.symbols.length}
                </span>
              </button>
            ))}
          </div>

          {/* Add Symbol Bar */}
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-surface-50 border border-border">
            <Search className="w-4 h-4 text-slate-400 ml-1" />
            <input
              type="text"
              placeholder="Add symbol to this watchlist (e.g. HINDUNILVR, TCS, ITC)..."
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddSymbol();
              }}
              className="flex-1 px-2 py-1 text-xs bg-transparent text-foreground placeholder-slate-500 focus:outline-none"
            />
            <button
              onClick={handleAddSymbol}
              className="px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-medium text-foreground transition-all"
            >
              Add Ticker
            </button>
          </div>

          {/* Watchlist Table */}
          <div className="rounded-xl bg-surface-50 border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02] text-slate-400 text-[11px]">
                    <th className="py-3 px-4 font-semibold">Asset Symbol</th>
                    <th className="py-3 px-4 font-semibold">Company Name</th>
                    <th className="py-3 px-4 font-semibold text-center">Sector</th>
                    <th className="py-3 px-4 font-semibold text-right">Last Price</th>
                    <th className="py-3 px-4 font-semibold text-right">1D Change</th>
                    <th className="py-3 px-4 font-semibold text-right">Volume</th>
                    <th className="py-3 px-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {currentWl.quotes.map((q) => {
                    const isUp = q.change_1d >= 0;
                    return (
                      <tr key={q.symbol} className="hover:bg-white/[0.015] transition-colors">
                        <td className="py-3 px-4 font-bold text-foreground">
                          <button
                            onClick={() => onSelectStock(q.symbol)}
                            className="hover:text-accent-cyan transition-colors"
                          >
                            {q.symbol}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{q.company_name}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                            {q.sector || "Equities"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                          ₹{q.current_price?.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span
                            className={`inline-flex items-center space-x-1 font-semibold ${
                              isUp ? "text-accent-emerald" : "text-accent-rose"
                            }`}
                          >
                            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span>{q.change_1d_pct > 0 ? `+${q.change_1d_pct}%` : `${q.change_1d_pct}%`}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                          {q.volume?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => onSelectStock(q.symbol)}
                              className="p-1 rounded hover:bg-white/[0.06] text-accent-cyan"
                              title="Open in Research"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveSymbol(q.symbol)}
                              className="p-1 rounded hover:bg-white/[0.06] text-slate-500 hover:text-rose-400"
                              title="Remove from Watchlist"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Disclaimer */}
      <ComplianceDisclaimer moduleName="Watchlists & Tracking" />
    </div>
  );
};
