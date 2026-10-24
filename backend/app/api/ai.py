"""
Agentic AI Research, Why-Moved, and Observability API routes.
"""
from typing import List, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database.session import get_db
from app.models.user import User
from app.models.agent_log import AgentRun, AgentToolCall
from app.api.deps import get_current_user
from app.schemas.agent import (
    AgentQueryRequest,
    AgentRunResponse,
    WhyMovedResponse,
    PortfolioDoctorResponse,
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantChatMessage
)
from app.agents.nexus_agent import NexusResearchAgent
from app.agents.why_moved_agent import WhyMovedAgent
from app.agents.portfolio_doctor import PortfolioDoctorAgent
from app.services.ai_service import AIService
from app.services.rag_service import rag_service
from app.services.market_service import MarketService
from app.services.trading_service import TradingService
from app.providers.market_data import market_data_provider
import time

router = APIRouter(prefix="/ai", tags=["Agentic AI & Intelligence"])

class TutorMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=6000)


class TutorChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: List[TutorMessage] = Field(default_factory=list, max_length=20)
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    topic: Optional[str] = Field(default=None, max_length=120)


class TutorLessonRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=160)
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"
    learning_goal: Optional[str] = Field(default=None, max_length=500)


@router.post("/tutor/chat")
def tutor_chat(
    req: TutorChatRequest,
    current_user: User = Depends(get_current_user),
):
    """Authenticated, model-backed finance tutor. Requires a configured AI provider."""
    # Retrieve source snippets when available; retrieval failure is explicitly
    # represented as no evidence, never as an invented citation.
    try:
        sources = rag_service.search(req.message, top_k=4)
    except Exception:
        sources = []
    history_text = "\\n".join(
        f"{m.role.upper()}: {m.content}" for m in req.history[-12:]
    )
    evidence_text = "\\n".join(
        f"- {item.get('title', 'Untitled document')} | {item.get('symbol', '')} | {item.get('snippet', '')[:1200]}"
        for item in sources
    ) or "No relevant indexed filing passages were retrieved."
    prompt = f"""Learner level: {req.level}
Topic: {req.topic or 'general personal finance and investing education'}
Recent conversation:
{history_text}

Retrieved evidence (may be empty; do not claim it proves anything unless directly relevant):
{evidence_text}

User's new question:
{req.message}

Pedagogical & Formatting Instructions:
1. Format your response cleanly using structured Markdown with crisp headings (###), bold definitions, and organized bullet points.
2. When presenting mathematical formulas, NEVER output cramped messy inline slashes. Format formulas with clean visual structure:
   - Provide the complete formula in a clear display block:
     $$\\text{{Metric}} = \\frac{{\\text{{Numerator}}}}{{\\text{{Denominator}}}} \\times 100$$
   - Clearly break down and define each numerator and denominator component.
3. Provide an intuitive real-world analogy to make abstract concepts instantly click.
4. Include a step-by-step worked numerical calculation showing every step of the math.
5. Highlight 1-2 common pitfalls that retail investors make.
6. Conclude with a practical takeaway and one quick checkpoint thought question.
This is objective financial education, not personalized investment advice."""
    result = AIService.generate_completion(
        prompt,
        system_instruction="You are NEXUS Tutor, an elite institutional financial educator and CFA charterholder. Communicate with the presentation clarity, structured formatting, and polished pedagogical depth of ChatGPT Plus. Use structured markdown, clean mathematical layouts, and step-by-step worked calculations.",
        max_tokens=1100,
        temperature=0.3,
    )
    if not result.get("content"):
        raise HTTPException(
            status_code=503,
            detail="AI tutor is unavailable. Configure at least one supported AI provider API key and try again.",
        )
    return {
        "answer": result["content"],
        "provider": result.get("provider"),
        "model": result.get("model"),
        "sources": [
            {
                "title": item.get("title"),
                "symbol": item.get("symbol"),
                "doc_type": item.get("doc_type"),
                "fiscal_year": item.get("fiscal_year"),
                "relevance_score": item.get("relevance_score"),
            }
            for item in sources
        ],
        "disclaimer": "For education only; not personalized investment advice.",
    }


