"use client";

import React, { useState, useEffect } from "react";
import { api, MacroIndicatorItem } from "@/lib/api";
import {
  Globe,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  Info
} from "lucide-react";
import { ComplianceDisclaimer } from "@/components/common/ComplianceDisclaimer";

export const MacroView: React.FC = () => {
  const [indicators, setIndicators] = useState<MacroIndicatorItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadMacro = async () => {
      setLoading(true);
      try {
        const data = await api.getMacroIndicators();
        setIndicators(data);
      } catch (err) {
        console.warn("Failed to load macro data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadMacro();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2.5">
          <Globe className="w-5 h-5 text-accent-cyan" />
          <h1 className="text-xl font-bold font-display text-foreground tracking-tight">
            Macroeconomic Dashboard & Regime Tracker
          </h1>
          <span className="px-2 py-0.5 text-[11px] rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
            India Macro Indicators
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Tracking national CPI, GDP growth, RBI policy interest rates, sovereign yields, and sector correlation linkages.
        </p>
      </div>

      {loading && (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading official macroeconomic indicators...
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {indicators.map((ind) => (
            <div
              key={ind.id}
              className="p-5 rounded-xl bg-surface-50 border border-border space-y-4 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-0.5 rounded bg-white/[0.04]">
                    {ind.frequency}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                    {ind.trend}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-foreground mt-3">{ind.name}</h3>
                <div className="mt-2 flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold font-mono text-foreground">{ind.current_value}</span>
                  <span className="text-xs text-slate-400 font-medium">{ind.unit}</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Target / Range: {ind.target_band}
                </span>

                {/* Historical Sparkline Bars */}
                <div className="mt-4 pt-3 border-t border-white/[0.04] space-y-2">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Recent Trajectory</span>
                    <span>As of {ind.last_updated}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5 items-end h-12 bg-white/[0.02] p-1.5 rounded-lg">
                    {ind.historical_series.map((pt, idx) => (
                      <div key={idx} className="flex flex-col items-center justify-end h-full group relative">
                        <div
                          className="w-full rounded-sm bg-accent-cyan/40 group-hover:bg-accent-cyan transition-all"
                          style={{ height: `${Math.min(100, (pt.value / (ind.current_value * 1.3)) * 100)}%` }}
                        />
                        <span className="text-[8px] text-slate-500 mt-1 truncate">{pt.period.split(" ")[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs text-slate-300 leading-relaxed mt-2">
                <span className="font-semibold text-accent-cyan block mb-1 text-[11px]">Sector Transmission Channel</span>
                {ind.sector_linkage}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compliance Disclaimer */}
      <ComplianceDisclaimer moduleName="Macroeconomic Intelligence" />
    </div>
  );
};
