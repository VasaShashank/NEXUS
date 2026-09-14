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
    COMMODITIES_FX_DATA,
)
from app.providers.amfi_provider import amfi_provider
from app.providers.amfi_metadata_provider import amfi_metadata_provider
from app.providers.market_data import market_data_provider
from app.providers.rbi_provider import rbi_provider
from app.providers.etf_disclosure_provider import etf_disclosure_provider

router = APIRouter(prefix="/assets", tags=["Multi-Asset Intelligence"])


class FundOverlapRequest(BaseModel):
    fund_id_a: str
    fund_id_b: str


class BondLadderRequest(BaseModel):
    total_investment: float
    target_tenor_years: int = 5
    risk_preference: str = "SOVEREIGN"  # SOVEREIGN, BALANCED, HIGH_YIELD


@router.get("/mutual-funds", response_model=List[Dict[str, Any]])
def get_mutual_funds(q: Optional[str] = Query(None, description="Filter or search scheme name or AMC")):
    """Retrieve catalog of Indian Mutual Funds across categories with live AMFI NAV updates."""
    return amfi_provider.get_all_funds(search_query=q)


@router.get("/mutual-funds/catalog", response_model=List[Dict[str, Any]])
def get_mutual_fund_catalog(
    q: Optional[str] = Query(None, description="Filter the AMFI scheme master by scheme name"),
    limit: int = Query(250, ge=1, le=1000),
):
    """Retrieve the persisted free AMFI scheme master from mftool."""
    return amfi_provider.get_scheme_master(search_query=q, limit=limit)


@router.get("/mutual-funds/{fund_id}", response_model=Dict[str, Any])
def get_mutual_fund_detail(fund_id: str):
    """Retrieve detailed scheme factsheet including top holdings and expense ratio."""
    all_funds = amfi_provider.get_all_funds()
    fund = next((f for f in all_funds if f["id"].upper() == fund_id.upper() or str(f.get("scheme_code")) == str(fund_id)), None)
    if not fund:
        raise HTTPException(status_code=404, detail=f"Mutual Fund '{fund_id}' not found.")
    return amfi_metadata_provider.enrich_fund_record(fund)


@router.get("/mutual-funds/{scheme_code}/nav-history", response_model=List[Dict[str, Any]])
def get_mutual_fund_nav_history(scheme_code: str, limit: int = Query(180, ge=10, le=1000)):
    """Retrieve historical daily NAV series from AMFI for charting."""
    return amfi_provider.get_nav_history(scheme_code, limit=limit)


@router.get("/mutual-funds/{scheme_code}/analytics", response_model=Dict[str, Any])
def get_mutual_fund_analytics(scheme_code: str):
    """Return rolling returns calculated from sourced AMFI NAV history."""
    return amfi_provider.get_nav_analytics(scheme_code)


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
    live_symbols = {etf["symbol"]: market_data_provider.get_quote(etf["symbol"]) for etf in ETFS_DATA}
    results = []
    for etf in ETFS_DATA:
        quote = live_symbols.get(etf["symbol"])
        disclosure = etf_disclosure_provider.get_creation_redemption(etf["symbol"])
        results.append({
            **etf,
            "nav": quote.current_price if quote else None,
            "current_price": quote.current_price if quote else None,
            "change_1d_pct": quote.change_1d_pct if quote else None,
            "data_status": "LIVE_QUOTE_REFERENCE_METADATA" if quote else "REFERENCE_METADATA_NO_LIVE_QUOTE",
            "data_source": quote.data_source if quote else "Curated AMC/index reference metadata",
            "source_url": disclosure["source_url"] if disclosure else "https://www.amfiindia.com/",
            "creation_redemption_metadata": disclosure,
        })
    return results


