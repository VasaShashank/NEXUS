"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { LandingHero } from "@/components/landing/LandingHero";
import { OverviewView } from "@/components/views/OverviewView";
import { ResearchView } from "@/components/views/ResearchView";
import { ScreenerView } from "@/components/views/ScreenerView";
import { PortfolioView } from "@/components/views/PortfolioView";
import { AnalyticsView } from "@/components/views/AnalyticsView";
import { AiStudioView } from "@/components/views/AiStudioView";
import { JournalView } from "@/components/views/JournalView";
import { SimulatorsView } from "@/components/views/SimulatorsView";
import { SettingsView } from "@/components/views/SettingsView";
// Phase 2: Multi-Asset, Intelligence & Analytics Views
import { StockCompareView } from "@/components/views/StockCompareView";
import { FundsView } from "@/components/views/FundsView";
import { BondsView } from "@/components/views/BondsView";
import { CommoditiesFxView } from "@/components/views/CommoditiesFxView";
import { MacroView } from "@/components/views/MacroView";
import { TaxView } from "@/components/views/TaxView";
import { ResearchLabView } from "@/components/views/ResearchLabView";
import { WatchlistView } from "@/components/views/WatchlistView";
import { AiTutorView } from "@/components/views/AiTutorView";
import { api, consumeAuthCallback } from "@/lib/api";

export default function AppShell() {
  const [showLanding, setShowLanding] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<string>("overview");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("RELIANCE");
  const [cashBalance, setCashBalance] = useState<number>(1000000.0);
  const [aiInitialQuery, setAiInitialQuery] = useState<string>(
    "Research Reliance Industries valuation, technical momentum, and key operational risks."
  );

  const refreshBalance = async () => {
    try {
      const summary = await api.getPortfolioSummary();
      setCashBalance(summary.cash_balance);
    } catch (err) {
      console.warn("Could not fetch initial balance:", err);
    }
  };

  useEffect(() => {
    // Pick up the JWT handed back by the Google OAuth callback (#auth_token=...).
    consumeAuthCallback();
    refreshBalance();
  }, []);

  const handleSelectStock = (symbol: string) => {
    setSelectedSymbol(symbol);
    setCurrentView("research");
  };

  const handleOpenAiStudio = (query: string, symbol: string) => {
    setAiInitialQuery(query);
    setSelectedSymbol(symbol);
    setCurrentView("ai-research");
  };

  if (showLanding) {
    return <LandingHero onEnterApp={() => setShowLanding(false)} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Universal Navbar */}
      <Navbar
        onSelectStock={handleSelectStock}
        cashBalance={cashBalance}
        onNavigate={setCurrentView}
      />

      <div className="flex-1 flex w-full">
        {/* Left Navigation Sidebar */}
        <Sidebar currentView={currentView} onNavigate={setCurrentView} />

        {/* Center Main Workspace */}
        <main className="flex-1 min-w-0 overflow-y-auto pb-12">
          {/* ── MARKETS ── */}
          {currentView === "overview" && (
            <OverviewView
              onSelectStock={handleSelectStock}
              onNavigate={setCurrentView}
            />
          )}
          {currentView === "screener" && (
            <ScreenerView onSelectStock={handleSelectStock} />
          )}
          {currentView === "research" && (
            <ResearchView
              symbol={selectedSymbol}
              onSelectStock={handleSelectStock}
              onOpenAiStudio={handleOpenAiStudio}
              onTradeSuccess={refreshBalance}
            />
          )}
          {currentView === "compare" && (
            <StockCompareView onSelectStock={handleSelectStock} />
          )}

          {/* ── MULTI-ASSET ── */}
          {currentView === "funds" && (
            <FundsView onSelectStock={handleSelectStock} />
          )}
          {currentView === "bonds" && <BondsView />}
          {currentView === "commodities-fx" && <CommoditiesFxView />}
          {currentView === "macro" && <MacroView />}

          {/* ── PORTFOLIO ── */}
          {(currentView === "portfolio" || currentView === "paper-trading") && (
            <PortfolioView
              onSelectStock={handleSelectStock}
              onNavigate={setCurrentView}
              onTradeSuccess={refreshBalance}
            />
          )}
          {currentView === "analytics" && (
            <AnalyticsView onNavigate={setCurrentView} />
          )}
          {currentView === "watchlists" && (
            <WatchlistView onSelectStock={handleSelectStock} />
          )}
          {currentView === "tax" && <TaxView />}

          {/* ── INTELLIGENCE ── */}
          {currentView === "ai-research" && (
            <AiStudioView
              initialQuery={aiInitialQuery}
              initialSymbol={selectedSymbol}
              defaultSubTab="research"
            />
          )}
          {currentView === "ai-assistant" && (
            <AiStudioView
              initialQuery={`Analyze why ${selectedSymbol} moved today`}
              initialSymbol={selectedSymbol}
              defaultSubTab="whymoved"
            />
          )}
          {currentView === "ai-tutor" && <AiTutorView />}

          {/* ── TOOLS ── */}
          {currentView === "quant-lab" && <ResearchLabView />}
          {currentView === "journal" && (
            <JournalView onSelectStock={handleSelectStock} />
          )}
          {currentView === "simulators" && <SimulatorsView />}

          {/* ── ACCOUNT ── */}
          {currentView === "settings" && (
            <SettingsView onResetPortfolio={refreshBalance} />
          )}
        </main>
      </div>
    </div>
  );
}
