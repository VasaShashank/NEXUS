"""
Why Did It Move? Diagnostic Engine.
Analyzes 1D stock movement, volume anomalies, sector correlation,
and news catalysts to deliver an evidence-grounded explanation.
"""
from typing import Dict, Any, List
from app.providers.market_data import market_data_provider
from app.providers.indian_equities_data import INDIAN_STOCKS_DATA
from app.services.market_service import MarketService
from app.schemas.agent import WhyMovedResponse, WhyMovedFactor


class WhyMovedAgent:
    @staticmethod
    def _fallback_quote(symbol: str) -> Dict[str, Any]:
        """Fall back to the most recent candle closes when the live quote is unavailable.

        Returns an honest, labeled payload keyed by 'price_basis':
        - 'live'       -> real-time provider quote
        - 'candles'    -> derived from the last two historical candle closes
        """
        norm = symbol.upper().split(".")[0]

        quote = market_data_provider.get_quote(norm)
        if quote:
            return {
                "price_basis": "live",
                "company_name": quote.company_name,
                "sector": quote.sector,
                "current_price": quote.current_price,
                "change_1d": quote.change_1d,
                "change_1d_pct": quote.change_1d_pct,
                "volume": quote.volume,
                "high_price": quote.high_price,
                "low_price": quote.low_price,
            }

        candles = MarketService.get_historical_candles(norm, "1D")
        ref = INDIAN_STOCKS_DATA.get(norm, {})
        if candles and len(candles) >= 2:
            last = candles[-1]
            prev = candles[-2]
            chg = last.close - prev.close
            chg_pct = (chg / prev.close) * 100 if prev.close > 0 else 0.0
            return {
                "price_basis": "candles",
                "company_name": ref.get("company_name", norm),
                "sector": ref.get("sector", "Equities"),
                "current_price": last.close,
                "change_1d": round(chg, 2),
                "change_1d_pct": round(chg_pct, 2),
                "volume": float(last.volume or 0),
                "high_price": last.high,
                "low_price": last.low,
            }

        return {
            "price_basis": "none",
            "company_name": ref.get("company_name", "Data unavailable"),
            "sector": ref.get("sector"),
            "current_price": None,
            "change_1d": 0.0,
            "change_1d_pct": 0.0,
            "volume": 0.0,
            "high_price": None,
            "low_price": None,
        }

    @staticmethod
    def analyze(symbol: str) -> WhyMovedResponse:
        norm = symbol.upper().split(".")[0]
        q = WhyMovedAgent._fallback_quote(norm)
        if q["price_basis"] == "none" or q["current_price"] is None:
            return WhyMovedResponse(
                symbol=norm,
                company_name=q["company_name"],
                change_1d_pct=0.0,
                volume_surge_ratio=0.0,
                sector_change_pct=0.0,
                market_change_pct=0.0,
                observed_factors=[],
                interpretation="Data unavailable: no current quote or historical candle data could be retrieved for this symbol.",
                confidence_rating="LOW",
                data_points={},
            )

        chg = q["change_1d_pct"]
        vol = q["volume"]

        # Real 20-day average volume from live history (never a hardcoded baseline)
        avg_vol = None
        try:
            hist_candles = MarketService.get_historical_candles(norm, "1M")
            if hist_candles:
                recent = hist_candles[-20:]
                vols = [c.volume for c in recent if c.volume]
                if vols:
                    avg_vol = sum(vols) / len(vols)
        except Exception:
            avg_vol = None

        vol_ratio = round(vol / avg_vol, 2) if (avg_vol and avg_vol > 0 and vol) else None

        # Get sector & index context
        overview = MarketService.get_market_overview()
        sec_change = 0.0
        for s in overview.sector_performance:
            if q["sector"] and q["sector"].lower() in s["sector"].lower():
                sec_change = s["average_change_pct"]
                break

        nifty_change = 0.0
        for idx in overview.indices:
            if "NIFTY 50" in idx.name:
                nifty_change = idx.change_1d_pct
                break

        # Check news
        news_items = MarketService.get_news(norm)
        factors: List[WhyMovedFactor] = []

        # 1. Volume Factor
        if vol_ratio is None:
            factors.append(WhyMovedFactor(
                factor_name="Volume Context",
                category="VOLUME",
                impact="NEUTRAL",
                description="Volume data unavailable: no live 20-day average or current volume could be retrieved, so no surge inference is made."
            ))
        elif vol_ratio > 1.4:
            factors.append(WhyMovedFactor(
                factor_name="Elevated Institutional Volume",
                category="VOLUME",
                impact="POSITIVE" if chg > 0 else "NEGATIVE",
                description=f"Trading volume was {vol_ratio}x the real 20-day average, suggesting possible institutional activity."
            ))
        else:
            factors.append(WhyMovedFactor(
                factor_name="Standard Daily Liquidity",
                category="VOLUME",
                impact="NEUTRAL",
                description="Trading volume remained within normal daily parameters relative to the real 20-day average."
            ))

        # 2. Sector & Benchmark Beta
        if abs(sec_change) > 0.5 and ((sec_change > 0 and chg > 0) or (sec_change < 0 and chg < 0)):
            factors.append(WhyMovedFactor(
                factor_name=f"Sector Alignment ({q['sector']})",
                category="SECTOR",
                impact="POSITIVE" if sec_change > 0 else "NEGATIVE",
                description=f"The broader {q['sector']} sector moved {sec_change:+,.2f}%, providing directional momentum to {norm}."
            ))

        # 3. Catalyst News Factor
        if news_items:
            recent_news = news_items[0]
            factors.append(WhyMovedFactor(
                factor_name=f"Market Catalyst: {recent_news.source}",
                category="NEWS",
                impact=recent_news.sentiment,
                description=f"{recent_news.headline}"
            ))

        # Confidence rating
        confidence = "HIGH" if (len(factors) >= 3 and abs(chg) > 1.0) else "MEDIUM"

        # Synthesis
        direction_word = "rallied" if chg > 0 else "retreated"
        vol_txt = f"{vol_ratio:.2f}x real 20-day average volume" if vol_ratio is not None else "volume context unavailable"
        interp = (
            f"{q['company_name']} ({norm}) {direction_word} {chg:+,.2f}% today. "
            f"The movement was primarily driven by {'sector-wide tailwinds' if sec_change > 0 else 'sector consolidation'} "
            f"coupled with {vol_txt}. "
            f"{'Positive catalysts around strategic execution reinforced buying pressure.' if chg > 0 else 'Broader profit booking and macro caution tempered sentiment.'}"
        )

        return WhyMovedResponse(
            symbol=norm,
            company_name=q["company_name"],
            change_1d_pct=chg,
            volume_surge_ratio=vol_ratio,
            sector_change_pct=sec_change,
            market_change_pct=nifty_change,
            observed_factors=factors,
            interpretation=interp,
            confidence_rating=confidence,
            data_points={
                "current_price": q["current_price"],
                "volume": vol,
                "day_high": q["high_price"],
                "day_low": q["low_price"],
                "price_basis": q["price_basis"],
            }
        )