@router.get("/etfs/{symbol}/look-through", response_model=Dict[str, Any])
def get_etf_look_through(symbol: str):
    """
    ETF Look-Through analysis: reveals underlying individual stock constituents
    for aggregate risk mapping.
    """
    etf = next((e for e in ETFS_DATA if e["symbol"].upper() == symbol.upper()), None)
    if not etf:
        raise HTTPException(status_code=404, detail=f"ETF '{symbol}' not found.")

    quote = market_data_provider.get_quote(etf["symbol"])
    disclosure = etf_disclosure_provider.get_creation_redemption(etf["symbol"])
    return {
        "symbol": etf["symbol"],
        "name": etf["name"],
        "nav": quote.current_price if quote else None,
        "expense_ratio": etf["expense_ratio"],
        "expense_ratio_status": "REFERENCE_METADATA",
        "underlying_index": etf["underlying_index"],
        "top_constituents": etf["constituents"],
        "constituents_status": "REFERENCE_METADATA",
        "creation_redemption_metadata": disclosure,
        "freshness_caveat": "ETF holdings are disclosed per official AMC monthly portfolio disclosures.",
    }


@router.get("/etfs/{symbol}/tracking-difference", response_model=Dict[str, Any])
def get_etf_tracking_difference(symbol: str):
    """Compare sourced ETF and mapped index history where both providers expose data."""
    etf = next((item for item in ETFS_DATA if item["symbol"].upper() == symbol.upper()), None)
    if not etf:
        raise HTTPException(status_code=404, detail=f"ETF '{symbol}' not found.")
    index_symbol = {"NIFTY 50": "^NSEI", "NIFTY Bank Index": "^NSEBANK"}.get(etf.get("underlying_index"))
    if not index_symbol:
        return {"symbol": etf["symbol"], "data_available": False, "reason": "No free benchmark history mapping is available."}
    etf_history = market_data_provider.get_historical_candles(etf["symbol"], "1Y")
    index_history = market_data_provider.get_historical_candles(index_symbol, "1Y")
    index_by_date = {candle.time: candle.close for candle in index_history}
    aligned = [(candle, index_by_date[candle.time]) for candle in etf_history if candle.time in index_by_date and candle.close > 0 and index_by_date[candle.time] > 0]
    if len(aligned) < 30:
        return {"symbol": etf["symbol"], "benchmark": index_symbol, "data_available": False, "reason": "Insufficient aligned ETF and benchmark observations."}
    etf_return = aligned[-1][0].close / aligned[0][0].close - 1
    index_return = aligned[-1][1] / aligned[0][1] - 1
    return {
        "symbol": etf["symbol"],
        "benchmark": index_symbol,
        "data_available": True,
        "observations": len(aligned),
        "cumulative_etf_return_pct": round(etf_return * 100, 2),
        "cumulative_benchmark_return_pct": round(index_return * 100, 2),
        "tracking_difference_pct": round((etf_return - index_return) * 100, 2),
        "source": "Yahoo Finance OHLCV history",
        "disclaimer": "Historical tracking difference is descriptive and excludes unavailable fund-flow, tax, and distribution adjustments.",
    }


@router.get("/bonds", response_model=List[Dict[str, Any]])
def get_bonds():
    """Retrieve RBI-backed sovereign bond instruments with sourced benchmark yields."""
    return rbi_provider.get_gsec_bonds()


@router.get("/bonds/yield-curve", response_model=Dict[str, Any])
def get_yield_curve():
    """Retrieve sourced sovereign yield curve anchor and interpolated tenors."""
    return rbi_provider.get_yield_curve()


