"use client";

import React, { useState } from "react";
import { Settings, ShieldCheck, Database, Server, RefreshCw, Key } from "lucide-react";
import { api } from "@/lib/api";

interface SettingsViewProps {
  onResetPortfolio: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onResetPortfolio }) => {
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleReset = async () => {
    if (confirm("Reset virtual balance to ₹10,00,000 and clear simulated trade records?")) {
      await api.resetPortfolio();
      setResetMessage("Virtual capital successfully restored to ₹10,00,000.");
      onResetPortfolio();
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="pb-3 border-b border-white/[0.05]">
        <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Platform Settings & Health</h1>
        <p className="text-[13px] text-slate-500 mt-0.5 font-light">
          Environment configuration, virtual balance management, and service infrastructure diagnostics.
        </p>
      </div>

      {/* 1. Infrastructure Status */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
          System Diagnostics & Connectivity
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-accent-cyan" />
              <span>FastAPI Backend</span>
            </div>
            <span className="text-[10px] font-bold text-accent-emerald bg-accent-emerald/15 px-1.5 py-0.5 rounded">
              ONLINE
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-accent-emerald" />
              <span>Relational Storage</span>
            </div>
            <span className="text-[10px] font-bold text-accent-emerald bg-accent-emerald/15 px-1.5 py-0.5 rounded">
              ACTIVE
            </span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-accent-violet" />
              <span>LangGraph Engine</span>
            </div>
            <span className="text-[10px] font-bold text-accent-cyan bg-accent-cyan/15 px-1.5 py-0.5 rounded">
              READY
            </span>
          </div>
        </div>
      </div>

      {/* 2. Paper Trading Sandbox Capital Reset */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
          Simulated Capital Management
        </h2>
        <p className="text-[13px] text-slate-500 mt-0.5 font-light">
          Reset your paper trading wallet back to ₹10,00,000 to test new allocation strategies.
        </p>
        {resetMessage && (
          <div className="p-3 rounded-lg text-xs font-medium bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/20">
            {resetMessage}
          </div>
        )}
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-slate-500 text-xs font-semibold text-foreground flex items-center space-x-2 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5 text-accent-cyan" />
          <span>Reset Virtual Cash to ₹10,00,000</span>
        </button>
      </div>

      {/* 3. API Key & Autonomous AI Fallback Guardrails */}
      <div className="p-5 rounded-2xl glass-card space-y-3">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center space-x-2">
          <Key className="w-4 h-4 text-accent-amber" />
          <span>Autonomous AI & LLM Fallback Mode</span>
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          NEXUS operates with strict financial guardrails. If external LLM API tokens (OpenAI / Gemini) are unavailable, the platform automatically deploys deterministic financial reasoning and multi-factor rule graphs without interrupting quotes, paper trades, charts, or risk calculations.
        </p>
      </div>
    </div>
  );
};
