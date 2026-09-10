"use client";

import React, { useState } from "react";
import {
  Calculator,
  TrendingUp,
  History,
  ShieldCheck,
  Coins,
  Award,
  Target,
  BarChart3,
} from "lucide-react";
import { InfoTooltip } from "@/components/common/InfoTooltip";

// Preset historical data for Indian stocks for the "What-If" simulator
const HISTORICAL_STOCK_DATA: Record<
  string,
  { name: string; returns: { [years: number]: number }; cagr: { [years: number]: number } }
> = {
  "TATAMOTORS.NS": {
    name: "Tata Motors",
    returns: { 1: 42, 3: 165, 5: 390 },
    cagr: { 1: 42, 3: 38.4, 5: 37.4 },
  },
  "RELIANCE.NS": {
    name: "Reliance Industries",
    returns: { 1: 18, 3: 48, 5: 140 },
    cagr: { 1: 18, 3: 14.0, 5: 19.1 },
  },
  "TCS.NS": {
    name: "Tata Consultancy Services",
    returns: { 1: 22, 3: 35, 5: 98 },
    cagr: { 1: 22, 3: 10.5, 5: 14.6 },
  },
  "INFY.NS": {
    name: "Infosys",
    returns: { 1: 28, 3: 32, 5: 125 },
    cagr: { 1: 28, 3: 9.7, 5: 17.6 },
  },
  "TITAN.NS": {
    name: "Titan Company",
    returns: { 1: 16, 3: 75, 5: 245 },
    cagr: { 1: 16, 3: 20.5, 5: 28.1 },
  },
  "HDFCBANK.NS": {
    name: "HDFC Bank",
    returns: { 1: 12, 3: 24, 5: 68 },
    cagr: { 1: 12, 3: 7.4, 5: 10.9 },
  },
};

