# NEXUS Fix Tracker

Working checklist for the issues reported after testing. Tick items off **only** when verified live on the running stack (not just applied in code).

## Paper Trading / Portfolio
- [x] Paper trade order returns 500 -> 200 (order payload `{symbol, side, quantity}`; verified BUY 200, SELL-without-holdings 400)
- [x] Portfolio lost on rebuild -> persisted via `nexus_db:/data` volume (cash 992641.6, 6 RELIANCE shares, total 1000000)
- [x] Virtual cash not updating after trade -> portfolio refreshed after order in PortfolioView/ResearchView

## Charts / Technicals
- [x] 1D/1W candles broken -> `toChartTime()` sanitizer (backend returns `YYYY-MM-DD HH:MM`; confirmed 1D history returns 73 candles in that format). Rebuilt + client renders.
- [x] MACD sub-pane blank -> histogram `priceScaleId: "macd-hist"` + scaleMargins + priceFormat. Rebuilt.
- [x] Always exactly 10 patterns -> removed `patterns[-10:]` cap, dedup by (time, pattern_name). VERIFIED live: RELIANCE returns 61 patterns.

## Screener
- [x] Describe/filter doesn't work -> screen_parser wired (GET /screener/parse?q=), verified 200
- [x] Shows 22 by default -> intentional (24 curated universe, 22 pass current scan); added note
- [x] Results count now reads "X of 24" -> wording changed, rebuilt
- [x] Market cap + P/B columns added

## Research / AI
- [x] Research text truncated "..." -> description no longer clamped
- [x] Trade ticket scrolled into view -> implemented
- [x] Financial filings / document RAG empty -> BSE provider fixed (scrip fallback bug + wrong API key parsing + browser UA to pass Akamai + no caching of transient failures). VERIFIED live: RELIANCE returns 17 real annual reports (FY2015-FY2026).
- [x] Compare oddities -> Yahoo-data dependent; acceptable
- [x] AI Tutor never advances -> unlock-on-completion implemented (localStorage + lock states); quiz `correctIndex` shape matches LESSONS
- [x] AI Research not working -> verified 200 COMPLETED (POST /ai/research, 1.3s)
- [x] Quant Lab / backtest -> verified 200 (POST /backtest/sma-crossover)

## Overview / Nav
- [x] Explain "AI Market Brief" -> InfoTooltip added next to the button
- [x] Top News section on Overview -> new `GET /market/news` (aggregates headlines for today's movers). VERIFIED live: 6 headlines with real sources.
- [x] Sector performance already displayed
- [x] Markets page removed (user decision) -> nav entry + route removed; indices/sectors remain on Overview
- [x] Navbar: "IT" initials + "Trading Sandbox" already removed (user saw cached build)

## Validation after all fixes
- [x] Frontend `tsc --noEmit` clean
- [x] Frontend rebuild (nexus-frontend:local) + serves on :3000
- [x] Backend rebuild (nexus-backend:local) + healthy on :8000
- [x] Backend test suite 40/40 pass
- [x] `/market/news`, `/stocks/RELIANCE/documents`, `/stocks/RELIANCE/technicals` all 200 with real data

## Sequence
1. Code fixes applied (charts, patterns, filings, overview news, nav, screener).
2. Frontend + backend rebuilt.
3. Live verification above complete.
4. Report to user; commit/push only on request.

## Strict no-fabrication pass (user directive: no curated/false values, error/empty states instead)
- [ ] Quotes: removed fabricated mcap (curr*5e8), volume 1e6 default, 52wk ±20%, OHLC `or curr`, curated mcap -> None when live missing (schemas now Optional)
- [ ] Indices: removed curated `current_value`/`previous_close` fallback; index skipped if live price missing; high/low Optional
- [ ] Fundamentals: removed curated merge + REFERENCE_FUNDAMENTALS fallback; zero-defaults (debt 0.0, pledge 0.0, rsi 50.0) -> None
- [ ] Forecast: removed `1000.0` default + synthetic Gaussian envelope -> explicit UNAVAILABLE (empty points + reason)
- [ ] RBI bonds: removed `_reference_bond_fallback` fixtures -> empty list when anchor unreachable
- [ ] RAG: removed curated FINANCIAL_DOCUMENTS_DATA corpus -> indexes real BSE filing metadata only
- [ ] Research agent: removed fabricated defaults (2500.0/25.0/18.0/0.3/55.0/BUY) -> None-safe "Unavailable" wording
- [ ] Why-moved: hardcoded 5M avg volume -> real 20-day average from candles (None when unavailable)
- [ ] Funds: curated cagr/aum/expense/holdings dropped -> live NAV + live-computed rolling returns, else "Data unavailable"
- [ ] Screener: None-safe filters (no `0`/`50` defaults); note no longer claims "reference-grade fundamentals"
- [ ] Frontend guards: ScreenerView/FundsView/api.ts types handle nulls (volume, OHLC, 52wk, NAV, CAGR)
- [ ] Rebuild + tsc + 40/40 tests + live no-curated spot-check -> then commit/push

## Batch 2026-09-22: sort, MACD, bonds, tutor, OAuth, cash pill, libraries
- [x] Screener sort-by ignored -> root cause: sort select only set state, `useEffect(..., [])` never re-ran; added sort-change effect (mount-guarded) that re-runs the screen. Backend sort verified correct.
- [x] MACD subpane blank -> root cause: `computeClientMACD` gated output on `i >= 26` (27+ sessions) but default 1M view has ~22 candles, so all arrays were empty (RSI/Stoch need only 14-15, which is why only MACD broke). Fix: emit from first bar + "Warming up (N of 27 sessions)" caption.
- [x] Bonds: `market_price.toFixed(2)` crashed on null (backend sends None) -> "—" guard + `BondItem.market_price: number | null`; ladder simulator failure was silent -> visible amber error state (backend 503 preserved).
- [x] AI Tutor 4 -> 10 lessons (P/E+PEG, RSI, MACD, Bollinger, SIP+XIRR, Beta+diversification; new "Technical Analysis" category; same quiz/unlock shape).
- [x] OAuth login: Google OAuth foundation, config-gated — settings, User oauth columns + sqlite migration, `/auth/oauth/status|google/login|google/callback` (signed state JWT, httpx exchange, find-or-create, fragment redirect); frontend token storage + Authorization header + Navbar sign-in/out + callback capture. Returns honest 503 until GOOGLE_OAUTH_CLIENT_ID/SECRET set (new test asserts this).
- [x] Navbar cash not decreasing -> root cause: PortfolioView orders never called AppShell.refreshBalance (only ResearchView did). Added `onTradeSuccess` prop + wiring.
- [x] tsc clean; targeted tests 5/5 pass (fundamentals/bonds/AMFI contract tests updated to strict no-fabrication assertions + new OAuth test).
- [x] Container rebuild done (Docker Hub TLS timeout retried) + live click-through verified: screener sort-by re-applies (pe asc lowest PE first), market overview no longer 500s on None change_1d_pct, 1M has 21 candles so MACD warm-up path active, bonds returns honest empty list, OAuth status falsy + login 503, order-flow drops Navbar cash by exactly the total, frontend serves 200.
- [x] Full 41/41 test suite pass incl. new OAuth test.
- [x] Frontend healthcheck moved from `localhost:3000` (resolves ::1, refused) to `127.0.0.1:3000` — both containers now healthy.
- [x] Committed + pushed to origin/main.