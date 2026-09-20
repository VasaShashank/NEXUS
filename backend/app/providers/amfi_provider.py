"""
AMFI Indian Mutual Funds Provider.
Integrates `mftool` and official AMFI feeds with cached fallback to provide:
1. Live Mutual Fund NAVs updated daily per AMFI regulatory releases.
2. Scheme search across all 44+ Indian Asset Management Companies.
3. Historical NAV series for performance and returns visualization.
4. Seamless look-through mapping with curated institutional holdings.
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import httpx
from app.database.session import SessionLocal
from app.models.mutual_fund import MutualFundNavObservation, MutualFundScheme
from app.core.cache import ttl_cache
from app.providers.multi_asset_data import MUTUAL_FUNDS_DATA

# Scheme code mapping for premier curated Indian mutual funds
CURATED_SCHEME_MAP = {
    "PPFC-FLEXI": "122639",       # Parag Parikh Flexi Cap Fund - Direct Growth
    "HDFC-TOP100": "118989",      # HDFC Top 100 Fund - Direct Growth
    "SBI-BLUECHIP": "119598",     # SBI Bluechip Fund - Direct Growth
    "NIPPON-SMALLCAP": "120503",  # Nippon India Small Cap / Axis Tax Saver
}


class AMFIMutualFundProvider:
    def __init__(self):
        self._mftool = None
        self._init_mftool()

    def _init_mftool(self):
        try:
            from mftool import Mftool
            self._mftool = Mftool()
        except Exception:
            self._mftool = None

    @ttl_cache(ttl_seconds=86400)
    def get_scheme_master(self, search_query: Optional[str] = None, limit: int = 250) -> List[Dict[str, Any]]:
        """Return and persist the free AMFI scheme code master from mftool."""
        schemes: Dict[str, str] = {}
        if self._mftool:
            try:
                schemes = self._mftool.get_scheme_codes() or {}
            except Exception:
                schemes = {}

        if schemes:
            now = datetime.now(timezone.utc)
            db = SessionLocal()
            try:
                for code, name in schemes.items():
                    if not str(code).strip() or str(code).lower() == "scheme code":
                        continue
                    db.merge(MutualFundScheme(
                        scheme_code=str(code).strip(),
                        scheme_name=str(name).strip(),
                        source="AMFI via mftool",
                        retrieved_at=now,
                    ))
                db.commit()
            finally:
                db.close()

        db = SessionLocal()
        try:
            query = db.query(MutualFundScheme)
            if search_query:
                query = query.filter(MutualFundScheme.scheme_name.ilike(f"%{search_query.strip()}%"))
            rows = query.order_by(MutualFundScheme.scheme_name.asc()).limit(limit).all()
            return [{
                "scheme_code": row.scheme_code,
                "scheme_name": row.scheme_name,
                "source": row.source,
                "retrieved_at": row.retrieved_at.isoformat() if row.retrieved_at else None,
            } for row in rows]
        finally:
            db.close()

    @ttl_cache(ttl_seconds=3600)
    def get_latest_nav(self, scheme_code: str) -> Optional[float]:
        """
        Fetch latest live NAV from AMFI via mftool or mfapi.in fallback.
        """
        code = str(scheme_code).strip()
        # 1. Try mftool
        if self._mftool:
            try:
                quote = self._mftool.get_scheme_quote(code)
                if quote and "nav" in quote:
                    try:
                        return float(quote["nav"])
                    except (ValueError, TypeError):
                        pass
            except Exception:
                pass

        # 2. Try official mfapi.in REST endpoint
        try:
            with httpx.Client(timeout=4.0) as client:
                resp = client.get(f"https://api.mfapi.in/mf/{code}")
                if resp.status_code == 200:
                    data = resp.json()
                    nav_list = data.get("data", [])
                    if nav_list and "nav" in nav_list[0]:
                        return float(nav_list[0]["nav"])
        except Exception:
            pass

        return None

    @ttl_cache(ttl_seconds=3600)
    def get_nav_history(self, scheme_code: str, limit: int = 180) -> List[Dict[str, Any]]:
        """
        Retrieve historical NAV candles formatted for charting.
        """
        code = str(scheme_code).strip()
        raw_history = []
        source = "AMFI via mftool"
        if self._mftool:
            try:
                raw_history = self._mftool.get_scheme_historical_nav(code) or []
            except Exception:
                raw_history = []
        try:
            if not raw_history:
                source = "AMFI via mfapi.in"
                with httpx.Client(timeout=5.0) as client:
                    resp = client.get(f"https://api.mfapi.in/mf/{code}")
                    if resp.status_code == 200:
                        raw_history = resp.json().get("data", [])

            formatted = []
            observations = []
            for item in raw_history[:limit]:
                d_str = item.get("date", "")
                try:
                    nav_date = datetime.strptime(d_str, "%d-%m-%Y").date()
                    nav = float(item["nav"])
                    formatted.append({"time": nav_date.isoformat(), "nav": nav})
                    observations.append(MutualFundNavObservation(
                        scheme_code=code,
                        nav_date=nav_date,
                        nav=nav,
                        source=source,
                    ))
                except (ValueError, TypeError, KeyError):
                    continue
            if observations:
                db = SessionLocal()
                try:
                    for observation in observations:
                        existing = db.query(MutualFundNavObservation).filter(
                            MutualFundNavObservation.scheme_code == code,
                            MutualFundNavObservation.nav_date == observation.nav_date,
                        ).first()
                        if existing:
                            existing.nav = observation.nav
                            existing.source = observation.source
                            existing.retrieved_at = observation.retrieved_at
                        else:
                            db.add(observation)
                    db.commit()
                finally:
                    db.close()
            return list(reversed(formatted))
        except Exception:
            pass
        return []

    @ttl_cache(ttl_seconds=3600)
    def get_nav_analytics(self, scheme_code: str) -> Dict[str, Any]:
        """Calculate descriptive rolling returns from sourced AMFI NAV observations."""
        history = self.get_nav_history(scheme_code, limit=2000)
        if not history:
            return {"scheme_code": str(scheme_code), "rolling_returns": {}, "data_available": False}
        latest = history[-1]
        latest_date = datetime.strptime(latest["time"], "%Y-%m-%d")
        rolling_returns = {}
        for years in (1, 3, 5):
            target_date = latest_date.replace(year=latest_date.year - years)
            prior = min(history, key=lambda item: abs(datetime.strptime(item["time"], "%Y-%m-%d") - target_date))
            elapsed_days = (latest_date - datetime.strptime(prior["time"], "%Y-%m-%d")).days
            if elapsed_days >= int(years * 300) and prior["nav"] > 0:
                rolling_returns[f"{years}y"] = round(((latest["nav"] / prior["nav"]) ** (365.25 / elapsed_days) - 1) * 100, 2)
            else:
                rolling_returns[f"{years}y"] = None
        return {
            "scheme_code": str(scheme_code),
            "latest_nav": latest["nav"],
            "as_of": latest["time"],
            "rolling_returns": rolling_returns,
            "observations": len(history),
            "source": "AMFI via mftool/mfapi.in",
            "methodology": "Annualized returns use the nearest available NAV observation to each requested anniversary.",
            "disclaimer": "Historical NAV returns are descriptive and do not predict future performance.",
        }

    @ttl_cache(ttl_seconds=1800)
    def get_all_funds(self, search_query: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Returns mutual funds catalog enriched with live AMFI NAVs.
        If search_query is provided, filters or discovers matching schemes.
        Return figures come only from live NAV history; curated catalog metrics
        are never presented as live values.
        """
        enriched_funds = []
        for fund in MUTUAL_FUNDS_DATA:
            fund_copy = dict(fund)

            # Remove curated numeric claims; they are only repopulated from live sources below.
            for field in ("nav", "cagr_1y", "cagr_3y", "cagr_5y", "aum_crores", "expense_ratio", "turnover_ratio"):
                fund_copy.pop(field, None)
            fund_copy["aum_crores"] = None
            fund_copy["expense_ratio"] = None
            fund_copy["top_holdings"] = []

            fund_copy["data_source"] = "AMFI scheme master / AMC scheme information"
            fund_copy["source_url"] = "https://www.amfiindia.com/"
            scheme_code = CURATED_SCHEME_MAP.get(fund["id"])
            if scheme_code:
                fund_copy["scheme_code"] = scheme_code
                live_nav = self.get_latest_nav(scheme_code)
                if live_nav:
                    fund_copy["nav"] = round(live_nav, 2)

                analytics = self.get_nav_analytics(scheme_code)
                if analytics.get("data_available"):
                    returns = analytics.get("rolling_returns", {})
                    fund_copy["cagr_1y"] = returns.get("1y")
                    fund_copy["cagr_3y"] = returns.get("3y")
                    fund_copy["cagr_5y"] = returns.get("5y")

            enriched_funds.append(fund_copy)

        if not search_query:
            return enriched_funds

        q_lower = search_query.lower().strip()
        # Filter curated funds first
        matches = [
            f for f in enriched_funds
            if q_lower in f["scheme_name"].lower()
            or q_lower in f["amc"].lower()
            or q_lower in f["category"].lower()
            or q_lower in f["id"].lower()
        ]

        if matches:
            return matches

        # If user searches for an arbitrary Indian mutual fund, dynamically search via mfapi
        try:
            with httpx.Client(timeout=4.0) as client:
                resp = client.get(f"https://api.mfapi.in/mf/search?q={search_query}")
                if resp.status_code == 200:
                    found_schemes = resp.json()[:10]
                    dynamic_results = []
                    for s in found_schemes:
                        s_code = str(s.get("schemeCode"))
                        s_name = s.get("schemeName")
                        nav = self.get_latest_nav(s_code)
                        dynamic_results.append({
                            "id": f"AMFI-{s_code}",
                            "scheme_code": s_code,
                            "scheme_name": s_name,
                            "amc": s_name.split()[0] + " Mutual Fund" if s_name else "Indian AMC",
                            "category": "Direct Equity / Hybrid Scheme",
                            "nav": round(nav, 2) if nav is not None else None,
                            "data_source": "AMFI scheme search via mfapi.in",
                            "source_url": f"https://api.mfapi.in/mf/{s_code}",
                        })
                    if dynamic_results:
                        return dynamic_results
        except Exception:
            pass

        return enriched_funds


amfi_provider = AMFIMutualFundProvider()
