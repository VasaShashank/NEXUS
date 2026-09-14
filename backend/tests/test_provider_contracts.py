"""Provider contract checks for zero-fabrication and provenance boundaries."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.database.session import engine, get_db
from app.main import app
from app.models.user import User
from app.core.security import get_password_hash
from app.providers.amfi_provider import amfi_provider
from app.providers.market_data import market_data_provider
from app.providers.rbi_provider import rbi_provider
from app.services.market_service import MarketService
from app.services.provenance_service import stale_report
from app.services.reference_data_service import ReferenceDataService


Base.metadata.create_all(bind=engine)

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
Base.metadata.create_all(bind=test_engine)
client = TestClient(app)


def _seed_user():
    db = TestingSessionLocal()
    if not db.query(User).filter(User.email == "demo@nexusfin.ai").first():
        db.add(User(
            email="demo@nexusfin.ai",
            hashed_password=get_password_hash("NexusDemo123!"),
            full_name="Institutional Trader",
            virtual_balance=1000000.0,
            is_active=True,
        ))
        db.commit()
    db.close()


def test_market_quote_contract():
    quote = market_data_provider.get_quote("RELIANCE")
    assert quote is not None
    assert quote.symbol == "RELIANCE"
    assert quote.current_price > 0
    assert quote.data_source
    assert quote.data_status
    assert quote.source_url


def test_market_history_contract():
    history = market_data_provider.get_historical_candles("RELIANCE", "1M")
    assert isinstance(history, list)
    for candle in history:
        assert candle.close > 0
        assert candle.time


def test_amfi_contract():
    funds = amfi_provider.get_all_funds()
    assert funds
    assert all(fund.get("scheme_name") and fund.get("source_url") for fund in funds)
    catalog = amfi_provider.get_scheme_master(limit=1)
    assert isinstance(catalog, list)
    if catalog:
        assert catalog[0]["scheme_code"]
        assert catalog[0]["retrieved_at"]


def test_sourced_events_contract():
    events = MarketService.get_sourced_events("RELIANCE")
    assert isinstance(events, list)
    for event in events:
        assert event["event_type"]
        assert event["source"]
        assert "uncertainty" in event


def test_stale_report_contract():
    report = stale_report(max_age_minutes=0)
    assert "observations" in report
    assert "stale_count" in report
    assert isinstance(report["observations"], list)


def test_fundamentals_provenance():
    fundamentals = MarketService.get_fundamentals("RELIANCE")
    if fundamentals:
        assert fundamentals.data_status
        assert fundamentals.source_url


def test_commodities_provenance():
    response = client.get("/api/v1/assets/commodities-fx")
    assert response.status_code == 200
    for item in response.json():
        assert item["data_status"] in {"LIVE_PROVIDER_QUOTE", "DATA_UNAVAILABLE"}
        assert "source_url" in item


def test_macro_provenance():
    indicators = rbi_provider.get_macro_indicators()
    for item in indicators:
        assert item["data_status"] in {"SOURCED_OFFICIAL", "SOURCED_MARKET", "DATA_UNAVAILABLE"}
        assert item["source_url"]


def test_bonds_provenance():
    bonds = rbi_provider.get_gsec_bonds()
    for bond in bonds:
        assert bond["data_status"]
        assert bond["source_url"]
        assert bond["bond_type"] == "SOVEREIGN"


def test_reference_data_isolated():
    fixtures = ReferenceDataService.get_dataset("bulk-block-deals")
    assert fixtures
    assert all(item["data_status"] == "REFERENCE_FIXTURE" for item in fixtures)


def test_user_facing_bulk_deals_not_fixtures():
    deals = MarketService.get_bulk_block_deals("RELIANCE")
    for deal in deals:
        assert deal.deal_type in {"BULK", "BLOCK"}


def test_scheduled_staleness_endpoint():
    response = client.get("/health/data-staleness/scheduled")
    assert response.status_code == 200
    payload = response.json()
    assert "observations" in payload


def test_broker_health_contract():
    response = client.get("/api/v1/brokers/health")
    assert response.status_code == 200
    for adapter in response.json():
        assert adapter["read_only"] is True
        assert adapter["live_execution_enabled"] is False
        assert "credentials_configured" in adapter


def test_portfolio_analytics_observation_gate():
    _seed_user()
    login = client.post("/api/v1/auth/login", json={"email": "demo@nexusfin.ai", "password": "NexusDemo123!"})
    token = login.json()["access_token"]
    response = client.get("/api/v1/portfolio/analytics", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    payload = response.json()
    assert "observation_count" in payload
    assert "long_history_metrics_ready" in payload
