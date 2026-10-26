# NEXUS 2.0 — Architectural Audit, Current State & Modernization Plan

**Date:** October 2026  
**Target Platform:** Institutional-Grade Indian Financial Intelligence Platform  
**Target Market:** Indian Capital Markets (NSE & BSE Equities, Corporate Filings, Regulatory Disclosures)

---

## 1. Executive Architecture Map & Existing Stack Audit

An in-depth inspection of the codebase confirms that NEXUS is structured as a decoupled full-stack application:

```
NEXUS ROOT
├── backend/
│   ├── app/
│   │   ├── api/          → FastAPI routers (auth, stocks, market, portfolio, multi_asset, ai, etc.)
│   │   ├── core/         → App configuration, security (JWT/bcrypt), in-memory TTL caching
│   │   ├── database/     → SQLAlchemy engine & session maker (defaults to local SQLite `nexus.db`)
│   │   ├── models/       → ORM entities: User, Stock, Fundamental, FinancialDocument, Portfolio, etc.
│   │   ├── providers/    → External adapters: BSE filings, NSE quotes, AMFI MF, RBI macro, Indian equities
│   │   ├── schemas/      → Pydantic v2 request/response contracts
│   │   ├── services/     → Domain services: RAG service, technical indicators, market service, ai_service
│   │   └── agents/       → Multi-tool reasoning agents, prompt templates, and execution tools
│   └── tests/            → 41-case automated test suite (test_all, test_caching, test_provider_contracts)
├── frontend/
│   ├── src/
│   │   ├── app/          → Next.js 14.2 App Router root (`page.tsx`, `layout.tsx`, `globals.css`)
│   │   ├── components/   → AppShell, Navbar, Sidebar, TradingView charts, and 20+ specialized views
│   │   └── lib/          → API client (`api.ts`), type definitions, auth tokens
│   └── package.json      → React 18, Next 14.2, Lightweight Charts v5.2.1, Lucide React, Tailwind CSS
```

