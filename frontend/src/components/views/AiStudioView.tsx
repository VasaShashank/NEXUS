"use client";

import React, { useState, useEffect } from "react";
import {
  Brain,
  Sparkles,
  HelpCircle,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Clock,
  FileText,
  Search,
  Zap,
  ChevronDown,
  Layers,
} from "lucide-react";
import {
  api,
  AgentRunResponse,
  WhyMovedResponse,
  PortfolioDoctorResponse,
} from "@/lib/api";

interface AiStudioViewProps {
  initialQuery?: string;
  initialSymbol?: string;
  defaultSubTab?: "research" | "whymoved" | "doctor";
}

export const AiStudioView: React.FC<AiStudioViewProps> = ({
  initialQuery = "Research Reliance Industries valuation, technical momentum, and key operational risks.",
  initialSymbol = "RELIANCE",
  defaultSubTab = "research",
}) => {
  const [subTab, setSubTab] = useState<"research" | "whymoved" | "doctor">(defaultSubTab);

  // Research Agent State
  const [query, setQuery] = useState<string>(initialQuery);
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [agentResult, setAgentResult] = useState<AgentRunResponse | null>(null);
  const [isResearching, setIsResearching] = useState<boolean>(false);
  const [showObservability, setShowObservability] = useState<boolean>(false);

  // Why Moved State
  const [whySymbol, setWhySymbol] = useState<string>("TCS");
  const [whyResult, setWhyResult] = useState<WhyMovedResponse | null>(null);
  const [isWhyLoading, setIsWhyLoading] = useState<boolean>(false);

  // Portfolio Doctor State
  const [doctorResult, setDoctorResult] = useState<PortfolioDoctorResponse | null>(null);
  const [isDoctorLoading, setIsDoctorLoading] = useState<boolean>(false);

  // Auto-run research if initialQuery provided
  useEffect(() => {
    handleRunResearch();
  }, []);

  const handleRunResearch = async () => {
    if (!query.trim()) return;
    setIsResearching(true);
    try {
      const res = await api.runAiResearch(query, symbol);
      setAgentResult(res);
    } catch (err) {
      console.error("AI Research error:", err);
    } finally {
      setIsResearching(false);
    }
  };

  const handleRunWhyMoved = async (sym: string) => {
    setWhySymbol(sym);
    setIsWhyLoading(true);
    try {
      const res = await api.getWhyMoved(sym);
      setWhyResult(res);
    } catch (err) {
      console.error("Why Moved error:", err);
    } finally {
      setIsWhyLoading(false);
    }
  };

  const handleRunDoctor = async () => {
    setIsDoctorLoading(true);
    try {
      const res = await api.getPortfolioDoctor();
      setDoctorResult(res);
    } catch (err) {
      console.error("Doctor error:", err);
    } finally {
      setIsDoctorLoading(false);
    }
  };

  useEffect(() => {
    if (subTab === "whymoved" && !whyResult) {
      handleRunWhyMoved("TCS");
    } else if (subTab === "doctor" && !doctorResult) {
      handleRunDoctor();
    }
  }, [subTab]);

  return (
    <div className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.05]">
        <div>
          <div className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-accent-cyan" />
            <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
              NEXUS Intelligence Studio
            </h1>
          </div>
          <p className="text-[13px] text-slate-500 mt-0.5 font-light">
            LangGraph multi-step research agent, controlled financial tools, and corporate filing RAG.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center space-x-1 bg-white/[0.03] p-1 rounded-lg text-xs">
          <button
            onClick={() => setSubTab("research")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all ${
              subTab === "research"
                ? "bg-surface-50 dark:bg-white/[0.04] text-accent-cyan shadow-sm"
                : "text-slate-400 hover:text-foreground"
            }`}
          >
            Research Agent
          </button>
          <button
            onClick={() => setSubTab("whymoved")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all ${
              subTab === "whymoved"
                ? "bg-surface-50 dark:bg-white/[0.04] text-accent-cyan shadow-sm"
                : "text-slate-400 hover:text-foreground"
            }`}
          >
            &quot;Why Did It Move?&quot;
          </button>
          <button
            onClick={() => setSubTab("doctor")}
            className={`px-3 py-1.5 font-semibold rounded-md transition-all ${
              subTab === "doctor"
                ? "bg-surface-50 dark:bg-white/[0.04] text-accent-cyan shadow-sm"
                : "text-slate-400 hover:text-foreground"
            }`}
          >
            Portfolio Doctor
          </button>
        </div>
      </div>

      {/* 1. RESEARCH AGENT VIEW */}
      {subTab === "research" && (
        <div className="space-y-6">
          {/* Query Bar */}
          <div className="p-4 rounded-2xl glass-card space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask an investment research question (e.g. Research TCS valuation and deal pipeline)..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white/[0.02] border border-white/[0.05] text-foreground focus:outline-none focus:ring-1 focus:ring-accent-cyan"
                  onKeyDown={(e) => e.key === "Enter" && handleRunResearch()}
                />
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl bg-white/[0.02] border border-white/[0.05] text-foreground focus:outline-none"
                >
                  <option value="RELIANCE">RELIANCE</option>
                  <option value="TCS">TCS</option>
                  <option value="HDFCBANK">HDFCBANK</option>
                  <option value="INFY">INFY</option>
                  <option value="TATAMOTORS">TATAMOTORS</option>
                  <option value="ITC">ITC</option>
                </select>
                <button
                  onClick={handleRunResearch}
                  disabled={isResearching}
                  className="px-4 py-2 rounded-lg bg-accent-cyan text-slate-950 font-bold text-xs hover:bg-sky-400 transition-all flex items-center space-x-1.5 shrink-0"
                >
                  {isResearching ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{isResearching ? "Synthesizing..." : "Run Agent"}</span>
                </button>
              </div>
            </div>

            {/* Quick Prompt Ideas */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.05] text-[11px] text-slate-400">
              <span className="font-semibold text-slate-400">Try asking:</span>
              <button
                onClick={() => {
                  setQuery("Analyze Reliance valuation multiples and upcoming green energy catalysts");
                  setSymbol("RELIANCE");
                }}
                className="hover:text-accent-cyan transition-colors"
              >
                • Reliance green energy & valuation
              </button>
              <button
                onClick={() => {
                  setQuery("Assess TCS operating margins, deal pipeline, and technical support levels");
                  setSymbol("TCS");
                }}
                className="hover:text-accent-cyan transition-colors"
              >
                • TCS margins & support levels
              </button>
            </div>
          </div>

          {/* Agent Results Card */}
          {agentResult && (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="p-5 rounded-2xl glass-card space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.05]">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-accent-emerald animate-pulse" />
                    <h2 className="text-[15px] font-display font-bold text-foreground">Grounded Research Synthesis</h2>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-400 tabular-nums">
                    <span>Latency: {agentResult.latency_ms}ms</span>
                    <span>•</span>
                    <span>Tokens: ~{agentResult.tokens_estimated}</span>
                    <button
                      onClick={() => setShowObservability(!showObservability)}
                      className="px-2 py-0.5 rounded bg-white/[0.04] text-[11px] text-slate-300 hover:text-foreground"
                    >
                      {showObservability ? "Hide Trace" : "View Tool Trace"}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {agentResult.executive_summary}
                </p>

                {/* Factual vs Interpretation vs Uncertainties */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-[10px] font-bold text-accent-cyan uppercase block mb-1">
                      Verified Data Facts
                    </span>
                    <ul className="text-xs space-y-1 text-slate-300 tabular-nums">
                      {Object.entries(agentResult.structured_findings.verified_facts || {}).map(
                        ([k, v]) => (
                          <li key={k} className="flex justify-between">
                            <span className="text-slate-400 capitalize">{k.replace("_", " ")}:</span>
                            <span className="font-semibold text-foreground">{String(v)}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-[10px] font-bold text-accent-amber uppercase block mb-1">
                      AI Analytical Interpretation
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {agentResult.structured_findings.interpretation}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Key Uncertainties
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {agentResult.structured_findings.uncertainties}
                    </p>
                  </div>
                </div>

                {/* Bull vs Bear Cases */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 rounded-lg bg-accent-emerald/5 border border-accent-emerald/20 space-y-1.5">
                    <span className="text-xs font-bold text-accent-emerald flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Bull Case Catalysts</span>
                    </span>
                    {agentResult.bull_case.map((b, i) => (
                      <p key={i} className="text-xs text-slate-300 leading-relaxed">
                        • {b}
                      </p>
                    ))}
                  </div>

                  <div className="p-3.5 rounded-lg bg-accent-rose/5 border border-accent-rose/20 space-y-1.5">
                    <span className="text-xs font-bold text-accent-rose flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Bear Case & Headwinds</span>
                    </span>
                    {agentResult.bear_case.map((b, i) => (
                      <p key={i} className="text-xs text-slate-300 leading-relaxed">
                        • {b}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Grounded Evidence Citations */}
                <div className="pt-2 border-t border-white/[0.05]">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2.5">
                    Grounded Evidence Citations ({agentResult.evidence_citations.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {agentResult.evidence_citations.map((c, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-foreground truncate">{c.title}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-white/[0.04] text-slate-300">
                            {c.source_type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 italic mb-1.5">&quot;{c.snippet}&quot;</p>
                        <div className="text-[10px] text-accent-cyan font-medium">
                          Source: {c.reference}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Observability Tool Trace Drawer */}
              {showObservability && (
                <div className="p-5 rounded-2xl glass-card space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
                    <span className="text-xs font-bold text-foreground">
                      Developer Observability: Tool Calls Trace
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Run ID: {agentResult.run_id}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {agentResult.tool_calls.map((tc, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] font-mono text-[11px] space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-accent-cyan">{tc.tool_name}()</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-400">{tc.latency_ms}ms</span>
                            <span className="text-accent-emerald uppercase font-bold text-[9px] px-1 bg-accent-emerald/15 rounded">
                              {tc.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-slate-400 truncate">
                          Input: {JSON.stringify(tc.tool_input)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. WHY DID IT MOVE? VIEW */}
      {subTab === "whymoved" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl glass-card flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Select Equity</span>
              <div className="flex items-center space-x-2">
                {["RELIANCE", "TCS", "TATAMOTORS", "HDFCBANK", "INFY"].map((sym) => (
                  <button
                    key={sym}
                    onClick={() => handleRunWhyMoved(sym)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      whySymbol === sym
                        ? "bg-accent-cyan text-slate-950 border-accent-cyan"
                        : "border-border text-slate-300 hover:text-foreground"
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
            {isWhyLoading && (
              <div className="text-xs text-accent-cyan font-medium animate-pulse">
                Analyzing movement vectors...
              </div>
            )}
          </div>

          {whyResult && (
            <div className="p-5 rounded-2xl glass-card space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.05]">
                <div className="flex items-center space-x-3">
                  <h2 className="text-base font-bold text-foreground">
                    Why {whyResult.company_name} ({whyResult.symbol}) Moved
                  </h2>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      whyResult.change_1d_pct >= 0
                        ? "bg-accent-emerald/15 text-accent-emerald"
                        : "bg-accent-rose/15 text-accent-rose"
                    }`}
                  >
                    {whyResult.change_1d_pct >= 0 ? "+" : ""}
                    {whyResult.change_1d_pct?.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400">Confidence:</span>
                  <span className="font-bold text-accent-cyan">{whyResult.confidence_rating}</span>
                </div>
              </div>

              {/* Observed Contributing Factors */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {whyResult.observed_factors.map((f, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{f.factor_name}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          f.impact === "POSITIVE"
                            ? "bg-accent-emerald/15 text-accent-emerald"
                            : f.impact === "NEGATIVE"
                            ? "bg-accent-rose/15 text-accent-rose"
                            : "bg-white/[0.04] text-slate-400"
                        }`}
                      >
                        {f.impact}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{f.description}</p>
                  </div>
                ))}
              </div>

              {/* Synthesis Interpretation */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Movement Interpretation
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {whyResult.interpretation}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. PORTFOLIO DOCTOR VIEW */}
      {subTab === "doctor" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl glass-card flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-display font-bold text-foreground">AI Portfolio Risk Doctor</h2>
              <p className="text-[13px] text-slate-500 mt-0.5 font-light">
                Automated algorithmic inspection of active holdings, single-holding exposure, and sector tilt.
              </p>
            </div>
            <button
              onClick={handleRunDoctor}
              disabled={isDoctorLoading}
              className="px-4 py-2 rounded-lg bg-accent-cyan text-slate-950 font-bold text-xs hover:bg-sky-400 transition-all flex items-center space-x-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isDoctorLoading ? "Diagnosing..." : "Run Diagnosis"}</span>
            </button>
          </div>

          {doctorResult && (
            <div className="p-5 rounded-2xl glass-card space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.05]">
                <span className="text-[15px] font-display font-bold text-foreground">Overall Health Rating</span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded bg-accent-emerald/15 text-accent-emerald">
                  {doctorResult.overall_health}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Concentration Analysis
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {doctorResult.concentration_summary}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Sector Tilt Analysis
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {doctorResult.sector_tilt_summary}
                  </p>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="p-4 rounded-lg bg-accent-blue/5 border border-accent-blue/20 space-y-2">
                <span className="text-xs font-bold text-accent-cyan uppercase tracking-wider block">
                  Recommended Portfolio Actions
                </span>
                {doctorResult.suggested_actions.map((act, i) => (
                  <div key={i} className="flex items-start space-x-2 text-xs text-slate-300">
                    <ArrowRight className="w-3.5 h-3.5 text-accent-cyan shrink-0 mt-0.5" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
