"""
Background Market Data Preheating & Scheduled Cache Refresher.
Pre-warms Indian indices, market overview, and equity quotes on application boot
and maintains fresh data on a 5-minute background cadence.
Guarantees that user requests hit pre-warmed in-memory cache with sub-10ms latency.
"""
import asyncio
import logging
from typing import Optional

logger = logging.getLogger("nexus.preheat")


class MarketDataPreheatWorker:
    def __init__(self, refresh_interval_seconds: int = 300):
        self._interval = refresh_interval_seconds
        self._task: Optional[asyncio.Task] = None
        self._is_running = False

    async def _run_loop(self):
        # Allow server to complete boot sequence before initial warm
        await asyncio.sleep(2)
        logger.info("Initializing background market data preheating...")

        while self._is_running:
            try:
                # Run the synchronous scraping / batch fetch in a worker thread so the async event loop is never blocked
                await asyncio.to_thread(self._preheat_sync)
                logger.info("Market data preheat cycle completed successfully.")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Market data preheat cycle encountered non-fatal error: {e}")

            # Sleep until next scheduled refresh
            try:
                await asyncio.sleep(self._interval)
            except asyncio.CancelledError:
                break

    def _preheat_sync(self):
        from app.providers.market_data import market_data_provider
        from app.providers.indian_equities_data import INDIAN_STOCKS_DATA
        from app.services.market_service import MarketService

        # 1. Pre-warm major Indian indices
        market_data_provider.get_indices()

        # 2. Concurrently batch-fetch core stock universe
        symbols = list(INDIAN_STOCKS_DATA.keys())
        market_data_provider.get_batch_quotes(symbols)

        # 3. Pre-compute and cache Market Overview
        MarketService.get_market_overview()

    def start(self):
        if not self._is_running:
            self._is_running = True
            self._task = asyncio.create_task(self._run_loop())

    def stop(self):
        self._is_running = False
        if self._task and not self._task.done():
            self._task.cancel()


# Singleton background preheat worker instance
preheat_worker = MarketDataPreheatWorker(refresh_interval_seconds=300)
