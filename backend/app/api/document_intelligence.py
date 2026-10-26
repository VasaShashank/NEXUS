"""
FastAPI Router for NEXUS 2.0 Document Intelligence, Canonical Facts, Forensics, Guidance, and DCF Valuation.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.document_intelligence import (
    CanonicalFinancialFact,
    CorporateDisclosureEvent,
    DocumentFiling,
    ExtractedTable,
    ForensicFinding,
    ManagementGuidanceStatement,
)
from app.schemas.document_intelligence import (
    CanonicalFactResponse,
    CorporateDisclosureResponse,
    DCFAssumptionInput,
    DCFValuationResult,
    DocumentFilingResponse,
    ExtractedTableResponse,
    ForensicFindingResponse,
    GuidanceDriftComparison,
    GuidanceStatementResponse,
)
from app.services.document_ingestion_service import document_ingestion_service
from app.services.forensic_service import forensic_rule_engine
from app.services.guidance_service import guidance_service
from app.services.disclosure_service import disclosure_service
from app.services.valuation_service import valuation_service
from app.services.hybrid_retrieval_service import hybrid_retrieval_service
from app.services.report_generation_service import report_generation_service

router = APIRouter(prefix="/intelligence", tags=["Document Intelligence & Forensics"])


@router.post("/seed", summary="Seed authoritative Indian corporate filings and financial tables")
def seed_filings(db: Session = Depends(get_db)):
    count = document_ingestion_service.seed_authoritative_filings(db)
    return {"status": "SUCCESS", "seeded_filings_count": count}


@router.get("/filings/{symbol}", response_model=List[DocumentFilingResponse], summary="List ingested corporate filings for a symbol")
def get_filings(symbol: str, db: Session = Depends(get_db)):
    norm = symbol.upper().split(".")[0]
    filings = db.query(DocumentFiling).filter(DocumentFiling.symbol == norm).order_by(DocumentFiling.filing_date.desc()).all()
    if not filings:
        # Auto-seed if database is fresh
        document_ingestion_service.seed_authoritative_filings(db)
        filings = db.query(DocumentFiling).filter(DocumentFiling.symbol == norm).order_by(DocumentFiling.filing_date.desc()).all()
    return filings


@router.get("/tables/{symbol}", summary="Get extracted financial tables with row hierarchy")
def get_extracted_tables(
    symbol: str,
    statement_type: Optional[str] = Query(None, description="BALANCE_SHEET, INCOME_STATEMENT, CASH_FLOW"),
    scope: str = Query("CONSOLIDATED", description="CONSOLIDATED or STANDALONE"),
    db: Session = Depends(get_db)
):
    norm = symbol.upper().split(".")[0]
    query = db.query(ExtractedTable).join(DocumentFiling).filter(
        DocumentFiling.symbol == norm,
        ExtractedTable.consolidation_scope == scope
    )
    if statement_type:
        query = query.filter(ExtractedTable.statement_type == statement_type)

    tables = query.all()
    if not tables:
        document_ingestion_service.seed_authoritative_filings(db)
        tables = query.all()

    return [
        {
            "id": t.id,
            "filing_id": t.filing_id,
            "page_number": t.page_number,
            "statement_type": t.statement_type,
            "consolidation_scope": t.consolidation_scope,
            "reporting_period": t.reporting_period,
            "currency": t.currency,
            "units": t.units,
            "headers": t.headers_json,
            "rows": t.rows_json,
            "raw_markdown": t.raw_markdown,
            "extraction_confidence": t.extraction_confidence,
        }
        for t in tables
    ]


@router.get("/facts/{symbol}", response_model=List[CanonicalFactResponse], summary="Get canonical normalized financial facts")
def get_canonical_facts(
    symbol: str,
    scope: str = Query("CONSOLIDATED", description="CONSOLIDATED or STANDALONE"),
    db: Session = Depends(get_db)
):
    norm = symbol.upper().split(".")[0]
    facts = db.query(CanonicalFinancialFact).filter(
        CanonicalFinancialFact.symbol == norm,
        CanonicalFinancialFact.consolidation_scope == scope
    ).order_by(CanonicalFinancialFact.fiscal_year.desc(), CanonicalFinancialFact.metric_id.asc()).all()

    if not facts:
        document_ingestion_service.seed_authoritative_filings(db)
        facts = db.query(CanonicalFinancialFact).filter(
            CanonicalFinancialFact.symbol == norm,
            CanonicalFinancialFact.consolidation_scope == scope
        ).order_by(CanonicalFinancialFact.fiscal_year.desc(), CanonicalFinancialFact.metric_id.asc()).all()

    return facts


@router.get("/forensics/{symbol}", response_model=List[ForensicFindingResponse], summary="Evaluate financial statement forensics and earnings quality")
def get_forensic_findings(symbol: str, db: Session = Depends(get_db)):
    norm = symbol.upper().split(".")[0]
    # Ensure filings exist
    filings = db.query(DocumentFiling).filter(DocumentFiling.symbol == norm).count()
    if filings == 0:
        document_ingestion_service.seed_authoritative_filings(db)

    findings = forensic_rule_engine.evaluate_company(norm, db)
    return findings


@router.get("/guidance/{symbol}", response_model=List[GuidanceStatementResponse], summary="List management guidance statements")
def get_guidance(symbol: str, db: Session = Depends(get_db)):
    norm = symbol.upper().split(".")[0]
    statements = guidance_service.get_statements(norm, db)
    if not statements:
        document_ingestion_service.seed_authoritative_filings(db)
        statements = guidance_service.get_statements(norm, db)
    return statements


@router.get("/guidance-drift/{symbol}", response_model=List[GuidanceDriftComparison], summary="Detect longitudinal guidance drift")
def get_guidance_drift(symbol: str, db: Session = Depends(get_db)):
    norm = symbol.upper().split(".")[0]
    return guidance_service.detect_guidance_drift(norm, db)


@router.get("/disclosures/{symbol}", response_model=List[CorporateDisclosureResponse], summary="Get corporate disclosure events and timeline")
def get_disclosures(symbol: str, db: Session = Depends(get_db)):
    norm = symbol.upper().split(".")[0]
    events = disclosure_service.get_timeline(norm, db)
    if not events:
        document_ingestion_service.seed_authoritative_filings(db)
        events = disclosure_service.get_timeline(norm, db)
    return events


@router.post("/valuation/dcf", response_model=DCFValuationResult, summary="Calculate deterministic DCF, sensitivity, and reverse valuation")
def run_dcf_valuation(input_data: DCFAssumptionInput, db: Session = Depends(get_db)):
    return valuation_service.calculate_dcf(input_data, db)


@router.post("/search", summary="Hybrid retrieval across structured facts, tables, and narrative guidance")
def hybrid_search(payload: Dict[str, Any], db: Session = Depends(get_db)):
    query = payload.get("query", "")
    symbol = payload.get("symbol", "RELIANCE")
    return hybrid_retrieval_service.search(query=query, symbol=symbol, db=db)


@router.get("/report/{symbol}/markdown", summary="Generate exportable institutional research dossier in markdown format")
def get_report_markdown(symbol: str, db: Session = Depends(get_db)):
    md = report_generation_service.generate_dossier_markdown(symbol, db)
    return Response(content=md, media_type="text/markdown")
