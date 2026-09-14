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
)


def parse_screen_query(query: str) -> Dict[str, Any]:
    filters: Dict[str, Any] = {}
    matched: List[str] = []
    normalized = query.lower().strip()
    for label, field, pattern in RULES:
        match = re.search(pattern, normalized)
        if match:
            filters[field] = float(match.group(1))
            matched.append(f"{label} {match.group(1)}")

    sector_match = re.search(r"(?:sector|industry)\s*(?:is|=|:)\s*([a-z][a-z &-]+)", normalized)
    if sector_match:
        filters["sector"] = sector_match.group(1).strip()
        matched.append(f"sector {filters['sector']}")

    return {
        "query": query,
        "filters": filters,
        "matched_conditions": matched,
        "unparsed": not bool(filters),
        "disclaimer": "This parser only translates explicit conditions; review the filters before running a screen.",
    }