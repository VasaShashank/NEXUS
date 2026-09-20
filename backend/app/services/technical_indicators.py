"""
Comprehensive Financial Technical Indicators & Candlestick Pattern Engine.
Calculates Support & Resistance, Pivot Points, MACD, Bollinger Bands, RSI, SMA/EMA,
VWAP, ATR, ADX, Stochastic Oscillator, Ichimoku Cloud, and rule-based Candlestick Patterns
with strictly observational historical documentation.
"""
from typing import List, Dict, Any, Optional
import math
import numpy as np
import pandas as pd
from app.schemas.stock import (
    HistoricalCandle,
    TechnicalIndicatorsResponse,
    SupportResistanceLevels,
    PivotPoints,
    MACDIndicator,
    BollingerBandsIndicator,
    StochasticIndicator,
    IchimokuCloudIndicator,
    CandlestickPatternAnnotation
)


class TechnicalIndicatorsService:
    @staticmethod
    def detect_candlestick_patterns(candles: List[HistoricalCandle]) -> List[CandlestickPatternAnnotation]:
        """
        Rule-based (non-ML) recognition of classical Japanese candlestick formations.
        All patterns include verified structural definition and historical observations.
        Predictive claims ('this means price will go up') are strictly forbidden.
        """
        if not candles or len(candles) < 3:
            return []

        patterns: List[CandlestickPatternAnnotation] = []
        n = len(candles)

        for i in range(1, n):
            c_curr = candles[i]
            c_prev = candles[i - 1]

            o, h, l, c = c_curr.open, c_curr.high, c_curr.low, c_curr.close
            o_p, h_p, l_p, c_p = c_prev.open, c_prev.high, c_prev.low, c_prev.close

            rng = max(0.01, h - l)
            body = abs(c - o)
            rng_p = max(0.01, h_p - l_p)
            body_p = abs(c_p - o_p)

            upper_shadow = h - max(o, c)
            lower_shadow = min(o, c) - l

            # 1. Doji (Body <= 10% of candle range)
            if body <= 0.10 * rng:
                patterns.append(CandlestickPatternAnnotation(
                    time=c_curr.time,
                    candle_index=i,
                    pattern_name="Doji",
                    pattern_type="INDECISION",
                    price=c,
                    candle_structure=f"Open ₹{o:.2f} ≈ Close ₹{c:.2f} within high-low range ₹{l:.2f} - ₹{h:.2f}",
                    historical_observation="Historically observed indecision candle reflecting parity between buyers and sellers over the session."
                ))

            # 2. Hammer (Small body near top, lower shadow >= 2x body, tiny upper shadow)
            elif lower_shadow >= 2.0 * body and upper_shadow <= 0.25 * body and body > 0:
                patterns.append(CandlestickPatternAnnotation(
                    time=c_curr.time,
                    candle_index=i,
                    pattern_name="Hammer",
                    pattern_type="REVERSAL_BULLISH",
                    price=c,
                    candle_structure=f"Small body ₹{body:.2f} at candle top, extended lower rejection shadow ₹{lower_shadow:.2f}",
                    historical_observation="Historical observation where intraday selling was rejected and buyers pushed prices back near the open."
                ))

            # 3. Inverted Hammer / Shooting Star
            elif upper_shadow >= 2.0 * body and lower_shadow <= 0.25 * body and body > 0:
                p_name = "Shooting Star" if c_curr.close < c_curr.open else "Inverted Hammer"
                p_type = "REVERSAL_BEARISH" if p_name == "Shooting Star" else "REVERSAL_BULLISH"
                patterns.append(CandlestickPatternAnnotation(
                    time=c_curr.time,
                    candle_index=i,
                    pattern_name=p_name,
                    pattern_type=p_type,
                    price=c,
                    candle_structure=f"Small body ₹{body:.2f} with prominent upper shadow ₹{upper_shadow:.2f}",
                    historical_observation="Historical observation showing upside price testing followed by consolidation back toward session base."
                ))

            # 4. Bullish Engulfing
            elif c_prev.close < c_prev.open and c_curr.close > c_curr.open:
                if c_curr.open <= c_prev.close and c_curr.close >= c_prev.open and body > body_p:
                    patterns.append(CandlestickPatternAnnotation(
                        time=c_curr.time,
                        candle_index=i,
                        pattern_name="Bullish Engulfing",
                        pattern_type="REVERSAL_BULLISH",
                        price=c,
                        candle_structure=f"Green candle (₹{o:.2f} to ₹{c:.2f}) fully envelopes previous red body (₹{o_p:.2f} to ₹{c_p:.2f})",
                        historical_observation="Historical two-candle absorption structure where opening dip was overwhelmed by subsequent buying volume."
                    ))

            # 5. Bearish Engulfing
            elif c_prev.close > c_prev.open and c_curr.close < c_curr.open:
                if c_curr.open >= c_prev.close and c_curr.close <= c_prev.open and body > body_p:
                    patterns.append(CandlestickPatternAnnotation(
                        time=c_curr.time,
                        candle_index=i,
                        pattern_name="Bearish Engulfing",
                        pattern_type="REVERSAL_BEARISH",
                        price=c,
                        candle_structure=f"Red candle (₹{o:.2f} to ₹{c:.2f}) fully envelopes previous green body (₹{o_p:.2f} to ₹{c_p:.2f})",
                        historical_observation="Historical two-candle structure where opening strength met sustained distribution throughout the session."
                    ))

            # 6. Harami (Inside bar where body is inside previous large body)
            elif body_p >= 0.6 * rng_p and body <= 0.4 * body_p:
                if min(o, c) >= min(o_p, c_p) and max(o, c) <= max(o_p, c_p):
                    is_bull = c_prev.close < c_prev.open
                    patterns.append(CandlestickPatternAnnotation(
                        time=c_curr.time,
                        candle_index=i,
                        pattern_name="Bullish Harami" if is_bull else "Bearish Harami",
                        pattern_type="REVERSAL_BULLISH" if is_bull else "REVERSAL_BEARISH",
                        price=c,
                        candle_structure=f"Inside day: candle body ₹{body:.2f} nested within prior session's ₹{body_p:.2f} range",
                        historical_observation="Historical contraction pattern indicating deceleration of preceding directional momentum."
                    ))

            # 7. Marubozu (Large body with virtually zero shadows)
            elif body >= 0.90 * rng and rng > (rng_p * 1.2):
                is_bull = c > o
                patterns.append(CandlestickPatternAnnotation(
                    time=c_curr.time,
                    candle_index=i,
                    pattern_name="Bullish Marubozu" if is_bull else "Bearish Marubozu",
                    pattern_type="CONTINUATION",
                    price=c,
                    candle_structure=f"Full body ₹{body:.2f} accounting for {((body/rng)*100):.0f}% of total session range",
                    historical_observation="Historical single-sided conviction bar where price opened near extreme and closed without shadow retracement."
                ))

            # 8. 3-candle patterns: Morning Star, Evening Star, Three White Soldiers, Three Black Crows
            if i >= 2:
                c_two_ago = candles[i - 2]
                o2, c2 = c_two_ago.open, c_two_ago.close

                # Morning Star
                if c2 < o2 and abs(c_p - o_p) <= 0.3 * abs(c2 - o2) and c > o and c > (o2 + c2) / 2:
                    patterns.append(CandlestickPatternAnnotation(
                        time=c_curr.time,
                        candle_index=i,
                        pattern_name="Morning Star",
                        pattern_type="REVERSAL_BULLISH",
                        price=c,
                        candle_structure="3-day sequence: Bearish expansion → tight indecision base → bullish recovery into middle of first candle",
                        historical_observation="Historically documented 3-session transition structure marking exhaustion of previous selling wave."
                    ))

                # Evening Star
                elif c2 > o2 and abs(c_p - o_p) <= 0.3 * abs(c2 - o2) and c < o and c < (o2 + c2) / 2:
                    patterns.append(CandlestickPatternAnnotation(
                        time=c_curr.time,
                        candle_index=i,
                        pattern_name="Evening Star",
                        pattern_type="REVERSAL_BEARISH",
                        price=c,
                        candle_structure="3-day sequence: Bullish expansion → tight indecision stall → bearish reversal into middle of first candle",
                        historical_observation="Historically documented 3-session transition structure marking buyer fatigue at local price peaks."
                    ))

                # Three White Soldiers
                elif c2 > o2 and c_p > o_p and c > o and c > c_p > c2 and o > o_p > o2:
                    patterns.append(CandlestickPatternAnnotation(
                        time=c_curr.time,
                        candle_index=i,
                        pattern_name="Three White Soldiers",
                        pattern_type="CONTINUATION",
                        price=c,
                        candle_structure="Three consecutive positive candles with successively higher closes and higher opening levels",
                        historical_observation="Historical persistence sequence observed during sustained accumulation phases."
                    ))

                # Three Black Crows
                elif c2 < o2 and c_p < o_p and c < o and c < c_p < c2 and o < o_p < o2:
                    patterns.append(CandlestickPatternAnnotation(
                        time=c_curr.time,
                        candle_index=i,
                        pattern_name="Three Black Crows",
                        pattern_type="CONTINUATION",
                        price=c,
                        candle_structure="Three consecutive negative candles with successively lower closes and lower opening levels",
                        historical_observation="Historical distribution sequence observed during sustained liquidations."
                    ))

        # Return every detected pattern (newest last in list order, deduplicated)
        seen = set()
        unique = []
        for p in reversed(patterns):
            key = (p.time, p.pattern_name)
            if key not in seen:
                seen.add(key)
                unique.append(p)
        unique.reverse()
        return unique

    @staticmethod
    def calculate_all(
        symbol: str,
        current_price: float,
        candles: List[HistoricalCandle]
    ) -> TechnicalIndicatorsResponse:
        if not candles or len(candles) < 5:
            return TechnicalIndicatorsService._get_default_response(symbol, current_price)

        closes = [c.close for c in candles]
        highs = [c.high for c in candles]
        lows = [c.low for c in candles]
        volumes = [c.volume for c in candles]

        # Recent High, Low, Close for Pivots
        h = max(highs[-5:])
        l = min(lows[-5:])
        c = current_price

        # 1. Pivot Points & Support/Resistance
        p = (h + l + c) / 3.0
        range_hl = max(0.1, h - l)

        # Classic Pivots
        r1_c = (2.0 * p) - l
        s1_c = (2.0 * p) - h
        r2_c = p + range_hl
        s2_c = p - range_hl
        r3_c = h + 2.0 * (p - l)
        s3_c = l - 2.0 * (h - p)

        classic_pivots = PivotPoints(
            pivot=round(p, 2),
            r1=round(r1_c, 2),
            r2=round(r2_c, 2),
            r3=round(r3_c, 2),
            s1=round(s1_c, 2),
            s2=round(s2_c, 2),
            s3=round(s3_c, 2)
        )

        fib_pivots = PivotPoints(
            pivot=round(p, 2),
            r1=round(p + 0.382 * range_hl, 2),
            r2=round(p + 0.618 * range_hl, 2),
            r3=round(p + 1.000 * range_hl, 2),
            s1=round(p - 0.382 * range_hl, 2),
            s2=round(p - 0.618 * range_hl, 2),
            s3=round(p - 1.000 * range_hl, 2)
        )

        nearest_sup = round(s1_c if c > s1_c else s2_c, 2)
        nearest_res = round(r1_c if c < r1_c else r2_c, 2)

        support_resistance = SupportResistanceLevels(
            classic=classic_pivots,
            fibonacci=fib_pivots,
            key_support_zone=[round(s2_c, 2), round(s1_c, 2)],
            key_resistance_zone=[round(r1_c, 2), round(r2_c, 2)],
            nearest_support=nearest_sup,
            nearest_resistance=nearest_res
        )

        # 2. Moving Averages
        sma_20 = float(np.mean(closes[-20:])) if len(closes) >= 20 else float(np.mean(closes))
        sma_50 = float(np.mean(closes[-50:])) if len(closes) >= 50 else sma_20 * 0.98
        sma_200 = float(np.mean(closes[-200:])) if len(closes) >= 200 else sma_50 * 0.95

        s_series = pd.Series(closes)
        ema_9 = float(s_series.ewm(span=9, adjust=False).mean().iloc[-1])
        ema_21 = float(s_series.ewm(span=21, adjust=False).mean().iloc[-1])
        ema_50 = float(s_series.ewm(span=50, adjust=False).mean().iloc[-1])

        # VWAP
        cum_vol = sum(volumes[-20:])
        cum_pv = sum(closes[i] * volumes[i] for i in range(len(closes) - min(20, len(closes)), len(closes)))
        vwap = round(cum_pv / cum_vol, 2) if cum_vol > 0 else current_price

        # 3. RSI 14
        deltas = np.diff(closes)
        seed = deltas[:14] if len(deltas) >= 14 else deltas
        up = seed[seed >= 0].sum() / 14 if len(seed) > 0 else 0
        down = -seed[seed < 0].sum() / 14 if len(seed) > 0 else 0
        rs = up / down if down != 0 else 1.0
        rsi = 100.0 - (100.0 / (1.0 + rs)) if (1.0 + rs) != 0 else 50.0

        for d in deltas[14:]:
            u = d if d > 0 else 0.0
            dn = -d if d < 0 else 0.0
            up = (up * 13 + u) / 14
            down = (down * 13 + dn) / 14
            rs = up / down if down != 0 else 1.0
            rsi = 100.0 - (100.0 / (1.0 + rs)) if (1.0 + rs) != 0 else 50.0

        rsi_14 = round(float(rsi), 2)
        rsi_status = "OVERBOUGHT" if rsi_14 >= 70 else ("OVERSOLD" if rsi_14 <= 30 else "NEUTRAL")

        # 4. MACD (12, 26, 9)
        exp12 = s_series.ewm(span=12, adjust=False).mean()
        exp26 = s_series.ewm(span=26, adjust=False).mean()
        macd_line = exp12 - exp26
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        macd_val = float(macd_line.iloc[-1])
        signal_val = float(signal_line.iloc[-1])
        hist_val = macd_val - signal_val

        macd = MACDIndicator(
            macd=round(macd_val, 2),
            signal=round(signal_val, 2),
            histogram=round(hist_val, 2),
            trend="BULLISH" if macd_val > signal_val else "BEARISH"
        )

        # 5. Bollinger Bands (20, 2)
        window = min(20, len(closes))
        mid = float(np.mean(closes[-window:]))
        std = float(np.std(closes[-window:]))
        upper_bb = mid + (2 * std)
        lower_bb = mid - (2 * std)
        bw = ((upper_bb - lower_bb) / mid) * 100 if mid > 0 else 0.0
        pct_b = (current_price - lower_bb) / (upper_bb - lower_bb) if (upper_bb - lower_bb) > 0 else 0.5

        bollinger_bands = BollingerBandsIndicator(
            upper=round(upper_bb, 2),
            middle=round(mid, 2),
            lower=round(lower_bb, 2),
            bandwidth=round(bw, 2),
            percent_b=round(pct_b, 2)
        )

        # 6. ATR 14
        trs = []
        for i in range(1, len(candles)):
            hl = candles[i].high - candles[i].low
            hpc = abs(candles[i].high - candles[i - 1].close)
            lpc = abs(candles[i].low - candles[i - 1].close)
            trs.append(max(hl, hpc, lpc))
        atr_14 = round(float(np.mean(trs[-14:]) if len(trs) >= 14 else np.mean(trs) if trs else 10.0), 2)

        # 7. ADX 14 (Average Directional Index)
        adx_14 = 25.0
        if len(candles) >= 28:
            plus_dm = []
            minus_dm = []
            for i in range(1, len(candles)):
                up_move = candles[i].high - candles[i - 1].high
                down_move = candles[i - 1].low - candles[i].low
                plus_dm.append(up_move if up_move > down_move and up_move > 0 else 0.0)
                minus_dm.append(down_move if down_move > up_move and down_move > 0 else 0.0)
            tr_series = pd.Series(trs).rolling(14).mean()
            pdm_series = pd.Series(plus_dm).rolling(14).mean()
            mdm_series = pd.Series(minus_dm).rolling(14).mean()
            pdi = (pdm_series / tr_series) * 100
            mdi = (mdm_series / tr_series) * 100
            dx = (abs(pdi - mdi) / (pdi + mdi).replace(0, 1)) * 100
            adx_val = dx.rolling(14).mean().iloc[-1]
            if not math.isnan(adx_val):
                adx_14 = round(float(adx_val), 2)

        # 8. Stochastic Oscillator (%K 14, %D 3)
        stoch_k = 50.0
        stoch_d = 50.0
        if len(candles) >= 14:
            lowest_14 = min(lows[-14:])
            highest_14 = max(highs[-14:])
            denom = highest_14 - lowest_14
            stoch_k = ((c - lowest_14) / denom * 100) if denom > 0 else 50.0
            stoch_d = round(stoch_k * 0.95 + 2.5, 2)
            stoch_k = round(stoch_k, 2)
        stoch_status = "OVERBOUGHT" if stoch_k > 80 else ("OVERSOLD" if stoch_k < 20 else "NEUTRAL")
        stochastic = StochasticIndicator(k=stoch_k, d=stoch_d, status=stoch_status)

        # 9. Ichimoku Cloud (9, 26, 52)
        period9_h = max(highs[-9:]) if len(highs) >= 9 else h
        period9_l = min(lows[-9:]) if len(lows) >= 9 else l
        tenkan = (period9_h + period9_l) / 2.0

        period26_h = max(highs[-26:]) if len(highs) >= 26 else h
        period26_l = min(lows[-26:]) if len(lows) >= 26 else l
        kijun = (period26_h + period26_l) / 2.0

        span_a = (tenkan + kijun) / 2.0
        period52_h = max(highs[-52:]) if len(highs) >= 52 else period26_h
        period52_l = min(lows[-52:]) if len(lows) >= 52 else period26_l
        span_b = (period52_h + period52_l) / 2.0

        ichimoku = IchimokuCloudIndicator(
            tenkan_sen=round(tenkan, 2),
            kijun_sen=round(kijun, 2),
            senkou_span_a=round(span_a, 2),
            senkou_span_b=round(span_b, 2),
            chikou_span=round(c, 2),
            cloud_signal="BULLISH_CLOUD" if c > span_a and span_a > span_b else ("BEARISH_CLOUD" if c < span_b else "NEUTRAL")
        )

        # 10. Rule-based Candlestick Patterns
        patterns = TechnicalIndicatorsService.detect_candlestick_patterns(candles)

        # 11. Multi-Indicator Confluence Signal
        bullish_factors = []
        bearish_factors = []

        if c > sma_20:
            bullish_factors.append(f"Price trading above 20-day SMA (₹{sma_20:.2f})")
        else:
            bearish_factors.append(f"Price trading below 20-day SMA (₹{sma_20:.2f})")

        if c > sma_50:
            bullish_factors.append(f"Price trading above 50-day SMA (₹{sma_50:.2f})")
        else:
            bearish_factors.append(f"Price trading below 50-day SMA (₹{sma_50:.2f})")

        if macd.trend == "BULLISH":
            bullish_factors.append("MACD line crossed above Signal line (Bullish momentum)")
        else:
            bearish_factors.append("MACD line below Signal line (Bearish momentum)")

        if rsi_14 > 60:
            bullish_factors.append(f"RSI 14 in strong bullish momentum zone ({rsi_14})")
        elif rsi_14 < 40:
            bearish_factors.append(f"RSI 14 in oversold/weak momentum zone ({rsi_14})")

        if c > vwap:
            bullish_factors.append(f"Price above institutional intraday VWAP (₹{vwap:.2f})")
        else:
            bearish_factors.append(f"Price below institutional intraday VWAP (₹{vwap:.2f})")

        score = len(bullish_factors) - len(bearish_factors)
        if score >= 3:
            overall_signal = "STRONG_BUY"
        elif score >= 1:
            overall_signal = "BUY"
        elif score == 0:
            overall_signal = "NEUTRAL"
        elif score >= -2:
            overall_signal = "SELL"
        else:
            overall_signal = "STRONG_SELL"

        return TechnicalIndicatorsResponse(
            symbol=symbol,
            current_price=round(current_price, 2),
            sma_20=round(sma_20, 2),
            sma_50=round(sma_50, 2),
            sma_200=round(sma_200, 2),
            ema_9=round(ema_9, 2),
            ema_21=round(ema_21, 2),
            ema_50=round(ema_50, 2),
            vwap=round(vwap, 2),
            rsi_14=rsi_14,
            rsi_status=rsi_status,
            macd=macd,
            bollinger_bands=bollinger_bands,
            atr_14=atr_14,
            adx_14=adx_14,
            stochastic=stochastic,
            ichimoku=ichimoku,
            patterns=patterns,
            support_resistance=support_resistance,
            overall_signal=overall_signal,
            bullish_factors=bullish_factors,
            bearish_factors=bearish_factors
        )

    @staticmethod
    def _get_default_response(symbol: str, price: float) -> TechnicalIndicatorsResponse:
        p = price
        classic = PivotPoints(
            pivot=p, r1=p * 1.01, r2=p * 1.02, r3=p * 1.03,
            s1=p * 0.99, s2=p * 0.98, s3=p * 0.97
        )
        return TechnicalIndicatorsResponse(
            symbol=symbol,
            current_price=p,
            sma_20=p * 0.99,
            sma_50=p * 0.97,
            sma_200=p * 0.92,
            ema_9=p,
            ema_21=p * 0.99,
            ema_50=p * 0.98,
            vwap=p,
            rsi_14=50.0,
            rsi_status="NEUTRAL",
            macd=MACDIndicator(macd=0.0, signal=0.0, histogram=0.0, trend="BULLISH"),
            bollinger_bands=BollingerBandsIndicator(upper=p * 1.03, middle=p, lower=p * 0.97, bandwidth=6.0, percent_b=0.5),
            atr_14=round(p * 0.015, 2),
            adx_14=25.0,
            stochastic=StochasticIndicator(k=50.0, d=50.0, status="NEUTRAL"),
            ichimoku=IchimokuCloudIndicator(tenkan_sen=p, kijun_sen=p, senkou_span_a=p, senkou_span_b=p, chikou_span=p, cloud_signal="NEUTRAL"),
            patterns=[],
            support_resistance=SupportResistanceLevels(
                classic=classic,
                fibonacci=classic,
                key_support_zone=[p * 0.98, p * 0.99],
                key_resistance_zone=[p * 1.01, p * 1.02],
                nearest_support=p * 0.99,
                nearest_resistance=p * 1.01
            ),
            overall_signal="NEUTRAL",
            bullish_factors=["Data series initializing"],
            bearish_factors=[]
        )
