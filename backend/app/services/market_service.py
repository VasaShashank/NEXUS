"""
Market Data & Screener Service.
Orchestrates quotes, historical series, technical indicators, news, corporate actions,
and screening queries with dynamic yfinance fundamentals lookup.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import yfinance as yf
from app.core.cache import ttl_cache, get_cached_session
from app.providers.market_data import market_data_provider
from app.providers.indian_equities_data import (
    INDIAN_STOCKS_DATA,
    INDIAN_INDICES,
    INDEX_CONSTITUENT_CHANGES
)
from app.providers.nse_provider import nse_provider
from app.providers.bse_filings_provider import bse_filings_provider
from app.schemas.stock import (
    StockQuote,
    IndexQuote,
    HistoricalCandle,
    TechnicalIndicatorsResponse,
    FundamentalData,
    NewsItem,
    DocumentItem,
    MarketOverviewResponse,
    ScreenerFilterRequest,
    CorporateActionItem,
    BulkBlockDealItem,
    InsiderTradeItem,
    IndexConstituentChange
)
from app.services.technical_indicators import TechnicalIndicatorsService
from app.services.provenance_service import record_observation


class MarketService:
    @staticmethod
    @ttl_cache(ttl_seconds=86400)
    def get_valuation_bands(symbol: str) -> Optional[Dict[str, Any]]:
        """Compare current multiples with annual historical observations from Yahoo data."""
        norm = symbol.upper().split(".")[0]
        try:
            ticker = yf.Ticker(f"{norm}.NS")
            history = ticker.history(period="5y", interval="1mo", auto_adjust=False)
            income = ticker.financials
            balance_sheet = ticker.balance_sheet
            if history is None or history.empty or income is None or income.empty:
                return None

            price_by_year = {}
            for index, row in history.iterrows():
                close = row.get("Close")
                if close is not None and close == close:
                    year = index.strftime("%Y") if hasattr(index, "strftime") else str(index)[:4]
                    price_by_year[year] = float(close)

            def annual_ratios(labels: List[str], denominator_scale: float = 1.0) -> List[float]:
                for label in labels:
                    if label not in income.index:
                        continue
                    values = []
                    for column in sorted(income.columns):
                        year = column.strftime("%Y") if hasattr(column, "strftime") else str(column)[:4]
                        raw_value = income.loc[label, column]
                        price = price_by_year.get(year)
                        if raw_value is not None and raw_value == raw_value and price and float(raw_value) > 0:
                            denominator = float(raw_value) / denominator_scale
                            if denominator > 0:
                                values.append(price / denominator)
                    if values:
                        return values
                return []

            pe_history = annual_ratios(["Diluted EPS", "Basic EPS"], denominator_scale=1.0)
            shares_outstanding = None
            try:
                shares_outstanding = float((ticker.info or {}).get("sharesOutstanding"))
            except (TypeError, ValueError):
                shares_outstanding = None
            pb_history = []
            if shares_outstanding and balance_sheet is not None and not balance_sheet.empty:
                for label in ("Stockholders Equity", "Common Stock Equity", "Total Equity Gross Minority Interest"):
                    if label not in balance_sheet.index:
                        continue
                    for column in sorted(balance_sheet.columns):
                        year = column.strftime("%Y") if hasattr(column, "strftime") else str(column)[:4]
                        price = price_by_year.get(year)
                        equity = balance_sheet.loc[label, column]
                        book_value_per_share = float(equity) / shares_outstanding if equity == equity else 0
                        if price and book_value_per_share > 0:
                            pb_history.append(price / book_value_per_share)
                    if pb_history:
                        break

            current = MarketService.get_fundamentals(norm)
            def summary(values: List[float], current_value: Optional[float]) -> Dict[str, Any]:
                if not values:
                    return {"current": current_value, "median": None, "p25": None, "p75": None, "observations": 0}
                ordered = sorted(values)
                midpoint = len(ordered) // 2
                median = ordered[midpoint] if len(ordered) % 2 else (ordered[midpoint - 1] + ordered[midpoint]) / 2
                return {
                    "current": current_value,
                    "median": round(median, 2),
                    "p25": round(ordered[max(0, int(len(ordered) * 0.25) - 1)], 2),
                    "p75": round(ordered[min(len(ordered) - 1, int(len(ordered) * 0.75))], 2),
                    "observations": len(ordered),
                }
            return {
                "symbol": norm,
                "pe": summary(pe_history, current.pe_ratio if current else None),
                "pb": summary(pb_history, current.pb_ratio if current else None),
                "source": "Yahoo Finance monthly prices and annual statements",
                "methodology": "Historical P/E uses annual positive EPS and the closest monthly close for each statement year. Historical P/B uses annual equity divided by the latest reported shares outstanding; unavailable denominators are excluded.",
                "disclaimer": "Historical valuation bands are descriptive observations, not fair-value estimates or forecasts.",
            }
        except Exception:
            return None

    @staticmethod
    @ttl_cache(ttl_seconds=3600)
    def get_sourced_events(symbol: str) -> List[Dict[str, Any]]:
        """Return deduplicated Yahoo Finance earnings, actions, and news observations."""
        norm = symbol.upper().split(".")[0]
        events: List[Dict[str, Any]] = []
        try:
            ticker = yf.Ticker(f"{norm}.NS")
            calendar = ticker.calendar
            earnings_dates = calendar.get("Earnings Date", []) if isinstance(calendar, dict) else []
            if not isinstance(earnings_dates, (list, tuple)):
                earnings_dates = [earnings_dates]
            for date_value in earnings_dates:
                if date_value is not None:
                    events.append({
                        "event_type": "EARNINGS_CALENDAR",
                        "symbol": norm,
                        "event_date": str(date_value)[:10],
                        "title": "Expected earnings date",
                        "summary": "Yahoo Finance calendar observation for a reported expected earnings date.",
                        "details": "Provider-reported earnings calendar date; timing and results may change.",
                        "uncertainty": "MEDIUM: provider calendar dates can change before issuer confirmation.",
                        "source": "Yahoo Finance",
                        "source_url": f"https://finance.yahoo.com/quote/{norm}.NS/",
                    })

            actions = ticker.actions
            if actions is not None and not actions.empty:
                for index, row in actions.iterrows():
                    event_date = index.strftime("%Y-%m-%d") if hasattr(index, "strftime") else str(index)[:10]
                    dividend = row.get("Dividends", 0)
                    split = row.get("Stock Splits", 0)
                    if dividend and float(dividend) != 0:
                        events.append({
                            "event_type": "DIVIDEND",
                            "symbol": norm,
                            "event_date": event_date,
                            "title": "Dividend distribution",
                            "summary": "Historical dividend action reported by the market-data provider.",
                            "details": f"Reported cash dividend per share: {float(dividend):.4f}.",
                            "uncertainty": "LOW: historical action supplied by the provider; corporate records remain authoritative.",
                            "source": "Yahoo Finance actions",
                            "source_url": f"https://finance.yahoo.com/quote/{norm}.NS/history/",
                        })
                    if split and float(split) != 0:
                        events.append({
                            "event_type": "STOCK_SPLIT",
                            "symbol": norm,
                            "event_date": event_date,
                            "title": "Stock split",
                            "summary": "Historical split action reported by the market-data provider.",
                            "details": f"Reported split ratio: {float(split):g}.",
                            "uncertainty": "LOW: historical action supplied by the provider; corporate records remain authoritative.",
                            "source": "Yahoo Finance actions",
                            "source_url": f"https://finance.yahoo.com/quote/{norm}.NS/history/",
                        })

            seen_news = set()
            for item in (ticker.news or []):
                content = item.get("content", item)
                title = content.get("title") or item.get("title")
                if not title:
                    continue
                key = " ".join(title.lower().split())
                if key in seen_news:
                    continue
                seen_news.add(key)
                provider_date = content.get("pubDate") or item.get("providerPublishTime")
                if isinstance(provider_date, (int, float)):
                    provider_date = datetime.fromtimestamp(provider_date, timezone.utc).isoformat()
                provider_url = content.get("canonicalUrl", {}).get("url") if isinstance(content.get("canonicalUrl"), dict) else content.get("link") or item.get("link")
                events.append({
                    "event_type": "NEWS",
                    "symbol": norm,
                    "event_date": str(provider_date or "")[:25],
                    "title": title,
                    "summary": content.get("summary") or item.get("publisher") or "Provider news observation.",
                    "details": content.get("summary") or item.get("publisher") or "Yahoo Finance provider news.",
                    "uncertainty": "MEDIUM: provider headline and summary are not independently verified by NEXUS.",
                    "source": content.get("provider") or item.get("publisher") or "Yahoo Finance",
                    "source_url": provider_url,
                })
        except Exception:
            return []
        events = sorted(events, key=lambda event: event.get("event_date", ""), reverse=True)
        record_observation("yfinance", "sourced-events", norm, f"https://finance.yahoo.com/quote/{norm}.NS/", events)
        return events

    @staticmethod
    def _technical_screen_metrics(symbol: str, benchmark_candles: Optional[List[HistoricalCandle]]) -> Dict[str, Optional[float]]:
        candles = market_data_provider.get_historical_candles(symbol, "1Y")
        if len(candles) < 22:
            return {"relative_volume": None, "beta": None, "atr_pct": None}
        average_volume = sum(candle.volume for candle in candles[-21:-1]) / 20
        relative_volume = candles[-1].volume / average_volume if average_volume > 0 else None
        true_ranges = []
        for index in range(1, len(candles)):
            current = candles[index]
            previous = candles[index - 1]
            true_ranges.append(max(current.high - current.low, abs(current.high - previous.close), abs(current.low - previous.close)))
        atr = sum(true_ranges[-14:]) / 14 if len(true_ranges) >= 14 else None
        atr_pct = (atr / candles[-1].close) * 100 if atr is not None and candles[-1].close > 0 else None
        beta = None
        if benchmark_candles:
            benchmark_by_date = {candle.time: candle.close for candle in benchmark_candles}
            paired_returns = []
            for index in range(1, len(candles)):
                previous_stock = candles[index - 1]
                current_stock = candles[index]
                previous_benchmark = benchmark_by_date.get(previous_stock.time)
                current_benchmark = benchmark_by_date.get(current_stock.time)
                if previous_benchmark and current_benchmark and previous_stock.close > 0 and previous_benchmark > 0:
                    paired_returns.append(((current_stock.close / previous_stock.close) - 1, (current_benchmark / previous_benchmark) - 1))
            if len(paired_returns) >= 20:
                stock_avg = sum(pair[0] for pair in paired_returns) / len(paired_returns)
                benchmark_avg = sum(pair[1] for pair in paired_returns) / len(paired_returns)
                covariance = sum((stock - stock_avg) * (benchmark - benchmark_avg) for stock, benchmark in paired_returns)
                variance = sum((benchmark - benchmark_avg) ** 2 for _, benchmark in paired_returns)
                beta = covariance / variance if variance > 0 else None
        return {"relative_volume": relative_volume, "beta": beta, "atr_pct": atr_pct}

    @staticmethod
    def _cagr_from_series(values: List[float]) -> Optional[float]:
        clean = [value for value in values if value is not None and value > 0]
        if len(clean) < 2:
            return None
        periods = len(clean) - 1
        return round(((clean[-1] / clean[0]) ** (1 / periods) - 1) * 100, 2)

    @staticmethod
    def _cagr_windows(values: List[Dict[str, Any]]) -> Dict[str, Optional[float]]:
        clean = [entry["value"] for entry in values if entry.get("value") is not None and entry["value"] > 0]
        result: Dict[str, Optional[float]] = {}
        for years in (3, 5, 10):
            result[f"{years}y"] = round(((clean[-1] / clean[-(years + 1)]) ** (1 / years) - 1) * 100, 2) if len(clean) > years else None
        return result

    @staticmethod
    @ttl_cache(ttl_seconds=86400)
    def get_historical_fundamentals(symbol: str) -> Optional[Dict[str, Any]]:
        """Return sourced annual statement values and CAGRs where Yahoo provides them."""
        norm = symbol.upper().split(".")[0]
        try:
            ticker = yf.Ticker(f"{norm}.NS")
            income = ticker.financials
            cashflow = ticker.cashflow
            if income is None or income.empty:
                return None

            def statement_values(frame: Any, labels: List[str], scale: float = 10000000.0) -> List[Dict[str, Any]]:
                for label in labels:
                    if label in frame.index:
                        values = []
                        for column in sorted(frame.columns):
                            raw_value = frame.loc[label, column]
                            if raw_value is not None and raw_value == raw_value:
                                values.append({"period": column.strftime("%Y") if hasattr(column, "strftime") else str(column), "value": round(float(raw_value) / scale, 2)})
                        if values:
                            return values
                return []

            series = {
                "revenue": statement_values(income, ["Total Revenue", "Operating Revenue"]),
                "net_income": statement_values(income, ["Net Income", "Net Income Common Stockholders"]),
                "eps": statement_values(income, ["Diluted EPS", "Basic EPS"], scale=1.0),
                "free_cash_flow": statement_values(cashflow, ["Free Cash Flow"]) if cashflow is not None and not cashflow.empty else [],
            }
            cagr = {name: MarketService._cagr_windows(values) for name, values in series.items()}

            balance_sheet = ticker.balance_sheet
            quarterly_income = ticker.quarterly_financials
            quarterly_balance_sheet = ticker.quarterly_balance_sheet
            quarterly_cashflow = ticker.quarterly_cashflow

            def statement_table(frame: Any) -> List[Dict[str, Any]]:
                if frame is None or frame.empty:
                    return []
                periods = [column.strftime("%Y-%m-%d") if hasattr(column, "strftime") else str(column) for column in frame.columns]
                rows = []
                for label in frame.index:
                    values = []
                    for column in frame.columns:
                        raw_value = frame.loc[label, column]
                        values.append(round(float(raw_value) / 10000000.0, 2) if raw_value is not None and raw_value == raw_value else None)
                    rows.append({"metric": str(label), "periods": dict(zip(periods, values))})
                return rows

            statements = {
                "annual": {
                    "income_statement": statement_table(income),
                    "balance_sheet": statement_table(balance_sheet),
                    "cash_flow": statement_table(cashflow),
                },
                "quarterly": {
                    "income_statement": statement_table(quarterly_income),
                    "balance_sheet": statement_table(quarterly_balance_sheet),
                    "cash_flow": statement_table(quarterly_cashflow),
                },
            }
            def latest_value(frame: Any, labels: List[str]) -> Optional[float]:
                if frame is None or frame.empty:
                    return None
                for label in labels:
                    if label in frame.index:
                        raw_value = frame.loc[label].iloc[0]
                        if raw_value is not None and raw_value == raw_value:
                            return float(raw_value)
                return None

            revenue = latest_value(income, ["Total Revenue", "Operating Revenue"])
            cogs = latest_value(income, ["Cost Of Revenue", "Cost Of Goods Sold"])
            inventory = latest_value(balance_sheet, ["Inventory", "Inventory Raw Materials", "Finished Goods"])
            receivables = latest_value(balance_sheet, ["Receivables", "Accounts Receivable", "Net Receivables"])
            payables = latest_value(balance_sheet, ["Payables", "Accounts Payable", "Current Liabilities"])
            working_capital = {
                "inventory_days": round((inventory / cogs) * 365, 2) if inventory is not None and cogs and cogs > 0 else None,
                "debtor_days": round((receivables / revenue) * 365, 2) if receivables is not None and revenue and revenue > 0 else None,
                "payable_days": round((payables / cogs) * 365, 2) if payables is not None and cogs and cogs > 0 else None,
            }
            if all(value is not None for value in working_capital.values()):
                working_capital["cash_cycle_days"] = round(
                    working_capital["inventory_days"] + working_capital["debtor_days"] - working_capital["payable_days"], 2
                )
            else:
                working_capital["cash_cycle_days"] = None
            return {
                "symbol": norm,
                "annual": series,
                "cagr": cagr,
                "working_capital": working_capital,
                "statements": statements,
                "source": "Yahoo Finance annual statements",
                "as_of": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "methodology": "CAGR uses the oldest and newest positive annual observations returned by the provider; missing series remain unavailable.",
            }
        except Exception:
            return None

    @staticmethod
    def get_indices() -> List[IndexQuote]:
        indices = market_data_provider.get_indices()
        record_observation("yfinance", "indices", None, "https://finance.yahoo.com/markets/indices/", [item.model_dump() for item in indices])
        return indices

    @staticmethod
    def get_quote(symbol: str) -> Optional[StockQuote]:
        quote = market_data_provider.get_quote(symbol)
        if quote:
            record_observation("yfinance", "quote", quote.symbol, f"https://finance.yahoo.com/quote/{quote.symbol}.NS/", quote.model_dump())
        return quote

    @staticmethod
    def get_historical_candles(symbol: str, timeframe: str = "1M") -> List[HistoricalCandle]:
        candles = market_data_provider.get_historical_candles(symbol, timeframe)
        norm = symbol.upper().split(".")[0]
        record_observation("yfinance", f"history:{timeframe}", norm, f"https://finance.yahoo.com/quote/{norm}.NS/history/", [item.model_dump() for item in candles], "SUCCESS" if candles else "NO_DATA")
        return candles

    @staticmethod
    def get_technical_indicators(symbol: str) -> TechnicalIndicatorsResponse:
        quote = market_data_provider.get_quote(symbol)
        if not quote:
            raise ValueError(f"No quote data available for '{symbol}'.")
        price = quote.current_price
        candles = market_data_provider.get_historical_candles(symbol, "6M")
        return TechnicalIndicatorsService.calculate_all(symbol, price, candles)

    @staticmethod
    @ttl_cache(ttl_seconds=86400)
    def get_fundamentals(symbol: str) -> Optional[FundamentalData]:
        norm = symbol.upper().split(".")[0]
        # Dynamically fetch fundamentals from yfinance for any stock.
        yf_sym = f"{norm}.NS" if not norm.endswith(".NS") else norm
        try:
            sess = get_cached_session()
            ticker = yf.Ticker(yf_sym)
            info = ticker.info
            if info and ("marketCap" in info or "trailingPE" in info or "currentPrice" in info):
                mcap = info.get("marketCap")
                mcap_cr = round(mcap / 10000000.0, 2) if mcap else None
                pe = round(float(info["trailingPE"]), 2) if info.get("trailingPE") else None
                pb = round(float(info["priceToBook"]), 2) if info.get("priceToBook") else None
                ev_ebitda = round(float(info["enterpriseToEbitda"]), 2) if info.get("enterpriseToEbitda") else None
                roe = round(float(info["returnOnEquity"]) * 100, 2) if info.get("returnOnEquity") else None
                de = round(float(info["debtToEquity"]) / 100, 2) if info.get("debtToEquity") else None
                div_yield = round(float(info["dividendYield"]) * 100, 2) if info.get("dividendYield") else None
                rev_growth = round(float(info["revenueGrowth"]) * 100, 2) if info.get("revenueGrowth") else None
                profit_growth = round(float(info["earningsGrowth"]) * 100, 2) if info.get("earningsGrowth") else None
                eps = round(float(info["trailingEps"]), 2) if info.get("trailingEps") else None
                op_margin = round(float(info["operatingMargins"]) * 100, 2) if info.get("operatingMargins") else None
                net_margin = round(float(info["profitMargins"]) * 100, 2) if info.get("profitMargins") else None
                debt = round(float(info["totalDebt"]) / 10000000.0, 2) if info.get("totalDebt") else None
                fcf = round(float(info["freeCashflow"]) / 10000000.0, 2) if info.get("freeCashflow") else None
                insiders = round(float(info["heldPercentInsiders"]) * 100, 2) if info.get("heldPercentInsiders") else None
                return FundamentalData(
                    symbol=norm,
                    market_cap=mcap_cr,
                    pe_ratio=pe,
                    pb_ratio=pb,
                    ev_to_ebitda=ev_ebitda,
                    roe=roe,
                    roce=None,
                    debt_to_equity=de,
                    dividend_yield=div_yield,
                    revenue_growth_yoy=rev_growth,
                    profit_growth_yoy=profit_growth,
                    eps=eps,
                    operating_margin=op_margin,
                    net_margin=net_margin,
                    total_debt=debt,
                    free_cash_flow=fcf,
                    promoter_holding=insiders,
                    promoter_pledge_pct=None,
                    fii_holding=None,
                    dii_holding=None,
                    rsi_14=None,
                    source="NSE / BSE Exchange Filings (via Yahoo Finance API)",
                    as_of_date=datetime.now(timezone.utc).strftime("%Y-%m"),
                    data_status="SOURCED_PROVIDER",
                    source_url=f"https://finance.yahoo.com/quote/{yf_sym}/",
                )
        except Exception:
            pass

        # No curated fundamental fallback: callers must show Data unavailable.
        return None

    @staticmethod
    def get_corporate_actions(symbol: Optional[str] = None) -> List[CorporateActionItem]:
        if not symbol:
            return []
        sourced = MarketService.get_sourced_events(symbol)
        sourced_actions = [event for event in sourced if event["event_type"] in {"DIVIDEND", "STOCK_SPLIT"}]
        if not sourced_actions:
            return []
        quote = market_data_provider.get_quote(symbol)
        company_name = quote.company_name if quote else symbol.upper()
        return [CorporateActionItem(
            symbol=symbol.upper().split(".")[0],
            company_name=company_name,
            action_type="DIVIDEND" if event["event_type"] == "DIVIDEND" else "SPLIT",
            ex_date=event["event_date"],
            details=event["details"],
            impact_summary=f"Source: {event.get('source_url') or event.get('source')}. {event.get('uncertainty', '')}".strip(),
        ) for event in sourced_actions]

    @staticmethod
    def get_bulk_block_deals(symbol: Optional[str] = None) -> List[BulkBlockDealItem]:
        deals = nse_provider.get_bulk_block_deals(symbol)
        return [BulkBlockDealItem(**{k: v for k, v in deal.items() if k in BulkBlockDealItem.model_fields}) for deal in deals]

    @staticmethod
    def get_insider_trades(symbol: Optional[str] = None) -> List[InsiderTradeItem]:
        trades = nse_provider.get_insider_trades(symbol)
        return [InsiderTradeItem(**{k: v for k, v in trade.items() if k in InsiderTradeItem.model_fields}) for trade in trades]

    @staticmethod
    def get_index_constituent_changes(index_name: Optional[str] = None) -> List[IndexConstituentChange]:
        changes = []
        for item in INDEX_CONSTITUENT_CHANGES:
            if index_name and item["index_name"].upper() != index_name.upper():
                continue
            changes.append(IndexConstituentChange(**item))
        return changes

    @staticmethod
    def get_news(symbol: Optional[str] = None) -> List[NewsItem]:
        if not symbol:
            return []
        sourced = [event for event in MarketService.get_sourced_events(symbol) if event["event_type"] == "NEWS"]

        def _normalize_source(raw: Any) -> str:
            if isinstance(raw, dict):
                return raw.get("displayName") or raw.get("label") or raw.get("sourceId") or "Yahoo Finance"
            if isinstance(raw, str) and raw:
                return raw
            return "Yahoo Finance"

        return [NewsItem(
            id=index + 1,
            symbol=event["symbol"],
            headline=event["title"],
            summary=event.get("summary") or event.get("details"),
            source=_normalize_source(event.get("source")),
            url=event.get("source_url"),
            sentiment="NEUTRAL",
            sentiment_score=0.0,
            published_at=event.get("event_date", ""),
        ) for index, event in enumerate(sourced)]

    @staticmethod
    def get_documents(symbol: Optional[str] = None) -> List[DocumentItem]:
        if not symbol:
            return []
        docs = bse_filings_provider.get_documents(symbol)
        return [DocumentItem(
            id=doc["id"],
            symbol=doc["symbol"],
            title=doc["title"],
            doc_type=doc["doc_type"],
            fiscal_year=doc.get("fiscal_year"),
            content=doc["content"],
            created_at=doc.get("created_at") or "",
        ) for doc in docs]

    @staticmethod
    @ttl_cache(ttl_seconds=120)
    def get_market_overview() -> MarketOverviewResponse:
        indices = market_data_provider.get_indices()
        symbols = list(INDIAN_STOCKS_DATA.keys())
        quotes_dict = market_data_provider.get_batch_quotes(symbols)
        all_quotes = [quotes_dict[s] for s in symbols if s in quotes_dict]

        if not all_quotes:
            for sym in symbols:
                q = market_data_provider.get_quote(sym)
                if q:
                    all_quotes.append(q)

        sorted_by_change = sorted(all_quotes, key=lambda x: x.change_1d_pct, reverse=True)
        top_gainers = sorted_by_change[:5]
        top_losers = sorted_by_change[-5:][::-1]
        most_active = sorted(all_quotes, key=lambda x: x.volume, reverse=True)[:5]

        advancing = sum(1 for q in all_quotes if q.change_1d > 0)
        declining = sum(1 for q in all_quotes if q.change_1d < 0)
        unchanged = sum(1 for q in all_quotes if q.change_1d == 0)
        ad_ratio = round(advancing / max(1, declining), 2)

        regime = "BULLISH" if ad_ratio > 1.2 else ("BEARISH" if ad_ratio < 0.8 else "NEUTRAL")

        # Sector performance
        sector_map: Dict[str, List[float]] = {}
        for q in all_quotes:
            s = q.sector or "Other"
            sector_map.setdefault(s, []).append(q.change_1d_pct)

        sector_perf = []
        for sec, chgs in sector_map.items():
            sector_perf.append({
                "sector": sec,
                "average_change_pct": round(sum(chgs) / len(chgs), 2),
                "constituents_count": len(chgs)
            })
        sector_perf.sort(key=lambda x: x["average_change_pct"], reverse=True)

        return MarketOverviewResponse(
            indices=indices,
            top_gainers=top_gainers,
            top_losers=top_losers,
            most_active=most_active,
            market_breadth={
                "advancing": advancing,
                "declining": declining,
                "unchanged": unchanged,
                "advance_decline_ratio": ad_ratio,
                "regime": regime
            },
            sector_performance=sector_perf
        )

    @staticmethod
    def run_screener(filters: ScreenerFilterRequest) -> List[Dict[str, Any]]:
        symbols = list(INDIAN_STOCKS_DATA.keys())
        quotes_dict = market_data_provider.get_batch_quotes(symbols)
        needs_technical_metrics = any(value is not None for value in (
            filters.min_relative_volume, filters.min_beta, filters.max_beta,
            filters.min_atr_pct, filters.max_atr_pct,
        ))
        benchmark_candles = market_data_provider.get_historical_candles("^NSEI", "1Y") if needs_technical_metrics else None

        def _row_for_symbol(sym: str) -> Optional[Dict[str, Any]]:
            quote = quotes_dict.get(sym) or market_data_provider.get_quote(sym)
            if not quote:
                return None

            fund_response = MarketService.get_fundamentals(sym)
            if not fund_response:
                return None
            fund = fund_response.model_dump()
            distance_from_high = ((quote.current_price / quote.week_52_high) - 1) * 100 if quote.week_52_high else None
            distance_from_low = ((quote.current_price / quote.week_52_low) - 1) * 100 if quote.week_52_low else None

            def _fund_val(key: str) -> Optional[float]:
                val = fund.get(key)
                return val if val is not None else None

            # Filter checks (a metric with no live value never passes a strict numeric filter)
            if filters.sector and filters.sector.lower() not in (quote.sector or "").lower():
                return None
            if filters.min_market_cap is not None and (_fund_val("market_cap") is None or _fund_val("market_cap") < filters.min_market_cap):
                return None
            if filters.max_market_cap is not None and (_fund_val("market_cap") is None or _fund_val("market_cap") > filters.max_market_cap):
                return None
            if filters.min_pe is not None and (_fund_val("pe_ratio") is None or _fund_val("pe_ratio") < filters.min_pe):
                return None
            if filters.max_pe is not None and (_fund_val("pe_ratio") is None or _fund_val("pe_ratio") > filters.max_pe):
                return None
            if filters.min_roe is not None and (_fund_val("roe") is None or _fund_val("roe") < filters.min_roe):
                return None
            if filters.min_roce is not None and (_fund_val("roce") is None or _fund_val("roce") < filters.min_roce):
                return None
            if filters.min_revenue_growth is not None and (_fund_val("revenue_growth_yoy") is None or _fund_val("revenue_growth_yoy") < filters.min_revenue_growth):
                return None
            if filters.min_profit_growth is not None and (_fund_val("profit_growth_yoy") is None or _fund_val("profit_growth_yoy") < filters.min_profit_growth):
                return None
            if filters.min_operating_margin is not None and (_fund_val("operating_margin") is None or _fund_val("operating_margin") < filters.min_operating_margin):
                return None
            if filters.max_distance_from_52w_high is not None and (distance_from_high is None or distance_from_high > filters.max_distance_from_52w_high):
                return None
            if filters.min_distance_from_52w_low is not None and (distance_from_low is None or distance_from_low < filters.min_distance_from_52w_low):
                return None
            if filters.min_volume is not None and (quote.volume is None or quote.volume < filters.min_volume):
                return None
            if filters.max_debt_equity is not None and (_fund_val("debt_to_equity") is None or _fund_val("debt_to_equity") > filters.max_debt_equity):
                return None
            if filters.min_dividend_yield is not None and (_fund_val("dividend_yield") is None or _fund_val("dividend_yield") < filters.min_dividend_yield):
                return None
            if filters.min_rsi is not None and (_fund_val("rsi_14") is None or _fund_val("rsi_14") < filters.min_rsi):
                return None
            if filters.max_rsi is not None and (_fund_val("rsi_14") is None or _fund_val("rsi_14") > filters.max_rsi):
                return None

            technical_metrics = MarketService._technical_screen_metrics(sym, benchmark_candles) if needs_technical_metrics else {}
            relative_volume = technical_metrics.get("relative_volume")
            beta = technical_metrics.get("beta")
            atr_pct = technical_metrics.get("atr_pct")
            if filters.min_relative_volume is not None and (relative_volume is None or relative_volume < filters.min_relative_volume):
                return None
            if filters.min_beta is not None and (beta is None or beta < filters.min_beta):
                return None
            if filters.max_beta is not None and (beta is None or beta > filters.max_beta):
                return None
            if filters.min_atr_pct is not None and (atr_pct is None or atr_pct < filters.min_atr_pct):
                return None
            if filters.max_atr_pct is not None and (atr_pct is None or atr_pct > filters.max_atr_pct):
                return None

            return {
                "symbol": quote.symbol,
                "company_name": quote.company_name,
                "sector": quote.sector,
                "current_price": quote.current_price,
                "change_1d_pct": quote.change_1d_pct,
                "market_cap": fund.get("market_cap"),
                "pe_ratio": fund.get("pe_ratio"),
                "pb_ratio": fund.get("pb_ratio"),
                "roe": fund.get("roe"),
                "roce": fund.get("roce"),
                "revenue_growth_yoy": fund.get("revenue_growth_yoy"),
                "profit_growth_yoy": fund.get("profit_growth_yoy"),
                "operating_margin": fund.get("operating_margin"),
                "debt_to_equity": fund.get("debt_to_equity"),
                "dividend_yield": fund.get("dividend_yield"),
                "rsi_14": fund.get("rsi_14"),
                "distance_from_52w_high_pct": round(distance_from_high, 2) if distance_from_high is not None else None,
                "distance_from_52w_low_pct": round(distance_from_low, 2) if distance_from_low is not None else None,
                "volume": quote.volume,
                "relative_volume": round(relative_volume, 3) if relative_volume is not None else None,
                "beta_vs_nifty": round(beta, 3) if beta is not None else None,
                "atr_pct": round(atr_pct, 3) if atr_pct is not None else None,
            }

        # The >200 per-symbol fundamentals lookups are network-bound (yfinance),
        # so fetch them concurrently instead of serially — this is what made the
        # screener take 2+ minutes and time out.
        results: List[Dict[str, Any]] = []
        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = [pool.submit(_row_for_symbol, sym) for sym in symbols]
            for future in as_completed(futures):
                try:
                    row = future.result()
                except Exception:
                    continue
                if row:
                    results.append(row)

        # Sort
        sort_key = filters.sort_by or "market_cap"
        reverse = filters.sort_dir == "desc"
        results.sort(key=lambda x: x.get(sort_key) or 0, reverse=reverse)
        return results[:filters.limit]
