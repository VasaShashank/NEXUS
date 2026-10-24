# NEXUS 2.0 implementation notes

## Changes made in this upgrade pass

- Corrected benchmark index units in the Markets and Overview views: index levels, day highs/lows, and point changes are shown in **points**, not ₹.
- Added authenticated model-backed tutor endpoints:
  - `POST /api/v1/ai/tutor/chat`
  - `POST /api/v1/ai/tutor/lesson`
- Connected the AI Tutor UI to the chat endpoint. The 10 existing lessons remain curated starter material; the new chat is genuinely model-backed when a provider key is configured.
- Added multi-provider AI failover across configured Groq, OpenAI, Gemini, and Ollama providers.
- Added a Marketaux news adapter using entity sentiment metadata when `MARKETAUX_API_TOKEN` is configured. When unavailable, news remains explicitly unscored rather than being labeled neutral by assumption.
- Added best-effort bounded PDF text extraction from BSE annual-report attachments for RAG; this requires the new `pypdf` dependency.
- Tightened CORS to the configured allowlist, disabled demo-account seeding by default, and made production startup reject the development-only secret.

## Required environment configuration

- `ENVIRONMENT=production` for production deployment
- `SECRET_KEY` set to a unique high-entropy secret in production
- `BACKEND_CORS_ORIGINS` set to the exact frontend origins
- At least one of `GROQ_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, or a configured `OLLAMA_BASE_URL` for live AI tutor responses
- `MARKETAUX_API_TOKEN` for news with third-party entity sentiment scores
- `ENABLE_DEMO_USER=true` only for local development, never production

Install backend dependencies from `backend/requirements.txt`. The new endpoints require the user to be signed in. They do not claim to work as live AI if no provider is configured.

## Market-data provider decision

Yahoo Finance/yfinance should not be treated as a guaranteed real-time or unlimited source. Choose a licensed provider based on the actual display rights, latency, history depth, instruments, and budget:

- **Groww Trade API** — useful if the project owner has API access and a valid token. Its official live-data docs describe batched LTP requests for up to 50 instruments per call: https://groww.in/trade-api/docs/curl/live-data
- **TrueData** — Indian exchange-focused provider offering WebSocket feeds, historical data, corporate announcements/actions, fundamentals and news, subject to the chosen subscription and exchange permissions: https://www.truedata.in/
- **NSE Data & Analytics** — official exchange data products including streaming, snapshot, end-of-day, historical and corporate data; usage/display rights require the relevant agreement: https://www.nseindia.com/static/nse-data-and-analytics
- **Marketaux** — optional news and entity-sentiment API: https://www.marketaux.com/

The code in this pass adds the Marketaux adapter and configuration but does **not** yet complete a production-grade Groww/TrueData market-data adapter. Do not set `MARKET_DATA_PROVIDER` and assume it switches the current market engine: provider routing, symbol mapping, historical candles, index snapshots, corporate actions and health checks still need to be implemented against the credentials and plan actually selected.

## Still required before calling the platform production-ready

1. Finish a licensed market-data abstraction and replace the 22-symbol curated universe with dynamic provider-backed search and pagination. Add per-provider rate limits, retries, freshness metadata and circuit breakers.
2. Implement real exchange corporate-actions and filing endpoints, then show source, exchange timestamp, attachment link and document extraction status. A failed exchange request must show unavailable, not fixtures.
3. Add a dedicated market-wide news feed and per-symbol news endpoint, deduplication, publisher timestamps, article links, and transparent sentiment methodology. Marketaux entity sentiment is a provider score, not a guarantee of market direction.
4. Upgrade RAG from keyword overlap to chunked document indexing, semantic retrieval, citations tied to exact source passages, and ingestion status. PDF extraction here is best-effort and cannot extract scanned PDFs without OCR.
5. Complete authentication: email verification, password reset, login rate limiting, refresh/revocation strategy, account recovery, secure deployment cookies or a documented token threat model, and user-isolation tests. This pass does not claim that auth is complete.
6. Persist tutor conversations, lessons and mastery in the database. Current chat history is sent by the client and is not yet server-persisted.
7. Test the full stack with real provider credentials, validate index symbols and all market-data field mappings, and add integration tests for rate limits, stale data, provider downtime, RAG citations and user isolation.
8. Add chart overlays for support/resistance zones and indicator values with an educational legend. RSI and MACD belong in separate panes because their scales differ from the stock price; the UI now explains this, but indicator interpretations must remain descriptive rather than guaranteed trading signals.

## Important

No API key is included in the archive. Live news/AI calls only work after you supply credentials. Market data redistribution and commercial display may require exchange/vendor licensing. Never represent delayed, stale, missing, or illustrative values as live.
