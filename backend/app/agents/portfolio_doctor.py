"""
AI Portfolio Doctor & Risk Diagnostic Engine.
Inspects real user holdings, identifies single-stock & sector skews,
and formulates actionable rebalancing recommendations.
"""
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.user import User
from app.services.trading_service import TradingService
from app.services.portfolio_analytics import PortfolioAnalyticsService
from app.schemas.agent import PortfolioDoctorResponse


class PortfolioDoctorAgent:
    @staticmethod
    def analyze(db: Session, user: User) -> PortfolioDoctorResponse:
        summary = TradingService.get_portfolio_summary(db, user)
        risk = PortfolioAnalyticsService.calculate_risk(db, user)
        analytics = PortfolioAnalyticsService.calculate_analytics(db, user)

        holdings = summary.holdings
        if not holdings:
            return PortfolioDoctorResponse(
                overall_health="BALANCED",
                concentration_summary="Portfolio currently holds 100% in cash capital (₹10,00,000).",
                sector_tilt_summary="No active sector exposure.",
                primary_risks=["Zero market deployment: Capital is unexposed to market growth."],
                suggested_actions=[
                    "Identify 3-5 core large-cap Indian equities across distinct sectors (e.g. IT, Banking, FMCG).",
                    "Deploy initial pilot allocations (10-15% of capital) to build positions without timing the market."
                ],
                supporting_metrics={
                    "total_value": summary.total_value,
                    "cash_pct": 100.0,
                    "holdings_count": 0,
                    "sharpe_ratio": 1.0
                }
            )

        # Evaluate real metrics
        c_risk = risk.concentration_risk
        top_h_pct = c_risk.top_holding_pct
        top_sec_pct = c_risk.top_sector_pct

        actions: List[str] = []
        risks: List[str] = []

        if c_risk.is_concentrated:
            health = "VULNERABLE"
            conc_summary = f"High asset concentration: Top position accounts for {top_h_pct}% of equity capital."
            risks.append(f"A 5% adverse movement in {holdings[0].symbol} will disproportionately drag total portfolio returns.")
            actions.append(f"Consider trimming {holdings[0].symbol} to below 25% of total capital to mitigate idiosyncratic risk.")
        else:
            health = "EXCELLENT" if risk.diversification_score > 70 else "BALANCED"
            conc_summary = f"Balanced position sizing: Largest holding is capped at {top_h_pct}%."

        # Sector tilt check
        heavy_secs = [s for s in risk.sector_exposures if s.risk_rating == "HEAVY"]
        if heavy_secs:
            sec_summary = f"Heavy tilt towards {heavy_secs[0].sector} ({heavy_secs[0].percentage}%)."
            risks.append(f"Sector-specific regulatory or macroeconomic cycles in {heavy_secs[0].sector} pose correlated downside.")
            actions.append(f"Diversify incremental capital into defensive or non-correlated sectors (e.g. FMCG or Pharma).")
        else:
            sec_summary = "Healthy multi-sector exposure with no single vertical exceeding safe thresholds."

        if not actions:
            actions.append("Maintain disciplined position sizing and set target exits in the Investment Journal.")

        return PortfolioDoctorResponse(
            overall_health=health,
            concentration_summary=conc_summary,
            sector_tilt_summary=sec_summary,
            primary_risks=risks,
            suggested_actions=actions,
            supporting_metrics={
                "total_value": summary.total_value,
                "cash_balance": summary.cash_balance,
                "holdings_count": len(holdings),
                "diversification_score": risk.diversification_score,
                "sharpe_ratio": analytics.sharpe_ratio,
                "max_drawdown": analytics.max_drawdown
            }
        )
