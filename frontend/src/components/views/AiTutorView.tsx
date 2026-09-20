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
  category: "Fundamentals" | "Fixed Income" | "Portfolio Risk" | "Funds & ETFs";
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
