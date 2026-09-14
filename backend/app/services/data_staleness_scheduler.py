"""Scheduled execution of persisted-observation stale-data reports."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("nexus.staleness")


class DataStalenessScheduler:
    def __init__(self, interval_seconds: int = 3600, max_age_minutes: int = 1440):
        self._interval = interval_seconds
        self._max_age_minutes = max_age_minutes
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self.last_report: Optional[dict] = None

    def run_once(self) -> dict:
        from app.services.provenance_service import stale_report

        report = stale_report(max_age_minutes=self._max_age_minutes)
        self.last_report = report
        stale_count = report.get("stale_count", 0)
        logger.info(
            "Stale-data report generated at %s: %s stale of %s observations",
            report.get("generated_at"),
            stale_count,
            len(report.get("observations", [])),
        )
        return report

    async def _loop(self) -> None:
        await asyncio.sleep(5)
        while self._running:
            try:
                await asyncio.to_thread(self.run_once)
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning("Stale-data scheduler error: %s", exc)
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


staleness_scheduler = DataStalenessScheduler(interval_seconds=3600, max_age_minutes=1440)
