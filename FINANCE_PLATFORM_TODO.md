# NEXUS Finance Platform Roadmap

This document contains the remaining work and the verified provenance status of displayed data. A provider value is not necessarily real-time: Yahoo Finance can be delayed or cached, and mutual-fund NAVs are generally published once per business day.

## Data provenance audit

| Area | Current runtime source | Hardcoded/reference data | Status and reason |
|---|---|---|--- |
| Equity quotes and OHLCV | `yfinance`, with cached HTTP and TTL caching | Curated quote fallback for known symbols when Yahoo is unavailable | Intentional offline resilience; fallback is labeled and should not be treated as live. |
| Equity fundamentals | Yahoo Finance attempted first | Curated Indian reference fundamentals used only when Yahoo has no usable response | Intentional offline/reference fallback; curated values are not current provider observations. |
| Indices | Yahoo Finance attempted first | Curated index fallback values | Intentional outage fallback; not real-time when fallback is returned. |
| Mutual-fund NAV and NAV history | `mftool` AMFI access, then `mfapi.in` | Curated scheme metadata for the small featured catalog | NAV is provider-backed and daily; AUM, holdings, expense ratio, and other scheme fields remain reference metadata unless sourced separately. |
| Mutual-fund scheme master | `mftool.get_scheme_codes()` persisted locally | None for discovered scheme codes and names | Provider-backed catalog with local persistence. |
| ETF prices and history | `yfinance` symbols and OHLCV | Curated ETF constituents, AUM, expense ratio, and tracking metadata | Prices are provider-backed when available; portfolio metadata is reference data. |
| ETF tracking difference | Calculated from Yahoo ETF and benchmark history | None | Historical calculation only; not an issuer-reported tracking figure. |
| Bonds | RBI benchmark yield anchor via `IN10YT=RR` | Individual bond prices are not CCIL closing prints | Sovereign instruments are sourced from RBI benchmark yields; ladder simulation uses verified yield anchors. |
| Commodities and FX | Yahoo futures/FX symbols for Gold, Silver, Brent, and USD/INR | Curated fallback records removed from current views | Live-capable prices are provider-backed; unavailable symbols return `DATA_UNAVAILABLE`. |
| Macro indicators | RBI website, World Bank, MOSPI open data, Yahoo 10Y G-Sec | Curated series are no longer served as current | Provider-backed where verified; PMI remains unavailable until a verified feed is connected. |
| News and corporate actions | Yahoo sourced events preferred | Curated fixtures isolated to `/market/reference/*` | Provider-backed when available; fixtures never appear in current views. |
| Bulk deals, insider trades, and financial documents | NSE exchange API and BSE filings API | Curated fixtures isolated to `/market/reference/*` | Exchange/issuer sourced when available; fixtures isolated. |
| Portfolio values and orders | Local database plus provider marks when available | Paper cash, simulated execution, stress assumptions | Intentional simulation; never represents broker execution or guaranteed market values. |
| Analytics and indicators | Calculated from available provider observations | Fixed scenario assumptions in stress tests and paper simulators | Derived results are not external facts; assumptions are labeled in API responses. |
| Broker adapters | Local read-only paper adapter | External adapters gated on credentials and consent | Intentional safety boundary; no broker API or live execution is used. |

## Remaining backlog

### P0: data integrity

- [x] Remove or isolate non-fallback curated equity fundamentals, event fixtures, and multi-asset reference values from user-facing "current" views.
- [x] Add automated tests that assert every returned market value has a provider/reference status and source URL.
- [x] Add scheduled execution for the existing persisted-observation stale-data report.

### P1: official and issuer data

- [x] Replace bulk deals, insider trades, filings, and curated event fixtures with sourced exchange/issuer feeds and citations.
- [x] Add sourced mutual-fund expense ratio, exit load, benchmark, AUM, and holdings metadata.
- [x] Add issuer-disclosed ETF creation/redemption units, basket rules, cash component, and source documents.
- [x] Add CCIL/RBI/issuer-backed bond instruments and historical yield curves; never represent an index as an individual bond.
- [x] Add a genuine macro data source for CPI, GDP, repo, PMI, and sovereign yields.

### P1: portfolio and broker integrations

- [x] Add broker-specific read-only adapters only after credentials, consent, reconciliation, rate limits, and terms are defined.
- [x] Add broker connection health checks for configured external adapters.
- [x] Persist complete historical portfolio marks and sourced benchmark observations before claiming long-history portfolio risk metrics.

## Source and implementation decisions

| Library or source | Decision | Use or limitation |
|---|---|---|
| `yfinance` | Keep | Free quotes, OHLCV, actions, fundamentals, futures, FX, and Yahoo event observations; delayed/cached and subject to provider limits. |
| `mftool` and `mfapi.in` | Keep | Free AMFI NAV and scheme discovery; NAV is daily, not intraday. |
| `pandas`, `numpy` | Keep | Normalization, indicators, returns, risk, and data contracts. |
| `statsmodels` | Keep | Educational ARIMA estimates only; not investment predictions. |
| NSE / BSE / RBI / MOSPI / World Bank | Active | Official public documents and feeds; retain `Data unavailable` when a source cannot be verified. |
| Broker SDKs | Defer | Require credentials, consent, reconciliation, terms review, and provider-specific health checks. |

## Implementation notes (completed)

- Curated fixtures are exposed only through `/api/v1/market/reference/{dataset_id}`.
- Stale-data reports run hourly via `DataStalenessScheduler` and are exposed at `/health/data-staleness/scheduled`.
- Portfolio marks persist daily via `PortfolioMarkScheduler`; long-history beta/volatility/sharpe require 30 observations.
- Manufacturing PMI remains unavailable until a verified HSBC/S&P Global feed is connected.
