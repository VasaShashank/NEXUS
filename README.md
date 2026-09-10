# NEXUS — Institutional Multi-Asset Financial Intelligence & Research Platform

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11%2B-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg?logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?logo=typescript)
![Lightweight Charts](https://img.shields.io/badge/Lightweight_Charts-v5.2.1-2962FF.svg)
![Tests](https://img.shields.io/badge/pytest-13%2F13%20passed-success.svg)
![Market Focus](https://img.shields.io/badge/Market-NSE%20%7C%20BSE%20(India)-FF9933.svg)

**An institutional-grade, AI-augmented research and simulation workstation covering Indian Equities, Mutual Funds, Sovereign & Corporate Bonds, ETFs, Commodities, FX, and Macroeconomic Indicators.**

</div>

---

## Executive Summary

**NEXUS** bridges the gap between retail trading interfaces and professional Bloomberg/FactSet-style institutional intelligence. Built natively for Indian capital markets (NSE & BSE), NEXUS integrates high-performance canvas financial charting, a multi-asset research engine, rule-based quantitative backtesting, tax accounting under Indian Budget 2024-25 mandates, and deterministic multi-agent financial reasoning.

---

## Core Principles & Engineering Guardrails

1. **Strict Zero Financial Data Fabrication**:
   - Synthetic random-walk generators (such as Brownian motion fallbacks) are eliminated.
   - If an external market data provider is unreachable or market data is withheld, NEXUS explicitly states `"Data unavailable"` alongside provider telemetry, source attribution, and sync timestamps.
2. **Pure Historical Observational Language**:
   - Candlestick patterns, sector rotation cycles, backtesting runs, and AI reports strictly employ observational phrasing (*"Historically observed continuation tendency under past regimes"*).
   - Forward-looking financial guarantees and deterministic predictive assertions are forbidden across all layers.
3. **Self-Hosted Lightweight Charts v5.2.1**:
   - High-framerate interactive canvas charting with programmatic multi-indicator overlays (SMA, EMA, VWAP, Bollinger Bands, Ichimoku Cloud), sub-pane oscillators (RSI, MACD, Stochastic, ADX), and clickable candlestick pattern markers.
4. **Autonomous Offline Resilience**:
   - Core screening, fundamentals, portfolio diagnostics, paper trading, and backtesting execute autonomously with local fallbacks even when external AI APIs (OpenAI / Gemini) are unset.

---

## 7 Navigation Pillars & Architectural Map

```
NEXUS WORKSTATION
│
├── MARKETS
│   ├── Overview          → Macro benchmarks (NIFTY 50, SENSEX), Market Breadth (A/D ratio), Sector Heatmap
│   ├── Markets           → Sectoral rotation analysis, valuation comparisons (P/E, ROE, ROCE)
│   ├── Screener          → Multi-factor quantitative filtering (P/E, D/E, ROE, RSI, Margins)
│   ├── Research          → Deep-dive equity diagnostics, Candlestick markers, RAG document intelligence
│   └── Compare           → Side-by-side equity matrix & multi-stock normalized percentage return charts
│
├── MULTI-ASSET
│   ├── Mutual Funds      → AUM, expense ratios, Sharpe ratios, rolling CAGR, scheme overlap calculator
│   ├── ETFs              → Constituent weight look-through (NIFTYBEES, GOLDBEES, JUNIORBEES, BANKBEES)
│   ├── Bonds             → Sovereign G-Secs, PSU bonds, YTM/duration, and interactive Bond Ladder cash-flow simulator
│   ├── Commodities & FX  → Gold, Silver, Brent Crude, and USD/INR historical charts with macro correlations
│   └── Macro Dashboard   → CPI Inflation, Real GDP Growth, RBI Repo Rate, 10Y Benchmark Yield, Manufacturing PMI
│
├── PORTFOLIO
│   ├── Portfolio & Paper → ₹10,00,000 virtual balance paper trading execution with real-time order matching
│   ├── Analytics         → Sharpe, Sortino, Beta vs NIFTY 50, Max Drawdown, and Stress Testing (-10%/-20% shock)
│   ├── Watchlists        → Multi-watchlist tracking, batch additions, real-time performance evaluation
│   └── Tax Analytics     → Indian Budget 2024-25 Capital Gains: STCG (20%), LTCG (12.5% > ₹1.25L), tax lots, CSV export
│
├── RESEARCH & QUANT LAB
│   └── Quant Lab         → Dual SMA crossover strategy backtesting with 70/30 In-Sample vs Out-of-Sample isolation
│
├── INTELLIGENCE
│   ├── AI Research       → Multi-agent institutional equity syntheses with strict evidence citations
│   ├── AI Assistant      → "Why Did It Move?" diagnostic attribution engine
│   └── AI Tutor          → Interactive financial education (ROCE, Duration, Tracking Error, Quizzes)
│
└── TOOLS & ACCOUNT
    ├── Journal           → Post-trade psychological review, trade thesis logging, and behavioral leak detection
    ├── Simulators        → Intrinsic DCF fair-value model, Historical SIP wealth calculator
    └── Settings          → Environment configuration, provider health observability, and simulated balance reset
```

---

## Feature Audit & Implementation Matrix

| # | Feature Area | Status | Technical Implementation Details |
|---|---|:---:|---|
| **1** | **Chart Indicators & Sub-Panes** | **Complete** | Lightweight Charts v5.2.1 canvas engine. SMA (20, 50, 200), EMA (9, 21, 50), VWAP, Bollinger Bands, Ichimoku Cloud overlays; toggleable sub-pane oscillators (RSI 14, MACD with histogram, Stochastic %K/%D, ADX 14). |
| **2** | **Candlestick Pattern Intelligence** | **Complete** | Rule-based recognition engine for Doji, Hammer, Inverted Hammer, Shooting Star, Bullish/Bearish Engulfing, Morning/Evening Star, Harami, Marubozu, Three White Soldiers, Three Black Crows. Clickable markers with structural metrics & non-predictive observation notes. |
| **3** | **Data Freshness & Indicators** | **Complete** | Real-time badge indicators (`Delayed 15m (NSE)` or `Market Closed - As of DD Mon HH:MM`) displayed on quotes, research views, and chart headers. |
| **4** | **No Fabricated Numbers** | **Complete** | All synthetic random-walk / Brownian motion generators removed. Clear fallback to `"Data unavailable"` with provider telemetry. |
| **5** | **Comprehensive Stock Metrics** | **Complete** | Balance sheet fundamentals: P/E, P/B, EV/EBITDA, ROE, ROCE, Debt-to-Equity, FCF, Promoter Pledge %, FII/DII holding distributions, and quarterly institutional changes. |
| **6** | **Stock Comparison Engine** | **Complete** | Side-by-side multi-stock comparison matrix with valuation rankings and normalized % return charts comparing up to 5 symbols over 1M/6M/1Y/5Y. |
| **7** | **Universal Entity Search** | **Complete** | Dynamic symbol search across 5,000+ NSE/BSE listed equities, indices, and asset classes with real-time ticker discovery. |
| **8** | **Watchlists Engine** | **Complete** | Multi-list management system with persistent SQLite/Postgres storage, real-time performance summary, batch removal/addition, and 1-click research navigation. |
| **9** | **Corporate Actions & Bulk Deals** | **Complete** | Historical dividend yields, splits, bonus shares, rights issues, and institutional bulk/block deal transaction filings. |
| **10** | **Sector Rotation Analysis** | **Complete** | Sectoral performance heatmap, P/E multiples, breadth ratios, and historical capital flow analysis. |
| **11** | **Index Survivorship Context** | **Complete** | NIFTY 50 and NIFTY Bank constituent tracking with historical additions and deletions. |
| **12** | **Mutual Funds & Overlap Engine** | **Complete** | Explorer across Large Cap, Flexi Cap, Mid Cap, Hybrid, and Debt schemes. Mathematical portfolio overlap calculator ($\sum \min(w_{i,A}, w_{i,B})$) detecting duplicate holdings. |
| **13** | **ETF Look-Through** | **Complete** | ETF catalog (NIFTYBEES, GOLDBEES, JUNIORBEES, BANKBEES, LIQUIDBEES) with underlying constituent look-through for exposure unmasking. |
| **14** | **Bonds & Bond Ladder Simulator** | **Complete** | Sovereign G-Secs (7.18% GS 2033, 7.10% GS 2034) and AAA PSU bonds. Macauley/Modified duration, YTM, and interactive Bond Ladder cash-flow schedule simulator. |
| **15** | **Commodities & Currencies** | **Complete** | Gold (₹/10g), Silver (₹/kg), Brent Crude ($/bbl), and USD/INR exchange rates with historical charts and equity correlation notes. |
| **16** | **Portfolio Analytics & Risk Lab** | **Complete** | CAGR, XIRR, Sharpe, Sortino, Max Drawdown, Benchmark Beta, Sector Concentration, and Stress-Testing simulations (-10%/-20% market shocks, crude shock, rate hike). |
| **17** | **Portfolio Rebalancing Simulator**| **Complete** | Current vs Target asset allocation simulator generating hypothetical rebalancing orders without live execution risk. |
| **18** | **Grounded RAG Document AI** | **Complete** | Vector cosine-similarity financial document search over corporate annual reports and quarterly filings with strict prompt-injection defenses. |
| **19** | **AI Research Reports** | **Complete** | Structured research generation strictly separating Facts, Calculated Metrics, Historical Observations, and Uncertainties. |
| **20** | **Research Workspace & Journal** | **Complete** | Trade thesis logging, emotional rating, execution quality tracking, and thesis dossier recording. |
| **21** | **Quant Research Lab & Backtesting**| **Complete** | Dual SMA crossover backtester with 70% In-Sample / 30% Out-of-Sample segregation, slippage assumptions (10 bps), equity curves, CAGR, drawdown, and factor intelligence profiles. |
| **22** | **Macroeconomic Dashboard** | **Complete** | CPI Inflation, Real GDP Growth, RBI Repo Rate, 10Y Benchmark G-Sec Yield, and HSBC India Manufacturing PMI historical series with sector linkage notes. |
| **23** | **Personalized Feed & Filings** | **Complete** | Dynamic portfolio and watchlist event tracking for announcements, earnings, and disclosures. |
| **24** | **Event-Based Alerts Engine** | **Complete** | Threshold monitors for 52-week highs/lows, intraday price deviations, and portfolio drawdown alerts (strictly non-predictive). |
| **25** | **Tax & Capital Gains Analytics** | **Complete** | Indian Union Budget 2024-25 rules: STCG @ 20%, LTCG @ 12.5% above ₹1,25,000 exemption limit. Tax lots, unrealized/realized gains, dividend income, and CSV exports. |
| **26** | **AI Financial Tutor Mode** | **Complete** | Interactive guides for financial concepts (ROCE, P/E, Duration, Tracking Error, Beta, Sharpe) with formulas, real market examples, and checkpoint quizzes. |
| **27** | **AI Observability & Fallbacks** | **Complete** | Offline-first architecture. Fully functional without external API keys; `AgentRunLog` tracks run execution telemetry. |
| **28** | **Compliance, Disclaimers & Exports**| **Complete** | Persistent non-advisory regulatory disclaimers, formatted Lakh/Crore Indian currency formatters, CSV exports, and provider health telemetry. |

---

## Technology Stack

```
Frontend:
  - Framework: Next.js 14.2.15 (App Router, Client-side view switching, React 18)
  - Language: TypeScript 5.0
  - Styling: TailwindCSS 3.4.1 (Custom institutional dark theme tokens: #06080D, glass-card)
  - Typography: Outfit (Headings), Plus Jakarta Sans (Body), JetBrains Mono (Financial Data)
  - Charting: TradingView Lightweight Charts v5.2.1 (Self-hosted canvas)
  - Icons: Lucide React

Backend:
  - Framework: FastAPI (Python 3.11)
  - ORM: SQLAlchemy 2.0 (SQLite fallback with nexus.db, PostgreSQL-ready)
  - Validation: Pydantic v2
  - Security: JWT Authentication with passlib bcrypt hashing
  - Data Processing: Pandas, NumPy
  - Market Data: yfinance with resilient caching and curated verified Indian market reference data
  - Testing: Pytest (13 comprehensive automated test suites)
```

---

## Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** and **npm**

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment** (recommended):
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the FastAPI development server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   - Interactive Swagger API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
   - Alternative ReDoc API Documentation: [http://localhost:8000/redoc](http://localhost:8000/redoc)
   - Health Check: [http://localhost:8000/health](http://localhost:8000/health)

5. **Run the automated backend test suite**:
   ```bash
   python -m pytest tests/test_all.py -v
   ```
   *Expected output: All 13 tests passing.*

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Verify TypeScript compilation**:
   ```bash
   npx tsc --noEmit
   ```

4. **Launch the Next.js development server**:
   ```bash
   npm run dev
   ```

5. **Open the platform**:
   - Access the web interface at: [http://localhost:3000](http://localhost:3000) (or configured port)

---

### Default Demo Credentials

NEXUS automatically seeds a simulated institutional portfolio for testing:
- **Email**: `demo@nexusfin.ai`
- **Password**: `NexusDemo123!`
- **Virtual Balance**: `₹10,00,000.00`

---

## Regulatory Compliance & Disclaimer

> [!IMPORTANT]
> **Regulatory Disclaimer**:
> NEXUS is an educational and quantitative financial intelligence platform designed strictly for informational and simulation purposes. NEXUS is NOT a SEBI-registered Research Analyst, Investment Adviser, Portfolio Manager, or Broker-Dealer. Nothing within this software constitutes personalized investment, tax, or legal advice. 
> 
> All simulation outputs, backtesting models, candlestick pattern annotations, and AI research reports reflect historical observations and hypothetical assumptions. Past performance is no guarantee of future returns. Users must consult a qualified SEBI-registered financial advisor and chartered accountant prior to making real-world capital allocation decisions.

---

## License

This project is licensed under the MIT License — see the LICENSE file for details.
