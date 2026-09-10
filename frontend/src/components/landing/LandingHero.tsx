"use client";

import React from "react";
import {
  ArrowRight,
  TrendingUp,
  Brain,
  ShieldCheck,
  Zap,
  BarChart2,
  FileText,
  Lock,
  Layers,
  ChevronRight,
} from "lucide-react";

interface LandingHeroProps {
  onEnterApp: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onEnterApp }) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top minimal nav */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-white/[0.05]">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center text-white font-black text-base shadow-sm">
            N
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">NEXUS</span>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onEnterApp}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-foreground text-background hover:opacity-90 transition-all flex items-center space-x-1.5 shadow-sm"
          >
            <span>Launch Platform</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-20 text-center flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05] text-xs text-slate-400 mb-8">
          <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
          <span className="font-medium text-slate-300">Institutional Intelligence for Indian Equities</span>
          <ChevronRight className="w-3 h-3 text-slate-500" />
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl leading-[1.1] mb-6">
          Research smarter. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan via-sky-400 to-accent-emerald">
            Understand deeper.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          NEXUS combines market intelligence, portfolio analytics, financial documents, and agentic AI into one research workspace.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={onEnterApp}
            className="w-full sm:w-auto px-6 py-3 text-sm font-semibold rounded-xl bg-accent-cyan text-slate-950 hover:bg-sky-400 transition-all flex items-center justify-center space-x-2 shadow-lg shadow-accent-cyan/20"
          >
            <span>Open Terminal Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onEnterApp}
            className="w-full sm:w-auto px-6 py-3 text-sm font-medium rounded-xl border border-border text-foreground hover:bg-surface-100 dark:hover:bg-surface-100 transition-all"
          >
            Explore ₹10,00,000 Paper Trading
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left mt-8">
          <div className="p-6 rounded-2xl bg-surface-50 dark:bg-surface-50 border border-border">
            <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center text-accent-cyan mb-4">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">Market Intelligence & S/R</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              TradingView-grade candlestick charts with automatic Support & Resistance zones, Pivot Points, MACD, Bollinger Bands, and NIFTY constituent breadth.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface-50 dark:bg-surface-50 border border-border">
            <div className="w-10 h-10 rounded-xl bg-accent-emerald/10 flex items-center justify-center text-accent-emerald mb-4">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">Agentic AI & RAG</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              LangGraph-orchestrated research agent with controlled tool calling, corporate filing RAG, and an evidence-grounded &quot;Why Did It Move?&quot; diagnostic engine.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface-50 dark:bg-surface-50 border border-border">
            <div className="w-10 h-10 rounded-xl bg-accent-violet/10 flex items-center justify-center text-accent-violet mb-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-2">Portfolio Intelligence</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Institutional risk analytics: Sharpe Ratio, maximum drawdown, sector tilt exposure, concentration alerts, and real-time paper order execution.
            </p>
          </div>
        </div>

        {/* Security and Technology Strip */}
        <div className="mt-16 pt-8 border-t border-white/[0.05] w-full flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-accent-emerald" />
            <span>Zero real-money risk • Educational research platform</span>
          </div>
          <div className="flex items-center space-x-6">
            <span>Next.js 14 App Router</span>
            <span>FastAPI & SQLAlchemy</span>
            <span>TradingView Lightweight</span>
            <span>LangGraph Agentic</span>
          </div>
        </div>
      </main>
    </div>
  );
};