### 1.1 Existing Functionality to Preserve
* **Authentication & User Management:** Clean JWT bearer token + bcrypt hashing pipeline, demo user autoseeding (`demo@nexusfin.ai`), and OAuth callback handler (`backend/app/api/auth.py`).
* **High-Performance Canvas Charting:** TradingView Lightweight Charts v5.2.1 canvas renderer with multi-indicator overlays (EMA, SMA, VWAP, Bollinger Bands) and sub-panes (RSI, MACD) in `frontend/src/components/charts/TradingViewChart.tsx`.
* **Multi-Provider AI Fallback Engine:** Resilient failover cascade supporting Groq (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`), OpenAI, Gemini, and local Ollama (`backend/app/services/ai_service.py`).
* **Deterministic Technical Indicator Calculations:** Pure mathematical calculations in `backend/app/services/technical_indicators.py` avoiding external API black-boxes for RSI, MACD, Stochastic, and Support/Resistance.
* **Paper Trading & Cash Ledger:** Transactional order execution ledger with cash accounting and lot tracking (`backend/app/services/trading_service.py`).

### 1.2 Non-Negotiable Exclusions (Enforced)
In strict accordance with the product directive, the following are **strictly excluded**:
1. No quantitative trading strategies, factor models, or factor portfolios.
2. No Black-Litterman or portfolio optimization algorithms.
3. No backtesting engines, strategy laboratories, or synthetic trading systems.
4. No Monte Carlo risk simulators or portfolio VaR/CVaR research tabs.
5. No AI-generated buy/sell recommendations or fabricated target prices.
6. No mock implementations presented as production-ready.

---

## 2. Identified Limitations & Technical Debt in Current State

1. **Naive Document Ingestion & Text-Only RAG:**
   - `backend/app/providers/bse_filings_provider.py` pulls PDF text using basic `PdfReader.pages[:5].extract_text()`. It slices the first 5 pages and strips all tabular structure.
   - `backend/app/services/rag_service.py` performs simple token set-intersection search. It lacks BM25 scoring, semantic vector embeddings, and table awareness. When an annual report contains a balance sheet table, the rows and columns are flattened into an unreadable string.
2. **Missing Canonical Financial Fact Layer:**
   - Financial figures are currently stored as flat scalar columns on `fundamentals` (e.g., `pe_ratio`, `roe`, `debt_to_equity`).
   - There is no relational storage for historical multi-period financial statements (Balance Sheet, Profit & Loss, Cash Flow) preserving period start/end, reporting frequency (Quarterly vs Annual), consolidation scope (Standalone vs Consolidated), unit (₹ Crores), and filing provenance.
3. **Absence of Accounting & Earnings-Quality Forensics:**
   - There is currently no forensic analysis engine to evaluate earnings quality (e.g., Cash Flow from Operations vs Profit After Tax divergence, Receivables growing faster than Revenue, Inventory accumulation, Debt-to-Interest coverage deterioration).
4. **No Longitudinal Management Guidance Tracking:**
   - Management statements in concalls or earnings releases are treated as static text, without cross-quarter tracking of targets (capex, margins, capacity, debt reduction) or modality shifts.
5. **Disconnected Corporate Disclosures:**
   - Corporate actions, bulk deals, and insider trades are queried ad-hoc without unified entity resolution, date clustering, or timeline investigation.
6. **DCF Simulator Lacks Direct Evidence Grounding:**
   - The current DCF in `SimulatorsView.tsx` relies on manual input or static defaults without automatically pulling historical Free Cash Flows from verified company filings and lacking reverse-DCF sensitivity models.

---

## 3. NEXUS 2.0 Architectural Blueprint

To transform NEXUS into an institutional-grade Indian financial intelligence platform, we implement the following core subsystems:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           NEXUS 2.0 UNIFIED ARCHITECTURE                        │
├──────────────────────────────────────┬──────────────────────────────────────────┤
│           INGESTION & DATA LAYER     │          INTELLIGENCE & REASONING        │
│  • BSE/NSE Filing Discovery Adapters │  • Hybrid BM25 + Vector Retrieval Engine │
│  • Safe Streaming PDF Ingestion      │  • Table-Aware Document Chunking & Search│
│  • Layout-Aware Table Extractor      │  • Grounded AI Assistant with Tool Calls │
│  • Canonical FinancialFact Ledger    │  • Citation Verifier & Page Deeplinking  │
├──────────────────────────────────────┼──────────────────────────────────────────┤
│        FORENSICS & GOVERNANCE        │           VALUATION & REPORTING          │
│  • 10-Rule Accounting Forensic Engine│  • Transparent 3-Statement DCF Model     │
│  • Cash Flow vs PAT Divergence Check │  • Reverse Valuation Implied Growth Calc │
│  • Longitudinal Guidance Drift Engine│  • Sensitivity Matrix (WACC vs Terminal) │
│  • Corporate Disclosure Timeline     │  • Citation-Backed Institutional Report  │
└──────────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 4. Implementation Phase Mapping

| Phase | Core Domain | Key Backend Modules | Key Frontend Views | Verification / Test |
|---|---|---|---|---|
| **Phase 1: Data Foundation** | Document Ingestion & Financial Table Intelligence | `app/models/financial_fact.py`<br>`app/services/document_ingestion_service.py`<br>`app/services/table_extraction_service.py`<br>`app/api/documents.py` | `ResearchView.tsx` (Statements & Filings tabs)<br>`DocumentInspectorModal.tsx` | Unit tests for table parsing, canonical fact normalization, and idempotent download |
| **Phase 2: Financial Forensics** | Accounting & Earnings-Quality Engine | `app/services/forensic_service.py`<br>`app/schemas/forensics.py`<br>`app/api/forensics.py` | `ResearchView.tsx` (Forensic Findings card & inspector)<br>Severity badges & Benign explanation accordion | Unit tests for all 10 forensic rules with known mathematical fixtures |
| **Phase 3: Evidence-Grounded AI** | Hybrid Retrieval & Table-Aware RAG | `app/services/hybrid_retrieval_service.py`<br>`app/agents/forensic_tools.py`<br>`app/api/ai.py` | `AiStudioView.tsx`<br>`ResearchView.tsx` AI Research tab | Automated citation tests verifying exact source page and fact IDs |
| **Phase 4: Corporate Intelligence** | Management Guidance Drift & Disclosure Timeline | `app/services/guidance_service.py`<br>`app/services/disclosure_service.py`<br>`app/api/disclosures.py` | `ResearchView.tsx` (Guidance Drift timeline, Disclosure Events) | Tests for commitment modality detection and chronological clustering |
| **Phase 5: Valuation & Reports** | Transparent DCF & Institutional Report Generation | `app/services/valuation_service.py`<br>`app/services/report_generation_service.py`<br>`app/api/valuation.py` | `SimulatorsView.tsx` (Upgraded DCF & Reverse DCF)<br>`ResearchView.tsx` (Export Dossier) | Unit tests for WACC, Free Cash Flow projections, and markdown/PDF compilation |
| **Phase 6: Integration & Hardening** | Full-Stack Integration, Quality Badges & Clean Routing | End-to-end integration across all views, database migrations, error handling, rate limiting | Complete Company Workspace in `ResearchView.tsx` | Full regression test suite passing across all modules |

---

## 5. Verification & Acceptance Criteria
1. **Zero Financial Hallucination:** Every numerical fact in the system has a deterministic provenance record (Source URL, filing date, page number, extraction confidence).
2. **Table Preservation:** Tabular balance sheets and P&L statements retain row hierarchy, consolidation scope, and unit consistency.
3. **Reproducibility:** All forensic calculations and DCF scenarios execute via pure Python functions with 100% deterministic outputs.
4. **End-to-End User Experience:** Users can search any Indian equity (e.g. RELIANCE, TCS, INFY), view normalized multi-period financial statements, inspect forensic accounting flags, trace guidance drift, run transparent DCF sensitivity, and generate a fully cited institutional research dossier.
