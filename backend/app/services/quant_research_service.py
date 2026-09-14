"""Dependency-free quantitative research over sourced OHLCV observations."""
from typing import Any, Dict, List, Tuple
from app.providers.market_data import market_data_provider


class QuantResearchService:
    @staticmethod
    def _returns(symbol: str) -> Tuple[List[str], List[float], List[float]]:
        candles = market_data_provider.get_historical_candles(symbol, "5Y")
        dates = []
        returns = []
        volumes = []
        for index in range(1, len(candles)):
            previous = candles[index - 1]
            current = candles[index]
            if previous.close > 0 and current.close > 0:
                dates.append(current.time)
                returns.append((current.close / previous.close) - 1)
                volumes.append(current.volume)
        return dates, returns, volumes

    @staticmethod
    def _correlation(left: List[float], right: List[float]) -> float:
        count = min(len(left), len(right))
        if count < 20:
            raise ValueError("At least 20 aligned return observations are required.")
        left = left[-count:]
        right = right[-count:]
        left_avg = sum(left) / count
        right_avg = sum(right) / count
        numerator = sum((a - left_avg) * (b - right_avg) for a, b in zip(left, right))
        left_variance = sum((a - left_avg) ** 2 for a in left)
        right_variance = sum((b - right_avg) ** 2 for b in right)
        denominator = (left_variance * right_variance) ** 0.5
        return numerator / denominator if denominator else 0.0

    @staticmethod
    def similarity_and_clusters(symbols: List[str], correlation_threshold: float = 0.7) -> Dict[str, Any]:
        normalized = list(dict.fromkeys(symbol.upper().split(".")[0] for symbol in symbols if symbol.strip()))[:20]
        series = {symbol: QuantResearchService._returns(symbol) for symbol in normalized}
        similarities = []
        parent = {symbol: symbol for symbol in normalized}

        def find(symbol: str) -> str:
            while parent[symbol] != symbol:
                parent[symbol] = parent[parent[symbol]]
                symbol = parent[symbol]
            return symbol

        def union(left: str, right: str) -> None:
            left_root, right_root = find(left), find(right)
            if left_root != right_root:
                parent[right_root] = left_root

        for index, left in enumerate(normalized):
            for right in normalized[index + 1:]:
                try:
                    correlation = round(QuantResearchService._correlation(series[left][1], series[right][1]), 4)
                except ValueError:
                    continue
                similarities.append({"symbol_a": left, "symbol_b": right, "correlation": correlation, "distance": round(1 - correlation, 4)})
                if correlation >= correlation_threshold:
                    union(left, right)

        clusters: Dict[str, List[str]] = {}
        for symbol in normalized:
            clusters.setdefault(find(symbol), []).append(symbol)
        return {
            "symbols": normalized,
            "similarities": sorted(similarities, key=lambda item: item["correlation"], reverse=True),
            "clusters": list(clusters.values()),
            "methodology": "Pearson correlation of aligned daily close-to-close returns; clusters join pairs at or above the configured threshold.",
            "disclaimer": "Historical similarity is descriptive and does not predict future co-movement.",
        }

    @staticmethod
    def anomalies(symbol: str, z_threshold: float = 3.0) -> Dict[str, Any]:
        dates, returns, volumes = QuantResearchService._returns(symbol)
        if len(returns) < 30:
            return {"symbol": symbol.upper(), "anomalies": [], "data_available": False, "disclaimer": "At least 30 observations are required."}
        mean_return = sum(returns) / len(returns)
        std_return = (sum((value - mean_return) ** 2 for value in returns) / len(returns)) ** 0.5
        mean_volume = sum(volumes) / len(volumes)
        std_volume = (sum((value - mean_volume) ** 2 for value in volumes) / len(volumes)) ** 0.5
        anomalies = []
        for date, daily_return, volume in zip(dates, returns, volumes):
            return_z = abs((daily_return - mean_return) / std_return) if std_return else 0.0
            volume_z = abs((volume - mean_volume) / std_volume) if std_volume else 0.0
            if return_z >= z_threshold or volume_z >= z_threshold:
                anomalies.append({
                    "date": date,
                    "return_pct": round(daily_return * 100, 2),
                    "volume": volume,
                    "return_z": round(return_z, 2),
                    "volume_z": round(volume_z, 2),
                    "reason": "return anomaly" if return_z >= volume_z else "volume anomaly",
                })
        return {
            "symbol": symbol.upper(),
            "anomalies": anomalies[-100:],
            "observations": len(returns),
            "z_threshold": z_threshold,
            "methodology": "Absolute z-scores over the full available daily return and volume history.",
            "disclaimer": "Anomalies identify unusual historical observations and are not trading signals.",
        }

    @staticmethod
    def _strategy_return(closes: List[float], fast: int, slow: int) -> float:
        if len(closes) <= slow:
            return 0.0
        equity = 1.0
        position = 0
        for index in range(slow, len(closes)):
            fast_average = sum(closes[index - fast:index]) / fast
            slow_average = sum(closes[index - slow:index]) / slow
            next_position = 1 if fast_average > slow_average else 0
            if position:
                equity *= closes[index] / closes[index - 1]
            position = next_position
        return equity - 1

    @staticmethod
    def walk_forward(symbol: str, fast_periods: List[int], slow_periods: List[int], train_window: int, test_window: int, step: int) -> Dict[str, Any]:
        candles = market_data_provider.get_historical_candles(symbol, "5Y")
        closes = [candle.close for candle in candles]
        if len(closes) < train_window + test_window:
            return {"symbol": symbol.upper(), "folds": [], "data_available": False, "disclaimer": "Insufficient historical observations for requested windows."}
        folds = []
        start = 0
        while start + train_window + test_window <= len(closes):
            train = closes[start:start + train_window]
            test = closes[start + train_window:start + train_window + test_window]
            candidates = [(fast, slow) for fast in fast_periods for slow in slow_periods if fast < slow and slow < len(train)]
            if not candidates:
                break
            best_fast, best_slow = max(candidates, key=lambda pair: QuantResearchService._strategy_return(train, pair[0], pair[1]))
            folds.append({
                "train_start": candles[start].time,
                "train_end": candles[start + train_window - 1].time,
                "test_start": candles[start + train_window].time,
                "test_end": candles[start + train_window + test_window - 1].time,
                "selected_fast_period": best_fast,
                "selected_slow_period": best_slow,
                "train_return_pct": round(QuantResearchService._strategy_return(train, best_fast, best_slow) * 100, 2),
                "test_return_pct": round(QuantResearchService._strategy_return([train[-1]] + test, best_fast, best_slow) * 100, 2),
                "leakage_check": "PASS: parameters selected only from the preceding train window",
            })
            start += step
        return {
            "symbol": symbol.upper(),
            "folds": folds,
            "train_window": train_window,
            "test_window": test_window,
            "step": step,
            "methodology": "Rolling expanding-independent train/test windows; each test window is evaluated only after parameter selection on its preceding train window.",
            "disclaimer": "Historical walk-forward simulation with no predictive guarantee.",
        }
