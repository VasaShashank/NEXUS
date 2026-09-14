"""
Automated Test Suite for NEXUS Financial Platform.
Covers Authentication, Market Data, Paper Trading, Technical Indicators, and AI Tools.
"""
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database.session import Base, get_db
from app.models.user import User
from app.core.security import get_password_hash
from app.services.technical_indicators import TechnicalIndicatorsService
from app.schemas.stock import HistoricalCandle
from app.agents.tools import get_stock_quote, get_fundamentals, get_technical_indicators

from sqlalchemy.pool import StaticPool

# In-memory test SQLite DB with StaticPool to retain tables across threads/requests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=engine)
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Seed default user
    demo_user = User(
        email="demo@nexusfin.ai",
        hashed_password=get_password_hash("NexusDemo123!"),
        full_name="Institutional Trader",
        virtual_balance=1000000.0,
        is_active=True
    )
    db.add(demo_user)
    db.commit()
    db.close()


def test_health_endpoints():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_finance_library_capabilities():
    response = client.get("/api/v1/stocks/capabilities")
    assert response.status_code == 200
    capabilities = {item["library"]: item for item in response.json()}
    assert capabilities["yfinance"]["installed"] is True
    assert capabilities["mftool"]["status"] == "active_optional"
    assert capabilities["statsmodels"]["status"] == "active"
    assert capabilities["vectorbt"]["status"] == "planned"


def test_natural_language_screener_parser():
    response = client.get("/api/v1/stocks/screener/parse?q=ROE above 20 and PE below 25 and debt below 0.5")
    assert response.status_code == 200
    filters = response.json()["filters"]
    assert filters["min_roe"] == 20.0
    assert filters["max_pe"] == 25.0
    assert filters["max_debt_equity"] == 0.5


def test_screener_price_distance_and_volume_filters():
    response = client.post("/api/v1/stocks/screener", json={"max_distance_from_52w_high": 0, "min_volume": 1})
    assert response.status_code == 200
    for row in response.json():
        assert row["distance_from_52w_high_pct"] <= 0
        assert row["volume"] >= 1


def test_explainable_stock_score():
    response = client.get("/api/v1/stocks/TCS/score")
    assert response.status_code == 200
    data = response.json()
    assert 0 <= data["overall_score"] <= 100
    assert set(data["categories"]) == {"financial_quality", "growth", "valuation", "momentum"}
    assert "missing values are excluded" in data["methodology"]


def test_market_overview():
    response = client.get("/api/v1/market/overview")
    assert response.status_code == 200
    data = response.json()
    assert "indices" in data
    assert len(data["indices"]) >= 3
    assert "market_breadth" in data
    assert "sector_performance" in data


def test_stock_quote_and_technicals():
    response = client.get("/api/v1/stocks/RELIANCE/quote")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "RELIANCE"
    assert data["current_price"] > 0

    # Test technical indicators endpoint
    tech_resp = client.get("/api/v1/stocks/RELIANCE/technicals")
    assert tech_resp.status_code == 200
    tech = tech_resp.json()
    assert "support_resistance" in tech
    assert "classic" in tech["support_resistance"]
    assert "fibonacci" in tech["support_resistance"]
    assert "macd" in tech
    assert "bollinger_bands" in tech
    assert "rsi_14" in tech
    assert tech["overall_signal"] in ["STRONG_BUY", "BUY", "NEUTRAL", "SELL", "STRONG_SELL"]


def test_paper_trading_order_execution():
    # Buy 10 shares of RELIANCE
    order_payload = {
        "symbol": "RELIANCE",
        "side": "BUY",
        "order_type": "MARKET",
        "quantity": 10
    }
    buy_resp = client.post("/api/v1/portfolio/order", json=order_payload)
    assert buy_resp.status_code == 200
    buy_data = buy_resp.json()
    assert buy_data["quantity"] == 10
    assert buy_data["side"] == "BUY"

    # Check portfolio summary
    summary_resp = client.get("/api/v1/portfolio/summary")
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["holdings_count"] == 1
    assert summary["cash_balance"] < 1000000.0  # Cash deducted
    assert summary["holdings"][0]["symbol"] == "RELIANCE"

    # Partial Sell 5 shares
    sell_payload = {
        "symbol": "RELIANCE",
        "side": "SELL",
        "order_type": "MARKET",
        "quantity": 5
    }
    sell_resp = client.post("/api/v1/portfolio/order", json=sell_payload)
    assert sell_resp.status_code == 200

    # Verify remaining holding
    summary2 = client.get("/api/v1/portfolio/summary").json()
    assert summary2["holdings"][0]["quantity"] == 5


def test_paper_order_type_validation():
    quote = client.get("/api/v1/stocks/RELIANCE/quote").json()
    current_price = quote["current_price"]
    response = client.post("/api/v1/portfolio/order", json={
        "symbol": "RELIANCE",
        "side": "BUY",
        "order_type": "LIMIT",
        "limit_price": current_price * 0.5,
        "quantity": 1,
    })
    assert response.status_code == 400
    assert "LIMIT order not executed" in response.json()["detail"]


