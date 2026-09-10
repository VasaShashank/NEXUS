"""
Multi-Asset API Routes.
Exposes endpoints for Mutual Funds, ETF Look-Through, Bond Ladder Simulation,
Commodities/FX, and Macroeconomic Indicators.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.providers.multi_asset_data import (
    MUTUAL_FUNDS_DATA,
    ETFS_DATA,
    BONDS_DATA,
    COMMODITIES_FX_DATA,
    MACRO_INDICATORS_DATA
)

router = APIRouter(prefix="/assets", tags=["Multi-Asset Intelligence"])


class FundOverlapRequest(BaseModel):
    fund_id_a: str
    fund_id_b: str


class BondLadderRequest(BaseModel):
    total_investment: float
    target_tenor_years: int = 5
    risk_preference: str = "SOVEREIGN"  # SOVEREIGN, BALANCED, HIGH_YIELD


@router.get("/mutual-funds", response_model=List[Dict[str, Any]])
def get_mutual_funds():
    """Retrieve catalog of premier Indian Mutual Funds across categories."""
    return MUTUAL_FUNDS_DATA


@router.get("/mutual-funds/{fund_id}", response_model=Dict[str, Any])
def get_mutual_fund_detail(fund_id: str):
    """Retrieve detailed scheme factsheet including top holdings and expense ratio."""
    fund = next((f for f in MUTUAL_FUNDS_DATA if f["id"].upper() == fund_id.upper()), None)
    if not fund:
        raise HTTPException(status_code=404, detail=f"Mutual Fund '{fund_id}' not found.")
    return fund


@router.post("/mutual-funds/overlap", response_model=Dict[str, Any])
def calculate_fund_overlap(payload: FundOverlapRequest):
    """
    Calculate portfolio overlap between two mutual funds.
    Documented Methodology:
    Sum of min(Weight_A, Weight_B) across all common securities.
    """
    fund_a = next((f for f in MUTUAL_FUNDS_DATA if f["id"].upper() == payload.fund_id_a.upper()), None)
    fund_b = next((f for f in MUTUAL_FUNDS_DATA if f["id"].upper() == payload.fund_id_b.upper()), None)

    if not fund_a or not fund_b:
        raise HTTPException(status_code=404, detail="One or both mutual funds could not be found.")

    holdings_a = {h["symbol"]: h for h in fund_a.get("top_holdings", [])}
    holdings_b = {h["symbol"]: h for h in fund_b.get("top_holdings", [])}

    common_symbols = set(holdings_a.keys()).intersection(set(holdings_b.keys()))
    common_holdings = []
    total_overlap_pct = 0.0

    for sym in common_symbols:
        wt_a = holdings_a[sym]["weight"]
        wt_b = holdings_b[sym]["weight"]
        min_wt = min(wt_a, wt_b)
        total_overlap_pct += min_wt
        common_holdings.append({
            "symbol": sym,
            "name": holdings_a[sym]["name"],
            "weight_fund_a": wt_a,
            "weight_fund_b": wt_b,
            "overlap_weight": round(min_wt, 2)
        })

    common_holdings.sort(key=lambda x: x["overlap_weight"], reverse=True)

    return {
        "fund_a": fund_a["scheme_name"],
        "fund_b": fund_b["scheme_name"],
        "overlap_percentage": round(total_overlap_pct, 2),
        "common_holdings_count": len(common_holdings),
        "common_holdings": common_holdings,
        "methodology": "Portfolio overlap is calculated as the sum of min(w_i,A, w_i,B) for all intersecting securities i.",
        "interpretation": (
            f"These funds have a {round(total_overlap_pct, 1)}% portfolio overlap. "
            f"{'High duplication: holding both provides limited diversification benefit.' if total_overlap_pct > 30 else 'Low overlap: complementary asset allocation.'}"
        )
    }


@router.get("/etfs", response_model=List[Dict[str, Any]])
def get_etfs():
    """Retrieve Indian ETF directory with underlying tracking metrics."""
    return ETFS_DATA


@router.get("/etfs/{symbol}/look-through", response_model=Dict[str, Any])
def get_etf_look_through(symbol: str):
    """
    ETF Look-Through analysis: reveals underlying individual stock constituents
    for aggregate risk mapping.
    """
    etf = next((e for e in ETFS_DATA if e["symbol"].upper() == symbol.upper()), None)
    if not etf:
        raise HTTPException(status_code=404, detail=f"ETF '{symbol}' not found.")

    return {
        "symbol": etf["symbol"],
        "name": etf["name"],
        "nav": etf["nav"],
        "expense_ratio": etf["expense_ratio"],
        "underlying_index": etf["underlying_index"],
        "top_constituents": etf["constituents"],
        "freshness_caveat": "ETF holdings are disclosed per official AMC monthly portfolio disclosures."
    }


@router.get("/bonds", response_model=List[Dict[str, Any]])
def get_bonds():
    """Retrieve directory of Indian Sovereign G-Secs and AAA PSU/Corporate Bonds."""
    return BONDS_DATA


@router.post("/bonds/ladder-simulator", response_model=Dict[str, Any])
def simulate_bond_ladder(payload: BondLadderRequest):
    """
    Simulates a conservative bond maturity ladder across 1 to 10 year maturities.
    Generates year-by-year cash-flow schedule (coupons + principal redemptions).
    """
    principal = payload.total_investment
    num_rungs = min(5, max(3, payload.target_tenor_years))
    rung_amount = principal / num_rungs

    schedule = []
    total_coupons = 0.0
    current_year = 2026

    # Select representative bonds
    eligible_bonds = BONDS_DATA[:num_rungs]

    weighted_ytm = sum(b["ytm"] for b in eligible_bonds) / len(eligible_bonds)
    weighted_duration = sum(b["modified_duration_years"] for b in eligible_bonds) / len(eligible_bonds)

    for idx, bond in enumerate(eligible_bonds):
        mat_year = current_year + idx + 1
        annual_coupon = round(rung_amount * (bond["coupon_rate"] / 100.0), 2)
        total_coupons += annual_coupon * (idx + 1)
        schedule.append({
            "rung_number": idx + 1,
            "maturity_year": mat_year,
            "allocated_capital": round(rung_amount, 2),
            "bond_name": bond["name"],
            "coupon_rate": bond["coupon_rate"],
            "annual_coupon_income": annual_coupon,
            "principal_redemption": round(rung_amount, 2),
            "total_cash_flow_at_maturity": round(rung_amount + annual_coupon, 2)
        })

    return {
        "total_principal": principal,
        "number_of_rungs": num_rungs,
        "weighted_average_ytm": round(weighted_ytm, 2),
        "weighted_duration_years": round(weighted_duration, 2),
        "estimated_annual_cashflow": round(sum(s["annual_coupon_income"] for s in schedule), 2),
        "schedule": schedule,
        "simulation_disclaimer": "Historical simulation under specified assumptions only. Bond prices and yields fluctuate with prevailing interest rates. Not an offer or guarantee."
    }


@router.get("/commodities-fx", response_model=List[Dict[str, Any]])
def get_commodities_fx():
    """Retrieve Gold, Silver, Brent Crude, and USD/INR price histories and volatility."""
    return COMMODITIES_FX_DATA


@router.get("/commodities", response_model=List[Dict[str, Any]])
def get_commodities():
    """Alias for /commodities-fx endpoint."""
    return COMMODITIES_FX_DATA


@router.get("/macro", response_model=List[Dict[str, Any]])
def get_macro_indicators():
    """Retrieve macroeconomic dashboard: CPI, GDP, Policy Repo Rate, 10Y Yield, PMI."""
    return MACRO_INDICATORS_DATA
