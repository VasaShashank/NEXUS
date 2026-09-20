"""
Statistical Trend Estimation & Forecast Schemas.
Encapsulates ARIMA time series forecasting, linear trend channels,
and statistical prediction intervals with mandatory educational compliance disclaimers.
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class ForecastPoint(BaseModel):
    step: int = Field(..., description="Forecast horizon step (1 = next session)")
    projected_date: str = Field(..., description="Target session date (YYYY-MM-DD)")
    projected_close: float = Field(..., description="Statistical mean projected closing price")
    confidence_lower_95: float = Field(..., description="Lower 95% confidence boundary")
    confidence_upper_95: float = Field(..., description="Upper 95% confidence boundary")


class TrendForecastResponse(BaseModel):
    symbol: str
    current_price: Optional[float] = None
    model_name: str = "ARIMA(1,1,1) Autoregressive Time-Series & OLS Trend Channel"
    trend_outlook: str  # BULLISH_TREND, BEARISH_TREND, SIDEWAYS_CONSOLIDATION, UNAVAILABLE
    trend_slope_pct: Optional[float] = None
    aic: Optional[float] = None
    bic: Optional[float] = None
    historical_volatility_annualized: Optional[float] = None
    forecast_points: List[ForecastPoint] = []
    unavailable_reason: Optional[str] = None
    methodology_note: str = (
        "Statistical expectation estimated via autoregressive integrated moving average (ARIMA) "
        "and empirical volatility dispersion. Prediction intervals represent Gaussian 95% confidence bands."
    )
    compliance_disclaimer: str = (
        "For academic, educational, and statistical illustration only. Equity prices follow stochastic paths; "
        "statistical models cannot predict corporate events, sentiment shocks, or future market trajectory. "
        "Strictly not investment advice."
    )
