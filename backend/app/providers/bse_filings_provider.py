"""BSE India issuer filing discovery for annual reports and disclosures."""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import httpx

from app.core.cache import ttl_cache
from app.services.provenance_service import record_observation

BSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
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
                if response.status_code == 200:
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
    def _fetch_annual_reports(self, scrip: str) -> Optional[List[Dict[str, Any]]]:
        """Fetch raw annual report rows from BSE. Returns None on failure so
        transient 403/rate-limit blocks are NOT cached as an empty result."""
        try:
            with httpx.Client(timeout=8.0, headers=BSE_HEADERS) as client:
                response = client.get(
                    "https://api.bseindia.com/BseIndiaAPI/api/AnnualReport/w",
                    params={"scripcode": scrip},
                )
                if response.status_code != 200:
                    return None
                payload = response.json()
                return payload if isinstance(payload, list) else payload.get("Table", [])
        except Exception:
            return None

    def get_documents(self, symbol: str) -> List[Dict[str, Any]]:
        """Fetch annual report links from BSE corporate filings API."""
        norm = self._normalize_symbol(symbol)
        scrip = self._resolve_scrip_code(norm)
        if not scrip:
            return []
        rows = self._fetch_annual_reports(scrip)
        if not rows:
            return []
        documents: List[Dict[str, Any]] = []
        try:
            for index, row in enumerate(rows):
                title = (
                    row.get("DOCNAME")
                    or row.get("HEADLINE")
                    or (f"{norm} Annual Report {row.get('year')}" if row.get("year") else f"{norm} Filing")
                )
                url = (
                    row.get("ATTACHMENTNAME")
                    or row.get("docurl")
                    or row.get("file_name")
                )
                file_link = f"https://www.bseindia.com/xml-data/corpfiling/AttachHis/{url}" if url else None
                documents.append({
                    "id": index + 1,
                    "symbol": norm,
                    "title": title,
                    "doc_type": row.get("CATEGORYNAME") or ("ANNUAL_REPORT" if row.get("year") else "FILING"),
                    "fiscal_year": row.get("FY") or row.get("FINYEAR") or row.get("year"),
                    "content": f"Issuer filing metadata retrieved from BSE corporate filings (file: {file_link})." if file_link else "Issuer filing metadata from BSE.",
                    "created_at": str(row.get("NEWS_DT") or row.get("DisclosureDate") or row.get("dt_tm") or "")[:10],
                    "data_status": "SOURCED_ISSUER",
                    "source": "BSE India Corporate Filings",
                    "source_url": file_link or "https://www.bseindia.com/corporates/ann.html",
                })
            record_observation("bse", "filings", norm, "https://api.bseindia.com/BseIndiaAPI/api/AnnualReport/w", documents)
        except Exception:
            return []
        return documents


bse_filings_provider = BSEFilingsProvider()