@router.post("/bonds/ladder-simulator", response_model=Dict[str, Any])
def simulate_bond_ladder(payload: BondLadderRequest):
    """
    Simulates a conservative bond maturity ladder across 1 to 10 year maturities.
    Generates year-by-year cash-flow schedule (coupons + principal redemptions).
    """
    eligible_bonds = rbi_provider.get_gsec_bonds()
    if not eligible_bonds:
        raise HTTPException(status_code=503, detail="Bond ladder unavailable: no verified live CCIL/RBI/issuer bond feed is configured.")

    principal = payload.total_investment
    num_rungs = min(len(eligible_bonds), min(5, max(3, payload.target_tenor_years)))
    rung_amount = principal / num_rungs

    schedule = []
    current_year = 2026
    selected = eligible_bonds[:num_rungs]

    weighted_ytm = sum(b["ytm"] for b in selected if b.get("ytm")) / len(selected)
    weighted_duration = sum(b["modified_duration_years"] for b in selected) / len(selected)

    for idx, bond in enumerate(selected):
        mat_year = current_year + idx + 1
        annual_coupon = round(rung_amount * (bond["coupon_rate"] / 100.0), 2)
        schedule.append({
            "rung_number": idx + 1,
            "maturity_year": mat_year,
            "allocated_capital": round(rung_amount, 2),
            "bond_name": bond["name"],
            "coupon_rate": bond["coupon_rate"],
            "annual_coupon_income": annual_coupon,
            "principal_redemption": round(rung_amount, 2),
            "total_cash_flow_at_maturity": round(rung_amount + annual_coupon, 2),
            "source_url": bond.get("source_url"),
        })

    return {
        "total_principal": principal,
        "number_of_rungs": num_rungs,
        "weighted_average_ytm": round(weighted_ytm, 2),
        "weighted_duration_years": round(weighted_duration, 2),
        "estimated_annual_cashflow": round(sum(s["annual_coupon_income"] for s in schedule), 2),
        "schedule": schedule,
        "source": "RBI sovereign benchmark yields",
        "simulation_disclaimer": "Historical simulation under specified assumptions only. Bond prices and yields fluctuate with prevailing interest rates. Not an offer or guarantee."
    }


@router.get("/commodities-fx", response_model=List[Dict[str, Any]])
def get_commodities_fx():
    """Retrieve Gold, Silver, Brent Crude, and USD/INR price histories and volatility."""
    yahoo_symbols = {"GOLD": "GC=F", "SILVER": "SI=F", "BRENT_CRUDE": "BZ=F", "USD_INR": "USDINR=X"}
    usd_inr_quote = market_data_provider.get_quote("USDINR=X")
    usd_inr = usd_inr_quote.current_price if usd_inr_quote else None
    results = []
    for item in COMMODITIES_FX_DATA:
        quote = market_data_provider.get_quote(yahoo_symbols[item["symbol"]])
        enriched = {
            "symbol": item["symbol"],
            "name": item["name"],
            "asset_class": item["asset_class"],
            "unit": item["unit"],
            "macro_impact": item.get("macro_impact"),
        }
        if quote:
            price = quote.current_price
            if item["symbol"] == "GOLD" and usd_inr:
                price = price * usd_inr * 10 / 31.1034768
            elif item["symbol"] == "SILVER" and usd_inr:
                price = price * usd_inr * 32.1507466
            enriched.update({
                "current_price": round(price, 2),
                "change_1d_pct": quote.change_1d_pct,
                "change_1d": round(price * quote.change_1d_pct / 100, 2),
                "as_of": quote.as_of,
                "data_status": "LIVE_PROVIDER_QUOTE",
                "data_source": quote.data_source,
                "source_url": f"https://finance.yahoo.com/quote/{yahoo_symbols[item['symbol']]}",
            })
        else:
            enriched.update({
                "current_price": None,
                "change_1d_pct": None,
                "change_1d": None,
                "data_status": "DATA_UNAVAILABLE",
                "data_source": None,
                "source_url": f"https://finance.yahoo.com/quote/{yahoo_symbols[item['symbol']]}",
            })
        results.append(enriched)
    return results


@router.get("/commodities", response_model=List[Dict[str, Any]])
def get_commodities():
    """Alias for /commodities-fx endpoint."""
    return get_commodities_fx()


@router.get("/macro", response_model=List[Dict[str, Any]])
def get_macro_indicators():
    """Retrieve macroeconomic dashboard: CPI, GDP, Policy Repo Rate, 10Y Yield."""
    return rbi_provider.get_macro_indicators()
