"use client";

import React, { useState, useEffect } from "react";
import { api, SMABacktestResponse } from "@/lib/api";
import {
  FlaskConical,
  Play,
  Activity,
  Layers,
  Percent,
  Sliders,
  TrendingUp,
  ShieldAlert,
  Info
} from "lucide-react";
import { ComplianceDisclaimer } from "@/components/common/ComplianceDisclaimer";

export const ResearchLabView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"backtest" | "factors">("backtest");
  const [symbol, setSymbol] = useState<string>("RELIANCE");
  const [fastPeriod, setFastPeriod] = useState<number>(20);
  const [slowPeriod, setSlowPeriod] = useState<number>(50);
  const [slippageBps, setSlippageBps] = useState<number>(10);

  const [backtestResult, setBacktestResult] = useState<SMABacktestResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [factors, setFactors] = useState<any[]>([]);

  const runBacktest = async () => {
    setLoading(true);
    try {
      const res = await api.runSmaBacktest({
        symbol,
        fast_period: fastPeriod,
        slow_period: slowPeriod,
        slippage_bps: slippageBps,
      });
      setBacktestResult(res);
    } catch (err) {
      console.warn("Backtest failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadFactors = async () => {
      try {
        const data = await api.getFactorResearch();
        setFactors(data);
      } catch (err) {
        console.warn("Failed to load factors:", err);
      }
    };
    loadFactors();
    runBacktest();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <FlaskConical className="w-5 h-5 text-accent-cyan" />
            <h1 className="text-xl font-bold font-display text-foreground tracking-tight">
              Quantitative Research Lab
            </h1>
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
              Rule-Based Simulations
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Walk-forward in-sample vs out-of-sample backtesting, slippage modeling, and descriptive factor research.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center space-x-1 p-1 bg-surface-50 border border-border rounded-xl">
          <button
            onClick={() => setActiveTab("backtest")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "backtest"
                ? "bg-accent-blue/20 text-accent-cyan border border-accent-blue/30 shadow-sm"
                : "text-slate-400 hover:text-foreground"
            }`}
          >
            Strategy Backtester
          </button>
          <button
            onClick={() => setActiveTab("factors")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "factors"
                ? "bg-accent-blue/20 text-accent-cyan border border-accent-blue/30 shadow-sm"
                : "text-slate-400 hover:text-foreground"
            }`}
          >
            Descriptive Factor Lab
          </button>
        </div>
      </div>

      {activeTab === "backtest" && (
        <div className="space-y-6">
          {/* Strategy Configuration Form */}
          <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-accent-cyan" />
              <span>Configure Quantitative Backtesting Parameters</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Asset Symbol</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white/[0.04] border border-border text-foreground focus:outline-none focus:border-accent-cyan"
                >
                  <option value="RELIANCE" className="bg-[#0A0D14]">RELIANCE</option>
                  <option value="TCS" className="bg-[#0A0D14]">TCS</option>
                  <option value="HINDUNILVR" className="bg-[#0A0D14]">HINDUNILVR</option>
                  <option value="HDFCBANK" className="bg-[#0A0D14]">HDFCBANK</option>
                  <option value="INFY" className="bg-[#0A0D14]">INFY</option>
                  <option value="TRENT" className="bg-[#0A0D14]">TRENT</option>
                  <option value="BEL" className="bg-[#0A0D14]">BEL</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Fast Moving Average (Days)</label>
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={fastPeriod}
                  onChange={(e) => setFastPeriod(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white/[0.04] border border-border text-foreground focus:outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Slow Moving Average (Days)</label>
                <input
                  type="number"
                  min={20}
                  max={200}
                  value={slowPeriod}
                  onChange={(e) => setSlowPeriod(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white/[0.04] border border-border text-foreground focus:outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Slippage & Costs (BPS)</label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={slippageBps}
                  onChange={(e) => setSlippageBps(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white/[0.04] border border-border text-foreground focus:outline-none focus:border-accent-cyan"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={runBacktest}
                disabled={loading}
                className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-accent-blue hover:bg-accent-blue/80 text-white text-xs font-semibold shadow-md transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{loading ? "Simulating..." : "Run Quantitative Simulation"}</span>
              </button>
            </div>
          </div>

          {/* Results: In-Sample vs Out-of-Sample Display */}
          {backtestResult && backtestResult.in_sample_results && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* In-Sample Card */}
                <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                        In-Sample Training Period (70%)
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        {backtestResult.in_sample_results.start_date} to {backtestResult.in_sample_results.end_date}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[11px] text-slate-500 block">Total Return</span>
                      <span className={`text-lg font-bold font-mono ${backtestResult.in_sample_results.total_return_pct >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                        {backtestResult.in_sample_results.total_return_pct}%
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[11px] text-slate-500 block">Benchmark Return</span>
                      <span className="text-lg font-bold font-mono text-slate-300">
                        {backtestResult.in_sample_results.benchmark_return_pct}%
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[11px] text-slate-500 block">CAGR</span>
                      <span className="text-lg font-bold font-mono text-foreground">
                        {backtestResult.in_sample_results.cagr_pct}%
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[11px] text-slate-500 block">Sharpe Ratio</span>
                      <span className="text-lg font-bold font-mono text-accent-cyan">
                        {backtestResult.in_sample_results.sharpe_ratio}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[11px] text-slate-500 block">Max Drawdown</span>
                      <span className="text-lg font-bold font-mono text-accent-rose">
                        -{backtestResult.in_sample_results.max_drawdown_pct}%
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[11px] text-slate-500 block">Trades & Win Rate</span>
                      <span className="text-xs font-semibold text-slate-300">
                        {backtestResult.in_sample_results.total_trades} trades ({backtestResult.in_sample_results.win_rate_pct}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Out-of-Sample Card */}
                <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        Out-of-Sample Validation Period (30%)
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        {backtestResult.out_of_sample_results.start_date} to {backtestResult.out_of_sample_results.end_date}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[11px] text-slate-500 block">Total Return</span>
                      <span className={`text-lg font-bold font-mono ${backtestResult.out_of_sample_results.total_return_pct >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                        {backtestResult.out_of_sample_results.total_return_pct}%
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[11px] text-slate-500 block">Benchmark Return</span>
                      <span className="text-lg font-bold font-mono text-slate-300">
                        {backtestResult.out_of_sample_results.benchmark_return_pct}%
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[11px] text-slate-500 block">CAGR</span>
                      <span className="text-lg font-bold font-mono text-foreground">
                        {backtestResult.out_of_sample_results.cagr_pct}%
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[11px] text-slate-500 block">Sharpe Ratio</span>
                      <span className="text-lg font-bold font-mono text-accent-cyan">
                        {backtestResult.out_of_sample_results.sharpe_ratio}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[11px] text-slate-500 block">Max Drawdown</span>
                      <span className="text-lg font-bold font-mono text-accent-rose">
                        -{backtestResult.out_of_sample_results.max_drawdown_pct}%
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-[11px] text-slate-500 block">Trades & Win Rate</span>
                      <span className="text-xs font-semibold text-slate-300">
                        {backtestResult.out_of_sample_results.total_trades} trades ({backtestResult.out_of_sample_results.win_rate_pct}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-slate-400 flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
                <p>
                  <strong className="text-slate-200">Survivorship Bias Awareness:</strong> {backtestResult.survivorship_bias_note}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Descriptive Factor Research */}
      {activeTab === "factors" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {factors.map((factor) => (
            <div
              key={factor.factor_name}
              className="p-5 rounded-xl bg-surface-50 border border-border space-y-4 hover:border-white/20 transition-all"
            >
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-accent-cyan px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/20">
                  Descriptive Factor Profile
                </span>
                <h3 className="text-base font-bold text-foreground mt-2">{factor.factor_name}</h3>
                <p className="text-xs text-slate-400 mt-1">{factor.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px] text-center">
                <div>
                  <span className="text-slate-500 block">Historical 3Y CAGR</span>
                  <span className="font-bold text-accent-emerald">+{factor.historical_3y_cagr}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Annual Volatility</span>
                  <span className="font-bold text-slate-200">{factor.historical_volatility}%</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sharpe Ratio</span>
                  <span className="font-bold text-accent-cyan">{factor.historical_sharpe}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-500 block">Representative Basket Constituents:</span>
                <div className="flex flex-wrap gap-1.5">
                  {factor.representative_symbols.map((s: string) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] text-slate-300 font-mono"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-accent-cyan block mb-1 text-[11px]">Regime Characteristic</span>
                {factor.regime_behavior}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compliance Disclaimer */}
      <ComplianceDisclaimer moduleName="Quantitative Backtesting & Factor Lab" />
    </div>
  );
};