@router.post("/tutor/lesson")
def tutor_generate_lesson(
    req: TutorLessonRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate a structured lesson on any supported finance topic."""
    prompt = f"""Create a finance learning lesson as valid JSON with keys:
title, learning_objectives (array of 3 strings), explanation, technical_deep_dive,
worked_example, common_mistakes (array of 3 strings), quiz (array of 3 objects with
question, options (4 strings), correct_index (0-3), explanation), next_topics (array of 3 strings).
Topic: {req.topic}
Learner level: {req.level}
Learning goal: {req.learning_goal or 'Understand the topic and apply it safely'}.
Use hypothetical numbers unless sourced data is provided. Show formulas clearly and
check arithmetic. No promises of returns and no personalized buy/sell recommendations."""
    result = AIService.generate_completion(
        prompt,
        system_instruction="You are NEXUS Tutor's curriculum designer. Return valid JSON only, with no markdown fences. Educational, accurate, non-promotional.",
        max_tokens=1400,
        temperature=0.25,
    )
    if not result.get("content"):
        raise HTTPException(status_code=503, detail="AI lesson generation unavailable; configure an AI provider.")
    import json
    raw = (result["content"] or "").strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    try:
        lesson = json.loads(raw.strip())
    except (ValueError, TypeError):
        raise HTTPException(status_code=502, detail="The AI provider returned an invalid lesson format. Please retry.")
    required = {"title", "learning_objectives", "explanation", "worked_example", "quiz"}
    if not required.issubset(lesson):
        raise HTTPException(status_code=502, detail="The AI provider returned an incomplete lesson. Please retry.")
    return {"lesson": lesson, "provider": result.get("provider"), "model": result.get("model")}



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


@router.post("/assistant/chat", response_model=AssistantChatResponse)
def assistant_chat(
    req: AssistantChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Conversational Financial Copilot.
    Grounded in live Indian equities quotes, fundamental ratios, technical confluence,
    and the user's live paper trading portfolio.
    """
    start_time = time.time()
    if not req.messages:
        raise HTTPException(status_code=400, detail="At least one message is required.")

    latest_msg = req.messages[-1].content
    q_lower = latest_msg.lower()

    # 1. Identify relevant tickers from query or parameter
    detected_symbols = []
    if req.symbol:
        detected_symbols.append(req.symbol.upper().split(".")[0])

    known_tickers = [
        "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK", "BHARTIARTL",
        "SBIN", "LT", "ITC", "TATAMOTORS", "BAJFINANCE", "MARUTI", "SUNPHARMA",
        "TITAN", "KOTAKBANK", "AXISBANK", "WIPRO", "HCLTECH", "ONGC", "NTPC"
    ]
    for tk in known_tickers:
        if tk.lower() in q_lower or (tk == "TATAMOTORS" and "tata motors" in q_lower) or (tk == "HDFCBANK" and "hdfc" in q_lower):
            if tk not in detected_symbols:
                detected_symbols.append(tk)

    # Limit to top 2 for context window efficiency
    context_chunks = []
    used_context_labels = []

    for sym in detected_symbols[:2]:
        try:
            quote = market_data_provider.get_quote(sym)
            fund = None
            tech = None
            try:
                fund = MarketService.get_fundamentals(sym)
            except Exception:
                pass
            try:
                tech = MarketService.get_technical_indicators(sym)
            except Exception:
                pass

            sym_info = [f"### Live Market Context for {sym}:"]
            if quote:
                sym_info.append(f"- Current Price: ₹{quote.current_price:,.2f} ({'+' if quote.change_1d_pct >= 0 else ''}{quote.change_1d_pct:.2f}%)")
                sym_info.append(f"- Day Range: Low ₹{quote.low_price:,.2f} / High ₹{quote.high_price:,.2f} | Volume: {quote.volume:,}")
            if fund:
                sym_info.append(f"- Fundamentals: P/E: {fund.pe_ratio}x, ROE: {fund.roe}%, Debt/Equity: {fund.debt_to_equity}x, Market Cap: ₹{fund.market_cap:,.0f} Cr")
            if tech:
                sym_info.append(f"- Technicals: 14D RSI: {tech.rsi_14:.1f}, Confluence Signal: {tech.overall_signal}, MACD Trend: {tech.macd.trend if tech.macd else 'N/A'}")

            if len(sym_info) > 1:
                context_chunks.append("\n".join(sym_info))
                used_context_labels.append(f"Live Market Data ({sym})")
        except Exception:
            pass

    # 2. Portfolio context if requested or relevant
    if req.include_portfolio or any(w in q_lower for w in ["portfolio", "holdings", "my stocks", "rebalance", "allocation", "pnl", "balance"]):
        try:
            summary = TradingService.get_portfolio_summary(db, current_user)
            port_info = [
                "### User Portfolio & Cash Context:",
                f"- Virtual Cash Balance: ₹{summary.cash_balance:,.2f}",
                f"- Total Portfolio Value: ₹{summary.total_value:,.2f}",
                f"- Unrealized P&L: ₹{summary.total_pnl:,.2f} ({'+' if summary.total_pnl_pct >= 0 else ''}{summary.total_pnl_pct:.2f}%)",
                "- Active Holdings:"
            ]
            if summary.holdings:
                for h in summary.holdings[:8]:
                    port_info.append(f"  * {h.symbol}: {h.quantity} shares @ avg ₹{h.average_buy_price:,.2f} (Current: ₹{h.current_price:,.2f}, P&L: {h.pnl_pct:+.2f}%)")
            else:
                port_info.append("  * No active stock holdings. 100% liquid cash.")
            context_chunks.append("\n".join(port_info))
            used_context_labels.append("User Portfolio Ledger")
        except Exception:
            pass

    # 3. System instruction
    system_instruction = (
        "You are the NEXUS Financial Copilot, an institutional quantitative equity research analyst and portfolio strategist.\n"
        "Your mission is to provide rigorous, evidence-grounded insights, comparative stock evaluations, macroeconomic commentary, and mathematical valuation reasoning.\n\n"
        "CRITICAL FORMATTING GUIDELINES (Like ChatGPT):\n"
        "1. VISUAL MATHEMATICAL FRACTIONS: When showing formulas, calculations, or financial metrics, write divisions clearly as:\n"
        "   (Numerator) / (Denominator)  or  \\frac{Numerator}{Denominator}\n"
        "   Break down arithmetic step-by-step with intermediate values.\n"
        "2. STRUCTURE & TYPOGRAPHY:\n"
        "   - Use bold markdown headers (###) to separate sections.\n"
        "   - Use bullet points and numbered badges for clear readability.\n"
        "   - For stock comparisons, present side-by-side metric tables (P/E, ROE, Margin, RSI, Confluence).\n"
        "3. GROUNDING & FIDELITY: Strictly adhere to any verified financial context provided below. Never fabricate corporate earnings or stock quotes outside the provided context.\n"
        "4. ACTIONABLE TAKEAWAYS: Conclude with key risk considerations, price pivots to watch, and follow-up inquiry suggestions.\n"
        "5. DISCLAIMER: Remind the user when giving tactical insights that this is quantitative educational synthesis and not personalized SEBI financial advice."
    )

    # 4. Construct prompt history
    history_lines = []
    # Include up to last 8 messages
    for msg in req.messages[-8:]:
        role_label = "User" if msg.role == "user" else "Assistant"
        history_lines.append(f"{role_label}: {msg.content}")

    context_text = "\n\n".join(context_chunks) if context_chunks else "No specific stock or portfolio context was requested."

    final_prompt = (
        f"VERIFIED FINANCIAL CONTEXT:\n{context_text}\n\n"
        f"CONVERSATION HISTORY:\n"
        + "\n\n".join(history_lines)
        + "\n\nAssistant:"
    )

    result = AIService.generate_completion(
        prompt=final_prompt,
        system_instruction=system_instruction,
        max_tokens=1500,
        temperature=0.3
    )

    if result.get("status") not in ("SUCCESS", "FALLBACK") or not result.get("content"):
        raise HTTPException(
            status_code=503,
            detail="The AI Copilot is temporarily unavailable. Verify your backend AI provider API key."
        )

    latency_ms = round((time.time() - start_time) * 1000, 2)

    return AssistantChatResponse(
        message=AssistantChatMessage(
            role="assistant",
            content=result["content"].strip()
        ),
        provider=result.get("provider", "groq"),
        model=result.get("model", "llama-3.3-70b-versatile"),
        latency_ms=latency_ms,
        context_used=used_context_labels
    )