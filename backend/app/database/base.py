"""
Base class metadata importing all models for migrations and schema creation.
"""
from app.database.session import Base
from app.models.user import User
from app.models.portfolio import Portfolio, Holding, Transaction
from app.models.stock import Stock, Fundamental, NewsArticle, FinancialDocument, Watchlist, SavedScreen, Alert
from app.models.journal import JournalEntry
from app.models.agent_log import AgentRun, AgentToolCall
from app.models.mutual_fund import MutualFundScheme, MutualFundNavObservation
from app.models.portfolio_observation import PortfolioObservation
from app.models.provider_observation import ProviderObservation
