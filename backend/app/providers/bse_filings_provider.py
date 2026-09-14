"""BSE India issuer filing discovery for annual reports and disclosures."""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import httpx

from app.core.cache import ttl_cache
from app.services.provenance_service import record_observation

BSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; NEXUS/2.0; +https://nexusfin.ai)",
    "Accept": "application/json",
    "Referer": "https://www.bseindia.com/",
}


class BSEFilingsProvider:
    @staticmethod
    def _normalize_symbol(symbol: str) -> str:
        return symbol.upper().split(".")[0].strip()

    @ttl_cache(ttl_seconds=86400)
    def _resolve_scrip_code(self, symbol: str) -> Optional[str]:
        norm = self._normalize_symbol(symbol)
        try:
            with httpx.Client(timeout=8.0, headers=BSE_HEADERS) as client:
                response = client.get(
                    "https://api.bseindia.com/BseIndiaAPI/api/StockReachGraph/w",
                    params={"scripcode": norm, "flag": "EQ"},
                )
                if response.status_code != 200:
                    return None
                match = re.search(r"scrip_cd=(\d+)", response.text)
                if match:
                    return match.group(1)
        except Exception:
            pass

        known_codes = {
            "RELIANCE": "500325",
            "TCS": "532540",
            "HINDUNILVR": "500696",
            "INFY": "500209",
            "HDFCBANK": "500180",
            "ICICIBANK": "532174",
        }
        return known_codes.get(norm)

    @ttl_cache(ttl_seconds=86400)
    def get_documents(self, symbol: str) -> List[Dict[str, Any]]:
        """Fetch annual report links from BSE corporate filings API."""
        norm = self._normalize_symbol(symbol)
        scrip = self._resolve_scrip_code(norm)
        if not scrip:
            return []
        documents: List[Dict[str, Any]] = []
        try:
            with httpx.Client(timeout=8.0, headers=BSE_HEADERS) as client:
                response = client.get(
                    "https://api.bseindia.com/BseIndiaAPI/api/AnnualReport/w",
                    params={"scripcode": scrip},
                )
                if response.status_code != 200:
                    return []
                payload = response.json()
                rows = payload if isinstance(payload, list) else payload.get("Table", [])
                for index, row in enumerate(rows):
                    title = row.get("DOCNAME") or row.get("HEADLINE") or f"{norm} Filing"
                    url = row.get("ATTACHMENTNAME") or row.get("docurl")
                    if url and not url.startswith("http"):
                        url = f"https://www.bseindia.com/xml-data/corpfiling/AttachHis/{url}"
                    documents.append({
                        "id": index + 1,
                        "symbol": norm,
                        "title": title,
                        "doc_type": row.get("CATEGORYNAME") or "FILING",
                        "fiscal_year": row.get("FY") or row.get("FINYEAR"),
                        "content": f"Issuer filing available at {url}" if url else "Issuer filing metadata from BSE.",
                        "created_at": str(row.get("NEWS_DT") or row.get("DisclosureDate") or "")[:10],
                        "data_status": "SOURCED_ISSUER",
                        "source": "BSE India Corporate Filings",
                        "source_url": url or "https://www.bseindia.com/corporates/ann.html",
                    })
            record_observation("bse", "filings", norm, "https://api.bseindia.com/BseIndiaAPI/api/AnnualReport/w", documents)
        except Exception:
            return []
        return documents


bse_filings_provider = BSEFilingsProvider()
