"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  AlertTriangle,
  TrendingUp,
  History,
  Calculator,
  Download,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  Info,
  Scale,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import {
  api,
  DocumentFiling,
  ExtractedTable,
  ForensicFinding,
  GuidanceDriftComparison,
  CorporateDisclosure,
  DCFValuationResult,
  DCFAssumptionInput,
} from "@/lib/api";

interface FinancialIntelligenceWorkspaceProps {
  symbol: string;
}

export const FinancialIntelligenceWorkspace: React.FC<FinancialIntelligenceWorkspaceProps> = ({
  symbol,
}) => {
  const [activeTab, setActiveTab] = useState<
    "statements" | "forensics" | "guidance" | "disclosures" | "valuation" | "dossier"
  >("forensics");

  // State
  const [filings, setFilings] = useState<DocumentFiling[]>([]);
  const [tables, setTables] = useState<ExtractedTable[]>([]);
  const [forensics, setForensics] = useState<ForensicFinding[]>([]);
  const [drift, setDrift] = useState<GuidanceDriftComparison[]>([]);
  const [disclosures, setDisclosures] = useState<CorporateDisclosure[]>([]);
  const [dcfResult, setDcfResult] = useState<DCFValuationResult | null>(null);
  const [dossierMarkdown, setDossierMarkdown] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedDossier, setCopiedDossier] = useState<boolean>(false);

  // Table options
  const [statementType, setStatementType] = useState<string>("INCOME_STATEMENT");
  const [scope, setScope] = useState<string>("CONSOLIDATED");

  // DCF Assumptions State
  const [dcfInputs, setDcfInputs] = useState<DCFAssumptionInput>({
    symbol,
    revenue_growth_y1_5: 12.0,
    terminal_growth_rate: 4.5,
    operating_margin: 18.0,
    effective_tax_rate: 25.0,
    reinvestment_rate: 20.0,
    wacc: 11.5,
  });

  // Expanded forensic cards
  const [expandedForensics, setExpandedForensics] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchIntelligenceData();
  }, [symbol, statementType, scope]);

  const fetchIntelligenceData = async () => {
    setIsLoading(true);
    try {
      const [f, t, fnd, d, disc, dcf, report] = await Promise.all([
        api.getFilings(symbol).catch(() => []),
        api.getExtractedTables(symbol, statementType, scope).catch(() => []),
        api.getForensics(symbol).catch(() => []),
        api.getGuidanceDrift(symbol).catch(() => []),
        api.getDisclosures(symbol).catch(() => []),
        api.runDcfValuation({ ...dcfInputs, symbol }).catch(() => null),
        api.getReportMarkdown(symbol).catch(() => ""),
      ]);

      setFilings(f);
      setTables(t);
      setForensics(fnd);
      setDrift(d);
      setDisclosures(disc);
      setDcfResult(dcf);
      setDossierMarkdown(report);

      // Auto-expand critical/high findings
      const initialExpanded: Record<number, boolean> = {};
      fnd.forEach((item, idx) => {
        if (item.severity === "CRITICAL" || item.severity === "HIGH" || idx === 0) {
          initialExpanded[item.id] = true;
        }
      });
      setExpandedForensics(initialExpanded);
    } catch (err) {
      console.error("Failed to load intelligence workspace data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculateDcf = async () => {
    try {
      const res = await api.runDcfValuation({ ...dcfInputs, symbol });
      setDcfResult(res);
    } catch (err) {
      console.error("DCF recalculation error:", err);
    }
  };

  const toggleForensic = (id: number) => {
    setExpandedForensics((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = () => {
    if (dossierMarkdown) {
      navigator.clipboard.writeText(dossierMarkdown);
      setCopiedDossier(true);
      setTimeout(() => setCopiedDossier(false), 2000);
    }
  };

  const downloadDossier = () => {
    if (!dossierMarkdown) return;
    const blob = new Blob([dossierMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NEXUS_${symbol}_Intelligence_Dossier.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden mt-6 backdrop-blur-md">
      {/* Workspace Header */}
      <div className="px-6 py-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-950/40">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider bg-blue-500/10 border border-blue-500/30 text-blue-400">
              NEXUS 2.0 INTELLIGENCE
            </span>
            <span className="text-xs text-slate-400">
              Audited BSE/NSE Filings &amp; Deterministic Accounting Forensics
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            Institutional Research &amp; Disclosure Workspace: {symbol}
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchIntelligenceData}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Sync Filings</span>
          </button>
          <button
            onClick={() => setActiveTab("dossier")}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Dossier</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 px-6 bg-slate-950/20 overflow-x-auto">
        {[
          { id: "forensics", label: "Accounting Forensics", icon: AlertTriangle, count: forensics.length },
          { id: "statements", label: "Audited Statements", icon: FileText, count: tables.length },
          { id: "guidance", label: "Guidance Drift", icon: TrendingUp, count: drift.length },
          { id: "disclosures", label: "Corporate Timeline", icon: History, count: disclosures.length },
          { id: "valuation", label: "Transparent DCF", icon: Calculator },
          { id: "dossier", label: "Research Dossier", icon: Scale },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? "border-blue-500 text-blue-400 bg-blue-500/5"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? "bg-blue-500/20 text-blue-300" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="p-6">
        {/* ── 1. ACCOUNTING FORENSICS TAB ── */}
        {activeTab === "forensics" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <div>
                <h3 className="text-sm font-bold text-white">Earnings-Quality &amp; Divergence Checks</h3>
                <p className="text-xs text-slate-400">
                  Deterministic accounting heuristics evaluating operating cash flow conversion, receivables DSO, and solvency.
                </p>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/30">
                  Zero Hallucination
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">Non-Predictive Observation</span>
              </div>
            </div>

            {forensics.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-white">No Material Red Flags Observed</p>
                <p className="text-xs mt-1">Earnings quality and working capital ratios adhere to standard accounting benchmarks.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {forensics.map((finding) => {
                  const isExpanded = !!expandedForensics[finding.id];
                  const severityBadge =
                    finding.severity === "CRITICAL"
                      ? "bg-rose-500/15 text-rose-400 border-rose-500/40"
                      : finding.severity === "HIGH"
                      ? "bg-amber-500/15 text-amber-400 border-amber-500/40"
                      : finding.severity === "MEDIUM"
                      ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/40"
                      : "bg-emerald-500/15 text-emerald-400 border-emerald-500/40";

                  return (
                    <div
                      key={finding.id}
                      className="border border-slate-800 rounded-xl bg-slate-950/40 overflow-hidden transition-all"
                    >
                      {/* Finding Header */}
                      <button
                        onClick={() => toggleForensic(finding.id)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-900/40 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${severityBadge}`}
                          >
                            {finding.severity}
                          </span>
                          <span className="font-semibold text-sm text-white">{finding.title}</span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-400">
                          <span>Confidence: {finding.confidence}</span>
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </button>

                      {/* Finding Details */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-slate-800/60 space-y-4 text-xs">
                          {/* Observation & Calculations */}
                          <div className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                            <span className="font-bold text-slate-300 block mb-1">Observed Accounting Pattern:</span>
                            <p className="text-slate-300 leading-relaxed">{finding.observation_summary}</p>
                          </div>

                          {/* Why It Matters */}
                          <div>
                            <span className="font-bold text-slate-300 block mb-1 text-[11px] uppercase tracking-wider">
                              Why This Matters:
                            </span>
                            <p className="text-slate-400 leading-relaxed">{finding.why_it_matters}</p>
                          </div>

                          {/* Benign Explanations */}
                          {finding.benign_explanations.length > 0 && (
                            <div className="bg-blue-950/20 border border-blue-900/30 p-3 rounded-lg">
                              <span className="font-bold text-blue-300 block mb-1.5 text-[11px] uppercase tracking-wider">
                                Plausible Benign Explanations (Not Proof of Misconduct):
                              </span>
                              <ul className="list-disc list-inside space-y-1 text-slate-300">
                                {finding.benign_explanations.map((benign, bIdx) => (
                                  <li key={bIdx}>{benign}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Recommended Checks */}
                          {finding.recommended_checks.length > 0 && (
                            <div className="bg-amber-950/20 border border-amber-900/30 p-3 rounded-lg">
                              <span className="font-bold text-amber-300 block mb-1.5 text-[11px] uppercase tracking-wider">
                                Recommended Verification Checks:
                              </span>
                              <ul className="list-disc list-inside space-y-1 text-slate-300">
                                {finding.recommended_checks.map((check, cIdx) => (
                                  <li key={cIdx}>{check}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Citations Footer */}
                          {finding.citations.length > 0 && (
                            <div className="flex items-center space-x-2 text-[11px] text-slate-400 pt-1">
                              <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span>
                                Provenance Citations:{" "}
                                {finding.citations
                                  .map((c) => `${c.metric || 'Filing'} (${c.period || 'FY24'}, Page ${c.page || 'N/A'})`)
                                  .join(" | ")}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 2. AUDITED STATEMENTS TAB ── */}
        {activeTab === "statements" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                {["INCOME_STATEMENT", "BALANCE_SHEET", "CASH_FLOW"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatementType(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      statementType === st
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Scope:</span>
                {["CONSOLIDATED", "STANDALONE"].map((sc) => (
                  <button
                    key={sc}
                    onClick={() => setScope(sc)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                      scope === sc
                        ? "bg-slate-700 text-white border border-slate-600"
                        : "bg-slate-900 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {sc}
                  </button>
                ))}
              </div>
            </div>

            {tables.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No extracted table available for selected scope.</p>
              </div>
            ) : (
              tables.map((tbl) => (
                <div key={tbl.id} className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between text-xs bg-slate-900/60">
                    <span className="font-bold text-slate-300">
                      {tbl.statement_type.replace("_", " ")} ({tbl.consolidation_scope})
                    </span>
                    <span className="text-slate-400">
                      Units: {tbl.units} ({tbl.currency}) | Source Page: {tbl.page_number}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/30 text-slate-400">
                          <th className="py-2.5 px-4 font-semibold">Line Item</th>
                          <th className="py-2.5 px-3 font-semibold text-center w-16">Note</th>
                          {tbl.headers.map((h) => (
                            <th key={h} className="py-2.5 px-4 font-semibold text-right">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {tbl.rows.map((row, rIdx) => {
                          const isTotal = row.is_total;
                          return (
                            <tr
                              key={rIdx}
                              className={`hover:bg-slate-800/30 transition-colors ${
                                isTotal ? "bg-slate-900/40 font-bold text-white" : "text-slate-300"
                              }`}
                            >
                              <td className="py-2.5 px-4" style={{ paddingLeft: `${16 + row.level * 16}px` }}>
                                {row.label}
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-400">
                                {row.note_ref || "—"}
                              </td>
                              {tbl.headers.map((h) => {
                                const val = row.values[h];
                                return (
                                  <td key={h} className="py-2.5 px-4 text-right font-mono">
                                    {val !== null && val !== undefined ? val.toLocaleString("en-IN", { minimumFractionDigits: 1 }) : "—"}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── 3. GUIDANCE DRIFT TAB ── */}
        {activeTab === "guidance" && (
          <div className="space-y-4">
            <div className="pb-2 border-b border-slate-800/60">
              <h3 className="text-sm font-bold text-white">Longitudinal Management Guidance Drift</h3>
              <p className="text-xs text-slate-400">
                Quarter-over-quarter tracking of capex, margin, and revenue growth commitments extracted from BSE disclosures.
              </p>
            </div>

            {drift.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Tracking guidance drift requires disclosures across at least two consecutive periods.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drift.map((item, idx) => (
                  <div key={idx} className="border border-slate-800 rounded-xl p-5 bg-slate-950/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-blue-400">
                        {item.category.replace("_", " ")}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        {item.drift_type}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/80">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {item.historical_period} Historical Guidance ({item.historical_modality})
                        </span>
                        <p className="text-slate-300 italic">"{item.historical_statement}"</p>
                      </div>

                      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/80">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          {item.current_period} Current Guidance ({item.current_modality})
                        </span>
                        <p className="text-slate-300 italic">"{item.current_statement}"</p>
                      </div>
                    </div>

                    <div className="bg-blue-950/20 border border-blue-900/30 p-2.5 rounded text-xs text-blue-200">
                      <span className="font-bold text-blue-300 mr-1.5">Drift Analysis:</span>
                      {item.explanation}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 4. CORPORATE DISCLOSURES TAB ── */}
        {activeTab === "disclosures" && (
          <div className="space-y-4">
            <div className="pb-2 border-b border-slate-800/60">
              <h3 className="text-sm font-bold text-white">Corporate Ownership &amp; Disclosure Timeline</h3>
              <p className="text-xs text-slate-400">
                Official filings for insider transactions, promoter pledge encumbrances, and institutional bulk/block deals.
              </p>
            </div>

            {disclosures.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p>No recent insider trading or promoter pledge events reported for this issuer.</p>
              </div>
            ) : (
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/40 text-slate-400">
                      <th className="py-2.5 px-4 font-semibold">Date</th>
                      <th className="py-2.5 px-4 font-semibold">Event Type</th>
                      <th className="py-2.5 px-4 font-semibold">Entity</th>
                      <th className="py-2.5 px-3 font-semibold">Action</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Shares / Value</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Exchange</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {disclosures.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-800/20 transition-colors text-slate-300">
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {new Date(ev.event_date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 border border-slate-700 text-blue-300">
                            {ev.event_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-white">{ev.entity_name}</td>
                        <td className="py-3 px-3 text-slate-400">{ev.action_type || "—"}</td>
                        <td className="py-3 px-4 text-right font-mono">
                          {ev.shares_count ? `${ev.shares_count.toLocaleString("en-IN")} shs` : "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[11px] font-bold text-slate-400">{ev.source_exchange}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── 5. TRANSPARENT DCF VALUATION TAB ── */}
        {activeTab === "valuation" && (
          <div className="space-y-6">
            <div className="pb-2 border-b border-slate-800/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Deterministic Multi-Stage DCF Valuation</h3>
                <p className="text-xs text-slate-400">
                  Calculates intrinsic fair value from verified historical free cash flows. No black-box AI price targets.
                </p>
              </div>
              <button
                onClick={handleRecalculateDcf}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Recalculate Model
              </button>
            </div>

            {/* Assumption Controls Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  5Y Revenue CAGR (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={dcfInputs.revenue_growth_y1_5}
                  onChange={(e) =>
                    setDcfInputs({ ...dcfInputs, revenue_growth_y1_5: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Target Operating Margin (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={dcfInputs.operating_margin}
                  onChange={(e) =>
                    setDcfInputs({ ...dcfInputs, operating_margin: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Discount Rate (WACC %)
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={dcfInputs.wacc}
                  onChange={(e) => setDcfInputs({ ...dcfInputs, wacc: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Terminal Growth (%)
                </label>
                <input
                  type="number"
                  step="0.25"
                  value={dcfInputs.terminal_growth_rate}
                  onChange={(e) =>
                    setDcfInputs({ ...dcfInputs, terminal_growth_rate: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {dcfResult && (
              <>
                {/* Result KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Intrinsic Value / Share
                    </span>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">
                      ₹{dcfResult.intrinsic_value_per_share.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Current Market Price
                    </span>
                    <div className="text-2xl font-bold text-white mt-1">
                      ₹{dcfResult.current_market_price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Margin of Safety
                    </span>
                    <div
                      className={`text-2xl font-bold mt-1 ${
                        dcfResult.margin_of_safety_pct >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {dcfResult.margin_of_safety_pct >= 0 ? "+" : ""}
                      {dcfResult.margin_of_safety_pct.toFixed(1)}%
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Market-Implied Growth
                    </span>
                    <div className="text-2xl font-bold text-blue-400 mt-1">
                      {dcfResult.reverse_valuation.implied_5yr_revenue_cagr_pct}%
                    </div>
                  </div>
                </div>

                {/* Reverse DCF Interpretation Box */}
                <div className="bg-blue-950/20 border border-blue-900/30 p-3.5 rounded-xl text-xs text-blue-200">
                  <span className="font-bold text-blue-300 block mb-1 text-[11px] uppercase tracking-wider">
                    Reverse-DCF Market Implication:
                  </span>
                  <p>{dcfResult.reverse_valuation.interpretation}</p>
                </div>

                {/* 5-Year Cash Flow Projection Table */}
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                  <div className="px-5 py-3 border-b border-slate-800 text-xs font-bold text-slate-300 bg-slate-900/60">
                    5-Year Projected Cash Flow Schedule (₹ Crores)
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/30 text-slate-400">
                        <th className="py-2.5 px-4 font-semibold">Period</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Revenue</th>
                        <th className="py-2.5 px-4 font-semibold text-right">EBIT</th>
                        <th className="py-2.5 px-4 font-semibold text-right">NOPAT</th>
                        <th className="py-2.5 px-4 font-semibold text-right">FCFF</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Discount Factor</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Present Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {dcfResult.projected_fcf.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/20 text-slate-300 font-mono">
                          <td className="py-2.5 px-4 font-sans text-white">{row.year}</td>
                          <td className="py-2.5 px-4 text-right">{row.revenue.toLocaleString("en-IN")}</td>
                          <td className="py-2.5 px-4 text-right">{row.ebit.toLocaleString("en-IN")}</td>
                          <td className="py-2.5 px-4 text-right">{row.nopat.toLocaleString("en-IN")}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-400">
                            {row.fcf.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-4 text-right text-slate-400">{row.discount_factor.toFixed(4)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-white">
                            {row.present_value.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── 6. RESEARCH DOSSIER TAB ── */}
        {activeTab === "dossier" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <div>
                <h3 className="text-sm font-bold text-white">Full Institutional Research Dossier</h3>
                <p className="text-xs text-slate-400">
                  Evidence-backed intelligence document ready for internship presentation and equity analysis.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  {copiedDossier ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDossier ? "Copied" : "Copy Markdown"}</span>
                </button>
                <button
                  onClick={downloadDossier}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .md</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-6 font-mono text-xs text-slate-300 overflow-x-auto max-h-[550px] overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {dossierMarkdown || "Generating dossier from verified corporate filings..."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
