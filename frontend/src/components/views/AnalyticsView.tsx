"use client";

import React, { useState, useEffect } from "react";
import {
  PieChart,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { api, PortfolioAnalyticsResponse, PortfolioRiskResponse } from "@/lib/api";
import { InfoTooltip } from "@/components/common/InfoTooltip";

interface AnalyticsViewProps {
  onNavigate: (view: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigate }) => {
  const [analytics, setAnalytics] = useState<PortfolioAnalyticsResponse | null>(null);
  const [risk, setRisk] = useState<PortfolioRiskResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [a, r] = await Promise.all([api.getAnalytics(), api.getRisk()]);
      setAnalytics(a);
      setRisk(r);
    } catch (err) {
      console.error("Failed to load analytics and risk data:", err);
      setLoadError("Could not reach the NEXUS analytics service. Retry below.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loadError && (!analytics || !risk)) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-4">
          <span>{loadError}</span>
          <button
            onClick={fetchData}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-rose-500/15 border border-rose-500/30 text-rose-200 hover:bg-rose-500/25 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !analytics || !risk) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.05]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
              Portfolio Intelligence & Risk Analytics
            </h1>
            <InfoTooltip
              title="Portfolio Intelligence & Risk Diagnostics"
              definition="Institutional-grade quantitative attribution measuring risk-adjusted returns, benchmark co-movement, and tail-risk exposure."
              decisionImpact="Identifies structural flaws in portfolio construction. Allows optimizing asset allocation to maximize return per unit of downside risk."
            />
          </div>
          <p className="text-[13px] text-slate-400 mt-1 font-light">
            Institutional performance attribution, benchmark beta, and structural risk diagnostics.
          </p>
        </div>
        <button
          onClick={() => onNavigate("ai-assistant")}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-accent-blue/10 border border-accent-blue/20 text-accent-cyan text-xs font-semibold hover:bg-accent-blue/20 transition-all shadow-[0_0_12px_rgba(14,165,233,0.15)]"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Launch AI Portfolio Doctor</span>
        </button>
      </div>

      {/* 1. Core Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              CAGR Return
            </span>
            <InfoTooltip
              title="Compound Annual Growth Rate (CAGR)"
              definition="The mean annual growth rate of an investment over a specified period of time longer than one year, assuming reinvestment."
              decisionImpact="Benchmark against Nifty 50 CAGR (~13%). If lower over a 3-year period, active stock picking is destroying value vs passive indexing."
            />
          </div>
          <div className="text-xl font-black text-foreground tabular-nums">{analytics.cagr}%</div>
        </div>

        <div className="p-4 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              Sharpe Ratio
            </span>
            <InfoTooltip
              title="Sharpe Ratio (Risk-Adjusted Return)"
              definition="Calculates excess return above the risk-free rate divided by portfolio standard deviation."
              decisionImpact="Ratio > 1.0 is satisfactory; > 1.5 is institutional caliber. If Sharpe < 0.8, returns do not justify the volatility taken; reallocate to lower-beta assets."
            />
          </div>
          <div className="text-xl font-black text-accent-emerald tabular-nums">
            {analytics.sharpe_ratio}
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              Max Drawdown
            </span>
            <InfoTooltip
              title="Maximum Historical Drawdown"
              definition="The largest peak-to-trough drop in total equity valuation before a new peak is achieved."
              decisionImpact="Defines risk containment. If drawdown breaches your maximum psychological tolerance (e.g. 15%), immediately reduce gross exposure by 30-50%."
            />
          </div>
          <div className="text-xl font-black text-accent-rose tabular-nums">
            {analytics.max_drawdown}%
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              Beta vs NIFTY 50
            </span>
            <InfoTooltip
              title="Portfolio Beta vs NIFTY 50"
              definition="Measure of portfolio volatility in relation to the systematic risk of the benchmark index (Beta = 1.0 matches Nifty)."
              decisionImpact="If Beta > 1.3, you are aggressively exposed to market selloffs. If Beta < 0.9, the portfolio acts defensively to preserve capital during corrections."
            />
          </div>
          <div className="text-xl font-black text-foreground tabular-nums">
            {analytics.beta_vs_nifty}
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              Annual Volatility
            </span>
            <InfoTooltip
              title="Annualized Volatility (σ)"
              definition="Annualized standard deviation of daily logarithmic returns, capturing the variance and spread of portfolio price swings."
              decisionImpact="Excess volatility (> 22%) often causes emotional trading errors. Keep volatility low to maintain consistent compounding."
            />
          </div>
          <div className="text-xl font-black text-slate-300 tabular-nums">
            {analytics.annualized_volatility}%
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">
              Trade Win Rate
            </span>
            <InfoTooltip
              title="Historical Trade Win Rate"
              definition="The percentage of closed positions that realized positive net profit upon trade liquidation."
              decisionImpact="Must be evaluated alongside Reward-to-Risk ratio. A 45% win rate with a 2.5:1 profit/loss ratio produces highly profitable net expectancy."
            />
          </div>
          <div className="text-xl font-black text-accent-emerald tabular-nums">
            {analytics.win_rate}%
          </div>
        </div>
      </div>

      {/* 2. Institutional Risk Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Concentration & Health Card */}
        <div className="p-5 rounded-2xl glass-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Structural Risk Status
            </h3>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                risk.overall_risk_score === "LOW"
                  ? "bg-accent-emerald/15 text-accent-emerald"
                  : risk.overall_risk_score === "MODERATE"
                  ? "bg-accent-cyan/15 text-accent-cyan"
                  : "bg-accent-rose/15 text-accent-rose"
              }`}
            >
              {risk.overall_risk_score} RISK
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            <div className="text-xs font-bold text-foreground mb-1">Concentration Assessment</div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {risk.concentration_risk.description}
            </p>
          </div>

          {/* Diversification Gauge */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Diversification Score</span>
              <span className="text-foreground font-bold tabular-nums">
                {risk.diversification_score} / 100
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
              <div
                style={{ width: `${risk.diversification_score}%` }}
                className="h-full bg-accent-cyan transition-all"
              />
            </div>
          </div>

          {/* Actionable Warnings */}
          <div className="space-y-2 pt-2 border-t border-white/[0.05]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Actionable Observations
            </span>
            {risk.actionable_warnings.map((w, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                <AlertTriangle className="w-3.5 h-3.5 text-accent-amber shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
            {risk.strengths.map((s, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald shrink-0 mt-0.5" />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2 Cols: Sector Exposures Breakdown */}
        <div className="lg:col-span-2 p-5 rounded-2xl glass-card space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.05]">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Sector Allocation & Exposure Weights
            </h3>
            <span className="text-[11px] text-slate-400">Target safe threshold: &lt; 25%</span>
          </div>

          {risk.sector_exposures.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-slate-500 mt-0.5 font-light">
              No sector allocations yet. Deploy cash into equities to analyze sector exposure.
            </div>
          ) : (
            <div className="space-y-4">
              {risk.sector_exposures.map((sec) => (
                <div key={sec.sector} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{sec.sector}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 tabular-nums">
                        ₹{sec.value?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </span>
                      <span className="font-bold tabular-nums text-foreground">
                        {sec.percentage}%
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          sec.risk_rating === "HEAVY"
                            ? "bg-accent-rose/15 text-accent-rose"
                            : sec.risk_rating === "OVERWEIGHT"
                            ? "bg-accent-amber/15 text-accent-amber"
                            : "bg-accent-emerald/15 text-accent-emerald"
                        }`}
                      >
                        {sec.risk_rating}
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/[0.04] overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, sec.percentage)}%` }}
                      className={`h-full ${
                        sec.risk_rating === "HEAVY"
                          ? "bg-accent-rose"
                          : sec.risk_rating === "OVERWEIGHT"
                          ? "bg-accent-amber"
                          : "bg-accent-emerald"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
