# NEXUS — Deployment & Stock-Prediction Decisions

## 1. Docker vs. UptimeRobot — decision: Docker (for the backend), not UptimeRobot

**What I found:** The backend is currently deployed as a Vercel Service —
a real Vercel feature (confirmed via their docs), running FastAPI as a
serverless Python function alongside the Next.js frontend. The database
falls back to SQLite at `/tmp/nexus.db` when no `DATABASE_URL` is set,
which is wiped on every cold start.

**Why UptimeRobot doesn't fix your problem:** UptimeRobot works by
pinging a URL periodically to stop a server from going idle. That only
helps on platforms that actually *sleep* an always-on process after
inactivity (e.g. Render's free tier, Railway in some configs). Vercel
Functions don't work that way — every invocation is a fresh, stateless
function call. Pinging it doesn't keep "the server" warm because there
isn't a persistent server to keep warm; you'd just be adding load without
fixing cold starts.

**Why Docker does help — but only if you also change where it runs:**
A Dockerfile by itself doesn't do anything on Vercel (Vercel Services
builds from your `entrypoint`, not a Dockerfile). What actually fixes
"takes too long to load data" is moving the backend to a platform that
runs it as one long-lived process instead of a serverless function:
Render, Railway, Fly.io, or a small VM. On those, Docker is the standard
way to ship the app, and — this part matters — a warm long-lived process
is exactly where the in-process TTL cache added this session (§ below)
pays off, because it persists across requests instead of resetting on
every cold start.

**What I did:** Added `backend/Dockerfile`, `frontend/Dockerfile`
(multi-stage, Next.js `standalone` output), `docker-compose.yml`, and
`.dockerignore` files. This gives you a real, working option to self-host
or deploy to Render/Railway/Fly without changing any application code —
`docker compose up --build` runs the full stack locally. Frontend can
stay on Vercel (it's a good fit there); it's specifically the Python
backend that benefits from moving off serverless.

**If you do move the backend:** set `DATABASE_URL` to a real Postgres
instance (Neon or Supabase both have workable free tiers) instead of
SQLite — this was already possible with zero code changes, since
`app/core/config.py` already reads `DATABASE_URL` from the environment.
*Then*, if you land on a platform that does sleep on inactivity (Render
free tier), UptimeRobot becomes genuinely useful — ping `/` or the
existing `/health` endpoint every 10 minutes.

## 2. Stock prediction — decision: do not add it

Your own README already states NEXUS's core engineering guardrail:
*"Pure Historical Observational Language... Forward-looking financial
guarantees and deterministic predictive assertions are forbidden across
all layers."* Every existing feature — candlestick patterns, sector
rotation, backtesting, AI research reports — was deliberately built to
describe what happened, not forecast what will happen next.

Adding an ML price-prediction feature (even framed as "just a signal")
would be the one feature in the entire platform that contradicts this
principle, and it's also the single highest-risk feature to get wrong in
a way that could mislead a real user with real money. It doesn't fit the
product you've built.

What *does* fit, and is either already present or a natural extension of
what's there: more technical indicators, more backtesting strategies
(rule-based, historically labeled), and descriptive factor research
(value/momentum/quality exposure) — all things NEXUS already does or is
scaffolded for. I'd keep the line exactly where it already is: describe
history, never predict the future.

## 3. Other things surfaced while implementing this

- `next@14.2.15` has a known, disclosed security vulnerability per npm's
  install warning (fixed in a later 14.x patch) — worth bumping when you
  next touch the frontend, independent of everything else here.
- Google Fonts (`next/font/google`) are fetched at build time from
  `fonts.googleapis.com`. If you ever build in a network-restricted CI
  environment, this will fail the build — worth knowing, not necessarily
  worth changing unless it actually bites you.
