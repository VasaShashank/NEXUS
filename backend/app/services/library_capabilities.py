"""Runtime inventory of optional finance libraries used by NEXUS."""
import importlib.util
from typing import Dict, List


LIBRARY_CATALOG = {
    "yfinance": {"purpose": "quotes, OHLCV, actions, Yahoo fundamentals", "status": "active"},
    "mftool": {"purpose": "AMFI mutual-fund NAV access", "status": "active_optional"},
    "pandas": {"purpose": "financial data transformation", "status": "active"},
    "numpy": {"purpose": "numeric analytics and indicators", "status": "active"},
    "statsmodels": {"purpose": "ARIMA trend estimation and econometrics", "status": "active"},
    "talib": {"purpose": "technical indicators", "status": "planned"},
    "pandas_ta": {"purpose": "technical indicators", "status": "planned"},
    "vectorbt": {"purpose": "vectorized backtesting", "status": "planned"},
    "backtrader": {"purpose": "event-driven backtesting", "status": "planned"},
    "pypfopt": {"purpose": "portfolio optimization", "status": "planned"},
    "quantstats": {"purpose": "portfolio performance reports", "status": "planned"},
    "QuantLib": {"purpose": "bond and derivative pricing", "status": "planned"},
    "openbb": {"purpose": "multi-provider research adapters", "status": "planned"},
}


def get_library_capabilities() -> List[Dict[str, object]]:
    capabilities = []
    for module_name, metadata in LIBRARY_CATALOG.items():
        installed = importlib.util.find_spec(module_name) is not None
        capabilities.append({
            "library": module_name,
            "installed": installed,
            "status": metadata["status"],
            "purpose": metadata["purpose"],
        })
    return capabilities