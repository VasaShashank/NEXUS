"use client";

import React from "react";
import { ShieldAlert, Info } from "lucide-react";

interface ComplianceDisclaimerProps {
  moduleName?: string;
  className?: string;
}

export const ComplianceDisclaimer: React.FC<ComplianceDisclaimerProps> = ({
  moduleName = "Research & Analytics",
  className = "",
}) => {
  return (
    <div
      className={`p-3.5 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 text-slate-400 text-xs leading-relaxed flex items-start space-x-3 ${className}`}
    >
      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="font-semibold text-amber-300 text-[11px] tracking-wide uppercase">
          Regulatory Disclaimer · {moduleName}
        </p>
        <p className="text-slate-400 text-[11px]">
          NEXUS is an institutional financial intelligence and mathematical research platform. NEXUS is{" "}
          <strong className="text-slate-200">not a SEBI or SEC-registered investment adviser or broker-dealer</strong>.
          All candlestick patterns, backtesting results, financial ratios, valuation multiples, and AI-generated syntheses
          represent historical mathematical observations and hypothetical simulations. Nothing displayed constitutes an offer,
          solicitation, recommendation, or personalized investment advice.
        </p>
      </div>
    </div>
  );
};
