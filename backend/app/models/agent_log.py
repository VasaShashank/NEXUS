"""
Observability models for tracking Agentic AI executions, tool calls, latencies, and tokens.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database.session import Base


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    run_id = Column(String, unique=True, index=True, nullable=False)
    agent_type = Column(String, default="RESEARCH")  # RESEARCH, WHY_MOVED, PORTFOLIO_DOCTOR
    query = Column(Text, nullable=False)
    state = Column(String, default="COMPLETED")  # PENDING, RUNNING, COMPLETED, FAILED
    grounded_response = Column(Text, nullable=True)
    evidence_citations = Column(JSON, default=list)
    tokens_used = Column(Integer, default=0)
    latency_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="agent_runs")
    tool_calls = relationship("AgentToolCall", back_populates="agent_run", cascade="all, delete-orphan")


class AgentToolCall(Base):
    __tablename__ = "agent_tool_calls"

    id = Column(Integer, primary_key=True, index=True)
    agent_run_id = Column(Integer, ForeignKey("agent_runs.id"), nullable=False)
    tool_name = Column(String, nullable=False)
    tool_input = Column(JSON, nullable=True)
    tool_output = Column(JSON, nullable=True)
    latency_ms = Column(Float, default=0.0)
    status = Column(String, default="SUCCESS")  # SUCCESS, ERROR
    called_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    agent_run = relationship("AgentRun", back_populates="tool_calls")
