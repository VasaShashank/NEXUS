"""Deterministic natural-language screener parser; no external AI dependency."""
import re
from typing import Any, Dict, List


RULES = (
    ("roe", "min_roe", r"(?:roe|return on equity)\s*(?:above|over|greater than|>)\s*(\d+(?:\.\d+)?)"),
    ("roce", "min_roce", r"(?:roce|return on capital employed)\s*(?:above|over|greater than|>)\s*(\d+(?:\.\d+)?)"),
    ("pe", "max_pe", r"(?:p/?e|price to earnings)\s*(?:below|under|less than|<)\s*(\d+(?:\.\d+)?)"),
    ("debt", "max_debt_equity", r"(?:debt(?:\s*/\s*equity)?|d/?e)\s*(?:below|under|less than|<)\s*(\d+(?:\.\d+)?)"),
    ("revenue growth", "min_revenue_growth", r"(?:revenue|sales)\s*growth\s*(?:above|over|greater than|>)\s*(\d+(?:\.\d+)?)"),
    ("profit growth", "min_profit_growth", r"(?:profit|pat)\s*growth\s*(?:above|over|greater than|>)\s*(\d+(?:\.\d+)?)"),
    ("operating margin", "min_operating_margin", r"(?:operating|opm)\s*margin\s*(?:above|over|greater than|>)\s*(\d+(?:\.\d+)?)"),
    ("market cap", "min_market_cap", r"(?:market cap|m-?cap|market capitalization)\s*(?:above|over|greater than|>)\s*(\d+(?:\.\d+)?)"),
    ("rsi", "max_rsi", r"rsi\s*(?:below|under|less than|<)\s*(\d+(?:\.\d+)?)"),
    ("rsi", "min_rsi", r"rsi\s*(?:above|over|greater than|>)\s*(\d+(?:\.\d+)?)"),
    ("volume", "min_volume", r"volume\s*(?:above|over|greater than|>)\s*(\d+(?:\.\d+)?)"),
    ("distance from 52w high", "max_distance_from_52w_high", r"(?:(?:distance|down|off)\s*(?:from|by)?\s*p?e?r?c?e?n?t?|below)?\s*(?:52w|52-week|year high|high)(?:s)?\s*(?:above|below|within|under|-)?\s*(\d+(?:\.\d+)?)\s*(?:%|percent)?"),
)

SECTOR_ALIASES = {
    "bank": "Banks & Financial Services",
    "banking": "Banks & Financial Services",
    "it": "Information Technology",
    "tech": "Information Technology",
    "technology": "Information Technology",
    "software": "Information Technology",
    "pharma": "Pharmaceuticals & Healthcare",
    "pharmaceuticals": "Pharmaceuticals & Healthcare",
    "healthcare": "Pharmaceuticals & Healthcare",
    "fmcg": "Fast Moving Consumer Goods",
    "consumer": "Fast Moving Consumer Goods",
    "auto": "Automobiles & Auto Components",
    "automobile": "Automobiles & Auto Components",
    "automobiles": "Automobiles & Auto Components",
    "energy": "Energy & Petrochemicals",
    "oil": "Energy & Petrochemicals",
    "metal": "Metals & Mining",
    "steel": "Metals & Mining",
    "mining": "Metals & Mining",
    "infra": "Infrastructure & Construction",
    "infrastructure": "Infrastructure & Construction",
    "construction": "Infrastructure & Construction",
    "capital goods": "Capital Goods",
    "cement": "Cement & Building Materials",
    "real estate": "Real Estate",
    "telecom": "Telecom & Media",
    "power": "Power & Utilities",
    "utilities": "Power & Utilities",
}


def parse_screen_query(query: str) -> Dict[str, Any]:
    filters: Dict[str, Any] = {}
    matched: List[str] = []
    normalized = query.lower().strip()
    for label, field, pattern in RULES:
        match = re.search(pattern, normalized)
        if match:
            value = float(match.group(1).replace(",", ""))
            if field not in filters:
                filters[field] = value
                matched.append(f"{label} {value}")

    sector_match = re.search(r"(?:sector|industry)\s*(?:is|=|:|in)\s*([a-zA-Z][a-z &-]+)", normalized)
    if sector_match:
        raw_sector = sector_match.group(1).strip()
        sector_value = SECTOR_ALIASES.get(raw_sector, raw_sector)
        filters["sector"] = sector_value
        matched.append(f"sector {sector_value}")

    return {
        "query": query,
        "filters": filters,
        "matched_conditions": matched,
        "unparsed": not bool(filters),
        "disclaimer": "This parser only translates explicit conditions; review the filters before running a screen.",
    }