"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Globe2,
  Filter,
  LineChart,
  Briefcase,
  PieChart,
  ArrowLeftRight,
  Brain,
  BookOpen,
  Calculator,
  Settings,
  Sparkles,
  Target,
  ChevronRight,
  GitCompare,
  Landmark,
  TrendingUp,
  BarChart3,
  Receipt,
  Star,
  FlaskConical,
  GraduationCap,
  BarChart2,
} from "lucide-react";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: string;
  technicalDescription: string;
  decisionImpact: string;
}

interface NavSection {
  label: string | null;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const [hoveredItem, setHoveredItem] = useState<NavItem | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ top: number }>({ top: 0 });

  const navSections: NavSection[] = [
    {
      label: null,
      items: [
        {
          id: "overview",
          label: "Overview",
          icon: LayoutDashboard,
          technicalDescription:
            "Aggregates real-time macro benchmark movements (Nifty 50, Sensex), market breadth (Advance/Decline), and intraday momentum movers.",
          decisionImpact:
            "Helps gauge overall market regime before trading. If breadth is bullish (>1.5x A/D), favor long entries; if breadth is weak, avoid buying breakouts.",
        },
      ],
    },
    {
      label: "MARKETS",
      items: [
        {
          id: "markets",
          label: "Markets",
          icon: Globe2,
          technicalDescription:
            "Tracks broad-market and sectoral indices (Nifty Bank, IT, Auto, Pharma) with intraday percentage changes and technical breadth.",
          decisionImpact:
            "Identifies sectoral rotation. Capital flows into leading sectors first; trade stocks within the strongest sectors to maximize momentum and win rate.",
        },
        {
          id: "screener",
          label: "Screener",
          icon: Filter,
          technicalDescription:
            "Multi-factor quantitative filtering engine across valuation (P/E), balance sheet strength (Debt/Equity), return on capital (ROE), and technical momentum (RSI).",
          decisionImpact:
            "Eliminates emotional bias by isolating stocks meeting strict quantitative risk/reward parameters. Reduces search time from hours to seconds.",
        },
        {
          id: "research",
          label: "Research",
          icon: LineChart,
          technicalDescription:
            "Deep single-stock diagnostics combining TradingView interactive candlestick charts, technical support/resistance, fundamental financials, and RAG filings.",
          decisionImpact:
            "Validates entries with technical confluence (support, moving averages) and confirms solvency/growth before taking large position sizes.",
        },
        {
          id: "compare",
          label: "Compare",
          icon: GitCompare,
          technicalDescription:
            "Side-by-side peer comparison of up to 5 equities: normalized price performance, valuation multiples matrix (P/E, P/B, EV/EBITDA), and quality scores.",
          decisionImpact:
            "Identifies the best-quality stock within a sector at the most attractive relative valuation before committing capital.",
        },
      ],
    },
    {
      label: "MULTI-ASSET",
      items: [
        {
          id: "funds",
          label: "Mutual Funds & ETFs",
          icon: BarChart3,
          technicalDescription:
            "Mutual fund explorer with AUM, rolling returns, risk-adjusted Sharpe ratios, portfolio overlap calculator, and ETF underlying constituent look-through.",
          decisionImpact:
            "Detects hidden concentration risk — if two funds share 65%+ overlap, you are not diversifying but doubling concentration in the same positions.",
        },
        {
          id: "bonds",
          label: "Bonds & Fixed Income",
          icon: Landmark,
          technicalDescription:
            "Sovereign G-Sec and AAA corporate bond directory with YTM, modified duration, credit quality, and interactive Bond Ladder cash-flow simulator.",
          decisionImpact:
            "Higher-duration bonds lose more value in rising rate cycles. Use bond ladder tool to build predictable income streams that match your liability schedule.",
        },
        {
          id: "commodities-fx",
          label: "Commodities & FX",
          icon: TrendingUp,
          technicalDescription:
            "Gold, Silver, Crude Oil, and USD/INR real-time quotes with 52-week context, correlation to equity indices, and inflation-hedging analysis.",
          decisionImpact:
            "Commodities typically outperform equities during stagflation. FX signals alert to input cost pressures affecting export-oriented IT and import-dependent energy companies.",
        },
        {
          id: "macro",
          label: "Macro Dashboard",
          icon: BarChart2,
          technicalDescription:
            "Macroeconomic dashboard: CPI Inflation, RBI Repo Rate, GDP Growth, 10-Year G-Sec Yield, India Manufacturing PMI with historical trend charts.",
          decisionImpact:
            "Rate policy drives P/E multiples. Rising repo rate compresses equity valuations; contracting PMI precedes earnings downgrades in cyclical sectors.",
        },
      ],
    },
    {
      label: "PORTFOLIO",
      items: [
        {
          id: "portfolio",
          label: "Portfolio",
          icon: Briefcase,
          technicalDescription:
            "Real-time position tracking, cost-basis calculation, realized/unrealized P&L accounting, and liquidity balance.",
          decisionImpact:
            "Informs position-sizing and profit-taking decisions. Tells you when to trim outsized winners or cut losing positions that violate risk rules.",
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: PieChart,
          technicalDescription:
            "Institutional risk diagnostics: Sharpe & Sortino ratios, portfolio Beta vs NIFTY 50, maximum historical drawdown, and sector concentration.",
          decisionImpact:
            "Prevents catastrophic drawdowns. If portfolio Beta > 1.3 or sector concentration > 35%, indicates excessive risk requiring immediate diversification.",
        },
        {
          id: "paper-trading",
          label: "Paper Trading",
          icon: ArrowLeftRight,
          badge: "₹10L DEMO",
          technicalDescription:
            "Simulated execution engine with ₹10,00,000 in virtual capital executing against live real-time market bid/ask prices.",
          decisionImpact:
            "Validates trading hypotheses and builds disciplined execution habits without risking real capital until your edge produces positive expectancy.",
        },
        {
          id: "watchlists",
          label: "Watchlists",
          icon: Star,
          technicalDescription:
            "Multi-watchlist manager with live quotes, custom grouping, and one-click navigation to Research view for any watched stock.",
          decisionImpact:
            "Organise candidate stocks into staged watchlists (Researching → Conviction → Ready to Buy) to build a structured pipeline of high-conviction ideas.",
        },
        {
          id: "tax",
          label: "Tax Analytics",
          icon: Receipt,
          badge: "FY26",
          technicalDescription:
            "Indian capital gains tax calculator applying Budget 2024 rates: STCG 20%, LTCG 12.5% with ₹1.25L exemption. Tax-lot ledger and CSV export.",
          decisionImpact:
            "Strategic tax-loss harvesting before March 31 can offset ₹1.25L of LTCG gains tax-free. Hold winners beyond 1 year to save 7.5% differential on STCG vs LTCG.",
        },
      ],
    },
    {
      label: "INTELLIGENCE",
      items: [
        {
          id: "ai-research",
          label: "AI Research",
          icon: Brain,
          badge: "AI",
          technicalDescription:
            "Autonomous multi-agent synthesis running fundamental, technical, and risk audits to produce institutional equity research reports.",
          decisionImpact:
            "Identifies hidden balance-sheet red flags, governance concerns, or emerging growth catalysts that traditional screeners often miss.",
        },
        {
          id: "ai-assistant",
          label: "AI Assistant",
          icon: Sparkles,
          technicalDescription:
            "Context-aware financial reasoning assistant with access to real-time market data, price action drivers, and news analysis.",
          decisionImpact:
            "Answers specific tactical questions like 'Why did Tata Motors drop 3% on earnings?' to avoid selling into panic or buying value traps.",
        },
        {
          id: "ai-tutor",
          label: "AI Tutor",
          icon: GraduationCap,
          badge: "LEARN",
          technicalDescription:
            "Interactive financial education engine covering ROCE, Duration, Tracking Error, Sharpe/Sortino with real market examples and checkpoint quizzes.",
          decisionImpact:
            "Knowledge compounds like interest. Understanding why ROCE > cost of capital creates durable value prevents buying value traps at cheap P/E.",
        },
      ],
    },
    {
      label: "TOOLS",
      items: [
        {
          id: "quant-lab",
          label: "Quant Lab",
          icon: FlaskConical,
          badge: "BETA",
          technicalDescription:
            "Walk-forward SMA crossover backtester with In-Sample (70%) / Out-of-Sample (30%) isolation, slippage simulation, and factor profiling.",
          decisionImpact:
            "Out-of-sample validation prevents overfitting. A strategy with 35% CAGR in-sample but only 8% out-of-sample is a curve-fitted data illusion, not an edge.",
        },
        {
          id: "journal",
          label: "Journal",
          icon: BookOpen,
          technicalDescription:
            "Trade logging and post-trade analysis tracking entry reasons, technical thesis, emotion ratings, and exit efficiency.",
          decisionImpact:
            "Uncovers behavioral leaks (e.g. FOMO entries, premature profit cuts) to systematically increase your long-term win rate and Sharpe ratio.",
        },
        {
          id: "simulators",
          label: "Simulators",
          icon: Calculator,
          technicalDescription:
            "Discounted Cash Flow (DCF) fair-value modeling, historical 'What-If' scenario backtesting, and compound SIP wealth projections.",
          decisionImpact:
            "Calculates intrinsic fair value and Margin of Safety. Prevents overpaying for hype stocks by defining your exact maximum entry price.",
        },
      ],
    },
    {
      label: "ACCOUNT",
      items: [
        {
          id: "settings",
          label: "Settings",
          icon: Settings,
          technicalDescription:
            "Platform environment configuration, API connectivity, display themes, and simulated account balance management.",
          decisionImpact:
            "Allows resetting paper balances or configuring risk thresholds to match your specific investing methodology.",
        },
      ],
    },
  ];



  const handleMouseEnter = (item: NavItem, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cardHeight = 220;
    const maxTop = typeof window !== "undefined" ? window.innerHeight - cardHeight - 16 : 400;
    const clampedTop = Math.max(16, Math.min(rect.top - 8, maxTop));
    setHoverPosition({ top: clampedTop });
    setHoveredItem(item);
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };

  return (
    <aside className="w-60 shrink-0 h-[calc(100vh-4rem)] sticky top-16 glass-sidebar flex flex-col justify-between py-5 px-3 overflow-y-auto relative">
      <div className="space-y-6">
        {navSections.map((section, secIdx) => (
          <div key={secIdx}>
            {section.label && (
              <div className="px-3 pb-2 text-[11px] uppercase font-bold tracking-wider text-slate-400 font-display">
                {section.label}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    onMouseEnter={(e) => handleMouseEnter(item, e)}
                    onMouseLeave={handleMouseLeave}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[14.5px] font-medium transition-all duration-300 group ${
                      isActive
                        ? "nav-active font-semibold rounded-l-none pl-2.5 bg-accent-cyan/10 border-l-2 border-accent-cyan shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] text-foreground"
                        : "text-slate-300 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon
                        className={`w-[19px] h-[19px] shrink-0 transition-all duration-300 ${
                          isActive
                            ? "text-accent-cyan drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]"
                            : "text-slate-400 group-hover:text-slate-200"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-accent-cyan" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Hover Card: Technical description + Decision utility */}
      {hoveredItem && (
        <div
          style={{ top: Math.max(16, hoverPosition.top - 8) }}
          className="fixed left-60 z-[999] w-[340px] p-4 rounded-2xl bg-[#070B14]/98 backdrop-blur-2xl border border-accent-cyan/35 shadow-[0_16px_45px_rgba(0,0,0,0.9),0_0_28px_rgba(14,165,233,0.22)] pointer-events-none animate-in fade-in zoom-in-95 duration-150 space-y-3 ml-3"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_8px_rgba(14,165,233,0.9)]" />
              <span className="text-[13.5px] font-display font-bold text-white tracking-wide">
                {hoveredItem.label}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/25">
              Technical Guide
            </span>
          </div>

          {/* Technical Description */}
          <div>
            <div className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider mb-1">
              Description & Mechanics:
            </div>
            <p className="text-[12.5px] leading-relaxed text-slate-200 font-normal">
              {hoveredItem.technicalDescription}
            </p>
          </div>

          {/* How it is useful in taking decisions */}
          <div className="pt-2.5 border-t border-white/[0.06] space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] uppercase font-bold text-accent-cyan tracking-wider">
              <Target className="w-3.5 h-3.5 text-accent-cyan" />
              <span>Decision Utility:</span>
            </div>
            <p className="text-[12.5px] leading-relaxed text-slate-300 font-medium">
              {hoveredItem.decisionImpact}
            </p>
          </div>
        </div>
      )}

      {/* Bottom info footer */}
      <div className="pt-4 mt-4 border-t border-white/[0.05] px-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-mono text-[10px]">Engine v1.0.4</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald status-live" />
            <span className="text-accent-emerald font-semibold text-[10px]">Live Feeds</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
