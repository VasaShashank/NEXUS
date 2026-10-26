"""
Automated Test Suite for NEXUS 2.0 Document Intelligence, Canonical Facts,
Forensics Engine, Management Guidance Drift, and Transparent DCF Valuation.
"""
import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.session import Base, get_db
from app.services.document_ingestion_service import document_ingestion_service
from app.services.forensic_service import forensic_rule_engine
from app.services.guidance_service import guidance_service
from app.services.valuation_service import valuation_service
from app.schemas.document_intelligence import DCFAssumptionInput

# Isolated in-memory SQLite database
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
    # Seed filings and canonical financial facts
    document_ingestion_service.seed_authoritative_filings(db)
    db.close()


def test_seed_and_list_filings():
    """Verify document filings are ingested with SHA-256 hashes and page counts."""
    resp = client.get("/api/v1/intelligence/filings/RELIANCE")
    assert resp.status_code == 200
    filings = resp.json()
    assert len(filings) >= 1
    rel = filings[0]
    assert rel["symbol"] == "RELIANCE"
    assert rel["doc_type"] == "ANNUAL_REPORT"
    assert rel["fiscal_year"] == "FY24"
    assert rel["page_count"] > 0
    assert rel["file_hash"] is not None


def test_extracted_tables_hierarchy_and_periods():
    """Verify tables preserve multi-period headers, row hierarchy, and units."""
    resp = client.get("/api/v1/intelligence/tables/RELIANCE?statement_type=INCOME_STATEMENT")
    assert resp.status_code == 200
    tables = resp.json()
    assert len(tables) >= 1
    tbl = tables[0]
    assert tbl["statement_type"] == "INCOME_STATEMENT"
    assert tbl["consolidation_scope"] == "CONSOLIDATED"
    assert "FY24" in tbl["headers"]
    assert "FY23" in tbl["headers"]

    # Check row labels
    labels = [r["label"] for r in tbl["rows"]]
    assert any("Revenue from Operations" in l for l in labels)
    assert any("Profit for the Year" in l or "PAT" in l for l in labels)


def test_canonical_financial_facts_normalization():
    """Verify canonical facts are stored with standardized metric IDs, periods, and units."""
    resp = client.get("/api/v1/intelligence/facts/RELIANCE")
    assert resp.status_code == 200
    facts = resp.json()
    assert len(facts) >= 5

    metrics = {f["metric_id"]: f["value"] for f in facts if f["fiscal_year"] == "FY24"}
    assert "REVENUE" in metrics
    assert metrics["REVENUE"] == 901064.0
    assert "PAT" in metrics
    assert metrics["PAT"] == 79020.0

    # Verify derived metrics: Free Cash Flow = CFO - Capex
    assert "FREE_CASH_FLOW" in metrics
    # CFO: 155288, Capex: 131769 -> FCF: 23519
    assert metrics["FREE_CASH_FLOW"] == 23519.0


def test_forensic_rule_engine_evaluation():
    """Verify deterministic accounting forensics generates explainable findings with citations."""
    resp = client.get("/api/v1/intelligence/forensics/RELIANCE")
    assert resp.status_code == 200
    findings = resp.json()
    assert len(findings) >= 1

    rule_ids = [f["rule_id"] for f in findings]
    # Check that CFO/PAT evaluation ran
    assert "RULE_CFO_PAT_DIVERGENCE" in rule_ids

    cfo_finding = next(f for f in findings if f["rule_id"] == "RULE_CFO_PAT_DIVERGENCE")
    assert cfo_finding["severity"] in ["INFORMATIONAL", "MEDIUM", "HIGH"]
    assert len(cfo_finding["benign_explanations"]) >= 1
    assert len(cfo_finding["recommended_checks"]) >= 1


def test_management_guidance_and_drift_detection():
    """Verify guidance statements are tracked and longitudinal drift is detected."""
    # List statements
    resp = client.get("/api/v1/intelligence/guidance/RELIANCE")
    assert resp.status_code == 200
    statements = resp.json()
    assert len(statements) >= 2
    assert any(s["statement_category"] == "CAPEX_PLAN" for s in statements)

    # Detect drift
    drift_resp = client.get("/api/v1/intelligence/guidance-drift/RELIANCE")
    assert drift_resp.status_code == 200
    drift_items = drift_resp.json()
    assert len(drift_items) >= 1
    capex_drift = next(d for d in drift_items if d["category"] == "CAPEX_PLAN")
    assert capex_drift["drift_type"] in ["CAPEX_NORMALIZED", "TARGET_REDUCED", "UNCHANGED"]
    assert "Target revised downward" in capex_drift["explanation"] or "1,20,000" in capex_drift["explanation"]


def test_corporate_disclosures_timeline():
    """Verify corporate disclosure events timeline."""
    resp = client.get("/api/v1/intelligence/disclosures/RELIANCE")
    assert resp.status_code == 200
    events = resp.json()
    assert len(events) >= 1
    assert any(e["event_type"] == "PROMOTER_PLEDGE" for e in events)


def test_deterministic_dcf_and_reverse_valuation():
    """Verify DCF calculations, 5x5 sensitivity matrix, and reverse-valuation root finding."""
    payload = {
        "symbol": "RELIANCE",
        "revenue_growth_y1_5": 10.0,
        "terminal_growth_rate": 4.5,
        "operating_margin": 18.0,
        "effective_tax_rate": 25.0,
        "reinvestment_rate": 20.0,
        "wacc": 11.5
    }
    resp = client.post("/api/v1/intelligence/valuation/dcf", json=payload)
    assert resp.status_code == 200
    dcf = resp.json()
    assert dcf["symbol"] == "RELIANCE"
    assert dcf["intrinsic_value_per_share"] > 0
    assert len(dcf["projected_fcf"]) == 5
    assert len(dcf["sensitivity_matrix"]) == 25  # 5x5 matrix
    assert "implied_5yr_revenue_cagr_pct" in dcf["reverse_valuation"]


def test_hybrid_search_structured_facts():
    """Verify hybrid search returns verified structured numerical facts for user query."""
    resp = client.post("/api/v1/intelligence/search", json={"query": "What is Reliance revenue and PAT?", "symbol": "RELIANCE"})
    assert resp.status_code == 200
    data = resp.json()
    assert "structured_facts" in data
    assert len(data["structured_facts"]) >= 1


def test_report_generation_markdown():
    """Verify report generation compiles an evidence-grounded markdown dossier."""
    resp = client.get("/api/v1/intelligence/report/RELIANCE/markdown")
    assert resp.status_code == 200
    md = resp.text
    assert "# INSTITUTIONAL FINANCIAL INTELLIGENCE DOSSIER: RELIANCE" in md
    assert "## 1. Executive Summary & Filing Provenance" in md
    assert "## 3. Financial Statement Forensics & Earnings Quality" in md
    assert "## 4. Longitudinal Management Guidance & Commentary Drift" in md
    assert "## 6. Transparent Valuation & Scenario Sensitivity" in md
