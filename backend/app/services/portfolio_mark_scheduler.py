"""Persist complete historical portfolio marks and benchmark observations."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("nexus.portfolio-marks")


class PortfolioMarkScheduler:
    def __init__(self, interval_seconds: int = 86400):
        self._interval = interval_seconds
        self._task: Optional[asyncio.Task] = None
        self._running = False

    def persist_all_marks(self) -> int:
        from app.database.session import SessionLocal
        from app.models.portfolio import Portfolio
        from app.models.portfolio_observation import PortfolioObservation
        from app.models.user import User
        from app.providers.market_data import market_data_provider
        from app.services.trading_service import TradingService

        db = SessionLocal()
        count = 0
        try:
            users = db.query(User).filter(User.is_active.is_(True)).all()
            benchmark_quote = market_data_provider.get_quote("^NSEI")
            now = datetime.now(timezone.utc)
            for user in users:
                portfolio = TradingService.get_or_create_user_portfolio(db, user)
                summary = TradingService.get_portfolio_summary(db, user)
                existing = db.query(PortfolioObservation).filter(
                    PortfolioObservation.portfolio_id == portfolio.id,
                    PortfolioObservation.observed_at >= now.replace(hour=0, minute=0, second=0, microsecond=0),
                ).first()
                if existing:
                    continue
                db.add(PortfolioObservation(
                    portfolio_id=portfolio.id,
                    observed_at=now,
                    portfolio_value=summary.total_value,
                    benchmark_value=benchmark_quote.current_price if benchmark_quote else None,
                    benchmark_source=benchmark_quote.data_source if benchmark_quote else None,
                ))
                count += 1
            db.commit()
            logger.info("Persisted %s portfolio mark observations", count)
        except Exception as exc:
            db.rollback()
            logger.warning("Portfolio mark persistence failed: %s", exc)
        finally:
            db.close()
        return count

    async def _loop(self) -> None:
        await asyncio.sleep(30)
        while self._running:
            try:
                await asyncio.to_thread(self.persist_all_marks)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning("Portfolio mark scheduler error: %s", exc)
            try:
                await asyncio.sleep(self._interval)
            except asyncio.CancelledError:
                break

    def start(self) -> None:
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._loop())

    def stop(self) -> None:
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()


portfolio_mark_scheduler = PortfolioMarkScheduler(interval_seconds=86400)
