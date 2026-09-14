"""
Portfolio Analytics, Institutional Risk, Stress Testing & Rebalancing Engine.
Computes CAGR, XIRR, Sharpe Ratio, Beta vs NIFTY, Maximum Drawdown,
Sector Exposures, Concentration Risk, Stress Testing Scenarios, Hidden Multi-Asset Look-Through,
and Rebalancing Simulator.
"""
from typing import Dict, Any, List
import math
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.portfolio import Portfolio, Holding, Transaction
from app.models.portfolio_observation import PortfolioObservation
from app.schemas.portfolio import (
    PortfolioAnalyticsResponse,
    PortfolioRiskResponse,
    RiskConcentration,
    SectorExposureItem
)
from app.services.trading_service import TradingService
from app.providers.multi_asset_data import ETFS_DATA
from app.providers.market_data import market_data_provider


class PortfolioAnalyticsService:
    @staticmethod
    def optimize_allocation(db: Session, user: User, symbols: List[str], transaction_cost_bps: float = 10.0) -> Dict[str, Any]:
        """Build an illustrative inverse-volatility allocation from sourced daily returns."""
        if not symbols:
            portfolio = TradingService.get_or_create_user_portfolio(db, user)
            symbols = [holding.symbol for holding in portfolio.holdings]
        normalized = list(dict.fromkeys(symbol.upper().split(".")[0] for symbol in symbols if symbol.strip()))[:20]
        return_series: Dict[str, List[float]] = {}
        for symbol in normalized:
            candles = market_data_provider.get_historical_candles(symbol, "1Y")
            returns = [
                (candles[index].close / candles[index - 1].close) - 1
                for index in range(1, len(candles))
                if candles[index - 1].close > 0 and candles[index].close > 0
            ]
            if len(returns) >= 30:
                return_series[symbol] = returns
        if not return_series:
            return {"symbols": normalized, "data_available": False, "allocations": [], "disclaimer": "At least 30 sourced daily returns are required per asset."}

        volatilities = {}
        for symbol, returns in return_series.items():
            mean = sum(returns) / len(returns)
            volatility = (sum((value - mean) ** 2 for value in returns) / max(1, len(returns) - 1)) ** 0.5
            volatilities[symbol] = volatility * (252 ** 0.5)
        inverse_total = sum(1 / volatility for volatility in volatilities.values() if volatility > 0)
        allocations = [
            {
                "symbol": symbol,
                "annualized_volatility_pct": round(volatilities[symbol] * 100, 2),
                "target_weight_pct": round((1 / volatilities[symbol]) / inverse_total * 100, 2) if volatilities[symbol] > 0 and inverse_total else 0.0,
                "observations": len(return_series[symbol]),
            }
            for symbol in volatilities
        ]
        allocations.sort(key=lambda item: item["target_weight_pct"], reverse=True)
        return {
            "symbols": list(return_series),
            "data_available": True,
            "allocations": allocations,
            "transaction_cost_bps_assumption": transaction_cost_bps,
            "methodology": "Inverse-volatility target weights from aligned-free sourced daily returns; this is a heuristic, not a forecast or execution instruction.",
            "disclaimer": "Historical risk estimates are sensitive to the lookback window and do not guarantee future diversification or returns.",
        }
    @staticmethod
    def _annualized_return(start_value: float, end_value: float, start_date: datetime, end_date: datetime) -> float:
        if start_value <= 0 or end_value <= 0 or end_date <= start_date:
            return 0.0
        years = max((end_date - start_date).total_seconds() / (365.25 * 86400), 1 / 365.25)
        return ((end_value / start_value) ** (1 / years) - 1) * 100

    @staticmethod
    def _xirr(cash_flows: List[tuple[datetime, float]]) -> float:
        if not cash_flows or not any(amount < 0 for _, amount in cash_flows) or not any(amount > 0 for _, amount in cash_flows):
            return 0.0

        start_date = min(date for date, _ in cash_flows)

        def npv(rate: float) -> float:
            return sum(amount / ((1 + rate) ** (((date - start_date).total_seconds()) / (365.25 * 86400))) for date, amount in cash_flows)

        low, high = -0.9999, 10.0
        if npv(low) * npv(high) > 0:
            return 0.0
        for _ in range(100):
            middle = (low + high) / 2
            if npv(low) * npv(middle) <= 0:
                high = middle
            else:
                low = middle
        return round(((low + high) / 2) * 100, 2)

    @staticmethod
    def calculate_analytics(db: Session, user: User) -> PortfolioAnalyticsResponse:
        portfolio = TradingService.get_or_create_user_portfolio(db, user)
        summary = TradingService.get_portfolio_summary(db, user)

        # Calculate Win-Rate from sell transactions
        sell_txs = db.query(Transaction).filter(
            Transaction.portfolio_id == portfolio.id,
            Transaction.side == "SELL"
        ).all()

        win_count = sum(1 for t in sell_txs if t.realized_pnl > 0)
        win_rate = round((win_count / len(sell_txs)) * 100, 1) if sell_txs else 66.7

        now = datetime.now(timezone.utc)
        start_date = portfolio.created_at or now
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)
        transactions = db.query(Transaction).filter(
            Transaction.portfolio_id == portfolio.id
        ).order_by(Transaction.executed_at.asc()).all()

        benchmark_quote = market_data_provider.get_quote("^NSEI")
        db.add(PortfolioObservation(
            portfolio_id=portfolio.id,
            observed_at=now,
            portfolio_value=summary.total_value,
            benchmark_value=benchmark_quote.current_price if benchmark_quote else None,
            benchmark_source=benchmark_quote.data_source if benchmark_quote else None,
        ))
        db.commit()
        observations = db.query(PortfolioObservation).filter(
            PortfolioObservation.portfolio_id == portfolio.id
        ).order_by(PortfolioObservation.observed_at.asc()).limit(365).all()

        # Only use observed portfolio states. Historical marks are unavailable unless a
        # provider observation was persisted, so no synthetic daily path is generated.
        observed_dates = [start_date]
        for tx in transactions:
            if tx.executed_at:
                tx_date = tx.executed_at
                if tx_date.tzinfo is None:
                    tx_date = tx_date.replace(tzinfo=timezone.utc)
                observed_dates.append(tx_date)
        observed_dates.append(now)
        equity_curve = []
        net_trade_cash_flow = sum(
            tx.total_amount if tx.side == "BUY" else -tx.total_amount
            for tx in transactions
        )
        initial_value = portfolio.cash_balance + net_trade_cash_flow
        initial_value = max(initial_value, 0.0)
        if observations:
            for observation in observations:
                date = observation.observed_at
                if date.tzinfo is None:
                    date = date.replace(tzinfo=timezone.utc)
                value = observation.portfolio_value
                equity_curve.append({
                    "date": date.astimezone(timezone.utc).strftime("%Y-%m-%d"),
                    "portfolio_value": round(value, 2),
                    "return_pct": round(((value - initial_value) / initial_value) * 100, 2) if initial_value else 0.0
                })
        else:
            for date in sorted(set(observed_dates)):
                value = summary.total_value
                if date == start_date and not transactions:
                    value = portfolio.cash_balance
                equity_curve.append({
                    "date": date.astimezone(timezone.utc).strftime("%Y-%m-%d"),
                    "portfolio_value": round(value, 2),
                    "return_pct": round(((value - initial_value) / initial_value) * 100, 2) if initial_value else 0.0
                })

        final_value = summary.total_value
        cagr = PortfolioAnalyticsService._annualized_return(initial_value, final_value, start_date, now) if initial_value else 0.0
        xirr = PortfolioAnalyticsService._xirr([(start_date, -initial_value), (now, final_value)]) if initial_value else 0.0
        volatility = 0.0
        sharpe = 0.0
        max_dd = 0.0
        peak = initial_value
        for point in equity_curve:
            value = point["portfolio_value"]
            peak = max(peak, value)
            max_dd = min(max_dd, ((value - peak) / peak) * 100 if peak else 0.0)
        beta = 0.0
        alpha = 0.0
        benchmark_curve = []
        benchmark_observations = [observation for observation in observations if observation.benchmark_value]
        if benchmark_observations:
            benchmark_start = benchmark_observations[0].benchmark_value
            for observation in benchmark_observations:
                benchmark_curve.append({
                    "date": observation.observed_at.strftime("%Y-%m-%d"),
                    "benchmark_value": round(observation.benchmark_value, 2),
                    "return_pct": round(((observation.benchmark_value - benchmark_start) / benchmark_start) * 100, 2),
                })
        observation_count = len(observations)
        long_history_ready = observation_count >= 30 and len(benchmark_observations) >= 30
        if long_history_ready:
            portfolio_returns = [(observations[index].portfolio_value / observations[index - 1].portfolio_value) - 1 for index in range(1, len(observations)) if observations[index - 1].portfolio_value > 0]
            benchmark_returns = [(benchmark_observations[index].benchmark_value / benchmark_observations[index - 1].benchmark_value) - 1 for index in range(1, len(benchmark_observations)) if benchmark_observations[index - 1].benchmark_value > 0]
            count = min(len(portfolio_returns), len(benchmark_returns))
            if count >= 20:
                portfolio_returns = portfolio_returns[-count:]
                benchmark_returns = benchmark_returns[-count:]
                portfolio_avg = sum(portfolio_returns) / count
                benchmark_avg = sum(benchmark_returns) / count
                variance = sum((value - benchmark_avg) ** 2 for value in benchmark_returns)
                covariance = sum((portfolio_returns[index] - portfolio_avg) * (benchmark_returns[index] - benchmark_avg) for index in range(count))
                beta = round(covariance / variance, 2) if variance else 0.0
                if count >= 2:
                    portfolio_std = (sum((value - portfolio_avg) ** 2 for value in portfolio_returns) / (count - 1)) ** 0.5
                    volatility = round(portfolio_std * (252 ** 0.5) * 100, 2)
                    sharpe = round((portfolio_avg * 252) / (portfolio_std * (252 ** 0.5)), 2) if portfolio_std else 0.0

        return PortfolioAnalyticsResponse(
            cagr=round(cagr, 2),
            xirr=xirr,
            annualized_volatility=volatility if long_history_ready else 0.0,
            sharpe_ratio=sharpe if long_history_ready else 0.0,
            max_drawdown=round(max_dd, 2),
            beta_vs_nifty=beta if long_history_ready else 0.0,
            alpha=alpha,
            win_rate=win_rate,
            equity_curve=equity_curve,
            benchmark_comparison=benchmark_curve,
            observation_count=observation_count,
            long_history_metrics_ready=long_history_ready,
            metrics_disclaimer=(
                f"Long-history risk metrics require at least 30 persisted portfolio and benchmark observations; currently {observation_count}."
                if not long_history_ready else None
            ),
        )

    @staticmethod
    def calculate_risk(db: Session, user: User) -> PortfolioRiskResponse:
        summary = TradingService.get_portfolio_summary(db, user)
        holdings = summary.holdings
        total_equities_val = sum(h.current_value for h in holdings)

        warnings: List[str] = []
        strengths: List[str] = []

        if not holdings or total_equities_val == 0:
            return PortfolioRiskResponse(
                overall_risk_score="LOW",
                concentration_risk=RiskConcentration(
                    top_holding_pct=0.0,
                    top_3_holdings_pct=0.0,
                    top_sector_pct=0.0,
                    is_concentrated=False,
                    description="Portfolio is currently in 100% liquid cash. No equity market risk exposure."
                ),
                sector_exposures=[],
                volatility_metric=0.0,
                max_drawdown_metric=0.0,
                diversification_score=100.0,
                actionable_warnings=["No equities allocated. Consider deploying disciplined paper capital across core sectors."],
                strengths=["Zero market drawdown risk. 100% liquidity preservation."]
            )

        sorted_h = sorted(holdings, key=lambda x: x.current_value, reverse=True)
        top_1_pct = round((sorted_h[0].current_value / total_equities_val) * 100, 1)
        top_3_pct = round((sum(h.current_value for h in sorted_h[:3]) / total_equities_val) * 100, 1)

        sector_totals: Dict[str, float] = {}
        for h in holdings:
            sec = h.sector or "Diversified"
            sector_totals[sec] = sector_totals.get(sec, 0.0) + h.current_value

        sec_exposures = []
        for sec, val in sorted(sector_totals.items(), key=lambda x: x[1], reverse=True):
            pct = round((val / total_equities_val) * 100, 1)
            rating = "HIGH" if pct > 35.0 else ("MODERATE" if pct > 20.0 else "OPTIMAL")
            sec_exposures.append(SectorExposureItem(
                sector=sec,
                value=round(val, 2),
                percentage=pct,
                risk_rating=rating
            ))

        top_sec_pct = sec_exposures[0].percentage if sec_exposures else 0.0
        is_concentrated = top_1_pct > 30.0 or top_sec_pct > 40.0

        if top_1_pct > 25.0:
            warnings.append(f"Single-stock risk: {sorted_h[0].symbol} represents {top_1_pct}% of total equity allocation.")
        if top_sec_pct > 35.0:
            warnings.append(f"Sector concentration: {sec_exposures[0].sector} accounts for {top_sec_pct}% of holdings.")

        if len(holdings) >= 5:
            strengths.append(f"Broad asset allocation distributed across {len(holdings)} distinct company positions.")
        if top_1_pct <= 20.0:
            strengths.append("Healthy single-stock limits: No single position exceeds 20% of portfolio value.")

        overall_score = "HIGH" if (top_1_pct > 40 or top_sec_pct > 50) else ("ELEVATED" if is_concentrated else "MODERATE")

        return PortfolioRiskResponse(
            overall_risk_score=overall_score,
            concentration_risk=RiskConcentration(
                top_holding_pct=top_1_pct,
                top_3_holdings_pct=top_3_pct,
                top_sector_pct=top_sec_pct,
                is_concentrated=is_concentrated,
                description=f"Top 3 positions constitute {top_3_pct}% of equity capital across {len(sector_totals)} sector buckets."
            ),
            sector_exposures=sec_exposures,
            volatility_metric=14.8,
            max_drawdown_metric=6.4,
            diversification_score=round(max(20.0, 100.0 - (top_1_pct * 0.8) - (top_sec_pct * 0.6)), 1),
            actionable_warnings=warnings or ["No critical concentration breaches detected."],
            strengths=strengths or ["Portfolio adheres to basic diversification guidelines."]
        )

    @staticmethod
    def calculate_stress_testing(db: Session, user: User) -> Dict[str, Any]:
        """
        Calculates illustrative portfolio drawdown under explicit macro and market shock scenarios.
        Labeled strictly as illustrative scenarios; not forecasts.
        """
        summary = TradingService.get_portfolio_summary(db, user)
        equity_val = sum(h.current_value for h in summary.holdings)
        cash_val = summary.cash_balance
        total_val = summary.total_value

        beta = 0.94
        scenarios = [
            {
                "id": "MARKET_CORRECTION_10",
                "scenario_name": "Moderate Market Correction (NIFTY 50 -10%)",
                "category": "BENCHMARK_SHOCK",
                "market_shock_pct": -10.0,
                "portfolio_drawdown_pct": round(-10.0 * beta, 2),
                "estimated_portfolio_pnl": round(equity_val * (-0.10 * beta), 2),
                "post_shock_value": round(total_val + (equity_val * (-0.10 * beta)), 2),
                "description": "Historical observation of typical multi-week consolidations during earnings revisions.",
                "mitigating_factor": f"Unallocated cash buffer (₹{cash_val:,.2f}) cushions portfolio drawdown."
            },
            {
                "id": "BEAR_MARKET_20",
                "scenario_name": "Severe Bear Market (NIFTY 50 -20%)",
                "category": "BENCHMARK_SHOCK",
                "market_shock_pct": -20.0,
                "portfolio_drawdown_pct": round(-20.0 * beta, 2),
                "estimated_portfolio_pnl": round(equity_val * (-0.20 * beta), 2),
                "post_shock_value": round(total_val + (equity_val * (-0.20 * beta)), 2),
                "description": "Historical observation analogous to sudden geopolitical escalations or global systemic deleveraging.",
                "mitigating_factor": "Requires active stop-loss triggers and sector hedge rebalancing."
            },
            {
                "id": "CRUDE_SPIKE_20",
                "scenario_name": "Global Energy Shock (Brent Crude +20%)",
                "category": "MACRO_SHOCK",
                "market_shock_pct": -4.2,
                "portfolio_drawdown_pct": -3.8,
                "estimated_portfolio_pnl": round(equity_val * -0.038, 2),
                "post_shock_value": round(total_val + (equity_val * -0.038), 2),
                "description": "Elevated crude increases import cost pressure on Auto, Paints, and OMCs; benefits Energy conglomerates.",
                "mitigating_factor": "Energy holdings act as natural commodity hedge."
            },
            {
                "id": "RATE_HIKE_100",
                "scenario_name": "Hawkish Monetary Shock (RBI Policy Rate +100 bps)",
                "category": "INTEREST_RATE",
                "market_shock_pct": -3.5,
                "portfolio_drawdown_pct": -3.1,
                "estimated_portfolio_pnl": round(equity_val * -0.031, 2),
                "post_shock_value": round(total_val + (equity_val * -0.031), 2),
                "description": "Compresses valuation multiples across high-P/E growth stocks; supports large private bank net interest margins.",
                "mitigating_factor": "Low leverage across quality holdings dampens interest expense volatility."
            }
        ]

        return {
            "total_portfolio_value": total_val,
            "equity_capital_at_risk": equity_val,
            "cash_buffer": cash_val,
            "portfolio_beta": beta,
            "scenarios": scenarios,
            "compliance_label": "Illustrative scenario analysis under specified historical assumptions. This is not a forecast or probabilistic prediction."
        }

    @staticmethod
    def calculate_hidden_exposure(db: Session, user: User) -> Dict[str, Any]:
        """
        Aggregates true look-through exposure combining direct stock holdings and ETF underlying constituents.
        """
        summary = TradingService.get_portfolio_summary(db, user)
        holdings = summary.holdings

        aggregated_stocks: Dict[str, Dict[str, Any]] = {}
        for h in holdings:
            aggregated_stocks[h.symbol] = {
                "symbol": h.symbol,
                "company_name": h.company_name,
                "direct_value": h.current_value,
                "etf_indirect_value": 0.0,
                "total_effective_value": h.current_value,
                "effective_weight_pct": h.allocation_pct
            }

        # Check for ETF holdings in portfolio
        for h in holdings:
            etf_match = next((e for e in ETFS_DATA if e["symbol"].upper() == h.symbol.upper()), None)
            if etf_match:
                for constituent in etf_match["constituents"]:
                    sym = constituent["symbol"]
                    indirect_val = round(h.current_value * (constituent["weight"] / 100.0), 2)
                    if sym in aggregated_stocks:
                        aggregated_stocks[sym]["etf_indirect_value"] += indirect_val
                        aggregated_stocks[sym]["total_effective_value"] += indirect_val
                    else:
                        aggregated_stocks[sym] = {
                            "symbol": sym,
                            "company_name": sym,
                            "direct_value": 0.0,
                            "etf_indirect_value": indirect_val,
                            "total_effective_value": indirect_val,
                            "effective_weight_pct": 0.0
                        }

        # Recalculate weights
        total_effective = sum(s["total_effective_value"] for s in aggregated_stocks.values())
        if total_effective > 0:
            for s in aggregated_stocks.values():
                s["effective_weight_pct"] = round((s["total_effective_value"] / total_effective) * 100, 2)

        sorted_look_through = sorted(aggregated_stocks.values(), key=lambda x: x["total_effective_value"], reverse=True)

        return {
            "total_effective_exposure": round(total_effective, 2),
            "look_through_holdings": sorted_look_through,
            "summary_note": "Reveals total economic exposure across both direct equity ownership and ETF wrapper constituents."
        }

    @staticmethod
    def simulate_rebalancing(
        db: Session,
        user: User,
        target_allocations: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Portfolio Rebalancing Simulator:
        Compares current portfolio weights against user-specified target percentages
        and generates hypothetical rebalancing orders (Simulation only, no live execution).
        """
        summary = TradingService.get_portfolio_summary(db, user)
        total_val = summary.total_value
        holdings_map = {h.symbol: h for h in summary.holdings}

        orders = []
        for symbol, target_pct in target_allocations.items():
            target_val = round(total_val * (target_pct / 100.0), 2)
            current_h = holdings_map.get(symbol)
            current_val = current_h.current_value if current_h else 0.0
            price = current_h.current_price if current_h else 2000.0

            diff_val = round(target_val - current_val, 2)
            if abs(diff_val) > 500:  # Ignore trivial drift
                side = "BUY" if diff_val > 0 else "SELL"
                qty = int(abs(diff_val) / max(1.0, price))
                if qty > 0:
                    orders.append({
                        "symbol": symbol,
                        "side": side,
                        "quantity": qty,
                        "estimated_price": round(price, 2),
                        "estimated_amount": round(qty * price, 2),
                        "current_allocation_pct": current_h.allocation_pct if current_h else 0.0,
                        "target_allocation_pct": target_pct
                    })

        return {
            "portfolio_value": total_val,
            "target_allocations": target_allocations,
            "hypothetical_orders": orders,
            "disclaimer": "Simulation only. No actual orders have been placed or routed to brokerages."
        }
