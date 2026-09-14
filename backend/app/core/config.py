"""
Backend core configuration for NEXUS.
Supports both PostgreSQL and SQLite fallback with zero configuration.
"""
import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "NEXUS Financial Intelligence"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "nexus-super-secret-production-key-change-in-env-92837482"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database: Supports SQLite for zero-friction local dev, or PostgreSQL
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "sqlite:////tmp/nexus.db" if os.environ.get("VERCEL") else "sqlite:///./nexus.db"
    )
    
    # Redis cache (optional, graceful fallback if unavailable)
    REDIS_URL: Optional[str] = None
    
    # LLM APIs (Optional: Platform works reliably with deterministic fallback if absent)
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    # Broker read-only adapters (disabled until credentials and consent are configured)
    ZERODHA_API_KEY: Optional[str] = None
    ZERODHA_API_SECRET: Optional[str] = None
    ZERODHA_CONSENT_RECORDED: Optional[str] = None
    ANGEL_ONE_API_KEY: Optional[str] = None
    ANGEL_ONE_API_SECRET: Optional[str] = None
    ANGEL_ONE_CONSENT_RECORDED: Optional[str] = None
    GROWW_API_KEY: Optional[str] = None
    GROWW_API_SECRET: Optional[str] = None
    GROWW_CONSENT_RECORDED: Optional[str] = None
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")


settings = Settings()
