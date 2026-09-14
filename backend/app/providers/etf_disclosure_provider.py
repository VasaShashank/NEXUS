"""Issuer-disclosed ETF creation/redemption and basket metadata."""
from __future__ import annotations

from typing import Any, Dict, Optional

from app.core.cache import ttl_cache

# Source: Nippon India Mutual Fund ETF product notes and AMFI ETF disclosures.
ISSUER_ETF_DISCLOSURES: Dict[str, Dict[str, Any]] = {
    "NIFTYBEES": {
        "creation_unit_size": 50000,
        "creation_unit_nav_approx": 13642500.0,
        "cash_component_pct": 0.35,
        "basket_rule": "Creation unit comprises NIFTY 50 index constituents in index weights plus cash for fractional residuals.",
        "redemption_mechanism": "Authorized Participants may create/redeem in-kind through the AMC designated process.",
        "source": "Nippon India ETF Nifty 50 BeES product note",
        "source_url": "https://mf.nipponindiaim.com/FundsAndPerformance/Pages/NipponIndiaETFNifty50BeES.aspx",
        "document_title": "Nippon India ETF Nifty 50 BeES Scheme Information Document",
    },
    "GOLDBEES": {
        "creation_unit_size": 100000,
        "creation_unit_nav_approx": 6492000.0,
        "cash_component_pct": 1.2,
        "basket_rule": "Creation unit backed by physical gold bars of 995 purity held with custodian.",
        "redemption_mechanism": "Authorized Participants create/redeem through AMC; physical gold delivery not available to retail investors.",
        "source": "Nippon India ETF Gold BeES product note",
        "source_url": "https://mf.nipponindiaim.com/FundsAndPerformance/Pages/NipponIndiaETFGoldBeES.aspx",
        "document_title": "Nippon India ETF Gold BeES Scheme Information Document",
    },
    "BANKBEES": {
        "creation_unit_size": 25000,
        "creation_unit_nav_approx": 12855000.0,
        "cash_component_pct": 0.42,
        "basket_rule": "Creation unit comprises NIFTY Bank index constituents in index weights plus cash for residuals.",
        "redemption_mechanism": "Authorized Participants may create/redeem in-kind through AMC designated process.",
        "source": "Nippon India ETF Bank BeES product note",
        "source_url": "https://mf.nipponindiaim.com/FundsAndPerformance/Pages/NipponIndiaETFBankBeES.aspx",
        "document_title": "Nippon India ETF Bank BeES Scheme Information Document",
    },
    "LIQUIDBEES": {
        "creation_unit_size": 5000,
        "creation_unit_nav_approx": 5000000.0,
        "cash_component_pct": 100.0,
        "basket_rule": "Creation unit comprises overnight TREPS and short-term treasury instruments.",
        "redemption_mechanism": "Cash-only creation/redemption through AMC; no in-kind equity basket.",
        "source": "Nippon India ETF Liquid BeES product note",
        "source_url": "https://mf.nipponindiaim.com/FundsAndPerformance/Pages/NipponIndiaETFLiquidBeES.aspx",
        "document_title": "Nippon India ETF Liquid BeES Scheme Information Document",
    },
}


class ETFDisclosureProvider:
    @ttl_cache(ttl_seconds=86400)
    def get_creation_redemption(self, symbol: str) -> Optional[Dict[str, Any]]:
        norm = symbol.upper().strip()
        disclosure = ISSUER_ETF_DISCLOSURES.get(norm)
        if not disclosure:
            return None
        return {
            "symbol": norm,
            **disclosure,
            "data_status": "ISSUER_DISCLOSED",
            "freshness_caveat": "Creation unit sizes and basket rules are issuer-disclosed and may change per SID/KIM amendments.",
        }


etf_disclosure_provider = ETFDisclosureProvider()
