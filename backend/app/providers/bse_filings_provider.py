"""BSE India issuer filing discovery for annual reports and disclosures."""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

import httpx
from io import BytesIO
try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None

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
            "TATAMOTORS": "500570",
            "SBIN": "500112",
            "ITC": "500875",
            "BHARTIARTL": "532454",
            "LT": "500510",
            "BAJFINANCE": "500034",
            "MARUTI": "532500",
        }
        return known_codes.get(norm)

    @ttl_cache(ttl_seconds=86400)
    def _fetch_annual_reports(self, scrip: str) -> Optional[List[Dict[str, Any]]]:
        """Fetch raw annual report rows from BSE. Returns None on failure so
        transient 403/rate-limit blocks are NOT cached as an empty result."""
        try:
            with httpx.Client(timeout=3.0, headers=BSE_HEADERS) as client:
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

    @staticmethod
    @ttl_cache(ttl_seconds=86400)
    def _extract_pdf_text(file_link: str) -> str:
        """Best-effort extraction of text from a public BSE filing PDF with fast safety timeout."""
        if not file_link or PdfReader is None:
            return ""
        try:
            with httpx.Client(timeout=3.0, headers=BSE_HEADERS, follow_redirects=True) as client:
                response = client.get(file_link)
                if response.status_code != 200:
                    return ""
                content = response.content
                if len(content) > 3 * 1024 * 1024 or not content.startswith(b"%PDF"):
                    return ""
            reader = PdfReader(BytesIO(content))
            parts = []
            for page in reader.pages[:5]:
                text = page.extract_text() or ""
                if text:
                    parts.append(text)
            return "\n".join(parts)[:10000]
        except Exception:
            return ""

    def get_documents(self, symbol: str) -> List[Dict[str, Any]]:
        """Fetch annual report links from BSE corporate filings API."""
        norm = self._normalize_symbol(symbol)
        scrip = self._resolve_scrip_code(norm)
        if not scrip:
            return []
        rows = self._fetch_annual_reports(scrip)
        if not rows:
            # Multi-tier fallback to verified issuer filings cache
            from app.providers.indian_equities_data import FINANCIAL_DOCUMENTS_DATA
            fallback_docs = [
                doc for doc in FINANCIAL_DOCUMENTS_DATA
                if doc["symbol"].upper().split(".")[0] == norm
            ]
            if fallback_docs:
                return fallback_docs                
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
                extracted_text = self._extract_pdf_text(file_link) if file_link else ""
                documents.append({
                    "id": index + 1,
                    "symbol": norm,
                    "title": title,
                    "doc_type": row.get("CATEGORYNAME") or ("ANNUAL_REPORT" if row.get("year") else "FILING"),
                    "fiscal_year": row.get("FY") or row.get("FINYEAR") or row.get("year"),
                    "content": extracted_text or (f"Issuer filing metadata retrieved from BSE corporate filings (file: {file_link}). PDF text was unavailable or could not be extracted." if file_link else "Issuer filing metadata from BSE; no document text URL was supplied."),
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