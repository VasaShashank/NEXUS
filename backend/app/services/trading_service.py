"""
Paper Trading & Order Execution Engine.
Handles Buy/Sell orders, position tracking, weighted average price calculations,
realized/unrealized P&L accounting, and virtual cash management.
"""
from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.portfolio import Portfolio, Holding, Transaction, TransactionSide
from app.models.user import User
from app.providers.market_data import market_data_provider
from app.schemas.portfolio import OrderCreateRequest, OrderResponse, PortfolioSummaryResponse, HoldingResponse


class TradingService:
    @staticmethod
    def get_or_create_user_portfolio(db: Session, user: User) -> Portfolio:
        portfolio = db.query(Portfolio).filter(Portfolio.user_id == user.id).first()
        if not portfolio:
            portfolio = Portfolio(
                user_id=user.id,
                name="Primary Portfolio",
                cash_balance=user.virtual_balance or 1000000.0
            )
            db.add(portfolio)
            db.commit()
            db.refresh(portfolio)
        return portfolio

    @staticmethod
    def execute_order(db: Session, user: User, order: OrderCreateRequest) -> OrderResponse:
        portfolio = TradingService.get_or_create_user_portfolio(db, user)
        if order.idempotency_key:
            existing = db.query(Transaction).filter(Transaction.idempotency_key == order.idempotency_key).first()
            if existing and existing.portfolio_id == portfolio.id:
                return OrderResponse(
                    id=existing.id,
                    portfolio_id=existing.portfolio_id,
                    symbol=existing.symbol,
                    side=existing.side,
                    quantity=existing.quantity,
                    price=existing.price,
                    total_amount=existing.total_amount,
                    realized_pnl=existing.realized_pnl,
                    executed_at=existing.executed_at.isoformat(),
                    message="Existing execution returned for idempotency key.",
                    order_type=existing.order_type,
                    status="EXECUTED",
                )
        symbol = order.symbol.upper().split(".")[0]
        
        quote = market_data_provider.get_quote(symbol)
        if not quote:
            raise HTTPException(status_code=400, detail=f"Invalid or untracked equity symbol: {symbol}")

        price = quote.current_price
        side = order.side.upper()
        order_type = order.order_type.upper()
        quantity = order.quantity

        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Order quantity must be greater than zero.")
        if side not in ("BUY", "SELL"):
            raise HTTPException(status_code=400, detail="Invalid side. Must be BUY or SELL.")
        if order.validity.upper() not in ("DAY", "IOC", "GTC"):
            raise HTTPException(status_code=400, detail="Invalid validity. Use DAY, IOC, or GTC.")
        if order_type not in ("MARKET", "LIMIT", "STOP_LOSS"):
            raise HTTPException(status_code=400, detail="Invalid order type. Use MARKET, LIMIT, or STOP_LOSS.")

        if order_type == "LIMIT":
            if order.limit_price is None or order.limit_price <= 0:
                raise HTTPException(status_code=400, detail="LIMIT orders require a positive limit_price.")
            is_marketable = price <= order.limit_price if side == "BUY" else price >= order.limit_price
            if not is_marketable:
                raise HTTPException(
                    status_code=400,
                    detail=f"LIMIT order not executed: current price ₹{price:,.2f} does not satisfy the {side} limit ₹{order.limit_price:,.2f}.",
                )
            price = order.limit_price
        elif order_type == "STOP_LOSS":
            if order.stop_price is None or order.stop_price <= 0:
                raise HTTPException(status_code=400, detail="STOP_LOSS orders require a positive stop_price.")
            is_triggered = price >= order.stop_price if side == "BUY" else price <= order.stop_price
            if not is_triggered:
                raise HTTPException(
                    status_code=400,
                    detail=f"STOP_LOSS order not triggered: current price ₹{price:,.2f} has not reached ₹{order.stop_price:,.2f}.",
                )

        total_cost = round(price * quantity, 2)
        realized_pnl = 0.0

        if side == "BUY":
            if portfolio.cash_balance < total_cost:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient virtual cash. Required: ₹{total_cost:,.2f}, Available: ₹{portfolio.cash_balance:,.2f}"
                )

            # Deduct cash
            portfolio.cash_balance -= total_cost
            user.virtual_balance = portfolio.cash_balance

            # Update or create holding
            holding = db.query(Holding).filter(
                Holding.portfolio_id == portfolio.id,
                Holding.symbol == symbol
            ).first()

            if not holding:
                holding = Holding(
                    portfolio_id=portfolio.id,
                    symbol=symbol,
                    company_name=quote.company_name,
                    sector=quote.sector,
                    quantity=quantity,
                    average_buy_price=price,
                    current_price=price,
                    invested_value=total_cost,
                    current_value=total_cost,
                    unrealized_pnl=0.0,
                    unrealized_pnl_pct=0.0
                )
                db.add(holding)
            else:
                # Weighted average cost calculation
                new_qty = holding.quantity + quantity
                new_invested = (holding.average_buy_price * holding.quantity) + total_cost
                new_avg_price = new_invested / new_qty
                
                holding.quantity = new_qty
                holding.average_buy_price = round(new_avg_price, 2)
                holding.invested_value = round(new_invested, 2)
                holding.current_price = price
                holding.current_value = round(new_qty * price, 2)
                holding.unrealized_pnl = round(holding.current_value - holding.invested_value, 2)
                holding.unrealized_pnl_pct = round((holding.unrealized_pnl / holding.invested_value) * 100, 2)

            message = f"Executed BUY order for {quantity} shares of {symbol} at ₹{price:,.2f}"

        elif side == "SELL":
            holding = db.query(Holding).filter(
                Holding.portfolio_id == portfolio.id,
                Holding.symbol == symbol
            ).first()

            if not holding or holding.quantity < quantity:
                avail = holding.quantity if holding else 0
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient holdings to sell {quantity} shares of {symbol}. You hold: {avail} shares."
                )

            # Calculate realized P&L on the sold portion
            cost_basis_sold = holding.average_buy_price * quantity
            proceeds = price * quantity
            realized_pnl = round(proceeds - cost_basis_sold, 2)

            # Credit cash
            portfolio.cash_balance += proceeds
            user.virtual_balance = portfolio.cash_balance

            # Update holding
            holding.quantity -= quantity
            if holding.quantity == 0:
                db.delete(holding)
            else:
                holding.invested_value = round(holding.average_buy_price * holding.quantity, 2)
                holding.current_price = price
                holding.current_value = round(holding.quantity * price, 2)
                holding.unrealized_pnl = round(holding.current_value - holding.invested_value, 2)
                holding.unrealized_pnl_pct = round((holding.unrealized_pnl / holding.invested_value) * 100, 2)

            message = f"Executed SELL order for {quantity} shares of {symbol} at ₹{price:,.2f} (Realized P&L: ₹{realized_pnl:+,.2f})"
        # Record transaction
        tx = Transaction(
            portfolio_id=portfolio.id,
            symbol=symbol,
            company_name=quote.company_name,
            side=side,
            order_type=order.order_type,
            quantity=quantity,
            price=price,
            total_amount=total_cost,
            realized_pnl=realized_pnl,
            idempotency_key=order.idempotency_key,
            executed_at=datetime.now(timezone.utc)
        )
        db.add(tx)
        db.commit()
        db.refresh(tx)

        return OrderResponse(
            id=tx.id,
            portfolio_id=portfolio.id,
            symbol=symbol,
            side=side,
            quantity=quantity,
            price=price,
            total_amount=total_cost,
            realized_pnl=realized_pnl,
            executed_at=tx.executed_at.isoformat(),
            message=f"{message} ({order_type}, {order.validity.upper()})",
            order_type=order_type,
            status="EXECUTED"
        )

    @staticmethod
    def get_portfolio_summary(db: Session, user: User) -> PortfolioSummaryResponse:
        portfolio = TradingService.get_or_create_user_portfolio(db, user)
        holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio.id).all()

        total_invested = 0.0
        total_curr_value = 0.0
        daily_pnl = 0.0

        # Update live prices for holdings
        holding_responses = []
        for h in holdings:
            quote = market_data_provider.get_quote(h.symbol)
            cur_p = quote.current_price if quote else h.current_price
            day_chg_pct = quote.change_1d_pct if quote else 0.0

            h.current_price = cur_p
            h.current_value = round(h.quantity * cur_p, 2)
            h.invested_value = round(h.quantity * h.average_buy_price, 2)
            h.unrealized_pnl = round(h.current_value - h.invested_value, 2)
            h.unrealized_pnl_pct = round((h.unrealized_pnl / h.invested_value) * 100, 2) if h.invested_value > 0 else 0.0

            total_invested += h.invested_value
            total_curr_value += h.current_value
            daily_pnl += h.current_value * (day_chg_pct / 100.0)

        # Calculate allocation percentages
        portfolio_equities_val = total_curr_value
        for h in holdings:
            alloc = (h.current_value / portfolio_equities_val * 100) if portfolio_equities_val > 0 else 0.0
            holding_responses.append(HoldingResponse(
                id=h.id,
                symbol=h.symbol,
                company_name=h.company_name,
                sector=h.sector,
                quantity=h.quantity,
                average_buy_price=h.average_buy_price,
                current_price=h.current_price,
                invested_value=h.invested_value,
                current_value=h.current_value,
                unrealized_pnl=h.unrealized_pnl,
                unrealized_pnl_pct=h.unrealized_pnl_pct,
                allocation_pct=round(alloc, 2)
            ))

        # Realized P&L from all sell transactions
        txs = db.query(Transaction).filter(
            Transaction.portfolio_id == portfolio.id,
            Transaction.side == "SELL"
        ).all()
        realized_pnl = round(sum(t.realized_pnl for t in txs), 2)

        unrealized_pnl = round(total_curr_value - total_invested, 2)
        unrealized_pnl_pct = round((unrealized_pnl / total_invested) * 100, 2) if total_invested > 0 else 0.0

        total_value = round(portfolio.cash_balance + total_curr_value, 2)
        daily_pnl = round(daily_pnl, 2)
        daily_pnl_pct = round((daily_pnl / total_value) * 100, 2) if total_value > 0 else 0.0

        db.commit()

        return PortfolioSummaryResponse(
            total_value=total_value,
            invested_value=round(total_invested, 2),
            cash_balance=round(portfolio.cash_balance, 2),
            unrealized_pnl=unrealized_pnl,
            unrealized_pnl_pct=unrealized_pnl_pct,
            realized_pnl=realized_pnl,
            daily_pnl=daily_pnl,
            daily_pnl_pct=daily_pnl_pct,
            holdings_count=len(holdings),
            holdings=holding_responses
        )

    @staticmethod
    def reset_virtual_portfolio(db: Session, user: User, starting_cash: float = 1000000.0) -> PortfolioSummaryResponse:
        portfolio = TradingService.get_or_create_user_portfolio(db, user)
        # Clear holdings and transactions
        db.query(Holding).filter(Holding.portfolio_id == portfolio.id).delete()
        db.query(Transaction).filter(Transaction.portfolio_id == portfolio.id).delete()
        portfolio.cash_balance = starting_cash
        user.virtual_balance = starting_cash
        db.commit()
        return TradingService.get_portfolio_summary(db, user)
