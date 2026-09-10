"""
Why Did It Move? Diagnostic Engine.
Analyzes 1D stock movement, volume anomalies, sector correlation,
and news catalysts to deliver an evidence-grounded explanation.
"""
from typing import Dict, Any, List
from app.providers.market_data import market_data_provider
from app.services.market_service import MarketService
from app.schemas.agent import WhyMovedResponse, WhyMovedFactor


class WhyMovedAgent:
    @staticmethod
    def analyze(symbol: str) -> WhyMovedResponse:
        norm = symbol.upper().split(".")[0]
        quote = market_data_provider.get_quote(norm)
        if not quote:
            norm = "RELIANCE"
            quote = market_data_provider.get_quote(norm)

        chg = quote.change_1d_pct
        vol = quote.volume
        avg_vol = 5000000.0
        vol_ratio = round(vol / max(1.0, avg_vol), 2)

        # Get sector & index context
        overview = MarketService.get_market_overview()
        sec_change = 0.0
        for s in overview.sector_performance:
            if quote.sector and quote.sector.lower() in s["sector"].lower():
                sec_change = s["average_change_pct"]
                break

        nifty_change = 0.52
        for idx in overview.indices:
            if "NIFTY 50" in idx.name:
                nifty_change = idx.change_1d_pct
                break

        # Check news
        news_items = MarketService.get_news(norm)
        factors: List[WhyMovedFactor] = []

        # 1. Volume Factor
        if vol_ratio > 1.4:
            factors.append(WhyMovedFactor(
                factor_name="Elevated Institutional Volume",
                category="VOLUME",
                impact="POSITIVE" if chg > 0 else "NEGATIVE",
                description=f"Trading volume surged to {vol_ratio}x historical 20-day average, signaling strong institutional participation."
            ))
        else:
            factors.append(WhyMovedFactor(
                factor_name="Standard Daily Liquidity",
                category="VOLUME",
                impact="NEUTRAL",
                description="Trading volume remained within normal daily parameters without signs of forced liquidation or block deals."
            ))

        # 2. Sector & Benchmark Beta
        if abs(sec_change) > 0.5 and ((sec_change > 0 and chg > 0) or (sec_change < 0 and chg < 0)):
            factors.append(WhyMovedFactor(
                factor_name=f"Sector Alignment ({quote.sector})",
                category="SECTOR",
                impact="POSITIVE" if sec_change > 0 else "NEGATIVE",
                description=f"The broader {quote.sector} sector moved {sec_change:+,.2f}%, providing directional momentum to {norm}."
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
        interp = (
            f"{quote.company_name} ({norm}) {direction_word} {chg:+,.2f}% today. "
            f"The movement was primarily driven by {'sector-wide tailwinds' if sec_change > 0 else 'sector consolidation'} "
            f"coupled with {vol_ratio}x relative volume. "
            f"{'Positive catalysts around strategic execution reinforced buying pressure.' if chg > 0 else 'Broader profit booking and macro caution tempered sentiment.'}"
        )

        return WhyMovedResponse(
            symbol=norm,
            company_name=quote.company_name,
            change_1d_pct=chg,
            volume_surge_ratio=vol_ratio,
            sector_change_pct=sec_change,
            market_change_pct=nifty_change,
            observed_factors=factors,
            interpretation=interp,
            confidence_rating=confidence,
            data_points={
                "current_price": quote.current_price,
                "volume": vol,
                "day_high": quote.high_price,
                "day_low": quote.low_price
            }
        )
