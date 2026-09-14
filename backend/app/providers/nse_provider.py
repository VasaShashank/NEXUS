"""NSE India exchange-sourced bulk/block deals and insider (PIT) disclosures."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.core.cache import ttl_cache
from app.services.provenance_service import record_observation

NSE_BASE = "https://www.nseindia.com"
NSE_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": f"{NSE_BASE}/",
}


class NSEProvider:
    def _session(self) -> httpx.Client:
        client = httpx.Client(timeout=8.0, headers=NSE_HEADERS, follow_redirects=True)
        client.get(NSE_BASE)
        return client

    def _fetch_json(self, path: str) -> Any:
        with self._session() as client:
            response = client.get(f"{NSE_BASE}{path}")
            response.raise_for_status()
            return response.json()

    @staticmethod
    def _normalize_symbol(symbol: str) -> str:
        return symbol.upper().split(".")[0].strip()

    @ttl_cache(ttl_seconds=900)
    def get_bulk_deals(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return NSE bulk deals, optionally filtered by symbol."""
        try:
            payload = self._fetch_json("/api/bulk-deals")
            rows = payload if isinstance(payload, list) else payload.get("data", [])
            deals: List[Dict[str, Any]] = []
            for row in rows:
                sym = str(row.get("symbol") or row.get("secSymbol") or "").upper()
                if symbol and sym != self._normalize_symbol(symbol):
                    continue
                qty = int(float(row.get("quantity") or row.get("qty") or 0))
                price = float(row.get("tradePrice") or row.get("avgPrice") or 0)
                value_cr = round((qty * price) / 1e7, 2) if qty and price else 0.0
                deals.append({
                    "symbol": sym,
                    "company_name": row.get("secName") or row.get("symbol") or sym,
                    "deal_type": "BULK",
                    "trade_date": str(row.get("date") or row.get("tradeDate") or "")[:10],
                    "client_name": row.get("clientName") or row.get("buyerName") or row.get("client") or "Undisclosed",
                    "deal_side": str(row.get("buySell") or row.get("transactionType") or "UNKNOWN").upper(),
                    "quantity": qty,
                    "trade_price": round(price, 2),
                    "value_in_cr": value_cr,
                    "data_status": "SOURCED_EXCHANGE",
                    "source": "NSE India",
                    "source_url": f"{NSE_BASE}/market-data/bulk-deals",
                })
            record_observation("nse", "bulk-deals", symbol, f"{NSE_BASE}/api/bulk-deals", deals)
            return deals
        except Exception:
            return []

    @ttl_cache(ttl_seconds=900)
    def get_block_deals(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return NSE block deals, optionally filtered by symbol."""
        try:
            payload = self._fetch_json("/api/block-deal")
            rows = payload if isinstance(payload, list) else payload.get("data", [])
            deals: List[Dict[str, Any]] = []
            for row in rows:
                sym = str(row.get("symbol") or row.get("secSymbol") or "").upper()
                if symbol and sym != self._normalize_symbol(symbol):
                    continue
                qty = int(float(row.get("quantity") or row.get("qty") or 0))
                price = float(row.get("tradePrice") or row.get("avgPrice") or 0)
                value_cr = round((qty * price) / 1e7, 2) if qty and price else 0.0
                deals.append({
                    "symbol": sym,
                    "company_name": row.get("secName") or row.get("symbol") or sym,
                    "deal_type": "BLOCK",
                    "trade_date": str(row.get("date") or row.get("tradeDate") or "")[:10],
                    "client_name": row.get("clientName") or row.get("buyerName") or row.get("client") or "Undisclosed",
                    "deal_side": str(row.get("buySell") or row.get("transactionType") or "UNKNOWN").upper(),
                    "quantity": qty,
                    "trade_price": round(price, 2),
                    "value_in_cr": value_cr,
                    "data_status": "SOURCED_EXCHANGE",
                    "source": "NSE India",
                    "source_url": f"{NSE_BASE}/market-data/block-deals",
                })
            record_observation("nse", "block-deals", symbol, f"{NSE_BASE}/api/block-deal", deals)
            return deals
        except Exception:
            return []

    @ttl_cache(ttl_seconds=900)
    def get_insider_trades(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return SEBI PIT insider disclosures published by NSE."""
        norm = self._normalize_symbol(symbol) if symbol else None
        try:
            path = "/api/corporates-pit?index=equities"
            if norm:
                path = f"/api/corporates-pit?index=equities&symbol={norm}"
            payload = self._fetch_json(path)
            rows = payload if isinstance(payload, list) else payload.get("data", [])
            trades: List[Dict[str, Any]] = []
            for row in rows:
                sym = str(row.get("symbol") or row.get("secSymbol") or "").upper()
                if norm and sym != norm:
                    continue
                qty = int(float(row.get("secAcq") or row.get("quantity") or row.get("acqShares") or 0))
                value = float(row.get("secVal") or row.get("value") or row.get("acqValue") or 0)
                trades.append({
                    "symbol": sym,
                    "insider_name": row.get("acqName") or row.get("personName") or row.get("acquirerName") or "Undisclosed",
                    "designation": row.get("personCategory") or row.get("designation") or "Insider",
                    "regulation": row.get("regulation") or "SEBI PIT Regulations",
                    "transaction_type": row.get("acqMode") or row.get("transactionType") or "DISCLOSED",
                    "quantity": qty,
                    "value_in_lakhs": round(value / 1e5, 2) if value else 0.0,
                    "filing_date": str(row.get("date") or row.get("acqfromDt") or row.get("disclosureDate") or "")[:10],
                    "data_status": "SOURCED_EXCHANGE",
                    "source": "NSE India PIT Disclosures",
                    "source_url": f"{NSE_BASE}/companies-listing/corporates-pit",
                })
            record_observation("nse", "insider-trades", norm, f"{NSE_BASE}{path}", trades)
            return trades
        except Exception:
            return []

    def get_bulk_block_deals(self, symbol: Optional[str] = None) -> List[Dict[str, Any]]:
        """Combined bulk and block deals from NSE."""
        return self.get_bulk_deals(symbol) + self.get_block_deals(symbol)


nse_provider = NSEProvider()
