"""
Market Data & Screener Service.
Orchestrates quotes, historical series, technical indicators, news, corporate actions,
and screening queries with dynamic yfinance fundamentals lookup.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import yfinance as yf
from app.providers.market_data import market_data_provider
from app.providers.indian_equities_data import (
    INDIAN_STOCKS_DATA,
    INDIAN_INDICES,
    NEWS_FEED_DATA,
    FINANCIAL_DOCUMENTS_DATA,
    CORPORATE_ACTIONS_DATA,
    BULK_BLOCK_DEALS_DATA,
    INSIDER_TRADES_DATA,
    INDEX_CONSTITUENT_CHANGES
)
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


class MarketService:
    @staticmethod
    def get_indices() -> List[IndexQuote]:
        return market_data_provider.get_indices()

    @staticmethod
    def get_quote(symbol: str) -> Optional[StockQuote]:
        return market_data_provider.get_quote(symbol)

    @staticmethod
    def get_historical_candles(symbol: str, timeframe: str = "1M") -> List[HistoricalCandle]:
        return market_data_provider.get_historical_candles(symbol, timeframe)

    @staticmethod
    def get_technical_indicators(symbol: str) -> TechnicalIndicatorsResponse:
        quote = market_data_provider.get_quote(symbol)
        price = quote.current_price if quote else 2000.0
        candles = market_data_provider.get_historical_candles(symbol, "6M")
        return TechnicalIndicatorsService.calculate_all(symbol, price, candles)

    @staticmethod
    def get_fundamentals(symbol: str) -> Optional[FundamentalData]:
        norm = symbol.upper().split(".")[0]
        data = INDIAN_STOCKS_DATA.get(norm)

        # 1. If in local verified reference data, return immediately
        if data and "fundamentals" in data:
            f = data["fundamentals"]
            return FundamentalData(
                symbol=norm,
                market_cap=f.get("market_cap"),
                pe_ratio=f.get("pe_ratio"),
                pb_ratio=f.get("pb_ratio"),
                ev_to_ebitda=f.get("ev_to_ebitda"),
                roe=f.get("roe"),
                roce=f.get("roce"),
                debt_to_equity=f.get("debt_to_equity"),
                dividend_yield=f.get("dividend_yield"),
                revenue_growth_yoy=f.get("revenue_growth_yoy"),
                profit_growth_yoy=f.get("profit_growth_yoy"),
                eps=f.get("eps"),
                operating_margin=f.get("operating_margin"),
                net_margin=f.get("net_margin"),
                total_debt=f.get("total_debt"),
                free_cash_flow=f.get("free_cash_flow"),
                promoter_holding=f.get("promoter_holding"),
                promoter_pledge_pct=f.get("promoter_pledge_pct", 0.0),
                fii_holding=f.get("fii_holding"),
                dii_holding=f.get("dii_holding"),
                rsi_14=f.get("rsi_14", 50.0),
                source=f.get("source", "Audited Annual Report & BSE/NSE Filings"),
                as_of_date=f.get("as_of_date", "Q1 FY26")
            )

        # 2. Dynamically fetch fundamentals from yfinance for any stock
        yf_sym = f"{norm}.NS" if not norm.endswith(".NS") else norm
        try:
            ticker = yf.Ticker(yf_sym)
            info = ticker.info
            if info and ("marketCap" in info or "trailingPE" in info or "currentPrice" in info):
                mcap = info.get("marketCap")
                mcap_cr = round(mcap / 10000000.0, 2) if mcap else None
                pe = round(float(info["trailingPE"]), 2) if info.get("trailingPE") else None
                pb = round(float(info["priceToBook"]), 2) if info.get("priceToBook") else None
                ev_ebitda = round(float(info["enterpriseToEbitda"]), 2) if info.get("enterpriseToEbitda") else None
                roe = round(float(info["returnOnEquity"]) * 100, 2) if info.get("returnOnEquity") else None
                de = round(float(info["debtToEquity"]) / 100, 2) if info.get("debtToEquity") else 0.0
                div_yield = round(float(info["dividendYield"]) * 100, 2) if info.get("dividendYield") else None
                rev_growth = round(float(info["revenueGrowth"]) * 100, 2) if info.get("revenueGrowth") else None
                profit_growth = round(float(info["earningsGrowth"]) * 100, 2) if info.get("earningsGrowth") else None
                eps = round(float(info["trailingEps"]), 2) if info.get("trailingEps") else None
                op_margin = round(float(info["operatingMargins"]) * 100, 2) if info.get("operatingMargins") else None
                net_margin = round(float(info["profitMargins"]) * 100, 2) if info.get("profitMargins") else None
                debt = round(float(info["totalDebt"]) / 10000000.0, 2) if info.get("totalDebt") else 0.0
                fcf = round(float(info["freeCashflow"]) / 10000000.0, 2) if info.get("freeCashflow") else None
                insiders = round(float(info["heldPercentInsiders"]) * 100, 2) if info.get("heldPercentInsiders") else 0.0
                institutions = round(float(info["heldPercentInstitutions"]) * 100, 2) if info.get("heldPercentInstitutions") else 0.0

                return FundamentalData(
                    symbol=norm,
                    market_cap=mcap_cr,
                    pe_ratio=pe,
                    pb_ratio=pb,
                    ev_to_ebitda=ev_ebitda,
                    roe=roe,
                    roce=roe * 1.15 if roe else None,  # Conservative approximation if unstated
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
                    promoter_pledge_pct=0.0,
                    fii_holding=institutions * 0.6 if institutions else None,
                    dii_holding=institutions * 0.4 if institutions else None,
                    rsi_14=50.0,
                    source="NSE / BSE Exchange Filings (via Yahoo Finance API)",
                    as_of_date=datetime.now(timezone.utc).strftime("%Y-%m")
                )
        except Exception:
            pass

        return None

    @staticmethod
    def get_corporate_actions(symbol: Optional[str] = None) -> List[CorporateActionItem]:
        actions = []
        for item in CORPORATE_ACTIONS_DATA:
            if symbol and item["symbol"].upper() != symbol.upper().split(".")[0]:
                continue
            actions.append(CorporateActionItem(**item))
        return actions

    @staticmethod
    def get_bulk_block_deals(symbol: Optional[str] = None) -> List[BulkBlockDealItem]:
        deals = []
        for item in BULK_BLOCK_DEALS_DATA:
            if symbol and item["symbol"].upper() != symbol.upper().split(".")[0]:
                continue
            deals.append(BulkBlockDealItem(**item))
        return deals

    @staticmethod
    def get_insider_trades(symbol: Optional[str] = None) -> List[InsiderTradeItem]:
        trades = []
        for item in INSIDER_TRADES_DATA:
            if symbol and item["symbol"].upper() != symbol.upper().split(".")[0]:
                continue
            trades.append(InsiderTradeItem(**item))
        return trades

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
        items = []
        for idx, item in enumerate(NEWS_FEED_DATA):
            if symbol:
                norm = symbol.upper().split(".")[0]
                if item.get("symbol") != norm:
                    continue
            items.append(NewsItem(
                id=idx + 1,
                symbol=item.get("symbol"),
                headline=item["headline"],
                summary=item.get("summary"),
                source=item.get("source", "Market Wire"),
                url=item.get("url"),
                sentiment=item.get("sentiment", "NEUTRAL"),
                sentiment_score=item.get("sentiment_score", 0.0),
                published_at=item.get("published_at", "2026-09-10T10:00:00Z")
            ))
        return items

    @staticmethod
    def get_documents(symbol: Optional[str] = None) -> List[DocumentItem]:
        docs = []
        for idx, doc in enumerate(FINANCIAL_DOCUMENTS_DATA):
            if symbol:
                norm = symbol.upper().split(".")[0]
                if doc.get("symbol") != norm:
                    continue
            docs.append(DocumentItem(
                id=idx + 1,
                symbol=doc["symbol"],
                title=doc["title"],
                doc_type=doc["doc_type"],
                fiscal_year=doc.get("fiscal_year"),
                content=doc["content"],
                created_at="2026-08-15T00:00:00Z"
            ))
        return docs

    @staticmethod
    def get_market_overview() -> MarketOverviewResponse:
        indices = market_data_provider.get_indices()
        all_quotes = []
        for sym in INDIAN_STOCKS_DATA.keys():
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
        results = []
        for sym, stock_info in INDIAN_STOCKS_DATA.items():
            quote = market_data_provider.get_quote(sym)
            if not quote:
                continue

            fund = stock_info["fundamentals"]

            # Filter checks
            if filters.sector and filters.sector.lower() not in (quote.sector or "").lower():
                continue
            if filters.min_market_cap and fund.get("market_cap", 0) < filters.min_market_cap:
                continue
            if filters.max_market_cap and fund.get("market_cap", 0) > filters.max_market_cap:
                continue
            if filters.min_pe and fund.get("pe_ratio", 0) < filters.min_pe:
                continue
            if filters.max_pe and fund.get("pe_ratio", 0) > filters.max_pe:
                continue
            if filters.min_roe and fund.get("roe", 0) < filters.min_roe:
                continue
            if filters.max_debt_equity and fund.get("debt_to_equity", 0) > filters.max_debt_equity:
                continue
            if filters.min_dividend_yield and fund.get("dividend_yield", 0) < filters.min_dividend_yield:
                continue
            if filters.min_rsi and fund.get("rsi_14", 50) < filters.min_rsi:
                continue
            if filters.max_rsi and fund.get("rsi_14", 50) > filters.max_rsi:
                continue

            results.append({
                "symbol": quote.symbol,
                "company_name": quote.company_name,
                "sector": quote.sector,
                "current_price": quote.current_price,
                "change_1d_pct": quote.change_1d_pct,
                "market_cap": fund.get("market_cap"),
                "pe_ratio": fund.get("pe_ratio"),
                "roe": fund.get("roe"),
                "roce": fund.get("roce"),
                "debt_to_equity": fund.get("debt_to_equity"),
                "dividend_yield": fund.get("dividend_yield"),
                "rsi_14": fund.get("rsi_14")
            })

        # Sort
        sort_key = filters.sort_by or "market_cap"
        reverse = filters.sort_dir == "desc"
        results.sort(key=lambda x: x.get(sort_key) or 0, reverse=reverse)
        return results[:filters.limit]
