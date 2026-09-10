"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Plus, Tag, Target, Clock, ShieldAlert, Award } from "lucide-react";
import { api, JournalSummaryResponse, JournalResponse } from "@/lib/api";

interface JournalViewProps {
  onSelectStock: (symbol: string) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({ onSelectStock }) => {
  const [data, setData] = useState<JournalSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);

  // Form State
  const [symbol, setSymbol] = useState<string>("RELIANCE");
  const [thesis, setThesis] = useState<string>("");
  const [strategyTag, setStrategyTag] = useState<string>("SWING");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [stopLoss, setStopLoss] = useState<string>("");
  const [timeframe, setTimeframe] = useState<string>("1-3 Months");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchJournal = async () => {
    try {
      const res = await api.getJournal();
      setData(res);
    } catch (err) {
      console.error("Failed to load journal:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJournal();
  }, []);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thesis.trim()) return;
    setIsSubmitting(true);
    try {
      await api.createJournalEntry({
        symbol: symbol.toUpperCase(),
        thesis,
        strategy_tag: strategyTag,
        target_price: targetPrice ? parseFloat(targetPrice) : undefined,
        stop_loss: stopLoss ? parseFloat(stopLoss) : undefined,
        expected_timeframe: timeframe,
        notes,
      });
      await fetchJournal();
      setShowModal(false);
      setThesis("");
      setNotes("");
      setTargetPrice("");
      setStopLoss("");
    } catch (err) {
      console.error("Journal entry error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-32 rounded-2xl skeleton" />
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.05]">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
            Investment Thesis Journal
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5 font-light">
            Log hypotheses, risk/reward setups, and track performance attribution across strategies.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-accent-cyan text-slate-950 text-xs font-bold hover:bg-sky-400 transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Thesis Entry</span>
        </button>
      </div>

      {/* 1. Strategy Performance Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl glass-card">
          <span className="text-xs font-semibold text-slate-400 block mb-1">
            Overall Strategy Win Rate
          </span>
          <div className="text-2xl font-black text-accent-emerald tabular-nums">
            {data.overall_win_rate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-white/[0.05]">
            Across {data.entries.length} Logged Entries
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Journal P&L</span>
          <div className="text-2xl font-black text-accent-emerald tabular-nums">
            +₹{data.total_journaled_pnl?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-white/[0.05]">
            Simulated Trade Outcomes
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Top Active Strategy</span>
          <div className="text-2xl font-black text-foreground">
            {data.strategy_breakdown[0]?.strategy || "SWING"}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-white/[0.05]">
            {data.strategy_breakdown[0]?.win_rate_pct || 75}% Strategy Win Ratio
          </div>
        </div>
      </div>

      {/* 2. Strategy Breakdown Strip */}
      {data.strategy_breakdown.length > 0 && (
        <div className="p-4 rounded-2xl glass-card space-y-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Strategy Attribution Breakdown
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.strategy_breakdown.map((s) => (
              <div
                key={s.strategy}
                className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1 text-xs tabular-nums"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{s.strategy}</span>
                  <span className="text-[10px] font-bold text-accent-emerald">
                    {s.win_rate_pct}% Win
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Total P&L:</span>
                  <span className="font-medium text-foreground">
                    ₹{s.total_pnl?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Avg Return:</span>
                  <span className="text-slate-300 font-medium">{s.avg_return_pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Logged Entries Timeline */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        <h3 className="text-[15px] font-display font-bold text-foreground">
          Recent Investment Entries ({data.entries.length})
        </h3>

        {data.entries.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <BookOpen className="w-8 h-8 mx-auto text-slate-600" />
            <p>No investment journal entries recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.entries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onSelectStock(entry.symbol)}
                      className="font-bold text-foreground hover:text-accent-cyan transition-colors"
                    >
                      {entry.symbol}
                    </button>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-accent-blue/15 text-accent-cyan uppercase">
                      {entry.strategy_tag}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {entry.expected_timeframe}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {entry.created_at.split("T")[0]}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed font-sans">{entry.thesis}</p>

                {(entry.target_price || entry.stop_loss) && (
                  <div className="flex items-center space-x-4 pt-2 border-t border-white/[0.05]/60 text-[11px] tabular-nums text-slate-400">
                    {entry.target_price && (
                      <span>
                        Target: <strong className="text-accent-emerald">₹{entry.target_price}</strong>
                      </span>
                    )}
                    {entry.stop_loss && (
                      <span>
                        Stop Loss: <strong className="text-accent-rose">₹{entry.stop_loss}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for creating thesis entry */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-surface-50 dark:bg-surface-50 border border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.05]">
              <h3 className="text-[15px] font-display font-bold text-foreground">Record Investment Thesis</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 text-xs">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Equity Symbol
                  </label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    className="w-full px-3 py-1.5 text-xs rounded-lg glass-input text-foreground focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Strategy Tag
                  </label>
                  <select
                    value={strategyTag}
                    onChange={(e) => setStrategyTag(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg glass-input text-foreground focus:outline-none"
                  >
                    <option value="SWING">SWING (Momentum Swing)</option>
                    <option value="VALUE">VALUE (Undervalued Compounder)</option>
                    <option value="GROWTH">GROWTH (High EPS Expansion)</option>
                    <option value="BREAKOUT">BREAKOUT (Technical Resistance Break)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Investment Hypothesis / Thesis
                </label>
                <textarea
                  rows={3}
                  value={thesis}
                  onChange={(e) => setThesis(e.target.value)}
                  placeholder="Explain why you are taking this trade, catalysts, and margin of safety..."
                  className="w-full px-3 py-2 text-xs rounded-lg glass-input text-foreground focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Target Price (₹)
                  </label>
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Stop Loss (₹)
                  </label>
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Timeframe
                  </label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg glass-input text-foreground focus:outline-none"
                  >
                    <option value="1-4 Weeks">1-4 Weeks</option>
                    <option value="1-3 Months">1-3 Months</option>
                    <option value="6-12 Months">6-12 Months</option>
                    <option value="3+ Years">3+ Years</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-1.5 text-xs rounded-lg text-slate-400 hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-accent-cyan text-slate-950 hover:bg-sky-400 transition-all"
                >
                  {isSubmitting ? "Saving..." : "Save Thesis"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
