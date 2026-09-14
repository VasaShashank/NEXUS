"""AMFI-sourced mutual fund scheme metadata beyond daily NAV."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx

from app.core.cache import ttl_cache
from app.providers.amfi_provider import CURATED_SCHEME_MAP
from app.providers.multi_asset_data import MUTUAL_FUNDS_DATA
from app.services.provenance_service import record_observation

AMFI_SCHEME_DETAIL = "https://api.mfapi.in/mf/{scheme_code}"


class AMFIMetadataProvider:
    @ttl_cache(ttl_seconds=86400)
    def get_scheme_metadata(self, scheme_code: str) -> Dict[str, Any]:
        """Fetch scheme metadata from mfapi.in (AMFI scheme master lineage)."""
        code = str(scheme_code).strip()
        metadata: Dict[str, Any] = {
            "scheme_code": code,
            "data_status": "UNAVAILABLE",
            "source_url": AMFI_SCHEME_DETAIL.format(scheme_code=code),
        }
        try:
            with httpx.Client(timeout=6.0) as client:
                response = client.get(AMFI_SCHEME_DETAIL.format(scheme_code=code))
                if response.status_code != 200:
                    return metadata
                payload = response.json()
                meta = payload.get("meta", {})
                metadata.update({
                    "scheme_name": meta.get("scheme_name"),
                    "fund_house": meta.get("fund_house"),
                    "scheme_type": meta.get("scheme_type"),
                    "scheme_category": meta.get("scheme_category"),
                    "benchmark": meta.get("scheme_category"),
                    "data_status": "SOURCED_AMFI",
                    "source": "AMFI via mfapi.in",
                    "source_url": AMFI_SCHEME_DETAIL.format(scheme_code=code),
                })
                record_observation("amfi", "scheme-metadata", code, metadata["source_url"], metadata)
        except Exception:
            pass
        return metadata

    def enrich_fund_record(self, fund: Dict[str, Any]) -> Dict[str, Any]:
        """Merge curated reference fields with sourced AMFI metadata, clearly labeled."""
        enriched = dict(fund)
        scheme_code = fund.get("scheme_code") or CURATED_SCHEME_MAP.get(fund.get("id", ""))
        if scheme_code:
            sourced = self.get_scheme_metadata(str(scheme_code))
            enriched["scheme_code"] = scheme_code
            if sourced.get("scheme_name"):
                enriched["scheme_name"] = sourced["scheme_name"]
            if sourced.get("fund_house"):
                enriched["amc"] = sourced["fund_house"]
            if sourced.get("scheme_category"):
                enriched["category"] = sourced["scheme_category"]
            if sourced.get("benchmark"):
                enriched["benchmark"] = sourced["benchmark"]
            enriched["metadata_status"] = sourced.get("data_status", "REFERENCE_METADATA")
            enriched["metadata_source"] = sourced.get("source", "Curated AMC reference")
            enriched["metadata_source_url"] = sourced.get("source_url", "https://www.amfiindia.com/")
        else:
            enriched["metadata_status"] = "REFERENCE_METADATA"
            enriched["metadata_source"] = "Curated AMC reference"
            enriched["metadata_source_url"] = "https://www.amfiindia.com/"

        for field in ("expense_ratio", "exit_load", "aum_crores", "top_holdings"):
            if field in enriched:
                enriched[f"{field}_status"] = "REFERENCE_METADATA"
                enriched[f"{field}_source_url"] = enriched.get("metadata_source_url")
        return enriched

    def get_all_enriched_funds(self) -> List[Dict[str, Any]]:
        return [self.enrich_fund_record(fund) for fund in MUTUAL_FUNDS_DATA]


amfi_metadata_provider = AMFIMetadataProvider()
