"""
Main FastAPI Application Entrypoint for NEXUS.
Configures CORS, mounts routers, manages database startup lifecycle,
and provides OpenAPI documentation.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from app.core.config import settings
from app.database.session import engine, Base
from app.database.base import *  # Ensure all models are registered
from app.api.auth import router as auth_router
from app.api.market import router as market_router
from app.api.stocks import router as stocks_router
from app.api.portfolio import router as portfolio_router
from app.api.journal import router as journal_router
from app.api.ai import router as ai_router
from app.api.multi_asset import router as multi_asset_router
from app.api.watchlists import router as watchlists_router
from app.api.tax import router as tax_router
from app.api.backtest import router as backtest_router
from app.api.health import router as health_router
from app.api.brokers import router as brokers_router
from app.api.alerts import router as alerts_router

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed default user
    Base.metadata.create_all(bind=engine)
    if settings.DATABASE_URL.startswith("sqlite"):
        columns = {column["name"] for column in inspect(engine).get_columns("transactions")}
        if "idempotency_key" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE transactions ADD COLUMN idempotency_key VARCHAR"))
        user_columns = {column["name"] for column in inspect(engine).get_columns("users")}
        if "oauth_provider" not in user_columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE users ADD COLUMN oauth_provider VARCHAR"))
        if "oauth_subject" not in user_columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE users ADD COLUMN oauth_subject VARCHAR"))
    from app.database.session import SessionLocal
    from app.models.user import User
    from app.core.security import get_password_hash
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "demo@nexusfin.ai").first()
        if not user:
            demo_user = User(
                email="demo@nexusfin.ai",
                hashed_password=get_password_hash("NexusDemo123!"),
                full_name="Institutional Trader",
                is_active=True,
                is_admin=True,
                virtual_balance=1000000.0
            )
            db.add(demo_user)
            db.commit()
    finally:
        db.close()

    from app.core.preheat import preheat_worker
    from app.services.data_staleness_scheduler import staleness_scheduler
    from app.services.portfolio_mark_scheduler import portfolio_mark_scheduler

    preheat_worker.start()
    staleness_scheduler.start()
    portfolio_mark_scheduler.start()

    yield

    portfolio_mark_scheduler.stop()
    staleness_scheduler.stop()
    preheat_worker.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent Multi-Asset Investment Research & Financial Intelligence Platform",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers under /api/v1
api_v1 = settings.API_V1_STR
app.include_router(auth_router, prefix=api_v1)
app.include_router(market_router, prefix=api_v1)
app.include_router(stocks_router, prefix=api_v1)
app.include_router(portfolio_router, prefix=api_v1)
app.include_router(journal_router, prefix=api_v1)
app.include_router(ai_router, prefix=api_v1)
app.include_router(multi_asset_router, prefix=api_v1)
app.include_router(watchlists_router, prefix=api_v1)
app.include_router(tax_router, prefix=api_v1)
app.include_router(backtest_router, prefix=api_v1)
app.include_router(alerts_router, prefix=api_v1)
app.include_router(health_router)
app.include_router(brokers_router, prefix=api_v1)


@app.get("/")
def root():
    return {
        "platform": "NEXUS Financial Intelligence",
        "status": "online",
        "api_docs": "/docs",
        "v1_endpoints": api_v1
    }
