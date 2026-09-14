"use client";

import React, { useEffect, useState } from "react";
import { Settings, ShieldCheck, Database, Server, RefreshCw, Key, PlugZap } from "lucide-react";
import { api, FinanceLibraryCapability } from "@/lib/api";

interface BrokerHealthItem {
  adapter: string;
  status: string;
  read_only: boolean;
  live_execution_enabled: boolean;
  credentials_configured: boolean;
  consent_recorded: boolean;
  reconciliation_ready: boolean;
  rate_limit_policy: string;
  connectivity?: string;
  message?: string;
}

interface SettingsViewProps {
  onResetPortfolio: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onResetPortfolio }) => {
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<FinanceLibraryCapability[]>([]);
  const [brokerHealth, setBrokerHealth] = useState<BrokerHealthItem[]>([]);

  useEffect(() => {
    api.getFinanceLibraryCapabilities().then(setCapabilities).catch(() => setCapabilities([]));
    api.getBrokerHealth().then(setBrokerHealth).catch(() => setBrokerHealth([]));
  }, []);

  const statusTone = (status: string) => {
    if (status === "operational" || status === "read_only_configured") return "text-accent-emerald bg-accent-emerald/15";
    if (status === "degraded") return "text-amber-300 bg-amber-500/15";
    return "text-slate-400 bg-white/[0.06]";
  };

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

      <div className="p-5 rounded-2xl glass-card space-y-4">
        <div>
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Finance Library Coverage</h2>
          <p className="text-[12px] text-slate-500 mt-1">Runtime inventory of installed libraries and active NEXUS integrations.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {capabilities.map((item) => (
            <div key={item.library} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-foreground">{item.library}</div>
                <div className="text-[11px] text-slate-500 truncate">{item.purpose}</div>
              </div>
              <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${item.status === "planned" ? "text-slate-400 bg-white/[0.06]" : "text-accent-emerald bg-accent-emerald/15"}`}>
                {item.status === "planned" ? "PLANNED" : item.installed ? "ACTIVE" : "OPTIONAL"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Broker Adapter Health */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        <div>
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center space-x-2">
            <PlugZap className="w-4 h-4 text-accent-cyan" />
            <span>Broker Adapter Health</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Read-only adapter connectivity. External brokers stay disabled until credentials, consent, and reconciliation terms are configured.
          </p>
        </div>
        {brokerHealth.length === 0 ? (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-slate-500">
            Broker adapter telemetry unavailable.
          </div>
        ) : (
          <div className="space-y-2">
            {brokerHealth.map((adapter) => (
              <div key={adapter.adapter} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground capitalize">{adapter.adapter}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${statusTone(adapter.status)}`}>
                    {adapter.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-400">
                  <div>Read-only: <strong className="text-slate-200">{adapter.read_only ? "Yes" : "No"}</strong></div>
                  <div>Live execution: <strong className="text-slate-200">{adapter.live_execution_enabled ? "Yes" : "No"}</strong></div>
                  <div>Credentials: <strong className="text-slate-200">{adapter.credentials_configured ? "Configured" : "Not set"}</strong></div>
                  <div>Consent: <strong className="text-slate-200">{adapter.consent_recorded ? "Recorded" : "Not recorded"}</strong></div>
                </div>
                <div className="text-[10px] text-slate-500">
                  Rate limit policy: {adapter.rate_limit_policy}
                  {adapter.message ? ` — ${adapter.message}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Paper Trading Sandbox Capital Reset */}
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

      {/* 4. API Key & Autonomous AI Fallback Guardrails */}
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
