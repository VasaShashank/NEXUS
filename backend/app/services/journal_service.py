"""
Investment Journal Service.
Logs investment hypotheses, links trades, and calculates strategy performance metrics.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.journal import JournalEntry
from app.models.portfolio import Transaction
from app.schemas.journal import (
    JournalCreateRequest,
    JournalResponse,
    JournalSummaryResponse,
    StrategyMetric
)


class JournalService:
    @staticmethod
    def create_entry(db: Session, user: User, req: JournalCreateRequest) -> JournalResponse:
        symbol = req.symbol.upper().split(".")[0]
        
        # Link to transaction if provided or if recent transaction exists
        tx_id = req.transaction_id
        if not tx_id:
            recent_tx = db.query(Transaction).filter(
                Transaction.symbol == symbol
            ).order_by(Transaction.executed_at.desc()).first()
            if recent_tx:
                tx_id = recent_tx.id

        entry = JournalEntry(
            user_id=user.id,
            transaction_id=tx_id,
            symbol=symbol,
            thesis=req.thesis,
            strategy_tag=req.strategy_tag.upper(),
            target_price=req.target_price,
            stop_loss=req.stop_loss,
            expected_timeframe=req.expected_timeframe,
            notes=req.notes
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

        return JournalResponse(
            id=entry.id,
            user_id=entry.user_id,
            symbol=entry.symbol,
            thesis=entry.thesis,
            strategy_tag=entry.strategy_tag,
            target_price=entry.target_price,
            stop_loss=entry.stop_loss,
            expected_timeframe=entry.expected_timeframe,
            notes=entry.notes,
            outcome_pnl=entry.outcome_pnl,
            created_at=entry.created_at.isoformat()
        )

    @staticmethod
    def get_user_journal(db: Session, user: User) -> JournalSummaryResponse:
        entries = db.query(JournalEntry).filter(JournalEntry.user_id == user.id).order_by(JournalEntry.created_at.desc()).all()

        entry_responses = [
            JournalResponse(
                id=e.id,
                user_id=e.user_id,
                symbol=e.symbol,
                thesis=e.thesis,
                strategy_tag=e.strategy_tag,
                target_price=e.target_price,
                stop_loss=e.stop_loss,
                expected_timeframe=e.expected_timeframe,
                notes=e.notes,
                outcome_pnl=e.outcome_pnl,
                created_at=e.created_at.isoformat()
            )
            for e in entries
        ]

        # Strategy performance breakdown — metrics are ONLY computed from
        # journal entries that have a real recorded outcome_pnl. No fabricated
        # default P&L, win rates, or capital bases are invented.
        strategy_buckets: Dict[str, List[JournalEntry]] = {}
        for e in entries:
            tag = e.strategy_tag or "SWING"
            strategy_buckets.setdefault(tag, []).append(e)

        breakdown: List[StrategyMetric] = []
        total_pnl = 0.0
        total_wins = 0
        total_outcomes = 0

        def _cost_basis(item: JournalEntry) -> Optional[float]:
            tx = item.transaction
            if tx and tx.price and tx.quantity:
                return tx.price * tx.quantity
            return None

        for strat, items in strategy_buckets.items():
            count = len(items)
            outcomes = [item for item in items if item.outcome_pnl is not None]
            resolved = [
                (item, float(item.outcome_pnl), _cost_basis(item))
                for item in outcomes
            ]
            strat_pnl = sum(pnl for _, pnl, _ in resolved)
            wins = sum(1 for _, pnl, _ in resolved if pnl > 0)
            win_pct = round((wins / len(outcomes)) * 100, 1) if outcomes else 0.0

            returns = [
                (pnl / cost) * 100
                for _, pnl, cost in resolved
                if cost and cost > 0
            ]
            avg_ret = round(sum(returns) / len(returns), 2) if returns else 0.0

            total_pnl += strat_pnl
            total_wins += wins
            total_outcomes += len(outcomes)

            breakdown.append(StrategyMetric(
                strategy=strat,
                total_trades=count,
                winning_trades=wins,
                win_rate_pct=win_pct,
                total_pnl=round(strat_pnl, 2),
                avg_return_pct=avg_ret
            ))

        overall_win_rate = round((total_wins / total_outcomes) * 100, 1) if total_outcomes > 0 else 0.0

        return JournalSummaryResponse(
            entries=entry_responses,
            strategy_breakdown=breakdown,
            overall_win_rate=overall_win_rate,
            total_journaled_pnl=round(total_pnl, 2)
        )
