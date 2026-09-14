"""Transparent, non-predictive stock scoring from available NEXUS observations."""
from typing import Any, Dict, Optional


def _score(value: Optional[float], thresholds: tuple[float, float], reverse: bool = False) -> int:
    if value is None:
        return 0
    low, high = thresholds
    if reverse:
        return 20 if value <= low else (10 if value <= high else 0)
    return 20 if value >= high else (10 if value >= low else 0)


def build_stock_score(fundamentals: Any, technicals: Any) -> Dict[str, Any]:
    quality = sum([
        _score(fundamentals.roe, (10, 20)),
        _score(fundamentals.roce, (10, 18)),
        _score(fundamentals.operating_margin, (10, 20)),
        _score(fundamentals.debt_to_equity, (0.5, 1.0), reverse=True),
    ])
    growth = sum([
        _score(fundamentals.revenue_growth_yoy, (5, 15)),
        _score(fundamentals.profit_growth_yoy, (5, 15)),
    ])
    valuation = sum([
        _score(fundamentals.pe_ratio, (20, 35), reverse=True),
        _score(fundamentals.pb_ratio, (2, 4), reverse=True),
        _score(fundamentals.dividend_yield, (1, 3)),
    ])
    momentum = 20 if technicals.overall_signal in ("STRONG_BUY", "BUY") else (10 if technicals.overall_signal == "NEUTRAL" else 0)
    categories = {
        "financial_quality": min(100, quality * 100 // 80),
        "growth": min(100, growth * 100 // 40),
        "valuation": min(100, valuation * 100 // 60),
        "momentum": momentum * 5,
    }
    available = [value for value in categories.values() if value is not None]
    overall = round(sum(available) / len(available)) if available else 0
    strengths = []
    risks = []
    if fundamentals.roe is not None and fundamentals.roe >= 20:
        strengths.append("ROE is at least 20% in the available fundamentals snapshot.")
    if fundamentals.debt_to_equity is not None and fundamentals.debt_to_equity <= 0.5:
        strengths.append("Debt-to-equity is at or below 0.5x.")
    if fundamentals.revenue_growth_yoy is not None and fundamentals.revenue_growth_yoy >= 15:
        strengths.append("Reported revenue growth is at least 15% year over year.")
    if fundamentals.pe_ratio is not None and fundamentals.pe_ratio > 35:
        risks.append("P/E is above 35x in the available snapshot.")
    if fundamentals.debt_to_equity is not None and fundamentals.debt_to_equity > 1:
        risks.append("Debt-to-equity is above 1.0x.")
    if not strengths:
        strengths.append("No high-confidence strength threshold was met in the available data.")
    if not risks:
        risks.append("No high-confidence risk threshold was met in the available data.")
    facts = {
        "symbol": fundamentals.symbol,
        "source": fundamentals.source,
        "as_of": fundamentals.as_of_date,
        "available_metrics": [name for name, value in {
            "roe": fundamentals.roe,
            "roce": fundamentals.roce,
            "operating_margin": fundamentals.operating_margin,
            "debt_to_equity": fundamentals.debt_to_equity,
            "revenue_growth_yoy": fundamentals.revenue_growth_yoy,
            "profit_growth_yoy": fundamentals.profit_growth_yoy,
            "pe_ratio": fundamentals.pe_ratio,
            "pb_ratio": fundamentals.pb_ratio,
            "dividend_yield": fundamentals.dividend_yield,
        }.items() if value is not None],
    }
    calculated = {
        "category_scores": categories,
        "overall_score": overall,
        "technical_signal": technicals.overall_signal,
        "method": "Threshold scoring over sourced fundamentals and calculated technical indicators.",
    }
    historical_observations = [
        "The score describes the current sourced snapshot and technical signal; it does not forecast returns.",
        *(["Historical technical observations are included through the current indicator signal."] if technicals.patterns else []),
    ]
    uncertainties = [
        "Missing provider fields are excluded rather than estimated.",
        "The score does not include unsourced filings, future events, or a historical valuation distribution.",
    ]
    return {
        "symbol": fundamentals.symbol,
        "overall_score": overall,
        "categories": categories,
        "strengths": strengths,
        "risks": risks,
        "methodology": "Rule-based thresholds over available fundamentals and technical signal; missing values are excluded, not estimated.",
        "disclaimer": "Descriptive decision-support score, not investment advice or a price prediction.",
        "facts": facts,
        "calculated": calculated,
        "historical_observations": historical_observations,
        "uncertainties": uncertainties,
    }