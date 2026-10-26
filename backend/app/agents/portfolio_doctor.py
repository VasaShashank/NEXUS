"""
AI Portfolio Doctor & Risk Diagnostic Engine.
Implements the Hybrid Institutional Pattern:
1. Deterministic Math Engine calculates verified weights, HHI, Beta, and Sector Tilts.
2. LLM Prescriptive Synthesis formulates personalized, macro-aware rebalancing strategies.
3. Deterministic Baseline Fallback guarantees zero downtime if external AI APIs are unset.
"""
from typing import Dict, Any, List
import json
from sqlalchemy.orm import Session
from app.models.user import User
from app.services.trading_service import TradingService
from app.services.portfolio_analytics import PortfolioAnalyticsService
from app.services.ai_service import AIService
from app.schemas.agent import PortfolioDoctorResponse


class PortfolioDoctorAgent:
    @staticmethod
    def analyze(db: Session, user: User) -> PortfolioDoctorResponse:
        # ── Step 1: Deterministic Mathematical Computation ──
        summary = TradingService.get_portfolio_summary(db, user)
        risk = PortfolioAnalyticsService.calculate_risk(db, user)
        analytics = PortfolioAnalyticsService.calculate_analytics(db, user)

        holdings = summary.holdings
        if not holdings:
            return PortfolioDoctorResponse(
                overall_health="BALANCED",
                concentration_summary="Portfolio currently holds 100% in cash capital (₹10,00,000).",
                sector_tilt_summary="No active sector exposure.",
                primary_risks=["Zero market deployment: Cash capital is entirely unhedged against inflation."],
                suggested_actions=[
                    "Construct a diversified Indian core allocation across Large-Cap equities (e.g., IT, Banking, FMCG).",
                    "Deploy staged capital allocations (15-20% tranches) to average entry prices without timing market peaks.",
                    "Allocate a defensive sleeve to Sovereign G-Secs or Gold ETF (GOLDBEES) for macroeconomic shock absorption."
                ],
                supporting_metrics={
                    "total_value": summary.total_value,
                    "cash_pct": 100.0,
                    "holdings_count": 0,
                    "sharpe_ratio": 1.0,
                    "diagnosis_engine": "DETERMINISTIC_BASELINE"
                }
            )

        c_risk = risk.concentration_risk
        top_h_pct = c_risk.top_holding_pct
        top_sec_pct = c_risk.top_sector_pct

        # Deterministic Health Classification
        if top_h_pct > 50.0 or top_sec_pct > 60.0:
            health = "CRITICAL"
        elif c_risk.is_concentrated or top_sec_pct > 35.0:
            health = "VULNERABLE"
        elif risk.diversification_score > 70:
            health = "EXCELLENT"
        else:
            health = "BALANCED"

        # ── Step 2: Deterministic Baseline Fallback ──
        fallback_conc_summary = (
            f"High asset concentration: Top holding accounts for {top_h_pct:.1f}% of invested capital."
            if c_risk.is_concentrated
            else f"Balanced position sizing: Largest holding is disciplined at {top_h_pct:.1f}%."
        )

        heavy_secs = [s for s in risk.sector_exposures if s.risk_rating == "HEAVY"]
        fallback_sec_summary = (
            f"Overweight sector exposure: {heavy_secs[0].sector} accounts for {heavy_secs[0].percentage:.1f}% of holdings."
            if heavy_secs
            else "Well-diversified cross-sector footprint across Indian market verticals."
        )

        fallback_risks = []
        if c_risk.is_concentrated:
            fallback_risks.append(f"Single-stock idiosyncratic risk: Adverse earnings surprise in {holdings[0].symbol} could trigger outsized portfolio drawdown.")
        if heavy_secs:
            fallback_risks.append(f"Sector cyclicality: Regulatory or rate-cycle shifts in {heavy_secs[0].sector} pose correlated downside risk.")
        if not fallback_risks:
            fallback_risks.append("Systematic equity beta risk: Broad market drawdowns in benchmark NIFTY 50.")

        fallback_actions = []
        if c_risk.is_concentrated:
            fallback_actions.append(f"Trim {holdings[0].symbol} position size to below 25% of total capital to mitigate idiosyncratic exposure.")
        if heavy_secs:
            fallback_actions.append(f"Direct subsequent capital additions into non-correlated defensive sectors (e.g., Pharma, FMCG, or G-Secs).")
        if not fallback_actions:
            fallback_actions.append("Maintain disciplined portfolio rebalancing and enforce stop-loss thresholds in the Journal.")

        # ── Step 3: LLM Prescriptive Synthesis ──
        # Check if an external AI provider (Groq / OpenAI / Gemini) is configured
        provider = AIService.get_available_provider()
        if provider != "deterministic":
            try:
                holdings_str = ", ".join([f"{h.symbol} ({h.weight_pct:.1f}%, Sector: {h.sector})" for h in holdings[:8]])
                sectors_str = ", ".join([f"{s.sector}: {s.percentage:.1f}%" for s in risk.sector_exposures[:5]])

                prompt = f"""You are the NEXUS Institutional Portfolio Doctor. Analyze these verified portfolio risk metrics and output an institutional diagnostic prescription.

Verified Mathematical Metrics:
- Overall Health: {health}
- Holdings ({len(holdings)} positions): {holdings_str}
- Sector Allocation: {sectors_str}
- Top Position Weight: {top_h_pct:.1f}%
- Diversification Score: {risk.diversification_score}/100
- Portfolio Beta vs NIFTY 50: {analytics.beta:.2f}
- Sharpe Ratio: {analytics.sharpe_ratio:.2f}
- Max Historical Drawdown: {analytics.max_drawdown:.1f}%

Respond with a valid JSON object ONLY (no markdown fences, no extra text) with exact keys:
{{
  "concentration_summary": "1 concise sentence explaining asset concentration risks and correlation",
  "sector_tilt_summary": "1 concise sentence evaluating sector exposure and macro sensitivity",
  "primary_risks": ["concise risk 1", "concise risk 2"],
  "suggested_actions": ["actionable institutional rebalancing step 1", "actionable step 2"]
}}"""

                ai_res = AIService.generate_completion(
                    prompt,
                    system_instruction="You are an institutional risk officer. Evaluate verified portfolio numbers. Return strictly valid JSON.",
                    max_tokens=350,
                    temperature=0.2
                )

                if ai_res.get("status") == "SUCCESS" and ai_res.get("content"):
                    raw = ai_res["content"].strip()
                    if raw.startswith("```json"):
                        raw = raw[7:]
                    elif raw.startswith("```"):
                        raw = raw[3:]
                    if raw.endswith("```"):
                        raw = raw[:-3]

                    parsed = json.loads(raw.strip())
                    if (
                        "concentration_summary" in parsed
                        and "sector_tilt_summary" in parsed
                        and "primary_risks" in parsed
                        and "suggested_actions" in parsed
                    ):
                        return PortfolioDoctorResponse(
                            overall_health=health,
                            concentration_summary=parsed["concentration_summary"],
                            sector_tilt_summary=parsed["sector_tilt_summary"],
                            primary_risks=parsed["primary_risks"],
                            suggested_actions=parsed["suggested_actions"],
                            supporting_metrics={
                                "total_value": summary.total_value,
                                "cash_balance": summary.cash_balance,
                                "holdings_count": len(holdings),
                                "diversification_score": risk.diversification_score,
                                "sharpe_ratio": analytics.sharpe_ratio,
                                "beta": analytics.beta,
                                "max_drawdown": analytics.max_drawdown,
                                "diagnosis_engine": f"HYBRID_LLM ({ai_res.get('provider', 'Groq')})"
                            }
                        )
            except Exception:
                pass  # Graceful fallback to deterministic baseline

        # Deterministic Baseline Return
        return PortfolioDoctorResponse(
            overall_health=health,
            concentration_summary=fallback_conc_summary,
            sector_tilt_summary=fallback_sec_summary,
            primary_risks=fallback_risks,
            suggested_actions=fallback_actions,
            supporting_metrics={
                "total_value": summary.total_value,
                "cash_balance": summary.cash_balance,
                "holdings_count": len(holdings),
                "diversification_score": risk.diversification_score,
                "sharpe_ratio": analytics.sharpe_ratio,
                "beta": analytics.beta,
                "max_drawdown": analytics.max_drawdown,
                "diagnosis_engine": "DETERMINISTIC_BASELINE"
            }
        )
