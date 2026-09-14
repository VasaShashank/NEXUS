"""Isolated curated reference fixtures — never surfaced as current market data."""
from typing import Any, Dict, List, Optional

from app.providers.indian_equities_data import (
    BULK_BLOCK_DEALS_DATA,
    CORPORATE_ACTIONS_DATA,
    FINANCIAL_DOCUMENTS_DATA,
    INSIDER_TRADES_DATA,
    NEWS_FEED_DATA,
)
from app.providers.multi_asset_data import COMMODITIES_FX_DATA, MACRO_INDICATORS_DATA, MUTUAL_FUNDS_DATA


class ReferenceDataService:
    """Expose curated fixtures only through explicit reference endpoints."""

    @staticmethod
    def list_reference_datasets() -> List[Dict[str, str]]:
        return [
            {"id": "bulk-block-deals", "description": "Curated bulk/block deal fixtures"},
            {"id": "insider-trades", "description": "Curated insider trade fixtures"},
            {"id": "corporate-actions", "description": "Curated corporate action fixtures"},
            {"id": "news", "description": "Curated news fixtures"},
            {"id": "documents", "description": "Curated filing text fixtures"},
            {"id": "commodities", "description": "Curated commodity reference values"},
            {"id": "macro", "description": "Curated macro reference values"},
            {"id": "mutual-funds", "description": "Curated mutual fund metadata"},
        ]

    @staticmethod
    def get_dataset(dataset_id: str, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        datasets = {
            "bulk-block-deals": BULK_BLOCK_DEALS_DATA,
            "insider-trades": INSIDER_TRADES_DATA,
            "corporate-actions": CORPORATE_ACTIONS_DATA,
            "news": NEWS_FEED_DATA,
            "documents": FINANCIAL_DOCUMENTS_DATA,
            "commodities": COMMODITIES_FX_DATA,
            "macro": MACRO_INDICATORS_DATA,
            "mutual-funds": MUTUAL_FUNDS_DATA,
        }
        rows = datasets.get(dataset_id, [])
        if symbol:
            norm = symbol.upper().split(".")[0]
            rows = [row for row in rows if row.get("symbol", "").upper() == norm]
        return [
            {
                **row,
                "data_status": "REFERENCE_FIXTURE",
                "source": "Curated local reference fixture",
                "source_url": None,
                "disclaimer": "Reference-only fixture. Not current market or exchange data.",
            }
            for row in rows
        ]
