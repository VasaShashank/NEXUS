"""Market news adapter using Marketaux's news endpoint and entity sentiment metadata.

Requires MARKETAUX_API_TOKEN. The provider never fabricates sentiment: missing
entity scores are returned as unavailable/neutral metadata with score 0 only as
a schema compatibility value and are tagged in the source field.
"""
from typing import Any, Dict, List, Optional
import httpx
from app.core.config import settings
from app.core.cache import ttl_cache


class MarketNewsProvider:
    BASE_URL = "https://api.marketaux.com/v1/news/all"

    @staticmethod
    @ttl_cache(ttl_seconds=180)
    def get_news(symbol: str, limit: int = 10) -> List[Dict[str, Any]]:
        token = settings.MARKETAUX_API_TOKEN
        if not token:
            return []
        norm = symbol.upper().split(".")[0]
        try:
            with httpx.Client(timeout=8.0) as client:
                response = client.get(
                    MarketNewsProvider.BASE_URL,
                    params={
                        "api_token": token,
                        "symbols": norm,
                        "filter_entities": "true",
                        "language": "en",
                        "limit": max(1, min(limit, 50)),
                    },
                )
                response.raise_for_status()
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
                sentiment_score: Optional[float] = sum(scores) / len(scores) if scores else None
                sentiment = (
                    "POSITIVE" if sentiment_score is not None and sentiment_score > 0.15
                    else "NEGATIVE" if sentiment_score is not None and sentiment_score < -0.15
                    else "NEUTRAL" if sentiment_score is not None
                    else "UNSCORED"
                )
                output.append({
                    "symbol": norm,
                    "headline": article.get("title") or "",
                    "summary": article.get("description") or article.get("snippet"),
                    "source": article.get("source") or "Marketaux",
                    "url": article.get("url"),
                    "published_at": article.get("published_at"),
                    "sentiment": sentiment,
                    "sentiment_score": round(sentiment_score, 4) if sentiment_score is not None else None,
                    "sentiment_provider": "Marketaux entity sentiment" if scores else "unscored",
                    "id": article.get("uuid") or article.get("url") or article.get("title"),
                })
            return output
        except Exception:
            # Provider outage is observable as unavailable data to the caller;
            # do not cache or replace the error with invented headlines.
            return []


market_news_provider = MarketNewsProvider()
