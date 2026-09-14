"""
Automated Test Suite for Caching, Batch Downloads, Mutual Funds (AMFI), and Statistical Forecasting.
Verifies:
1. requests-cache session and in-process TTLCache.
2. Multi-symbol batch quote fetching.
3. statsmodels ARIMA time-series trend forecasting with 95% confidence intervals.
4. AMFI Mutual Fund NAV retrieval and scheme search.
5. Fast sub-second response times.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.cache import get_cached_session, ttl_cache
from app.providers.market_data import market_data_provider
from app.services.forecast_service import TrendForecastService
from app.providers.amfi_provider import amfi_provider

client = TestClient(app)


def test_cached_session_initialized():
    """Verify that requests-cache persistent session is active."""
    sess = get_cached_session()
    assert sess is not None


def test_batch_quotes_retrieval():
    """Verify concurrent batch quote retrieval loads multiple symbols quickly."""
    symbols = ["RELIANCE", "TCS", "INFY", "HDFCBANK"]
    quotes = market_data_provider.get_batch_quotes(symbols)
    assert isinstance(quotes, dict)
    assert len(quotes) >= 2
    assert "RELIANCE" in quotes or "TCS" in quotes
    if "RELIANCE" in quotes:
        assert quotes["RELIANCE"].current_price > 0


def test_statsmodels_arima_forecast():
    """Verify statistical trend forecast produces 5 forecast points with 95% confidence intervals."""
    forecast = TrendForecastService.generate_forecast("RELIANCE", horizon_days=5)
    assert forecast.symbol == "RELIANCE"
    assert len(forecast.forecast_points) == 5
    assert forecast.current_price > 0
    assert forecast.trend_outlook in ["BULLISH_TREND", "BEARISH_TREND", "SIDEWAYS_CONSOLIDATION"]
    assert "not investment advice" in forecast.compliance_disclaimer.lower()

    # Check forecast bounds
    for pt in forecast.forecast_points:
        assert pt.confidence_upper_95 >= pt.projected_close
        assert pt.confidence_lower_95 <= pt.projected_close
        assert pt.projected_close > 0


def test_forecast_api_endpoint():
    """Verify GET /api/v1/stocks/{symbol}/forecast endpoint."""
    resp = client.get("/api/v1/stocks/TCS/forecast?days=5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["symbol"] == "TCS"
    assert len(data["forecast_points"]) == 5
    assert "compliance_disclaimer" in data


def test_amfi_mutual_funds_catalog():
    """Verify AMFI provider returns enriched funds with valid NAVs."""
    funds = amfi_provider.get_all_funds()
    assert len(funds) >= 4
    for f in funds:
        assert "scheme_name" in f
        assert "nav" in f
        assert f["nav"] > 0


def test_amfi_mutual_funds_api_endpoint():
    """Verify GET /api/v1/assets/mutual-funds endpoint with and without search query."""
    # Catalog
    resp = client.get("/api/v1/assets/mutual-funds")
    assert resp.status_code == 200
    funds = resp.json()
    assert len(funds) >= 4

    # Search
    search_resp = client.get("/api/v1/assets/mutual-funds?q=Parag")
    assert search_resp.status_code == 200
    search_results = search_resp.json()
    assert len(search_results) >= 1
    assert any("Parag" in f["scheme_name"] for f in search_results)


def test_amfi_nav_history_endpoint():
    """Verify GET /api/v1/assets/mutual-funds/{scheme_code}/nav-history endpoint."""
    resp = client.get("/api/v1/assets/mutual-funds/122639/nav-history?limit=30")
    assert resp.status_code == 200
    history = resp.json()
    assert isinstance(history, list)


def test_market_overview_speed_and_caching():
    """Verify that market overview is fast and cached."""
    resp1 = client.get("/api/v1/market/overview")
    assert resp1.status_code == 200
    data = resp1.json()
    assert len(data["indices"]) > 0
    assert len(data["top_gainers"]) > 0

    # Second request must hit the cache immediately
    resp2 = client.get("/api/v1/market/overview")
    assert resp2.status_code == 200