def test_ai_tools_and_agent():
    # Test controlled tools
    quote = get_stock_quote("TCS")
    assert "current_price" in quote
    assert quote["symbol"] == "TCS"

    fund = get_fundamentals("TCS")
    assert "pe_ratio" in fund
    assert fund["roe"] > 0

    ind = get_technical_indicators("TCS")
    assert "rsi_14" in ind
    assert "macd" in ind

    # Test AI Research endpoint
    ai_resp = client.post("/api/v1/ai/research", json={"query": "Analyze TCS valuation and risks", "symbol": "TCS"})
    assert ai_resp.status_code == 200
    ai_data = ai_resp.json()
    assert ai_data["agent_type"] == "RESEARCH"
    assert len(ai_data["tool_calls"]) >= 2
    assert len(ai_data["evidence_citations"]) >= 1
    assert len(ai_data["bull_case"]) > 0


def test_why_did_it_move():
    response = client.get("/api/v1/ai/why-moved/RELIANCE")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "RELIANCE"
    assert "observed_factors" in data
    assert len(data["observed_factors"]) >= 1
    assert data["confidence_rating"] in ["HIGH", "MEDIUM", "LOW"]


def test_hindunilvr_quote_and_fundamentals():
    """HINDUNILVR must resolve — this was previously broken with only 10 stocks."""
    resp = client.get("/api/v1/stocks/HINDUNILVR/quote")
    assert resp.status_code == 200
    data = resp.json()
    assert data["symbol"] == "HINDUNILVR"
    assert data["current_price"] > 0
    assert "Hindustan Unilever" in data["company_name"]

    fund_resp = client.get("/api/v1/stocks/HINDUNILVR/fundamentals")
    assert fund_resp.status_code == 200
    fund = fund_resp.json()
    assert fund["symbol"] == "HINDUNILVR"
    assert fund["pe_ratio"] is not None and fund["pe_ratio"] > 0
    assert fund["roe"] is not None


def test_stock_search_dynamic_universe():
    """Search must surface stocks beyond the 50-stock reference database."""
    # Test exact ticker lookup
    resp = client.get("/api/v1/stocks/search?q=HINDUNILVR")
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) > 0
    symbols = [r["symbol"] for r in results]
    assert "HINDUNILVR" in symbols

    # Test company name search
    resp2 = client.get("/api/v1/stocks/search?q=Tata")
    assert resp2.status_code == 200
    assert len(resp2.json()) > 0


def test_stock_compare_endpoint():
    """Compare endpoint must return quotes, fundamentals, and normalized performance for all symbols."""
    resp = client.get("/api/v1/stocks/compare?symbols=RELIANCE,TCS,INFY")
    assert resp.status_code == 200
    data = resp.json()
    assert "symbols" in data
    assert len(data["symbols"]) == 3
    assert "quotes" in data and len(data["quotes"]) >= 2
    assert "fundamentals" in data and len(data["fundamentals"]) >= 2
    assert "normalized_performance" in data


def test_multi_asset_endpoints():
    """Mutual funds, ETFs, bonds, commodities, and macro endpoints must all respond."""
    mf_resp = client.get("/api/v1/assets/mutual-funds")
    assert mf_resp.status_code == 200
    assert len(mf_resp.json()) > 0

    bond_resp = client.get("/api/v1/assets/bonds")
    assert bond_resp.status_code == 200
    bonds = bond_resp.json()
    assert len(bonds) > 0
    assert "coupon_rate" in bonds[0]

    comm_resp = client.get("/api/v1/assets/commodities")
    assert comm_resp.status_code == 200
    comms = comm_resp.json()
    assert any(c["symbol"] in ["GOLD", "SILVER", "CRUDE_OIL"] for c in comms)

    macro_resp = client.get("/api/v1/assets/macro")
    assert macro_resp.status_code == 200
    macro = macro_resp.json()
    assert len(macro) > 0
    assert any(m["indicator"] == "CPI_INFLATION" for m in macro)


def test_watchlist_crud():
    """Watchlist creation, stock addition, and deletion lifecycle."""
    # Create watchlist
    create_resp = client.post("/api/v1/watchlists/", json={"name": "Test Watchlist", "description": "Automated test"})
    assert create_resp.status_code == 200
    wl = create_resp.json()
    assert wl["name"] == "Test Watchlist"
    wl_id = wl["id"]

    # Add stock
    add_resp = client.post(f"/api/v1/watchlists/{wl_id}/stocks/RELIANCE")
    assert add_resp.status_code == 200

    # List watchlists
    list_resp = client.get("/api/v1/watchlists/")
    assert list_resp.status_code == 200
    watchlists = list_resp.json()
    assert any(w["id"] == wl_id for w in watchlists)

    # Delete watchlist
    del_resp = client.delete(f"/api/v1/watchlists/{wl_id}")
    assert del_resp.status_code == 200


def test_tax_summary_endpoint():
    """Tax summary must return STCG, LTCG, and total tax liability."""
    resp = client.get("/api/v1/tax/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "stcg_tax" in data
    assert "ltcg_tax" in data
    assert "total_tax_liability" in data
    # Tax rates: STCG 20%, LTCG 12.5% above ₹1.25L exemption
    assert data["stcg_rate_pct"] == 20.0
    assert data["ltcg_rate_pct"] == 12.5


def test_sma_backtest_endpoint():
    """SMA crossover backtest must return in-sample and out-of-sample results."""
    resp = client.post(
        "/api/v1/backtest/sma-crossover",
        json={"symbol": "RELIANCE", "fast_period": 20, "short_period": 20, "slow_period": 50}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "in_sample" in data
    assert "out_of_sample" in data
    in_s = data["in_sample"]
    if in_s is None:
        assert "error" in data
        assert data["out_of_sample"] is None
    else:
        assert "total_return_pct" in in_s
        assert "max_drawdown_pct" in in_s
        assert "sharpe_ratio" in in_s
        assert "num_trades" in in_s
