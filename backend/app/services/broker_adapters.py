"""Provider-agnostic broker adapter contracts with read-only external adapters."""
from typing import Any, Dict, List, Optional, Protocol

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.services.trading_service import TradingService


class ReadOnlyBrokerAdapter(Protocol):
    name: str

    def health(self) -> Dict[str, Any]: ...

    def get_positions(self, db: Session, user: User) -> List[Dict[str, Any]]: ...


class PaperBrokerAdapter:
    name = "paper"

    def health(self) -> Dict[str, Any]:
        return {
            "adapter": self.name,
            "status": "operational",
            "read_only": True,
            "live_execution_enabled": False,
            "credentials_configured": False,
            "consent_recorded": False,
            "reconciliation_ready": True,
            "rate_limit_policy": "local-only",
            "message": "Local paper portfolio adapter; no broker connection is used.",
        }

    def get_positions(self, db: Session, user: User) -> List[Dict[str, Any]]:
        summary = TradingService.get_portfolio_summary(db, user)
        return [holding.model_dump() for holding in summary.holdings]


class ConfigurableReadOnlyAdapter:
    """Read-only broker adapter gated on credentials, consent, and reconciliation terms."""

    def __init__(
        self,
        name: str,
        api_key_setting: Optional[str],
        api_secret_setting: Optional[str],
        consent_setting: Optional[str],
        health_url: Optional[str] = None,
    ):
        self.name = name
        self._api_key_setting = api_key_setting
        self._api_secret_setting = api_secret_setting
        self._consent_setting = consent_setting
        self._health_url = health_url

    def _credentials_configured(self) -> bool:
        return bool(self._api_key_setting and self._api_secret_setting)

    def _consent_recorded(self) -> bool:
        return bool(self._consent_setting)

    def health(self) -> Dict[str, Any]:
        credentials = self._credentials_configured()
        consent = self._consent_recorded()
        if not credentials:
            return {
                "adapter": self.name,
                "status": "disabled",
                "read_only": True,
                "live_execution_enabled": False,
                "credentials_configured": False,
                "consent_recorded": consent,
                "reconciliation_ready": False,
                "rate_limit_policy": "broker-specific (not configured)",
                "message": "External adapter disabled: broker credentials are not configured.",
            }
        if not consent:
            return {
                "adapter": self.name,
                "status": "disabled",
                "read_only": True,
                "live_execution_enabled": False,
                "credentials_configured": True,
                "consent_recorded": False,
                "reconciliation_ready": False,
                "rate_limit_policy": "broker-specific (awaiting consent)",
                "message": "External adapter disabled: user consent and reconciliation terms must be recorded.",
            }

        connectivity = "unknown"
        if self._health_url:
            try:
                with httpx.Client(timeout=4.0) as client:
                    response = client.get(self._health_url)
                    connectivity = "reachable" if response.status_code < 500 else "degraded"
            except Exception:
                connectivity = "unreachable"

        return {
            "adapter": self.name,
            "status": "read_only_configured" if connectivity != "unreachable" else "degraded",
            "read_only": True,
            "live_execution_enabled": False,
            "credentials_configured": True,
            "consent_recorded": True,
            "reconciliation_ready": True,
            "rate_limit_policy": "broker-specific read-only polling",
            "connectivity": connectivity,
            "message": "Read-only adapter configured. Positions are not synchronized until reconciliation is implemented.",
        }

    def get_positions(self, db: Session, user: User) -> List[Dict[str, Any]]:
        health = self.health()
        if health["status"] == "disabled":
            return []
        return []


def build_adapters() -> List[ReadOnlyBrokerAdapter]:
    return [
        PaperBrokerAdapter(),
        ConfigurableReadOnlyAdapter(
            "zerodha",
            settings.ZERODHA_API_KEY,
            settings.ZERODHA_API_SECRET,
            settings.ZERODHA_CONSENT_RECORDED,
            health_url="https://api.kite.trade/",
        ),
        ConfigurableReadOnlyAdapter(
            "angel_one",
            settings.ANGEL_ONE_API_KEY,
            settings.ANGEL_ONE_API_SECRET,
            settings.ANGEL_ONE_CONSENT_RECORDED,
        ),
        ConfigurableReadOnlyAdapter(
            "groww",
            settings.GROWW_API_KEY,
            settings.GROWW_API_SECRET,
            settings.GROWW_CONSENT_RECORDED,
        ),
    ]


def adapter_health() -> List[Dict[str, Any]]:
    return [adapter.health() for adapter in build_adapters()]
