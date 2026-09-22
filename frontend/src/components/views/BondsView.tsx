"use client";

import React, { useState, useEffect } from "react";
import { api, BondItem } from "@/lib/api";
import {
  ShieldCheck,
  Calendar,
  Percent,
  Sliders,
  TrendingUp,
  Download,
  Info,
  DollarSign
} from "lucide-react";
import { ComplianceDisclaimer } from "@/components/common/ComplianceDisclaimer";

export const BondsView: React.FC = () => {
  const [bonds, setBonds] = useState<BondItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Ladder Simulator state
  const [investmentAmount, setInvestmentAmount] = useState<number>(1000000);
  const [tenorYears, setTenorYears] = useState<number>(5);
  const [ladderResult, setLadderResult] = useState<any | null>(null);
  const [ladderLoading, setLadderLoading] = useState<boolean>(false);
  const [ladderError, setLadderError] = useState<string | null>(null);

  const loadBonds = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBonds();
      setBonds(data);
    } catch (err) {
      console.warn("Failed to load bonds:", err);
      setError("Could not reach the NEXUS fixed-income service. Retry below.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBonds();
  }, []);

  const runSimulation = async () => {
    setLadderLoading(true);
    setLadderError(null);
    try {
      const res = await api.simulateBondLadder({
        total_investment: investmentAmount,
        target_tenor_years: tenorYears,
      });
      setLadderResult(res);
    } catch (err) {
      console.warn("Ladder simulation failed:", err);
      setLadderResult(null);
      setLadderError("Bond ladder unavailable: no verified live bond feed is reachable right now.");
    } finally {
      setLadderLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [investmentAmount, tenorYears]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-accent-cyan" />
            <h1 className="text-xl font-bold font-display text-foreground tracking-tight">
              Sovereign & Corporate Fixed Income
            </h1>
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
              G-Secs & Corporate Bonds
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Government securities directory, Yield to Maturity (YTM) analytics, and cash-flow Bond Ladder simulator.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-4">
          <span>{error}</span>
          <button
            onClick={loadBonds}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-rose-500/15 border border-rose-500/30 text-rose-200 hover:bg-rose-500/25 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading fixed income bonds & yields...
        </div>
      )}

      {/* Bond Directory Table */}
      {!loading && !error && (
        <div className="rounded-xl bg-surface-50 border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Sovereign & PSU Fixed Income Securities</h3>
            <span className="text-[11px] text-slate-500">Trading on CCIL / NSE Debt Segment</span>
          </div>

          {bonds.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">Data unavailable: no verified live CCIL/RBI/issuer bond feed is configured.</div>
          ) : <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02] text-slate-400 text-[11px]">
                  <th className="py-3 px-4 font-semibold">Bond Name & ISIN</th>
                  <th className="py-3 px-4 font-semibold text-center">Coupon Rate</th>
                  <th className="py-3 px-4 font-semibold text-center">YTM (%)</th>
                  <th className="py-3 px-4 font-semibold text-center">Mod Duration</th>
                  <th className="py-3 px-4 font-semibold text-center">Maturity Date</th>
                  <th className="py-3 px-4 font-semibold text-center">Credit Rating</th>
                  <th className="py-3 px-4 font-semibold text-right">Market Price (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {bonds.map((b) => (
                  <tr key={b.isin} className="hover:bg-white/[0.015] transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-200 block">{b.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{b.isin} · {b.seniority}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-300">
                      {b.coupon_rate.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-accent-cyan">
                      {b.ytm.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-400">
                      {b.modified_duration_years.toFixed(2)} Yrs
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-400">
                      {b.maturity_date}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {b.credit_rating.split(" ")[0]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-foreground">
                      {b.market_price != null ? `₹${b.market_price.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </div>
      )}

      {/* Interactive Bond Ladder Simulator */}
      <div className="rounded-xl bg-surface-50 border border-border p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-accent-cyan" />
              <span>Bond Ladder Maturity & Cash-Flow Simulator</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulates staggered multi-year fixed income maturity schedules to stabilize interest income and reinvestment risk.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-white/[0.04] text-[11px] text-slate-400 font-medium border border-white/[0.05]">
            Simulation Only
          </span>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Total Investment Principal</span>
              <span className="font-bold font-mono text-foreground">₹{investmentAmount.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={100000}
              max={10000000}
              step={50000}
              value={investmentAmount}
              onChange={(e) => setInvestmentAmount(Number(e.target.value))}
              className="w-full accent-accent-cyan cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>₹1 Lakh</span>
              <span>₹50 Lakhs</span>
              <span>₹1 Crore</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Target Tenor (Rungs)</span>
              <span className="font-bold font-mono text-foreground">{tenorYears} Years</span>
            </div>
            <input
              type="range"
              min={3}
              max={10}
              step={1}
              value={tenorYears}
              onChange={(e) => setTenorYears(Number(e.target.value))}
              className="w-full accent-accent-cyan cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>3 Years</span>
              <span>5 Years</span>
              <span>10 Years</span>
            </div>
          </div>
        </div>

        {/* Simulation Results */}
        {ladderError && !ladderResult && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            {ladderError}
          </div>
        )}
        {ladderResult && (
          <div className="space-y-4 pt-2">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-xs text-slate-500 block">Weighted Average YTM</span>
                <span className="text-xl font-bold font-mono text-accent-cyan">
                  {ladderResult.weighted_average_ytm}%
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-xs text-slate-500 block">Estimated Annual Coupon Cash Flow</span>
                <span className="text-xl font-bold font-mono text-accent-emerald">
                  ₹{ladderResult.estimated_annual_cashflow.toLocaleString()}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-xs text-slate-500 block">Weighted Duration</span>
                <span className="text-xl font-bold font-mono text-slate-200">
                  {ladderResult.weighted_duration_years} Years
                </span>
              </div>
            </div>

            {/* Schedule Table */}
            <div className="overflow-x-auto rounded-lg border border-white/[0.05]">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-white/[0.02] text-slate-400 text-[11px] border-b border-white/[0.05]">
                    <th className="py-2.5 px-3 font-semibold">Rung #</th>
                    <th className="py-2.5 px-3 font-semibold">Maturity Year</th>
                    <th className="py-2.5 px-3 font-semibold">Assigned Bond</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Allocated Principal</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Annual Coupon</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Maturity Cash Flow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {ladderResult.schedule.map((r: any) => (
                    <tr key={r.rung_number} className="hover:bg-white/[0.015]">
                      <td className="py-2.5 px-3 font-medium text-slate-400">Rung {r.rung_number}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-accent-cyan">{r.maturity_year}</td>
                      <td className="py-2.5 px-3 text-slate-300 line-clamp-1">{r.bond_name}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">₹{r.allocated_capital.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-accent-emerald">₹{r.annual_coupon_income.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                        ₹{r.total_cash_flow_at_maturity.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-slate-500 italic pt-1">
              {ladderResult.simulation_disclaimer}
            </p>
          </div>
        )}
      </div>

      {/* Compliance Disclaimer */}
      <ComplianceDisclaimer moduleName="Fixed Income & Bond Analytics" />
    </div>
  );
};
