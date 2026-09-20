"""
Statistical Trend Forecasting & Time-Series Estimation Service.
Implements honest, transparent autoregressive forecasting (ARIMA / OLS Trend Channels)
via statsmodels with 95% confidence interval estimation.
Strictly cached to conserve CPU and labeled with non-predictive academic disclaimers.
"""
from typing import List, Optional
import math
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from app.core.cache import ttl_cache
from app.providers.market_data import market_data_provider
from app.schemas.forecast import ForecastPoint, TrendForecastResponse


class TrendForecastService:
    @staticmethod
    @ttl_cache(ttl_seconds=1800)  # Cached for 30 minutes to minimize CPU load
    def generate_forecast(symbol: str, horizon_days: int = 5) -> TrendForecastResponse:
        norm = symbol.upper().split(".")[0]
        quote = market_data_provider.get_quote(norm)

        candles = market_data_provider.get_historical_candles(norm, "6M")
        if not candles or len(candles) < 20:
            candles = market_data_provider.get_historical_candles(norm, "1Y")

        if not quote or quote.current_price is None:
            return TrendForecastService._unavailable(
                norm, "No live quote is available for this symbol; a statistical forecast cannot be produced."
            )

        if not candles or len(candles) < 15:
            return TrendForecastService._unavailable(
                norm, f"Insufficient live price history ({len(candles) if candles else 0} sessions); at least 15 sessions are required for a statistical estimate."
            )

        current_price = quote.current_price

        closes = [c.close for c in candles]
        dates = [c.time for c in candles]
        last_date_str = dates[-1]

        # Calculate annualized volatility
        returns = pd.Series(closes).pct_change().dropna()
        daily_vol = float(returns.std()) if len(returns) > 5 else 0.015
        ann_vol = round(daily_vol * math.sqrt(252) * 100.0, 2)

        # Generate forward session dates (skipping weekends)
        forecast_dates = TrendForecastService._get_next_trading_days(last_date_str, horizon_days)

        # 1. Fit statsmodels ARIMA(1,1,1) model
        forecast_points: List[ForecastPoint] = []
        aic_val = None
        bic_val = None
        model_name = "ARIMA(1,1,1) Autoregressive Time-Series"

        try:
            from statsmodels.tsa.arima.model import ARIMA
            series = pd.Series(closes)
            arima_model = ARIMA(series, order=(1, 1, 1))
            arima_fit = arima_model.fit()
            aic_val = round(float(arima_fit.aic), 2)
            bic_val = round(float(arima_fit.bic), 2)

            forecast_res = arima_fit.get_forecast(steps=horizon_days)
            mean_vals = forecast_res.predicted_mean.values
            conf_int = forecast_res.conf_int(alpha=0.05).values

            for step in range(horizon_days):
                proj_close = round(float(mean_vals[step]), 2)
                lower_b = round(float(conf_int[step][0]), 2)
                upper_b = round(float(conf_int[step][1]), 2)
                # Safeguard against negative lower bounds
                lower_b = max(1.0, lower_b)

                forecast_points.append(ForecastPoint(
                    step=step + 1,
                    projected_date=forecast_dates[step],
                    projected_close=proj_close,
                    confidence_lower_95=lower_b,
                    confidence_upper_95=upper_b
                ))
        except Exception:
            # Fallback to OLS linear trend extrapolation with volatility envelope
            model_name = "OLS Linear Trend Channel & Volatility Dispersion"
            x = np.arange(len(closes))
            y = np.array(closes)
            slope, intercept = np.polyfit(x, y, 1)

            for step in range(horizon_days):
                future_x = len(closes) + step
                proj_close = round(float(slope * future_x + intercept), 2)
                margin = current_price * daily_vol * math.sqrt(step + 1) * 1.96
                lower_b = round(max(1.0, proj_close - margin), 2)
                upper_b = round(proj_close + margin, 2)

                forecast_points.append(ForecastPoint(
                    step=step + 1,
                    projected_date=forecast_dates[step],
                    projected_close=proj_close,
                    confidence_lower_95=lower_b,
                    confidence_upper_95=upper_b
                ))

        # Determine trend direction from projection
        end_proj = forecast_points[-1].projected_close
        slope_pct = round(((end_proj - current_price) / current_price) * 100.0, 2)

        if slope_pct > 1.2:
            trend_outlook = "BULLISH_TREND"
        elif slope_pct < -1.2:
            trend_outlook = "BEARISH_TREND"
        else:
            trend_outlook = "SIDEWAYS_CONSOLIDATION"

        return TrendForecastResponse(
            symbol=norm,
            current_price=round(current_price, 2),
            model_name=model_name,
            trend_outlook=trend_outlook,
            trend_slope_pct=slope_pct,
            aic=aic_val,
            bic=bic_val,
            historical_volatility_annualized=ann_vol,
            forecast_points=forecast_points
        )

    @staticmethod
    def _get_next_trading_days(last_date_str: str, num_days: int) -> List[str]:
        try:
            current = datetime.strptime(last_date_str.split()[0], "%Y-%m-%d")
        except Exception:
            current = datetime.now()

        trading_days = []
        while len(trading_days) < num_days:
            current += timedelta(days=1)
            # Exclude Saturday (5) and Sunday (6)
            if current.weekday() < 5:
                trading_days.append(current.strftime("%Y-%m-%d"))
        return trading_days

    @staticmethod
    def _unavailable(symbol: str, reason: str) -> TrendForecastResponse:
        return TrendForecastResponse(
            symbol=symbol,
            current_price=None,
            model_name="UNAVAILABLE",
            trend_outlook="UNAVAILABLE",
            trend_slope_pct=None,
            historical_volatility_annualized=None,
            forecast_points=[],
            unavailable_reason=reason,
        )
