"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Calculator,
  AlertTriangle,
  Lightbulb,
  Lock,
  ArrowRight
} from "lucide-react";
import { ComplianceDisclaimer } from "@/components/common/ComplianceDisclaimer";

interface ConceptLesson {
  id: string;
  title: string;
  category: "Fundamentals" | "Fixed Income" | "Portfolio Risk" | "Funds & ETFs" | "Technical Analysis";
  simpleExplanation: string;
  technicalExplanation: string;
  formula: string;
  workedExample: string;
  realNexusExample: string;
  commonMistakes: string[];
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

const LESSONS: ConceptLesson[] = [
  {
    id: "roce",
    title: "ROCE (Return on Capital Employed)",
    category: "Fundamentals",
    simpleExplanation:
      "Measures how efficiently a company turns total money invested in the business (both debt and equity) into actual operating profit.",
    technicalExplanation:
      "Calculates the ratio of Earnings Before Interest and Taxes (EBIT) to Capital Employed (Total Assets minus Current Liabilities, or Total Equity plus Long-Term Debt). Unlike ROE, it does not get artificially inflated by taking on dangerous amounts of leverage.",
    formula: "ROCE = [ EBIT / (Total Assets - Current Liabilities) ] × 100",
    workedExample:
      "Company X generates ₹1,500 Cr in EBIT using ₹5,000 Cr in equity and ₹1,000 Cr in debt. Capital Employed = ₹6,000 Cr. ROCE = (1500 / 6000) × 100 = 25.0%.",
    realNexusExample:
      "TCS generates a stellar ROCE of ~61.5% with zero debt, demonstrating world-class operating efficiency and minimal reinvestment capital intensity.",
    commonMistakes: [
      "Confusing ROCE with ROE: High debt boosts ROE while potentially depressing ROCE.",
      "Comparing ROCE across mismatched industries: Asset-heavy utilities (e.g. NTPC) naturally have lower ROCE than capital-light IT services.",
    ],
    quiz: {
      question: "If a company borrows large amounts of debt to buy back shares, what typically happens?",
      options: [
        "ROE rises artificially, while ROCE may decrease if earnings do not rise",
        "Both ROE and ROCE double immediately",
        "ROCE rises while ROE stays identical",
        "Debt has no mathematical effect on either ratio",
      ],
      correctIndex: 0,
      explanation:
        "Borrowing debt reduces equity denominator in ROE (raising it artificially), while capital employed remains unchanged or rises, keeping ROCE grounded.",
    },
  },
  {
    id: "modified-duration",
    title: "Modified Duration (Bond Interest Rate Risk)",
    category: "Fixed Income",
    simpleExplanation:
      "Measures how sensitive a bond's price is to changes in interest rates. Higher duration means the bond swings more violently when yields move.",
    technicalExplanation:
      "Modified Duration is the percentage price sensitivity of a bond to a 100-basis-point (1.0%) shift in yield to maturity. It equals Macauley Duration divided by [1 + (YTM / payment frequency)].",
    formula: "Modified Duration = Macauley Duration / (1 + YTM / m)",
    workedExample:
      "A 10-Year G-Sec has a Modified Duration of 6.8 years. If the RBI hikes interest rates by 1.0% (100 bps), the bond price will drop approximately 6.8%.",
    realNexusExample:
      "The 7.18% GS 2033 sovereign bond has a duration of ~6.58 years; holding it in a falling yield regime generates capital appreciation on top of coupon income.",
    commonMistakes: [
      "Assuming coupon rate equals total yield: Yield to Maturity accounts for purchase discount or premium at maturity.",
      "Thinking short-term liquid funds have high duration: Overnight/liquid instruments have duration under 90 days, with minimal interest rate risk.",
    ],
    quiz: {
      question: "If interest rates decline by 50 bps (0.50%), what is the expected price movement of a bond with duration 6.0 years?",
      options: [
        "Falls by 6.0%",
        "Rises by approximately 3.0%",
        "Rises by 12.0%",
        "Remains unchanged until maturity",
      ],
      correctIndex: 1,
      explanation:
        "Price change ≈ -Duration × ΔYield = -6.0 × (-0.50%) = +3.0% price appreciation.",
    },
  },
  {
    id: "tracking-error",
    title: "Tracking Error & Tracking Difference",
    category: "Funds & ETFs",
    simpleExplanation:
      "Measures how closely an index fund or ETF actually mirrors the returns of its target benchmark index.",
    technicalExplanation:
      "Tracking Error is the annualized standard deviation of excess return differences between the fund NAV and the benchmark TRI index. Tracking Difference is the total cumulative divergence over a specified time horizon.",
    formula: "Tracking Error = √ [ (1 / (N - 1)) × Σ ( R_fund,t - R_bench,t - MeanDiff )² ] × √252",
    workedExample:
      "NIFTYBEES aims to track Nifty 50. If Nifty 50 gains 15.0% and NIFTYBEES gains 14.88%, the tracking difference is 0.12% (attributable to the 0.04% expense ratio and cash drag).",
    realNexusExample:
      "Nippon India ETF Nifty 50 BeES exhibits an institutional-grade tracking error of just 0.03%, reflecting tight liquidity replication on the NSE order book.",
    commonMistakes: [
      "Assuming tracking error is always zero for passive funds: Expense ratios, dividend withholding, and cash drag always induce slight divergence.",
      "Comparing price on exchange with NAV: In illiquid ETFs, market price can trade at a premium/discount to actual intraday iNAV.",
    ],
    quiz: {
      question: "Which factor does NOT contribute to ETF tracking error?",
      options: [
        "Fund expense ratio deducted from NAV",
        "Cash holding retained for daily redemptions",
        "The overall P/E ratio of the individual stock constituents",
        "Execution slippage during index rebalancing",
      ],
      correctIndex: 2,
      explanation:
        "The constituent P/E valuation is irrelevant to tracking fidelity; cash drag, fees, and rebalancing transaction friction cause tracking error.",
    },
  },
  {
    id: "sharpe-sortino",
    title: "Sharpe vs Sortino Ratio (Risk-Adjusted Return)",
    category: "Portfolio Risk",
    simpleExplanation:
      "Sharpe measures reward per total volatility; Sortino only penalizes harmful downside drops, ignoring profitable upside swings.",
    technicalExplanation:
      "Sharpe divides excess return over the risk-free rate by total standard deviation. Sortino divides excess return by Downside Deviation (semi-variance), meaning positive upside spikes are not penalized as 'risk'.",
    formula: "Sortino = (Portfolio Return - Risk Free Rate) / Downside Semi-Deviation",
    workedExample:
      "A momentum strategy achieves 24% return with 18% total volatility, but downside volatility is only 8%. Sharpe = (24 - 7) / 18 = 0.94; Sortino = (24 - 7) / 8 = 2.12.",
    realNexusExample:
      "NEXUS institutional analytics computes both ratios vs the 6.8% Indian 10Y sovereign yield baseline to ensure your alpha is genuine rather than leverage-induced.",
    commonMistakes: [
      "Believing a high Sharpe ratio guarantees zero drawdowns: High Sharpe can still suffer severe tail-risk events.",
      "Ignoring the benchmark hurdle: In India, a risk-free rate of ~7% means a 10% equity return only yields 3% excess return.",
    ],
    quiz: {
      question: "Why do institutional investors often prefer the Sortino ratio over the Sharpe ratio for asymmetric strategies?",
      options: [
        "Sortino ignores interest rates completely",
        "Sortino does not penalize large positive upside volatility as risk",
        "Sortino is always a higher number",
        "Sharpe cannot be computed on daily data",
      ],
      correctIndex: 1,
      explanation:
        "Sharpe treats violent upside price spikes as 'volatility' (penalizing the score); Sortino isolates only downside drawdowns.",
    },
  },
  {
    id: "pe-peg",
    title: "P/E Ratio and PEG Ratio (Valuation)",
    category: "Fundamentals",
    simpleExplanation:
      "P/E tells you how many rupees investors pay for each rupee of yearly profit. PEG goes one step further and asks whether that price is justified by how fast profits are growing.",
    technicalExplanation:
      "Trailing P/E = Market Price / Earnings Per Share (last 12 months). Forward P/E uses estimated next-year earnings. PEG = P/E divided by the expected annual EPS growth rate in percent. A PEG near 1.0 suggests price and growth are balanced; well above 1.0 means you are paying a premium for each unit of growth.",
    formula: "PEG = (P / E) / Annual EPS Growth %",
    workedExample:
      "Stock A trades at ₹2,000 with EPS of ₹100 (P/E = 20) and expected earnings growth of 20% per year. PEG = 20 / 20 = 1.0 — fairly priced for its growth. Stock B has P/E 20 but only 10% growth: PEG = 2.0 — expensive per unit of growth.",
    realNexusExample:
      "The NEXUS research desk shows live trailing P/E beside revenue and profit growth on every stock page, so you can judge the multiple against growth instead of reading P/E in isolation.",
    commonMistakes: [
      "Calling a low P/E stock 'cheap': A P/E of 8 with shrinking earnings is a value trap, not a bargain.",
      "Comparing P/E across sectors: Banks, IT services, and utilities structurally trade at different multiples.",
    ],
    quiz: {
      question: "Two companies both trade at a P/E of 25. Company X grows earnings at 25% yearly, Company Y at 10%. Which is cheaper on growth-adjusted valuation?",
      options: [
        "Company Y, because slower growth is safer",
        "They are equally cheap since P/E is identical",
        "Company X — its PEG is 1.0 versus 2.5 for Y",
        "Neither can be judged without the share price",
      ],
      correctIndex: 2,
      explanation:
        "PEG = P/E ÷ growth %. X: 25/25 = 1.0. Y: 25/10 = 2.5. X offers each unit of growth at a lower price.",
    },
  },
  {
    id: "rsi-momentum",
    title: "RSI Momentum Oscillator (0–100)",
    category: "Technical Analysis",
    simpleExplanation:
      "RSI is a speedometer for price moves, scaled 0 to 100. Above 70 the stock may be overheated (overbought); below 30 it may be washed out (oversold).",
    technicalExplanation:
      "RSI-14 compares average gains to average losses over 14 sessions using Wilder's smoothing: RS = avg gain / avg loss, RSI = 100 − 100/(1 + RS). In strong trends RSI can stay overbought/oversold for weeks, so it is a timing aid, never a standalone buy/sell signal.",
    formula: "RSI = 100 − [ 100 / (1 + RS) ],  RS = Avg Gain₁₄ / Avg Loss₁₄",
    workedExample:
      "Over 14 sessions a stock averages ₹12 of gains on up days and ₹6 of losses on down days. RS = 12/6 = 2. RSI = 100 − 100/3 = 66.7 — strong momentum, not yet overheated.",
    realNexusExample:
      "NEXUS computes RSI-14 on live candles for the chart sub-pane and the technical confluence engine, flagging OVERBOUGHT above 70 and OVERSOLD below 30.",
    commonMistakes: [
      "Shorting mechanically at RSI 70: In a genuine breakout, RSI can pin above 70 for weeks while price keeps climbing.",
      "Using RSI without trend context: An oversold bounce against a bearish MACD trend often fails.",
    ],
    quiz: {
      question: "A stock's RSI has stayed above 75 for three weeks while the price keeps making new highs. What is the most disciplined read?",
      options: [
        "Short immediately — RSI above 70 guarantees a crash",
        "Momentum is strongly bullish; wait for RSI to roll over or price structure to break before acting",
        "RSI is broken and should be ignored forever",
        "Buy double size because the signal is stronger",
      ],
      correctIndex: 1,
      explanation:
        "Overbought is a condition, not a timing trigger. In strong uptrends RSI stays elevated; entries and exits should wait for confirmation such as RSI crossing back down or support breaking.",
    },
  },
  {
    id: "macd-trend",
    title: "MACD Trend Momentum (12, 26, 9)",
    category: "Technical Analysis",
    simpleExplanation:
      "MACD tracks whether short-term momentum is running hotter or colder than long-term momentum. When the fast MACD line crosses above the slow signal line, bulls are taking charge.",
    technicalExplanation:
      "MACD line = EMA-12 minus EMA-26 of closing prices. Signal line = 9-period EMA of the MACD line. Histogram = MACD − signal. A bullish crossover (MACD crossing above signal, histogram flipping positive) marks upside acceleration; the mirror marks downside acceleration.",
    formula: "MACD = EMA₁₂ − EMA₂₆,  Signal = EMA₉(MACD),  Histogram = MACD − Signal",
    workedExample:
      "EMA-12 of a stock is ₹1,520 and EMA-26 is ₹1,500, so MACD = +20. The signal line sits at +12, so the histogram reads +8 — positive and expanding, i.e. strengthening upside momentum.",
    realNexusExample:
      "The NEXUS chart sub-pane draws the MACD line, signal line, and histogram together; on short timeframes (e.g. 1M ≈ 22 sessions) early bars are EMA warm-up and the header says so.",
    commonMistakes: [
      "Trading every crossover: In sideways markets MACD whipsaws across the signal line repeatedly.",
      "Ignoring the histogram slope: A crossover with a flat histogram carries far less conviction than one with expanding bars.",
    ],
    quiz: {
      question: "MACD crosses above its signal line while the histogram turns positive and expands. What does this indicate?",
      options: [
        "Guaranteed profit on a long trade",
        "Strengthening bullish momentum — upside acceleration",
        "A bearish reversal is underway",
        "Volume has dried up completely",
      ],
      correctIndex: 1,
      explanation:
        "A bullish crossover with an expanding positive histogram means short-term momentum is accelerating faster than the longer baseline — the textbook bullish MACD configuration.",
    },
  },
  {
    id: "bollinger-bands",
    title: "Bollinger Bands & Volatility Breakouts",
    category: "Technical Analysis",
    simpleExplanation:
      "Bollinger Bands are two flexible rails drawn two standard deviations above and below the 20-day average price. When the rails squeeze tight, a big move is usually brewing; when price rides a rail, the trend is strong.",
    technicalExplanation:
      "Middle = SMA-20. Upper = SMA-20 + 2σ, Lower = SMA-20 − 2σ (σ = 20-day standard deviation). %B = (Price − Lower)/(Upper − Lower) locates price inside the channel; Bandwidth = (Upper − Lower)/Middle × 100 measures the squeeze. Prices can walk a band for extended trends, so touches alone are not reversal signals.",
    formula: "Upper/Lower = SMA₂₀ ± 2σ₂₀,   %B = (P − Lower)/(Upper − Lower)",
    workedExample:
      "SMA-20 is ₹500 with σ = ₹15. Bands sit at ₹530/₹470. Price at ₹525 gives %B = (525−470)/60 = 0.92 — pressing the upper rail in a strong trend, not an automatic sell.",
    realNexusExample:
      "NEXUS draws Bollinger overlays on the main chart and reports bandwidth in technicals, so squeezes ahead of earnings or policy events are visible at a glance.",
    commonMistakes: [
      "Selling every upper-band touch: In trending phases price walks the band; wait for %B to roll over or support to break.",
      "Buying a squeeze breakout without volume: Bandwidth squeezes precede moves in either direction — confirmation matters.",
    ],
    quiz: {
      question: "Bandwidth collapses to a multi-month low while price coils near the middle band. What is the correct preparation?",
      options: [
        "Do nothing — squeezes mean the market is closed",
        "Expect a volatility expansion soon and plan entries for either direction with confirmation",
        "Short immediately because squeezes always break down",
        "Double leverage since risk has disappeared",
      ],
      correctIndex: 1,
      explanation:
        "A bandwidth squeeze signals stored energy and an imminent expansion, but direction is unknown — prepare both sides and demand a confirmed breakout with volume.",
    },
  },
  {
    id: "sip-xirr",
    title: "SIP, Compounding & XIRR",
    category: "Funds & ETFs",
    simpleExplanation:
      "A SIP converts market volatility into an advantage: fixed monthly investments automatically buy more units when prices dip and fewer when they peak. XIRR is the single annualized return number that fairly summarizes irregular cash flows.",
    technicalExplanation:
      "SIP future value compounds each instalment for its remaining tenure. XIRR is the rate r solving NPV = Σ CFᵢ/(1+r)^(dᵢ/365.25) = 0 (NEXUS solves it by bisection on [−0.9999, 10]). Unlike point-to-point returns, XIRR accounts for the timing and size of every investment and withdrawal.",
    formula: "NPV(r) = Σ CFᵢ / (1+r)^(dᵢ/365.25) = 0  →  r = XIRR",
    workedExample:
      "₹10,000 monthly for 12 months (₹1.2L invested) grows to ₹1.29L. A simple 7.5% gain understates timing effects; XIRR annualizes the monthly cash-flow schedule to roughly 14% in this illustration.",
    realNexusExample:
      "NEXUS analytics reports XIRR on your paper portfolio's actual transaction ledger, and the Simulators view projects SIP outcomes before you commit real capital.",
    commonMistakes: [
      "Quoting absolute returns on SIPs: 40% total gain over 10 years is barely ~3.4% annualized — always annualize with XIRR.",
      "Stopping SIPs in crashes: Pausing at the bottom abandons the cheapest units, which contribute the most to long-run XIRR.",
    ],
    quiz: {
      question: "Why is XIRR a fairer SIP performance number than total percentage gain?",
      options: [
        "XIRR is always a bigger number",
        "XIRR accounts for when each rupee entered and exited, annualizing irregular cash flows",
        "Total gain cannot be computed for SIPs",
        "Regulators ban percentage gains",
      ],
      correctIndex: 1,
      explanation:
        "A lump sum and a staggered SIP with the same total gain had very different capital at risk over time. XIRR reduces every dated cash flow to one comparable annualized rate.",
    },
  },
  {
    id: "beta-diversification",
    title: "Beta, Diversification & Position Sizing",
    category: "Portfolio Risk",
    simpleExplanation:
      "Beta measures how violently your stock dances when the market moves: beta 1.5 means roughly 1.5× the market's swing. Diversification across weakly-correlated assets — plus capping any single position — is what keeps one bad bet from sinking the portfolio.",
    technicalExplanation:
      "Beta = Cov(stock, benchmark)/Var(benchmark) over paired daily returns. Portfolio variance falls as imperfectly correlated assets are added (the only free lunch in finance). NEXUS flags single-stock, top-3, and sector concentration (HHI-style) and sizes inverse-volatility weights as wᵢ = (1/σᵢ)/Σ(1/σ).",
    formula: "β = Cov(R_stock, R_mkt) / Var(R_mkt),   wᵢ = (1/σᵢ) / Σ(1/σ)",
    workedExample:
      "Nifty falls 2%. A beta-1.5 stock typically drops ~3%, while a beta-0.6 defensive drops ~1.2%. A portfolio split across three uncorrelated names with volatilities 20/30/50 gets inverse-vol weights ≈ 47%/31%/22%.",
    realNexusExample:
      "The NEXUS Portfolio Doctor computes your beta vs NIFTY 50, concentration flags, and stress scenarios (crash, crude shock, rate hike) from your live holdings.",
    commonMistakes: [
      "Holding ten stocks from one sector and calling it diversified: Correlated names fall together — diversify across sectors and factors.",
      "Sizing by conviction instead of volatility: A 40% position in a high-beta name dominates portfolio risk regardless of confidence.",
    ],
    quiz: {
      question: "Your portfolio holds 45% in one high-beta stock and the market drops 3%. What is the core problem?",
      options: [
        "Nothing — concentration always outperforms",
        "Concentration plus high beta means that single name drives most of the loss; trim size or hedge",
        "Beta only applies to mutual funds",
        "The other 55% will automatically offset the loss",
      ],
      correctIndex: 1,
      explanation:
        "Position size × beta determines risk contribution. A 45% high-beta allocation behaves like a leveraged market bet — the fix is smaller size, lower-beta exposure, or an explicit hedge.",
    },
  },
];

export const AiTutorView: React.FC = () => {
  const [selectedLessonId, setSelectedLessonId] = useState<string>("roce");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswerFeedback, setShowAnswerFeedback] = useState<boolean>(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);

