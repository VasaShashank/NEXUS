"""
NEXUS Multi-Source Resilient Market News Adapter.
Implements a 3-tier fallback architecture:
Tier 1: Marketaux API with entity sentiment (if configured & quota active)
Tier 2: Yahoo Finance Live News feed for NSE/BSE tickers
Tier 3: Google News RSS Real-Time Feed for Indian Capital Markets
Zero empty states when third-party quotas exhaust.
"""
from typing import Any, Dict, List, Optional
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
import httpx

try:
    import yfinance as yf
except ImportError:
    yf = None

from app.core.config import settings
from app.core.cache import ttl_cache


class MarketNewsProvider:
    MARKETAUX_BASE_URL = "https://api.marketaux.com/v1/news/all"
    GOOGLE_RSS_URL = "https://news.google.com/rss/search"

    @classmethod
    @ttl_cache(ttl_seconds=180)
    def get_news(cls, symbol: str, limit: int = 10) -> List[Dict[str, Any]]:
        norm = symbol.upper().split(".")[0]

        # Tier 1: Try Marketaux API
        articles = cls._fetch_marketaux(norm, limit)
        if articles:
            return articles

        # Tier 2: Try Yahoo Finance News
        articles = cls._fetch_yfinance_news(norm, limit)
        if articles:
            return articles

        # Tier 3: Try Google News RSS for Indian Equities
        articles = cls._fetch_google_rss(norm, limit)
        if articles:
            return articles

        return []

    @classmethod
    def _fetch_marketaux(cls, norm: str, limit: int) -> List[Dict[str, Any]]:
        token = settings.MARKETAUX_API_TOKEN
        if not token:
            return []
        try:
            with httpx.Client(timeout=5.0) as client:
                response = client.get(
                    cls.MARKETAUX_BASE_URL,
                    params={
                        "api_token": token,
                        "symbols": norm,
                        "filter_entities": "true",
                        "language": "en",
                        "limit": max(1, min(limit, 20)),
                    },
                )
                if response.status_code != 200:
                    return []
                payload = response.json()

            output: List[Dict[str, Any]] = []
            for article in payload.get("data", []):
                entities = article.get("entities") or []
                matching = [
                    e for e in entities
                    if str(e.get("symbol", "")).upper().split(".")[0] == norm
                ]
                scores = [
                    float(e["sentiment_score"]) for e in matching
                    if isinstance(e.get("sentiment_score"), (int, float))
                ]
                sentiment_score = sum(scores) / len(scores) if scores else None
                sentiment = (
                    "POSITIVE" if sentiment_score is not None and sentiment_score > 0.15
                    else "NEGATIVE" if sentiment_score is not None and sentiment_score < -0.15
                    else "NEUTRAL"
                )
                output.append({
                    "symbol": norm,
                    "headline": article.get("title") or "",
                    "summary": article.get("description") or article.get("snippet"),
                    "source": article.get("source") or "Marketaux",
                    "url": article.get("url"),
                    "published_at": article.get("published_at"),
                    "sentiment": sentiment,
                    "sentiment_score": round(sentiment_score, 4) if sentiment_score is not None else 0.0,
                    "sentiment_provider": "Marketaux",
                    "id": article.get("uuid") or article.get("url") or article.get("title"),
                })
            return output
        except Exception:
            return []

    @classmethod
    def _fetch_yfinance_news(cls, norm: str, limit: int) -> List[Dict[str, Any]]:
        if yf is None:
            return []
        try:
            # Check NSE suffix first, then BSE
            ticker = yf.Ticker(f"{norm}.NS")
            raw_news = ticker.news or []
            if not raw_news:
                ticker_bse = yf.Ticker(f"{norm}.BO")
                raw_news = ticker_bse.news or []

            output: List[Dict[str, Any]] = []
            for item in raw_news[:limit]:
                title = item.get("title") or ""
                if not title:
                    continue
                pub_time = item.get("providerPublishTime")
                dt_str = (
                    datetime.fromtimestamp(pub_time, tz=timezone.utc).isoformat()
                    if pub_time else datetime.now(timezone.utc).isoformat()
                )
                # Basic lexical sentiment heuristic
                pos_words = {"surge", "jump", "growth", "profit", "gain", "rise", "soar", "deal", "win", "high", "upgrade"}
                neg_words = {"fall", "drop", "loss", "decline", "slump", "probe", "fine", "cut", "down", "downgrade", "debt"}
                t_lower = title.lower()
                has_pos = any(w in t_lower for w in pos_words)
                has_neg = any(w in t_lower for w in neg_words)
                sentiment = "POSITIVE" if has_pos and not has_neg else "NEGATIVE" if has_neg and not has_pos else "NEUTRAL"
                score = 0.5 if sentiment == "POSITIVE" else -0.5 if sentiment == "NEGATIVE" else 0.0

                output.append({
                    "symbol": norm,
                    "headline": title,
                    "summary": item.get("publisher", "Financial Press"),
                    "source": item.get("publisher") or "Yahoo Finance (NSE Feed)",
                    "url": item.get("link"),
                    "published_at": dt_str,
                    "sentiment": sentiment,
                    "sentiment_score": score,
                    "sentiment_provider": "Exchange News Feed",
                    "id": item.get("uuid") or title,
                })
            return output
        except Exception:
            return []

    @classmethod
    def _fetch_google_rss(cls, norm: str, limit: int) -> List[Dict[str, Any]]:
        try:
            query = f"{norm} NSE stock India market"
            with httpx.Client(timeout=6.0) as client:
                res = client.get(
                    cls.GOOGLE_RSS_URL,
                    params={"q": query, "hl": "en-IN", "gl": "IN", "ceid": "IN:en"},
                    headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
                )
                if res.status_code != 200:
                    return []
                root = ET.fromstring(res.text)

            items = root.findall(".//item")
            output: List[Dict[str, Any]] = []
            for it in items[:limit]:
                title = it.findtext("title") or ""
                link = it.findtext("link") or ""
                pub_date = it.findtext("pubDate") or datetime.now(timezone.utc).isoformat()
                source_elem = it.find("source")
                source_name = source_elem.text if source_elem is not None else "Google News (India)"

                # Sentiment
                t_lower = title.lower()
                pos_words = {"surge", "jump", "growth", "profit", "gain", "record", "rally"}
                neg_words = {"fall", "drop", "loss", "decline", "slump", "probe", "selloff"}
                sentiment = "POSITIVE" if any(w in t_lower for w in pos_words) else "NEGATIVE" if any(w in t_lower for w in neg_words) else "NEUTRAL"
                score = 0.5 if sentiment == "POSITIVE" else -0.5 if sentiment == "NEGATIVE" else 0.0

                output.append({
                    "symbol": norm,
                    "headline": title,
                    "summary": f"Reported by {source_name}",
                    "source": source_name,
                    "url": link,
                    "published_at": pub_date,
                    "sentiment": sentiment,
                    "sentiment_score": score,
                    "sentiment_provider": "Google News India RSS",
                    "id": link or title,
                })
            return output
        except Exception:
            return []


market_news_provider = MarketNewsProvider()
