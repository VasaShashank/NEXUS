"use client";

import React, { useState, useEffect } from "react";
import { Globe2, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { api, MarketOverviewResponse } from "@/lib/api";

interface MarketsViewProps {
  onSelectStock: (symbol: string) => void;
}

export const MarketsView: React.FC<MarketsViewProps> = ({ onSelectStock }) => {
  const [data, setData] = useState<MarketOverviewResponse | null>(null);

  useEffect(() => {
    api.getMarketOverview().then(setData).catch(console.error);
  }, []);

  if (!data) return <div className="p-6 animate-pulse text-[13px] text-slate-500">Loading Market Data...</div>;

  return (
    <div className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="pb-3 border-b border-white/[0.05] animate-float-up">
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Markets Command Center</h1>
        <p className="text-[13px] text-slate-500 mt-0.5 font-light">
          Indian macroeconomic indices, sector rotation, and liquidity trends.
        </p>
      </div>

      {/* Indices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.indices.map((idx, i) => {
          const isUp = idx.change_1d_pct >= 0;
          return (
            <div key={idx.symbol} className={`p-5 rounded-2xl glass-card animate-float-up animate-float-up-delay-${i + 1}`}>
              <span className="text-[12px] font-semibold text-slate-500 block mb-1.5 tracking-wide">{idx.name}</span>
              <div className="text-[22px] font-display font-extrabold text-foreground tabular-nums tracking-tight">
                ₹{idx.current_value?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </div>
              <div
                className={`text-[12px] font-bold mt-2.5 tabular-nums flex items-center px-2 py-0.5 rounded-lg w-fit ${
                  isUp ? "text-accent-emerald bg-accent-emerald/10" : "text-accent-rose bg-accent-rose/10"
                }`}
              >
                {isUp ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                {isUp ? "+" : ""}
                {idx.change_1d_pct}% ({isUp ? "+" : ""}₹{idx.change_1d})
              </div>
            </div>
          );
        })}
      </div>

      {/* Sector Heatmap & Constituent Dispersion */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        <h2 className="text-[15px] font-display font-bold text-foreground">Sector Dispersion & Capital Flows</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.sector_performance.map((sec) => {
            const isUp = sec.average_change_pct >= 0;
            return (
              <div
                key={sec.sector}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between hover:bg-white/[0.04] hover:border-accent-cyan/20 transition-all duration-300"
              >
                <div>
                  <span className="font-semibold text-[13px] text-foreground block">{sec.sector}</span>
                  <span className="text-[11px] text-slate-500">{sec.constituents_count} Tracked Equities</span>
                </div>
                <span
                  className={`text-[13px] font-black tabular-nums ${
                    isUp ? "text-accent-emerald" : "text-accent-rose"
                  }`}
                >
                  {isUp ? "+" : ""}
                  {sec.average_change_pct?.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