  // Persist completed lessons across sessions (curriculum progresses in order).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("nexus-tutor-completed");
      if (stored) setCompletedLessons(JSON.parse(stored));
    } catch {
      setCompletedLessons([]);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("nexus-tutor-completed", JSON.stringify(completedLessons));
    } catch {
      // Ignore storage failures (private mode, full quota, etc.)
    }
  }, [completedLessons]);

  const currentLesson = LESSONS.find((l) => l.id === selectedLessonId) || LESSONS[0];

  const isLessonUnlocked = (id: string): boolean => {
    const index = LESSONS.findIndex((l) => l.id === id);
    if (index <= 0) return true;
    return completedLessons.includes(LESSONS[index - 1].id);
  };

  const handleSelectAnswer = (index: number) => {
    setSelectedAnswer(index);
    setShowAnswerFeedback(true);
    if (index === currentLesson.quiz.correctIndex && !completedLessons.includes(currentLesson.id)) {
      setCompletedLessons((prev) => [...prev, currentLesson.id]);
    }
  };

  const handleSwitchLesson = (id: string) => {
    if (!isLessonUnlocked(id)) return;
    setSelectedLessonId(id);
    setSelectedAnswer(null);
    setShowAnswerFeedback(false);
  };

  const currentIndex = LESSONS.findIndex((l) => l.id === currentLesson.id);
  const nextLesson = LESSONS[currentIndex + 1];
  const answeredCorrectly = showAnswerFeedback && selectedAnswer === currentLesson.quiz.correctIndex;
  const progressPct = Math.round((completedLessons.length / LESSONS.length) * 100);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2.5">
          <GraduationCap className="w-5 h-5 text-accent-cyan" />
          <h1 className="text-xl font-bold font-display text-foreground tracking-tight">
            AI Financial Tutor Mode
          </h1>
          <span className="px-2 py-0.5 text-[11px] rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
            Interactive Pedagogy
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Master financial engineering principles with intuitive analogies, mathematical formulas, real NEXUS market data, and checkpoint quizzes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Lesson Navigation */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-1">
            Curated Curriculum
          </span>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-3">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span className="font-semibold">Course Progress</span>
              <span className="text-accent-cyan font-bold tabular-nums">{progressPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-cyan to-accent-violet transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">
              Pass the checkpoint quiz of a concept to unlock the next one.
            </p>
          </div>
          <div className="space-y-1.5">
            {LESSONS.map((lesson) => {
              const unlocked = isLessonUnlocked(lesson.id);
              const done = completedLessons.includes(lesson.id);
              return (
                <button
                  key={lesson.id}
                  onClick={() => handleSwitchLesson(lesson.id)}
                  disabled={!unlocked}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col space-y-1 ${
                    currentLesson.id === lesson.id
                      ? "bg-accent-blue/15 border-accent-blue/40 text-foreground font-semibold shadow-sm"
                      : unlocked
                      ? "bg-surface-50 border-border text-slate-400 hover:text-slate-200 hover:border-white/10"
                      : "bg-surface-50/50 border-border/60 text-slate-600 cursor-not-allowed opacity-60"
                  }`}
                >
                  <span className="flex items-center justify-between w-full">
                    <span className="text-[10px] text-accent-cyan uppercase font-bold tracking-wider">
                      {lesson.category}
                    </span>
                    {done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald" />
                    ) : !unlocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
                    ) : null}
                  </span>
                  <span className="text-xs">{lesson.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Active Lesson Content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="p-6 rounded-2xl bg-surface-50 border border-border space-y-5">
            {/* Title & Simple Explanation */}
            <div>
              <span className="text-xs text-accent-cyan font-semibold uppercase tracking-wider">
                {currentLesson.category} · Fundamental Concept
              </span>
              <h2 className="text-xl font-bold text-foreground mt-1">{currentLesson.title}</h2>
              <div className="p-4 rounded-xl bg-accent-blue/5 border border-accent-blue/20 mt-3 text-xs text-slate-200 leading-relaxed flex items-start space-x-3">
                <Lightbulb className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-accent-cyan block mb-0.5">Plain-English Intuition</span>
                  {currentLesson.simpleExplanation}
                </div>
              </div>
            </div>

            {/* Technical Detail & Mathematical Formula */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                <span className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-accent-cyan" />
                  <span>Technical Definition</span>
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentLesson.technicalExplanation}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                <span className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                  <Calculator className="w-3.5 h-3.5 text-accent-emerald" />
                  <span>Mathematical Formula</span>
                </span>
                <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06] font-mono text-xs text-accent-cyan font-bold">
                  {currentLesson.formula}
                </div>
              </div>
            </div>

            {/* Worked Example vs Real NEXUS Case */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                <span className="text-xs font-semibold text-slate-200 block">Worked Step-by-Step Example:</span>
                <p className="text-xs text-slate-300 leading-relaxed">{currentLesson.workedExample}</p>
              </div>

              <div className="p-4 rounded-xl bg-accent-emerald/5 border border-accent-emerald/20 space-y-1.5">
                <span className="text-xs font-semibold text-accent-emerald block">Real NEXUS Data Illustration:</span>
                <p className="text-xs text-slate-300 leading-relaxed">{currentLesson.realNexusExample}</p>
              </div>
            </div>

            {/* Common Pitfalls / Traps */}
            <div className="p-4 rounded-xl bg-rose-500/[0.03] border border-rose-500/20 space-y-2">
              <span className="text-xs font-semibold text-rose-300 flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Common Investor Traps to Avoid:</span>
              </span>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                {currentLesson.commonMistakes.map((m, idx) => (
                  <li key={idx} className="leading-relaxed">{m}</li>
                ))}
              </ul>
            </div>

            {/* Interactive Knowledge Checkpoint Quiz */}
            <div className="p-5 rounded-xl bg-surface-100 border border-border space-y-4">
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-accent-violet" />
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Knowledge Checkpoint Quiz
                </h4>
              </div>

              <p className="text-xs text-slate-200 font-medium">
                {currentLesson.quiz.question}
              </p>

              <div className="space-y-2">
                {currentLesson.quiz.options.map((option, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const isCorrect = idx === currentLesson.quiz.correctIndex;
                  let btnClass = "border-border bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]";
                  if (showAnswerFeedback) {
                    if (isCorrect) {
                      btnClass = "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 font-semibold";
                    } else if (isSelected) {
                      btnClass = "border-rose-500/50 bg-rose-500/10 text-rose-300";
                    }
                  } else if (isSelected) {
                    btnClass = "border-accent-cyan bg-accent-cyan/10 text-accent-cyan";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(idx)}
                      disabled={showAnswerFeedback}
                      className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between ${btnClass}`}
                    >
                      <span>{option}</span>
                      {showAnswerFeedback && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {showAnswerFeedback && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {showAnswerFeedback && (
                <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-slate-300 leading-relaxed">
                  <span className="font-semibold text-accent-cyan block mb-0.5">Explanation:</span>
                  {currentLesson.quiz.explanation}
                </div>
              )}

              {answeredCorrectly && nextLesson && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-accent-emerald/10 border border-accent-emerald/25">
                  <div className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-accent-emerald shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-accent-emerald">Concept mastered — locked in your progress.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {nextLesson.title} is now unlocked.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSwitchLesson(nextLesson.id)}
                    className="shrink-0 inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-accent-emerald text-slate-950 text-xs font-bold hover:bg-emerald-400 transition-all"
                  >
                    <span>Start Next Concept</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {answeredCorrectly && !nextLesson && (
                <div className="p-3.5 rounded-xl bg-accent-emerald/10 border border-accent-emerald/25">
                  <p className="text-xs font-semibold text-accent-emerald">
                    Curriculum complete — every concept is mastered. New lessons will be added over time.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Disclaimer */}
      <ComplianceDisclaimer moduleName="Educational Financial Tutor" />
    </div>
  );
};
