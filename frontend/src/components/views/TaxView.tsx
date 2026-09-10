"use client";

import React, { useState, useEffect } from "react";
import { api, API_BASE_URL, TaxSummaryResponse } from "@/lib/api";
import {
  Receipt,
  Download,
  ShieldAlert,
  Calendar,
  Layers,
  ArrowDownRight,
  TrendingUp,
  Percent
} from "lucide-react";
import { ComplianceDisclaimer } from "@/components/common/ComplianceDisclaimer";

export const TaxView: React.FC = () => {
  const [taxData, setTaxData] = useState<TaxSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadTax = async () => {
      setLoading(true);
      try {
        const data = await api.getTaxSummary();
        setTaxData(data);
      } catch (err) {
        console.error("Failed to load tax report", err);
      } finally {
        setLoading(false);
      }
    };
    loadTax();
  }, []);

  const handleExportCSV = () => {
    window.open(`${API_BASE_URL}/tax/export/csv`, "_blank");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <Receipt className="w-5 h-5 text-accent-cyan" />
            <h1 className="text-xl font-bold font-display text-foreground tracking-tight">
              Tax & Capital Gains Analytics
            </h1>
            <span className="px-2 py-0.5 text-[11px] rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
              AY 2025-26 Indian Tax Code
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Short-term (STCG) vs Long-term (LTCG) holding period classification, tax-lot accounting, and dividend income estimates.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-border text-xs font-medium text-foreground transition-all shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Download Tax Report (CSV)</span>
        </button>
      </div>

      {loading && (
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Auditing tax lots and calculating capital gains obligations...
        </div>
      )}

      {!loading && taxData && (
        <>
          {/* Key Tax Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-1">
              <span className="text-xs text-slate-500 font-medium">Realized STCG (≤ 12 Months)</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold font-mono text-foreground">
                  ₹{taxData.realized_stcg.toLocaleString()}
                </span>
                <span className="text-[10px] text-amber-400 font-semibold">@ 20% Tax</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Est. Tax: <strong className="text-slate-200">₹{taxData.estimated_stcg_tax.toLocaleString()}</strong>
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-1">
              <span className="text-xs text-slate-500 font-medium">Realized LTCG (&gt; 12 Months)</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold font-mono text-foreground">
                  ₹{taxData.realized_ltcg.toLocaleString()}
                </span>
                <span className="text-[10px] text-accent-cyan font-semibold">@ 12.5% Tax</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Est. Tax: <strong className="text-slate-200">₹{taxData.estimated_ltcg_tax.toLocaleString()}</strong>
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-1">
              <span className="text-xs text-slate-500 font-medium">LTCG ₹1.25L Exemption Remaining</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold font-mono text-accent-emerald">
                  ₹{taxData.ltcg_exemption_remaining.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Annual Sec 112A threshold: ₹1,25,000
              </p>
            </div>

            <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-1">
              <span className="text-xs text-slate-500 font-medium">Total Est. Tax Liability</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold font-mono text-accent-rose">
                  ₹{taxData.total_estimated_tax_liability.toLocaleString()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1">
                Excludes Surcharge & 4% Health/Edu Cess
              </p>
            </div>
          </div>

          {/* Unrealized Capital Gains & Dividends */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Unrealized Gains by Potential Tax Bucket
              </h3>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[11px] text-slate-500 block">Unrealized STCG</span>
                  <span className="text-lg font-bold font-mono text-foreground">
                    ₹{taxData.unrealized_stcg.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Potential tax @ 20%</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <span className="text-[11px] text-slate-500 block">Unrealized LTCG</span>
                  <span className="text-lg font-bold font-mono text-foreground">
                    ₹{taxData.unrealized_ltcg.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Potential tax @ 12.5%</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-surface-50 border border-border space-y-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Annualized Dividend Income Estimate
              </h3>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] mt-2">
                <span className="text-[11px] text-slate-500 block">Est. Total Dividend Receipts</span>
                <span className="text-lg font-bold font-mono text-accent-emerald">
                  ₹{taxData.estimated_dividend_income.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Taxable as &quot;Income from Other Sources&quot; under your applicable individual slab rate.
                </span>
              </div>
            </div>
          </div>

          {/* Tax-Lot History Table */}
          <div className="rounded-xl bg-surface-50 border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Closed Tax-Lots & Realized Gain/Loss Ledger
              </h3>
              <span className="text-[11px] text-slate-500">Method: FIFO (First-In, First-Out)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02] text-slate-400 text-[11px]">
                    <th className="py-2.5 px-4 font-semibold">Security Symbol</th>
                    <th className="py-2.5 px-4 font-semibold">Disposal Date</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Quantity</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Holding Period</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Classification</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Realized Gain / (Loss)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {taxData.tax_lots.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No closed sell positions recorded in current assessment cycle.
                      </td>
                    </tr>
                  ) : (
                    taxData.tax_lots.map((lot, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.015]">
                        <td className="py-2.5 px-4 font-bold text-slate-200">{lot.symbol}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-400">{lot.sell_date}</td>
                        <td className="py-2.5 px-4 text-center font-mono text-slate-300">{lot.quantity}</td>
                        <td className="py-2.5 px-4 text-center text-slate-400">{lot.holding_period}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/[0.05] text-slate-300 border border-white/[0.1]">
                            {lot.classification}
                          </span>
                        </td>
                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${lot.realized_pnl >= 0 ? "text-accent-emerald" : "text-accent-rose"}`}>
                          ₹{lot.realized_pnl.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Explicit Tax Disclaimer */}
      <ComplianceDisclaimer moduleName="Tax & Capital Gains" />
    </div>
  );
};
