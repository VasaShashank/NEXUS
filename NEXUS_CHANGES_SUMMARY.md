# NEXUS — Changes Summary (full session)

Everything below was verified, not assumed: I reinstalled backend deps
into a clean venv and ran pytest, and ran `npx tsc --noEmit` + `npm run
build` against the frontend after every batch of edits.

## Backend fixes

1. **Broken backend startup dependency (confirmed by running the test
   suite from a clean install).** `app/core/security.py` and
   `app/api/deps.py` did `import jwt` (PyJWT's import name), but only
   `python-jose` is listed in `requirements.txt` — a clean install could
   never satisfy this import, so the backend could not start at all.
   Fixed both files to `from jose import jwt`, and fixed a related
   exception-name mismatch (`jwt.PyJWTError` → `jwt.JWTError`, jose's
   actual name) in `deps.py`.

2. **`passlib`/`bcrypt` version incompatibility (also confirmed by
   running pytest).** `passlib[bcrypt]>=1.7.4` has no upper bound, and
   passlib 1.7.4 (unmaintained since 2020) can't parse bcrypt 4.1+'s
   version metadata, which throws `ValueError: password cannot be longer
   than 72 bytes` on *every* password, breaking login/signup entirely.
   Pinned `bcrypt<4.1` in `requirements.txt` with a comment explaining
   why. **Result: 12/13 backend tests now pass** (the 1 remaining
   failure is `RELIANCE.NS` not reachable — this sandbox has no network
   access to Yahoo Finance, not a code bug).

3. **No caching anywhere → slow loads, wasted yfinance calls.**
   `MarketDataProvider` had a `self._cache = {}` dict that was declared
   but never read or written — every quote, chart, and search hit
   yfinance live, every single time, with an N+1 pattern in
   `search_stocks()` (one `get_quote()` call per search result). Added
   `app/core/cache.py` — a thread-safe, in-process TTL cache — and
   applied it via `@ttl_cache(...)` to `get_quote` (20s), `get_indices`
   (30s), `get_historical_candles` (90s), and `search_stocks` (5 min) in
   `app/providers/market_data.py`. Documented honestly in the module
   docstring: this helps a lot on a long-running server, helps repeat
   requests even on serverless, but does not fix first-hit-after-cold-
   start latency — see `DEPLOYMENT_DECISIONS.md` for why that needs a
   platform change, not a code change.

## Frontend fixes

4. **The reported "mutual fund values not showing" bug**, and the same
   silent-failure pattern found in every other view. Root cause:
   fetch failures across the app were only `console.warn`'d and then
   silently left the UI empty (or, worse, stuck in an infinite skeleton
   loader) — nothing was ever shown to you. The MF/ETF data and API
   routing were both actually fine.

   **Fixed in all 14 views that had this pattern**, each with a real
   `error` state, a visible retry banner (reusing the styling already
   established in `StockCompareView`), and a `Retry` button wired to
   re-run the original fetch:
   - `FundsView` (the originally reported bug)
   - `OverviewView` — was stuck in an infinite skeleton loader on failure
   - `ResearchView` — was showing a misleading "Stock symbol not found"
     on a network failure; now distinguishes a real fetch error from a
     genuine not-found
   - `PortfolioView` — was stuck in an infinite skeleton loader
   - `AnalyticsView` — was stuck in an infinite skeleton loader
   - `WatchlistView`
   - `ScreenerView` — was showing a misleading "No stocks matched your
     filters" on a network failure; now distinguishes the two cases
   - `BondsView`
   - `CommoditiesFxView`
   - `MacroView`
   - `TaxView`
   - `JournalView` — was stuck in an infinite skeleton loader
   - `ResearchLabView` — both the backtest-run action and the background
     factor-research loader
   - `AiStudioView` — all three AI actions (Research Agent, Why-Did-It-
     Move, Portfolio Doctor), each with its own error banner + retry

   Verified with `npx tsc --noEmit` (zero errors) after every batch of
   edits. `npm run build` fails in this sandbox only because
   `next/font/google` can't reach `fonts.googleapis.com` here — a
   sandbox network restriction, not a code issue (confirmed the error is
   purely a font-fetch failure, nothing else).

## Deployment / infrastructure additions

5. **Docker.** Added `backend/Dockerfile`, `backend/.dockerignore`,
   `frontend/Dockerfile` (multi-stage, uses Next.js `standalone` output
   — added `output: "standalone"` to `next.config.mjs` to enable this),
   `frontend/.dockerignore`, and a root `docker-compose.yml` (backend +
   frontend + an optional Postgres profile). Full reasoning for *why*
   Docker (and *not* UptimeRobot, and *not* on Vercel) in
   `DEPLOYMENT_DECISIONS.md`.

6. **`DEPLOYMENT_DECISIONS.md`** — written decision doc covering:
   Docker vs. UptimeRobot (and why neither alone fixes Vercel serverless
   cold starts — the backend needs to move to a long-running host to get
   real benefit from either), and a recommendation **against** adding
   stock-price prediction, reasoned directly from NEXUS's own stated
   "zero fabrication / non-predictive" engineering principle in its
   README.

## Not touched / known follow-ups

- SQLite at `/tmp/nexus.db` is still the default on Vercel and is still
  ephemeral. No code change was needed to fix this — `DATABASE_URL`
  already reads from the environment — it just needs to actually be set
  to a Postgres URL (Neon/Supabase free tier) in production.
- `next@14.2.15` has a disclosed security vulnerability per npm's own
  install warning; worth a version bump next time the frontend is
  touched.
- No UI/visual/navigation changes were made anywhere. Every change in
  this pass is either a bug fix, an added error state using the app's
  existing visual language, or new deployment tooling that doesn't touch
  the running app's design at all.
