"""
Stock, Fundamental, Historical Price, News, and Screener models.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database.session import Base


class Stock(Base):
    __tablename__ = "stocks"

    symbol = Column(String, primary_key=True, index=True)  # e.g. RELIANCE.NS or RELIANCE
    company_name = Column(String, index=True, nullable=False)
    sector = Column(String, index=True)
    industry = Column(String)
    current_price = Column(Float, default=0.0)
    change_1d = Column(Float, default=0.0)
    change_1d_pct = Column(Float, default=0.0)
    open_price = Column(Float, default=0.0)
    high_price = Column(Float, default=0.0)
    low_price = Column(Float, default=0.0)
    previous_close = Column(Float, default=0.0)
    volume = Column(Float, default=0.0)
    week_52_high = Column(Float, default=0.0)
    week_52_low = Column(Float, default=0.0)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    fundamental = relationship("Fundamental", back_populates="stock", uselist=False, cascade="all, delete-orphan")
    news = relationship("NewsArticle", back_populates="stock", cascade="all, delete-orphan")
    documents = relationship("FinancialDocument", back_populates="stock", cascade="all, delete-orphan")


class Fundamental(Base):
    __tablename__ = "fundamentals"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, ForeignKey("stocks.symbol"), unique=True, nullable=False)
    market_cap = Column(Float, default=0.0)  # In Crores ₹
    pe_ratio = Column(Float, default=0.0)
    pb_ratio = Column(Float, default=0.0)
    ev_to_ebitda = Column(Float, default=0.0)
    roe = Column(Float, default=0.0)  # Percentage
    roce = Column(Float, default=0.0)  # Percentage
    debt_to_equity = Column(Float, default=0.0)
    dividend_yield = Column(Float, default=0.0)
    revenue_growth_yoy = Column(Float, default=0.0)
    profit_growth_yoy = Column(Float, default=0.0)
    eps = Column(Float, default=0.0)
    operating_margin = Column(Float, default=0.0)
    net_margin = Column(Float, default=0.0)
    total_debt = Column(Float, default=0.0)
    free_cash_flow = Column(Float, default=0.0)
    promoter_holding = Column(Float, default=0.0)
    promoter_pledge_pct = Column(Float, default=0.0)
    fii_holding = Column(Float, default=0.0)
    dii_holding = Column(Float, default=0.0)
    rsi_14 = Column(Float, default=50.0)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    stock = relationship("Stock", back_populates="fundamental")


class NewsArticle(Base):
    __tablename__ = "news_articles"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, ForeignKey("stocks.symbol"), index=True, nullable=True)
    headline = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    source = Column(String, default="Market Wire")
    url = Column(String, nullable=True)
    sentiment = Column(String, default="NEUTRAL")  # POSITIVE, NEGATIVE, NEUTRAL
    sentiment_score = Column(Float, default=0.0)
    published_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    stock = relationship("Stock", back_populates="news")


class FinancialDocument(Base):
    __tablename__ = "financial_documents"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, ForeignKey("stocks.symbol"), index=True, nullable=False)
    title = Column(String, nullable=False)
    doc_type = Column(String, default="ANNUAL_REPORT")  # ANNUAL_REPORT, EARNINGS_CALL, FILING
    fiscal_year = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    chunk_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    stock = relationship("Stock", back_populates="documents")


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, default="My Watchlist")
    symbols = Column(JSON, default=list)  # List of string symbols
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SavedScreen(Base):
    __tablename__ = "saved_screens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    filters = Column(JSON, nullable=False)  # JSON filter conditions
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="saved_screens")
