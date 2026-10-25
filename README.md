# NEXUS — Institutional Multi-Asset Financial Intelligence & Research Platform

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11%2B-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg?logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?logo=typescript)
![Lightweight Charts](https://img.shields.io/badge/Lightweight_Charts-v5.2.1-2962FF.svg)
![Tests](https://img.shields.io/badge/pytest-41%2F41%20passed-success.svg)
![Market Focus](https://img.shields.io/badge/Market-NSE%20%7C%20BSE%20(India)-FF9933.svg)
![AI Multi-Provider](https://img.shields.io/badge/AI%20Providers-Groq%20%7C%20OpenAI%20%7C%20Gemini%20%7C%20Ollama-8A2BE2.svg)
![RAG Vector Engine](https://img.shields.io/badge/RAG-BSE%20Filings%20%2B%20PDF%20Extraction-00C853.svg)

**An institutional-grade, AI-augmented research and simulation workstation covering Indian Equities, Mutual Funds, Sovereign & Corporate Bonds, ETFs, Commodities, FX, and Macroeconomic Indicators.**

</div>

---

## Executive Summary

**NEXUS** bridges the gap between retail trading interfaces and professional institutional intelligence systems like Bloomberg Terminal and FactSet. Purpose-built for Indian capital markets (NSE & BSE), NEXUS integrates high-performance canvas financial charting, a multi-asset research engine, rule-based quantitative backtesting, tax accounting strictly compliant with Indian Budget 2024-25 mandates, grounded Vector RAG over verified corporate filings, and deterministic multi-agent financial reasoning.

NEXUS enforces strict guardrails against LLM hallucination and number fabrication: all financial metrics originate directly from live exchange feeds or vetted balance-sheet disclosures, accompanied by verified source attribution and provenance badges.

---

## Core Principles & Engineering Guardrails

1. **Strict Zero Financial Data Fabrication**:
   - Synthetic random-walk generators (such as Brownian motion fallbacks) are eliminated across the stack.
   - If an external market data provider is unreachable or market data is withheld, NEXUS explicitly returns `"Data unavailable"` or honest `null`/empty states alongside provider telemetry, source attribution, and sync timestamps.
   - Benchmark index units are displayed accurately in **points**, not currency (₹).
2. **Pure Historical Observational Language**:
   - Candlestick patterns, sector rotation cycles, backtesting runs, and AI reports strictly employ observational phrasing (*"Historically observed continuation tendency under past regimes"*).
   - Forward-looking financial guarantees and deterministic predictive assertions are forbidden across all computational and presentation layers.
3. **Self-Hosted Lightweight Charts v5.2.1**:
   - High-framerate interactive canvas charting with programmatic multi-indicator overlays (SMA, EMA, VWAP, Bollinger Bands, Ichimoku Cloud), sub-pane oscillators (RSI, MACD with warming-up indicators, Stochastic, ADX), and 60+ clickable candlestick pattern markers.
4. **Resilient Multi-Provider AI & Offline Independence**:
   - Multi-provider failover engine supports **Groq** (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`), **OpenAI**, **Gemini**, and local **Ollama** models.
   - Core screening, fundamentals, portfolio diagnostics, paper trading, and backtesting execute autonomously with deterministic local fallback algorithms when external AI APIs are unset or rate-limited.
5. **Grounded RAG & Vector Document AI**:
   - Direct integration with BSE corporate disclosures and annual reports, featuring bounded PDF extraction via `pypdf`, vector indexing, and rigorous prompt-injection sanitization.
6. **Institutional Mathematical Typesetting**:
   - Full LaTeX / KaTeX mathematical formula rendering engine (`ChatGPTMessageRenderer`) across the AI Tutor, formulas, and quantitative research models.

---

## Navigation Pillars & Architectural Map

```
NEXUS WORKSTATION
│
├── MARKETS
│   ├── Overview          → Macro benchmarks (NIFTY 50, SENSEX in points), Market Breadth (A/D ratio), Sector Heatmap, Live News
│   ├── Screener          → Multi-factor quantitative filtering (P/E, D/E, ROE, RSI, Margins) with natural language parser
│   ├── Research          → Deep-dive equity diagnostics, Candlestick pattern markers, live BSE filings & Vector RAG intelligence
│   └── Compare           → Side-by-side peer valuation matrix & multi-stock normalized percentage return charts
│
├── MULTI-ASSET
│   ├── Mutual Funds      → AUM, expense ratios, Sharpe ratios, rolling CAGR, scheme overlap calculator
│   ├── ETFs              → Constituent weight look-through (NIFTYBEES, GOLDBEES, JUNIORBEES, BANKBEES)
│   ├── Bonds             → Sovereign G-Secs (7.18% GS 2033), PSU bonds, YTM/duration, and interactive Bond Ladder cash-flow simulator
│   ├── Commodities & FX  → Gold, Silver, Brent Crude, and USD/INR historical charts with equity correlation notes
│   └── Macro Dashboard   → CPI Inflation, Real GDP Growth, RBI Repo Rate, 10Y Benchmark Yield with source provenance badges
│
├── PORTFOLIO
│   ├── Portfolio & Paper → ₹10,00,000 virtual balance paper trading execution with real-time order matching & Navbar balance sync
│   ├── Analytics         → Sharpe, Sortino, Beta vs NIFTY 50, Max Drawdown, and Stress Testing (-10%/-20% market shocks)
│   ├── Watchlists        → Multi-watchlist tracking, batch additions, real-time performance evaluation, 1-click research navigation
│   └── Tax Analytics     → Indian Budget 2024-25 Capital Gains: STCG (20%), LTCG (12.5% > ₹1.25L), tax-lot ledger, CSV export
│
├── INTELLIGENCE
│   ├── AI Copilot        → Live conversational reasoning assistant grounded with real-time market data, technicals, and portfolio ledger
│   ├── AI Research       → Autonomous multi-tool research agent dossier synthesizing fundamentals, technicals, and filing citations
│   └── AI Tutor          → 10 structured curriculum lessons (P/E, ROCE, Duration, MACD, XIRR) with LaTeX formulas and checkpoint quizzes
│
└── TOOLS & ACCOUNT
    ├── Journal           → Trade thesis logging, emotional rating, execution quality tracking, and behavioral leak detection
    ├── Simulators        → Intrinsic DCF fair-value model, Historical SIP wealth calculator, What-If scenario projections
    └── Settings          → Google OAuth status, broker health observability, API connectivity, and simulated balance reset
```

---

## Feature Audit & Implementation Matrix

| # | Feature Area | Technical Implementation Details |
|---|---|---|
| **1** | **Chart Indicators & Sub-Panes** | TradingView Lightweight Charts v5.2.1 canvas engine. Overlays: SMA (20, 50, 200), EMA (9, 21, 50), VWAP, Bollinger Bands, Ichimoku Cloud. Toggleable sub-pane oscillators: RSI 14, MACD with histogram and warm-up state indicator (`Warming up (N of 27 sessions)`), Stochastic %K/%D, ADX 14. |
| **2** | **Candlestick Pattern Intelligence** | Full pattern recognition engine for Doji, Hammer, Inverted Hammer, Shooting Star, Bullish/Bearish Engulfing, Morning/Evening Star, Harami, Marubozu, Three White Soldiers, Three Black Crows (60+ patterns per symbol without artificial caps). Clickable markers with structural metrics & non-predictive observation notes. |
| **3** | **Data Freshness & Indicators** | Real-time badge indicators (`Delayed 15m (NSE)` or `Market Closed - As of DD Mon HH:MM`) displayed on quotes, research views, and chart headers. |
| **4** | **Strict No-Fabrication Enforcement** | All synthetic random-walk / Brownian motion generators removed. Honest `None` / `null` handling: missing quotes, fundamentals, or bond market prices render explicit empty states (`—` or `Data unavailable`) with provider telemetry. Index values correctly measured in points. |
| **5** | **Comprehensive Stock Metrics** | Balance sheet fundamentals: P/E, P/B, EV/EBITDA, ROE, ROCE, Debt-to-Equity, FCF, Promoter Pledge %, FII/DII holding distributions, and quarterly institutional changes. |
| **6** | **Stock Comparison Engine** | Side-by-side multi-stock comparison matrix with valuation rankings and normalized % return charts comparing up to 5 symbols over 1M/6M/1Y/5Y. |
| **7** | **Universal Entity Search** | Dynamic symbol search across 5,000+ NSE/BSE listed equities, indices, and asset classes with real-time ticker discovery. |
| **8** | **Watchlists Engine** | Multi-list management system with persistent SQLite/Postgres storage, real-time performance summary, batch removal/addition, and 1-click research navigation. |
| **9** | **Corporate Actions & Bulk Deals** | Historical dividend yields, splits, bonus shares, rights issues, and institutional bulk/block deal transaction filings. |
| **10** | **Sector Rotation Analysis** | Sectoral performance heatmap, P/E multiples, breadth ratios, and historical capital flow analysis. |
| **11** | **Index Survivorship Context** | NIFTY 50 and NIFTY Bank constituent tracking with historical additions and deletions. |
| **12** | **Mutual Funds & Overlap Engine** | Explorer across Large Cap, Flexi Cap, Mid Cap, Hybrid, and Debt schemes. Mathematical portfolio overlap calculator ($\sum \min(w_{i,A}, w_{i,B})$) detecting duplicate holdings. |
| **13** | **ETF Look-Through** | ETF catalog (NIFTYBEES, GOLDBEES, JUNIORBEES, BANKBEES, LIQUIDBEES) with underlying constituent look-through for exposure unmasking. |
| **14** | **Bonds & Bond Ladder Simulator** | Sovereign G-Secs (7.18% GS 2033, 7.10% GS 2034) and AAA PSU bonds. Macauley/Modified duration, YTM, and interactive Bond Ladder cash-flow schedule simulator with graceful error handling. |
| **15** | **Commodities & Currencies** | Gold (₹/10g), Silver (₹/kg), Brent Crude ($/bbl), and USD/INR exchange rates with historical charts and equity correlation notes. |
| **16** | **Portfolio Analytics & Risk Lab** | CAGR, XIRR, Sharpe, Sortino, Max Drawdown, Benchmark Beta, Sector Concentration, and Stress-Testing simulations (-10%/-20% market shocks, crude shock, rate hike). |
| **17** | **Paper Trading & Order Matching** | Virtual execution engine with ₹10,00,000 simulated capital. Instant balance synchronization across Top Navbar, Portfolio, and Research order tickets. |
| **18** | **Grounded RAG Document AI** | Real corporate filings fetched from BSE disclosures with bounded PDF text extraction via `pypdf`, vector indexing, prompt-injection sanitization, and excerpt citations tied to research dossiers. |
| **19** | **Multi-Provider AI Intelligence** | `AIService` abstraction with prioritized multi-provider failover: **Groq** (`openai/gpt-oss-120b`, `qwen/qwen3.8-27b`), **OpenAI**, **Gemini**, and **Ollama**, backed by a deterministic local synthesis fallback. |
| **20** | **Conversational AI Copilot** | Dedicated real-time conversational reasoning assistant (`AiAssistantView`) with tools to fetch live quotes, technical indicators, and portfolio holdings for contextual answers. |
| **21** | **Interactive AI Financial Tutor** | 10 modular curriculum chapters (P/E & PEG, RSI, MACD, Bollinger Bands, SIP & XIRR, Beta & Diversification, ROCE, Duration) with KaTeX formulas, checkpoint quizzes, progress unlock, and live model-backed tutor chat (`/api/v1/ai/tutor/chat`). |
| **22** | **Institutional Math & Equation Rendering** | Dedicated `ChatGPTMessageRenderer` component supporting full LaTeX mathematical notation, formula highlight cards, and blank-line markdown table normalization. |
| **23** | **Google OAuth 2.0 Integration** | Production-ready Google OAuth 2.0 foundation with signed state JWTs, fragment redirection, token local storage, and config-gated toggle (`/auth/oauth/status|google/login|google/callback`). |
| **24** | **Live Market News Feed** | Aggregated headlines feed (`GET /market/news`) for active market movers with an optional Marketaux adapter for third-party entity-sentiment metadata. |
| **25** | **Dynamic Screener & Natural Language** | Multi-attribute sorting (P/E, Market Cap, P/B, Volume, RSI) with reactive refetching and natural language screen parser (`/screener/parse?q=`). |
| **26** | **Tax & Capital Gains Analytics** | Compliant with Indian Union Budget 2024-25: STCG @ 20%, LTCG @ 12.5% above ₹1,25,000 exemption limit. Tax-lot ledger, realized/unrealized gains, and CSV export. |
| **27** | **Quant Research Lab & Backtesting** | Dual SMA crossover strategy backtesting with 70% In-Sample / 30% Out-of-Sample separation, 10 bps slippage model, equity curves, CAGR, and drawdown profiles. |
| **28** | **Macroeconomic Dashboard** | CPI Inflation, Real GDP Growth, RBI Repo Rate, and 10Y Benchmark G-Sec Yield with sector linkage notes and explicit provenance badges (`SOURCED_OFFICIAL` / `SOURCED_MARKET` / `DATA_UNAVAILABLE`). |
| **29** | **Broker Adapter Health Observability** | `/api/v1/brokers/health` reports adapter status (paper vs external), execution flags, credential & consent state, reconciliation readiness, and rate-limit policies in the Settings view. |
| **30** | **Docker Volume Persistence & Health** | Full stack Docker configuration with non-root containers, container health checks on `127.0.0.1:3000` and `:8000`, and persistent database storage via `nexus_db:/data`. |

---

## Technology Stack

```
Frontend:
  - Framework: Next.js 14.2.15 (React 18, App Router, Client-side view routing)
  - Language: TypeScript 5.0
  - Styling: TailwindCSS 3.4.1 (Institutional dark theme tokens: #06080D, glass-morphism)
  - Typography: Outfit (Headings), Plus Jakarta Sans (Body), JetBrains Mono (Data & Numbers)
  - Charting: TradingView Lightweight Charts v5.2.1 (Self-hosted canvas)
  - Math & Rendering: Institutional LaTeX / KaTeX rendering via ChatGPTMessageRenderer
  - Icons: Lucide React

Backend:
  - Framework: FastAPI (Python 3.11)
  - ORM: SQLAlchemy 2.0 (SQLite with WAL mode; PostgreSQL-ready)
  - Validation: Pydantic v2 & Pydantic-Settings
  - AI Engine: Groq, OpenAI, Gemini, Ollama with fallback chains (AIService)
  - Document RAG: Vector similarity, BSE corporate filings engine, pypdf document parser
  - Auth: OAuth 2.0 (Google), JWT (python-jose), passlib bcrypt password hashing
  - Data Processing: Pandas, NumPy, Statsmodels, yfinance, mftool
  - Testing: Pytest (41/41 passing unit and integration tests)
```

---

## Environment Configuration

Create a `.env` file in the project root or configure your hosting environment:

```ini
# Platform Environment
ENVIRONMENT=development                # 'development' or 'production'
SECRET_KEY=your-high-entropy-secret    # Required in production
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
ENABLE_DEMO_USER=true                  # Set false for production

# AI Providers (Optional - Platform includes offline deterministic fallbacks)
GROQ_API_KEY=your_groq_api_key        # Recommended for ultra-fast completions
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
OLLAMA_BASE_URL=http://localhost:11434 # Local Ollama endpoint

# Google OAuth 2.0 (Optional)
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret

# Financial News & Sentiment (Optional)
MARKETAUX_API_TOKEN=your_marketaux_api_token
```

---

## Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** and **npm**
- **Docker & Docker Compose** (optional, recommended for production)

---

### Method 1: Docker Deployment (Recommended)

The entire stack runs with Docker Compose with health checks and persistent storage:

```bash
# Build and run containers in detached mode
docker compose up --build -d
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Interactive Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
- SQLite database is persisted inside the `nexus_db` volume.

---

### Method 2: Local Development Setup

#### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
# Windows (PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS / Linux
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Run backend tests:
```bash
python -m pytest tests/ -q
```
*Expected: 41 passed across all test suites.*

#### 2. Frontend Setup

```bash
cd frontend

# Install npm dependencies
npm install

# Verify TypeScript types
npx tsc --noEmit

# Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Default Demo Credentials

When `ENABLE_DEMO_USER=true` is set, NEXUS provides a simulated portfolio account:
- **Email**: `demo@nexusfin.ai`
- **Password**: `NexusDemo123!`
- **Initial Virtual Balance**: `₹10,00,000.00`

---

## Regulatory Compliance & Disclaimer

> [!IMPORTANT]
> **Regulatory Disclaimer**:
> NEXUS is an educational and quantitative financial intelligence platform designed strictly for informational and simulation purposes. NEXUS is NOT a SEBI-registered Research Analyst, Investment Adviser, Portfolio Manager, or Broker-Dealer. Nothing within this software constitutes personalized investment, tax, or legal advice. 
> 
> All simulation outputs, backtesting models, candlestick pattern annotations, and AI research reports reflect historical observations and hypothetical assumptions. Past performance is no guarantee of future returns. Users must consult a qualified SEBI-registered financial advisor and chartered accountant prior to making real-world capital allocation decisions.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
