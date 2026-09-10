"""
Agentic AI Research, Why-Moved, and Observability API routes.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.models.agent_log import AgentRun, AgentToolCall
from app.api.deps import get_current_user
from app.schemas.agent import (
    AgentQueryRequest,
    AgentRunResponse,
    WhyMovedResponse,
    PortfolioDoctorResponse
)
from app.agents.nexus_agent import NexusResearchAgent
from app.agents.why_moved_agent import WhyMovedAgent
from app.agents.portfolio_doctor import PortfolioDoctorAgent

router = APIRouter(prefix="/ai", tags=["Agentic AI & Intelligence"])


@router.post("/research", response_model=AgentRunResponse)
def run_ai_research(
    req: AgentQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Execute Flagship LangGraph Investment Research Agent.
    Orchestrates market quoting, fundamental extraction, technical signals,
    and financial filing RAG with citations.
    """
    response = NexusResearchAgent.run_research(
        query=req.query,
        symbol=req.symbol,
        user_id=current_user.id
    )

    # Persist agent observability run in database
    try:
        run_record = AgentRun(
            user_id=current_user.id,
            run_id=response.run_id,
            agent_type="RESEARCH",
            query=response.query,
            state=response.state,
            grounded_response=response.executive_summary,
            evidence_citations=[c.model_dump() for c in response.evidence_citations],
            tokens_used=response.tokens_estimated,
            latency_ms=response.latency_ms
        )
        db.add(run_record)
        db.flush()

        for tc in response.tool_calls:
            call_record = AgentToolCall(
                agent_run_id=run_record.id,
                tool_name=tc.tool_name,
                tool_input=tc.tool_input,
                tool_output=tc.tool_output,
                latency_ms=tc.latency_ms,
                status=tc.status
            )
            db.add(call_record)
        db.commit()
    except Exception:
        db.rollback()

    return response


@router.get("/why-moved/{symbol}", response_model=WhyMovedResponse)
def why_did_it_move(symbol: str):
    """
    Diagnose why a specific equity moved today by cross-referencing
    index beta, sector trends, volume anomalies, and news catalysts.
    """
    return WhyMovedAgent.analyze(symbol)


@router.get("/portfolio-doctor", response_model=PortfolioDoctorResponse)
def run_portfolio_doctor(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Diagnose live paper portfolio concentration risk, sector tilts,
    and formulate institutional rebalancing suggestions.
    """
    return PortfolioDoctorAgent.analyze(db, current_user)


@router.get("/runs")
def get_agent_observability_runs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve historical agent execution traces, tool latencies, and token metrics."""
    runs = db.query(AgentRun).filter(AgentRun.user_id == current_user.id).order_by(AgentRun.created_at.desc()).limit(15).all()
    result = []
    for r in runs:
        calls = db.query(AgentToolCall).filter(AgentToolCall.agent_run_id == r.id).all()
        result.append({
            "run_id": r.run_id,
            "query": r.query,
            "state": r.state,
            "latency_ms": r.latency_ms,
            "tokens_used": r.tokens_used,
            "created_at": r.created_at.isoformat(),
            "tools_count": len(calls),
            "tools": [{"name": c.tool_name, "latency_ms": c.latency_ms, "status": c.status} for c in calls]
        })
    return result