export const SimulatorsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"whatif" | "dcf" | "sip">("whatif");

  // What-If Simulator State
  const [whatIfStock, setWhatIfStock] = useState<string>("TATAMOTORS.NS");
  const [whatIfAmount, setWhatIfAmount] = useState<number>(50000);
  const [whatIfYears, setWhatIfYears] = useState<number>(3);

  // DCF Simulator State
  const [fcf, setFcf] = useState<number>(24000);
  const [growthRate, setGrowthRate] = useState<number>(14);
  const [terminalRate, setTerminalRate] = useState<number>(4);
  const [discountRate, setDiscountRate] = useState<number>(11);
  const [sharesOutstanding, setSharesOutstanding] = useState<number>(670);
  const [currentMarketPrice, setCurrentMarketPrice] = useState<number>(2985);

  // SIP Calculator State
  const [monthlySip, setMonthlySip] = useState<number>(15000);
  const [sipRate, setSipRate] = useState<number>(14);
  const [sipYears, setSipYears] = useState<number>(10);

  // What-If Calculations
  const calcWhatIf = () => {
    const stockInfo = HISTORICAL_STOCK_DATA[whatIfStock] || HISTORICAL_STOCK_DATA["TATAMOTORS.NS"];
    const returnPct = stockInfo.returns[whatIfYears] || 50;
    const cagr = stockInfo.cagr[whatIfYears] || 15;
    const stockFinalValue = Math.round(whatIfAmount * (1 + returnPct / 100));
    const stockProfit = stockFinalValue - whatIfAmount;

    // Bank FD comparison (approx 7% CAGR)
    const fdFinalValue = Math.round(whatIfAmount * Math.pow(1 + 0.07, whatIfYears));
    const fdProfit = fdFinalValue - whatIfAmount;

    // Nifty Index comparison (approx 13% CAGR)
    const niftyFinalValue = Math.round(whatIfAmount * Math.pow(1 + 0.13, whatIfYears));
    const niftyProfit = niftyFinalValue - whatIfAmount;

    return {
      stockName: stockInfo.name,
      returnPct,
      cagr,
      stockFinalValue,
      stockProfit,
      fdFinalValue,
      fdProfit,
      niftyFinalValue,
      niftyProfit,
    };
  };

  // DCF Calculations
  const calcDcf = () => {
    let pvSum = 0;
    let cf = fcf;
    for (let i = 1; i <= 5; i++) {
      cf = cf * (1 + growthRate / 100);
      pvSum += cf / Math.pow(1 + discountRate / 100, i);
    }
    const terminalValue =
      (cf * (1 + terminalRate / 100)) / (discountRate / 100 - terminalRate / 100);
    const pvTerminal = terminalValue / Math.pow(1 + discountRate / 100, 5);
    const enterpriseVal = pvSum + pvTerminal;
    const fairValue = enterpriseVal / Math.max(1, sharesOutstanding);
    const marginOfSafety = ((fairValue - currentMarketPrice) / fairValue) * 100;

    return {
      fairValue: Math.round(fairValue),
      marginOfSafety: Math.round(marginOfSafety),
      isUndervalued: marginOfSafety > 0,
    };
  };

  // SIP Calculations
  const calcSip = () => {
    const monthlyRate = sipRate / 100 / 12;
    const months = sipYears * 12;
    const futureValue =
      monthlySip * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    const totalInvested = monthlySip * months;
    const wealthGain = futureValue - totalInvested;

    return {
      totalInvested: Math.round(totalInvested),
      futureValue: Math.round(futureValue),
      wealthGain: Math.round(wealthGain),
    };
  };

  const whatIf = calcWhatIf();
  const dcf = calcDcf();
  const sip = calcSip();

  return (
    <div className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto animate-float-up">
      {/* Header */}
      <div className="pb-3 border-b border-white/[0.05] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
              Financial Simulators & Valuation Models
            </h1>
            <InfoTooltip
              title="Financial Modeling & Simulation"
              definition="Mathematical sandboxes that discount projected cash flows, backtest historical capital allocation, and simulate compound wealth accumulation."
              decisionImpact="Removes speculation by quantifying whether current stock valuations offer an adequate margin of safety before deploying capital."
            />
          </div>
          <p className="text-[13px] text-slate-400 mt-1 font-light">
            Discounted Cash Flow (DCF) fair-value modeling, historical &quot;What-If&quot; backtesting, and compound wealth projection.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-[#0C101C]/80 border border-white/[0.08] backdrop-blur-md self-start md:self-auto">
          <button
            onClick={() => setActiveTab("whatif")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === "whatif"
                ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-[0_0_12px_rgba(14,165,233,0.2)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>&quot;What-If&quot; Backtest</span>
          </button>
          <button
            onClick={() => setActiveTab("dcf")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === "dcf"
                ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-[0_0_12px_rgba(14,165,233,0.2)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>DCF Valuation</span>
          </button>
          <button
            onClick={() => setActiveTab("sip")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
              activeTab === "sip"
                ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-[0_0_12px_rgba(14,165,233,0.2)]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>SIP Wealth Simulator</span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 1. "WHAT-IF" HISTORICAL SCENARIO SIMULATOR */}
      {/* ============================================================= */}
      {activeTab === "whatif" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-5 p-5 rounded-2xl glass-card space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-accent-cyan" />
                <h2 className="text-sm font-display font-bold text-foreground">
                  Historical Scenario Backtest
                </h2>
              </div>
              <InfoTooltip
                title="Scenario Backtesting"
                definition="Simulates the historical performance of capital allocated to single equities against benchmark equity indexes and debt."
                decisionImpact="Measures historical opportunity cost. Verifies if individual stock risk delivered excess alpha above Nifty 50 index funds."
              />
            </div>

            {/* Choose Stock */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="text-slate-300 font-medium">Asset Under Test</label>
                <span className="text-[10px] text-slate-500">NSE Listed Equities</span>
              </div>
              <select
                value={whatIfStock}
                onChange={(e) => setWhatIfStock(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-foreground text-xs focus:outline-none focus:border-accent-cyan/50"
              >
                {Object.entries(HISTORICAL_STOCK_DATA).map(([symbol, data]) => (
                  <option key={symbol} value={symbol} className="bg-slate-900 text-slate-200">
                    {data.name} ({symbol.replace(".NS", "")})
                  </option>
                ))}
              </select>
            </div>

            {/* Investment Amount Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-300 font-medium">
                  <span>Initial Principal Capital</span>
                  <InfoTooltip
                    title="Capital Base"
                    definition="Lump-sum deployment committed at the inception date."
                    decisionImpact="Used to analyze portfolio allocation sizing and risk exposure."
                  />
                </div>
                <span className="font-bold text-accent-cyan tabular-nums font-mono text-[15px]">
                  <span className="rupee">₹</span>{whatIfAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <input
                type="range"
                min="10000"
                max="500000"
                step="5000"
                value={whatIfAmount}
                onChange={(e) => setWhatIfAmount(parseInt(e.target.value))}
                className="w-full accent-accent-cyan cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span><span className="rupee">₹</span>10,000</span>
                <span><span className="rupee">₹</span>2,50,000</span>
                <span><span className="rupee">₹</span>5,00,000</span>
              </div>
            </div>

            {/* Time Period Buttons */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Backtest Duration (Years)</span>
                <InfoTooltip
                  title="Holding Period Duration"
                  definition="The backtesting lookback window in calendar years."
                  decisionImpact="Longer holding horizons (>3-5 years) mitigate market regime cycles and allow earnings compounding to dominate price volatility."
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 5].map((yr) => (
                  <button
                    key={yr}
                    onClick={() => setWhatIfYears(yr)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                      whatIfYears === yr
                        ? "bg-accent-cyan/20 border border-accent-cyan/40 text-accent-cyan shadow-[0_0_15px_rgba(14,165,233,0.2)]"
                        : "bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {yr} Year{yr > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Decision Utility Callout */}
            <div className="p-3 rounded-xl bg-accent-cyan/5 border border-accent-cyan/15 flex items-start gap-2 text-xs text-slate-300">
              <Target className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
              <p className="leading-relaxed text-[11px]">
                <strong className="text-accent-cyan">Decision Rule:</strong> If an individual equity fails to beat Nifty 50 index returns (~13% CAGR) over a 3-year horizon, allocating to index ETFs offers superior risk-adjusted return with zero individual business risk.
              </p>
            </div>
          </div>

          {/* Results Comparison Showcase */}
          <div className="lg:col-span-7 space-y-4">
            {/* Top Stat Banner */}
            <div className="p-5 rounded-2xl glass-card relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Terminal Portfolio Value ({whatIf.stockName}):</span>
                <span className="px-2 py-0.5 rounded-full bg-accent-emerald/15 text-accent-emerald font-semibold border border-accent-emerald/30 text-[11px]">
                  +{whatIf.returnPct}% Cumulative Return
                </span>
              </div>
              <div className="text-3xl lg:text-4xl font-display font-black text-foreground tabular-nums tracking-tight">
                <span className="rupee">₹</span>{whatIf.stockFinalValue.toLocaleString("en-IN")}
              </div>
              <div className="text-[13px] text-accent-emerald font-medium mt-1">
                Net Profit: +<span className="rupee">₹</span>{whatIf.stockProfit.toLocaleString("en-IN")} | Realized CAGR: {whatIf.cagr}%
              </div>
            </div>

            {/* Side-by-Side Asset Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Asset Under Test */}
              <div className="p-4 rounded-xl glass-card border-accent-cyan/30 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-accent-cyan uppercase tracking-wider">
                    {whatIf.stockName}
                  </span>
                  <Award className="w-4 h-4 text-accent-cyan" />
                </div>
                <div className="text-xl font-bold text-foreground font-mono tabular-nums">
                  <span className="rupee">₹</span>{whatIf.stockFinalValue.toLocaleString("en-IN")}
                </div>
                <div className="text-[12px] text-accent-emerald font-semibold">
                  +<span className="rupee">₹</span>{whatIf.stockProfit.toLocaleString("en-IN")} (+{whatIf.returnPct}%)
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-white/[0.06]">
                  CAGR: {whatIf.cagr}%/yr
                </p>
              </div>

              {/* Nifty 50 Benchmark */}
              <div className="p-4 rounded-xl glass-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-slate-300 uppercase tracking-wider">
                    NIFTY 50 (Benchmark)
                  </span>
                  <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-xl font-bold text-foreground font-mono tabular-nums">
                  <span className="rupee">₹</span>{whatIf.niftyFinalValue.toLocaleString("en-IN")}
                </div>
                <div className="text-[12px] text-accent-emerald font-semibold">
                  +<span className="rupee">₹</span>{whatIf.niftyProfit.toLocaleString("en-IN")} (~13% CAGR)
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-white/[0.06]">
                  Equity Benchmark
                </p>
              </div>

              {/* Risk-Free Sovereign / FD */}
              <div className="p-4 rounded-xl glass-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-slate-300 uppercase tracking-wider">
                    Fixed Deposit (7% FD)
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-xl font-bold text-foreground font-mono tabular-nums">
                  <span className="rupee">₹</span>{whatIf.fdFinalValue.toLocaleString("en-IN")}
                </div>
                <div className="text-[12px] text-slate-400 font-semibold">
                  +<span className="rupee">₹</span>{whatIf.fdProfit.toLocaleString("en-IN")} (~7% CAGR)
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-white/[0.06]">
                  Risk-Free Sovereign Rate
                </p>
              </div>
            </div>

            {/* Insight Note */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[12px] text-slate-300 leading-relaxed">
              Over the {whatIfYears}-year duration, allocating capital into {whatIf.stockName} generated <strong className="text-accent-emerald"><span className="rupee">₹</span>{(whatIf.stockProfit - whatIf.niftyProfit).toLocaleString("en-IN")} in excess alpha</strong> above the broader Nifty 50 benchmark, confirming superior capital allocation.
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. DCF VALUATION MODEL WITH TECHNICAL DEFINITIONS & DECISIONS */}
      {/* ============================================================= */}
      {activeTab === "dcf" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl glass-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-accent-cyan" />
                <h2 className="text-sm font-display font-bold text-foreground">
                  Discounted Cash Flow (DCF) Valuation Parameters
                </h2>
              </div>
              <InfoTooltip
                title="DCF Valuation Model"
                definition="A valuation methodology discounting future expected free cash flows to the present value using the Weighted Average Cost of Capital (WACC)."
                decisionImpact="Establishes absolute intrinsic value independent of market sentiment. If CMP < Fair Value, gives the quantitative green light to buy."
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Free Cash Flow (₹ Cr)</label>
                  <InfoTooltip
                    title="Free Cash Flow (FCF)"
                    definition="Operating cash flow minus capital expenditures (CapEx). The distributable cash remaining for equity holders."
                    decisionImpact="If FCF is consistently negative, the business burns cash and requires dilutive equity issuance or high-cost debt to survive."
                  />
                </div>
                <input
                  type="number"
                  value={fcf}
                  onChange={(e) => setFcf(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-foreground focus:outline-none focus:border-accent-cyan/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">5-Yr FCF Growth Rate (%)</label>
                  <InfoTooltip
                    title="FCF Growth Rate (Stage 1)"
                    definition="Projected annual compound growth rate of free cash flow during the initial 5-year discrete forecast period."
                    decisionImpact="Overly optimistic growth assumptions inflate fair value. Stress-test decisions by dropping growth rate by 3-5% to see if the stock remains undervalued."
                  />
                </div>
                <input
                  type="number"
                  value={growthRate}
                  onChange={(e) => setGrowthRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-foreground focus:outline-none focus:border-accent-cyan/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Terminal Growth Rate (%)</label>
                  <InfoTooltip
                    title="Terminal Growth Rate (g)"
                    definition="The perpetual growth rate of cash flows beyond year 5. By economic law, cannot exceed long-term GDP growth."
                    decisionImpact="Keep between 3.5% and 5.0% for Indian equities. Higher values distort enterprise value unrealistically."
                  />
                </div>
                <input
                  type="number"
                  value={terminalRate}
                  onChange={(e) => setTerminalRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-foreground focus:outline-none focus:border-accent-cyan/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Discount Rate / WACC (%)</label>
                  <InfoTooltip
                    title="Discount Rate (WACC)"
                    definition="The minimum hurdle rate required by capital providers, factoring in equity risk premium and cost of debt."
                    decisionImpact="Use 10-12% for mature Indian large caps, 13-15% for volatile mid/small caps. If interest rates hike, increase WACC to adjust fair value downwards."
                  />
                </div>
                <input
                  type="number"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-foreground focus:outline-none focus:border-accent-cyan/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Current Market Price (₹)</label>
                  <InfoTooltip
                    title="Current Market Price (CMP)"
                    definition="The current traded spot price of the equity on the exchange."
                    decisionImpact="Compared against calculated intrinsic fair value to derive the exact Margin of Safety."
                  />
                </div>
                <input
                  type="number"
                  value={currentMarketPrice}
                  onChange={(e) => setCurrentMarketPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-foreground focus:outline-none focus:border-accent-cyan/50"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400">Shares Outstanding (Cr)</label>
                  <InfoTooltip
                    title="Diluted Shares Outstanding"
                    definition="Total number of common shares issued and held by all public and promoter shareholders."
                    decisionImpact="Converts overall enterprise valuation into per-share intrinsic fair value."
                  />
                </div>
                <input
                  type="number"
                  value={sharesOutstanding}
                  onChange={(e) => setSharesOutstanding(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-foreground focus:outline-none focus:border-accent-cyan/50"
                />
              </div>
            </div>
          </div>

          {/* DCF Output & Decision Verdict */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl glass-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 font-display">
                  Intrinsic Valuation Verdict
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    dcf.isUndervalued
                      ? "bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30"
                      : "bg-accent-rose/20 text-accent-rose border border-accent-rose/30"
                  }`}
                >
                  {dcf.isUndervalued ? "Undervalued / Buy Target" : "Overvalued / High Risk"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    Calculated Fair Value
                    <InfoTooltip
                      title="Per-Share Intrinsic Value"
                      definition="The mathematical intrinsic value of one common share based on discounted future cash flows."
                      decisionImpact="Establishes your institutional price target. If CMP trades well below this level, risk/reward heavily favors entry."
                    />
                  </div>
                  <div className="text-2xl font-black text-foreground tabular-nums mt-1 font-display">
                    <span className="rupee">₹</span>{dcf.fairValue.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    CMP: <span className="rupee">₹</span>{currentMarketPrice.toLocaleString("en-IN")}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    Margin of Safety (MoS)
                    <InfoTooltip
                      title="Margin of Safety (MoS)"
                      definition="Percentage buffer between current market price and intrinsic fair value."
                      decisionImpact="Only execute purchases when MoS > 15-20%. This buffer protects capital against economic shocks and forecast deviations."
                    />
                  </div>
                  <div
                    className={`text-2xl font-black tabular-nums mt-1 font-display ${
                      dcf.isUndervalued ? "text-accent-emerald" : "text-accent-rose"
                    }`}
                  >
                    {dcf.marginOfSafety}%
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {dcf.isUndervalued ? "Favorable Risk/Reward" : "Premium Valuation Risk"}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-accent-cyan/5 border border-accent-cyan/15 text-xs text-slate-300 flex items-start gap-2">
                <Target className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  {dcf.isUndervalued ? (
                    <span>
                      <strong className="text-accent-emerald">Decision Recommendation:</strong> Equity trades at a <strong className="text-accent-emerald">{dcf.marginOfSafety}% discount</strong> to intrinsic value. This fulfills Benjamin Graham&apos;s criterion for institutional accumulation.
                    </span>
                  ) : (
                    <span>
                      <strong className="text-accent-rose">Decision Recommendation:</strong> Equity trades at a <strong className="text-accent-rose">{Math.abs(dcf.marginOfSafety)}% premium</strong> to intrinsic cash flows. Recommend avoiding lump-sum buys or waiting for multiple contraction on market pullbacks.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 3. COMPOUND WEALTH & SIP SIMULATOR */}
      {/* ============================================================= */}
      {activeTab === "sip" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl glass-card space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-accent-emerald" />
                <h2 className="text-sm font-display font-bold text-foreground">
                  Compound Wealth & Equity SIP Simulator
                </h2>
              </div>
              <InfoTooltip
                title="Systematic Investment Plan (SIP)"
                definition="A dollar-cost-averaging methodology deploying fixed cash commitments into equity assets at scheduled intervals."
                decisionImpact="Automates disciplined capital allocation, completely neutralizes market timing anxiety, and exploits market corrections via rupee cost averaging."
              />
            </div>

            {/* Monthly SIP Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-300">
                  <span>Monthly Capital Allocation (₹)</span>
                  <InfoTooltip
                    title="Periodic Cash Deployment"
                    definition="Fixed rupee amount deducted monthly for equity accumulation."
                    decisionImpact="Align with net disposable income. Increasing allocation by even 10% annually dramatically amplifies terminal wealth."
                  />
                </div>
                <span className="font-bold text-accent-cyan tabular-nums font-mono text-[15px]">
                  <span className="rupee">₹</span>{monthlySip.toLocaleString("en-IN")} / month
                </span>
              </div>
              <input
                type="range"
                min="2000"
                max="100000"
                step="1000"
                value={monthlySip}
                onChange={(e) => setMonthlySip(parseInt(e.target.value))}
                className="w-full accent-accent-cyan cursor-pointer"
              />
            </div>

            {/* Expected CAGR Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-300">
                  <span>Expected Annual CAGR (%)</span>
                  <InfoTooltip
                    title="Compound Annual Growth Rate (CAGR)"
                    definition="The geometric annualized return rate expected from the equity portfolio."
                    decisionImpact="Use conservative assumptions: 12-14% for broad index funds, 15-18% for high-conviction quality compounders."
                  />
                </div>
                <span className="font-bold text-accent-cyan tabular-nums font-mono text-[15px]">{sipRate}% CAGR</span>
              </div>
              <input
                type="range"
                min="8"
                max="25"
                step="1"
                value={sipRate}
                onChange={(e) => setSipRate(parseInt(e.target.value))}
                className="w-full accent-accent-cyan cursor-pointer"
              />
            </div>

            {/* Time Horizon Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-300">
                  <span>Time Horizon (Years)</span>
                  <InfoTooltip
                    title="Compounding Horizon"
                    definition="Total duration in years the capital remains untouched and compounding."
                    decisionImpact="Due to non-linear compounding, over 60% of total wealth creation occurs in the final 30% of the holding timeline."
                  />
                </div>
                <span className="font-bold text-accent-cyan tabular-nums font-mono text-[15px]">{sipYears} Years</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={sipYears}
                onChange={(e) => setSipYears(parseInt(e.target.value))}
                className="w-full accent-accent-cyan cursor-pointer"
              />
            </div>
          </div>

          {/* SIP Results Card */}
          <div className="p-5 rounded-2xl glass-card space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400 font-display">
                  Projected Wealth Attribution
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-accent-emerald/15 text-accent-emerald font-semibold border border-accent-emerald/25">
                  {sipYears} Year Timeline
                </span>
              </div>

              <div className="mt-4 space-y-3 text-[13px] tabular-nums font-mono">
                <div className="flex justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <span className="text-slate-400 font-sans">Total Cumulative Capital Invested:</span>
                  <span className="font-bold text-foreground">
                    <span className="rupee">₹</span>{sip.totalInvested.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <span className="text-slate-400 font-sans">Compounded Capital Gains:</span>
                  <span className="font-bold text-accent-emerald">
                    +<span className="rupee">₹</span>{sip.wealthGain.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-accent-cyan/10 to-accent-emerald/10 border border-accent-cyan/30">
                  <div className="text-[12px] text-slate-400 font-sans mb-1">
                    Terminal Maturity Capital:
                  </div>
                  <div className="text-3xl font-display font-black text-accent-cyan">
                    <span className="rupee">₹</span>{sip.futureValue.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[12px] text-accent-emerald mt-1 font-sans">
                    Wealth Expansion Multiplier: {((sip.futureValue / Math.max(1, sip.totalInvested))).toFixed(1)}x Invested Capital
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] text-[12px] text-slate-400 leading-relaxed">
              <strong className="text-slate-200">Allocation Takeaway:</strong> Systematic monthly compounding yields +<span className="rupee">₹</span>{sip.wealthGain.toLocaleString("en-IN")} in capital gains, proving that consistency of deployment beats market timing across decade-long investment horizons.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
