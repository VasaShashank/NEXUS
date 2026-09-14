"use client";

import React, { useState, useEffect } from "react";
import { api, CommodityFxItem } from "@/lib/api";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  DollarSign
} from "lucide-react";
import { ComplianceDisclaimer } from "@/components/common/ComplianceDisclaimer";

export const CommoditiesFxView: React.FC = () => {
  const [items, setItems] = useState<CommodityFxItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCommoditiesFx();
      setItems(data);
    } catch (err) {
      console.warn("Failed to load commodities/fx:", err);
      setError("Could not reach the NEXUS commodities & FX service. Retry below.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2.5">
          <Coins className="w-5 h-5 text-accent-cyan" />
          <h1 className="text-xl font-bold font-display text-foreground tracking-tight">
            Commodities & FX Asset Intelligence
          </h1>
          <span className="px-2 py-0.5 text-[11px] rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
            Gold · Crude · USD/INR
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Independent researchable assets with dedicated price tracking, annualized volatility, and macroeconomic linkages.
        </p>
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
          Loading commodities and foreign exchange quotes...
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const isUp = item.change_1d >= 0;
            return (
              <div
                key={item.symbol}
                className="p-5 rounded-xl bg-surface-50 border border-border space-y-4 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-accent-cyan px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/20">
                      {item.asset_class}
                    </span>
                    <h3 className="text-base font-bold text-foreground mt-2">{item.name}</h3>
                    <p className="text-xs text-slate-400">{item.unit}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono text-foreground block">
                      {item.symbol === "BRENT_CRUDE" ? `$${item.current_price.toFixed(2)}` : `₹${item.current_price.toLocaleString()}`}
                    </span>
                    <span
                      className={`text-xs font-semibold inline-flex items-center space-x-1 ${
                        isUp ? "text-accent-emerald" : "text-accent-rose"
                      }`}
                    >
                      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{item.change_1d > 0 ? `+${item.change_1d}` : item.change_1d} ({item.change_1d_pct > 0 ? `+${item.change_1d_pct}%` : `${item.change_1d_pct}%`})</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.05] text-[11px]">
                  <div>
                    <span className="text-slate-500 block">52W Low</span>
                    <span className="font-semibold text-slate-200">{item.week_52_low}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">52W High</span>
                    <span className="font-semibold text-slate-200">{item.week_52_high}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Ann. Volatility</span>
                    <span className="font-semibold text-amber-400">{item.annualized_volatility}%</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-accent-cyan block mb-1 text-[11px]">Macroeconomic Impact</span>
                  {item.macro_impact}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compliance Disclaimer */}
      <ComplianceDisclaimer moduleName="Commodities & Foreign Exchange" />
    </div>
  );
};
