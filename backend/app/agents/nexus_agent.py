"""
Flagship Agentic AI Research Engine built with LangGraph.
Implements multi-step planning, tool calling, grounding validation,
and factual vs interpretation separation.
"""
from typing import Dict, Any, List, Optional, TypedDict
import time
import uuid

try:
    from langgraph.graph import StateGraph, END
    HAS_LANGGRAPH = True
except ImportError:
    HAS_LANGGRAPH = False
    StateGraph = None
    END = "__END__"

from app.agents.tools import AVAILABLE_TOOLS
from app.schemas.agent import AgentRunResponse, ToolCallLog, EvidenceCitation
from app.services.ai_service import AIService


class ResearchState(TypedDict):
    run_id: str
    query: str
    symbol: Optional[str]
    user_id: Optional[int]
    planned_tools: List[str]
    tool_calls: List[Dict[str, Any]]
    collected_data: Dict[str, Any]
    citations: List[Dict[str, Any]]
    executive_summary: str
    structured_findings: Dict[str, Any]
    bull_case: List[str]
    bear_case: List[str]
    risks_to_monitor: List[str]
    tokens_estimated: int
    latency_ms: float


def parse_intent_node(state: ResearchState) -> Dict[str, Any]:
    """Determine what tools are required based on user research prompt."""
    q = state["query"].lower()
    symbol = state.get("symbol")
    
    # Infer symbol if not provided
    if not symbol:
        for s in ["reliance", "tcs", "hdfcbank", "infy", "icicibank", "bhartiartl", "sbin", "lt", "itc", "tatamotors"]:
            if s in q:
                symbol = s.upper()
                break
        if not symbol:
            symbol = "RELIANCE"

    tools_to_run = ["get_stock_quote", "get_fundamentals", "get_technical_indicators"]
    if "news" in q or "recent" in q or "catalyst" in q or "investigate" in q or "research" in q:
        tools_to_run.append("search_news")
    if "annual" in q or "report" in q or "filing" in q or "management" in q or "rag" in q or "research" in q:
        tools_to_run.append("search_financial_documents")
    if "portfolio" in q or "allocation" in q:
        tools_to_run.append("get_portfolio")
        tools_to_run.append("calculate_portfolio_risk")

    return {
        "symbol": symbol,
        "planned_tools": tools_to_run
    }


def execute_tools_node(state: ResearchState) -> Dict[str, Any]:
    """Execute selected backend tools with microsecond timing and result packaging."""
    symbol = state.get("symbol") or "RELIANCE"
    tool_logs = []
    collected = {}
    citations = []

    for tool_name in state["planned_tools"]:
        func = AVAILABLE_TOOLS.get(tool_name)
        if not func:
            continue

        start_t = time.time()
        tool_input: Dict[str, Any] = {}
        status = "SUCCESS"

        try:
            if tool_name in ["get_stock_quote", "get_fundamentals", "get_technical_indicators", "get_historical_prices"]:
                tool_input = {"symbol": symbol}
                res = func(symbol)
            elif tool_name == "search_news":
                tool_input = {"query": state["query"], "symbol": symbol}
                res = func(state["query"], symbol)
            elif tool_name == "search_financial_documents":
                tool_input = {"query": state["query"], "symbol": symbol}
                res = func(state["query"], symbol)
            elif tool_name in ["get_portfolio", "calculate_portfolio_risk"]:
                uid = state.get("user_id") or 1
                tool_input = {"user_id": uid}
                res = func(uid)
            else:
                res = {}
        except Exception as e:
            res = {"error": str(e)}
            status = "ERROR"

        dur_ms = round((time.time() - start_t) * 1000, 2)
        collected[tool_name] = res

        tool_logs.append({
            "tool_name": tool_name,
            "tool_input": tool_input,
            "tool_output": res,
            "latency_ms": dur_ms,
            "status": status
        })

        # Generate Evidence Citations
        if tool_name == "get_stock_quote" and isinstance(res, dict) and "current_price" in res:
            chg = res.get("change_1d_pct")
            chg_txt = f"{chg:+,.2f}%" if chg is not None else "change n/a"
            lo = res.get("low_price")
            hi = res.get("high_price")
            day_range = f"day range {lo} - {hi}" if lo is not None or hi is not None else "day range n/a"
            citations.append({
                "source_type": "MARKET_DATA",
                "title": f"{symbol} Live National Exchange Quote",
                "reference": "NSE Realtime Feed",
                "snippet": f"Trading at ₹{res['current_price']} ({chg_txt}) with {day_range}."
            })
        elif tool_name == "get_fundamentals" and isinstance(res, dict) and "pe_ratio" in res:
            pe = res.get("pe_ratio")
            roe = res.get("roe")
            de = res.get("debt_to_equity")
            rev = res.get("revenue_growth_yoy")
            citations.append({
                "source_type": "FUNDAMENTALS",
                "title": f"{symbol} Financial Ratios & Balance Sheet",
                "reference": "Live provider financial data",
                "snippet": f"P/E: {pe}x, ROE: {roe}%, Debt/Equity: {de}x, Revenue Growth: {rev}% YoY."
            })
        elif tool_name == "get_technical_indicators" and isinstance(res, dict) and "overall_signal" in res:
            sr = res.get("support_resistance", {})
            rsi = res.get("rsi_14")
            macd_trend = res.get("macd", {}).get("trend")
            nearest_sup = sr.get("nearest_support")
            citations.append({
                "source_type": "TECHNICALS",
                "title": f"{symbol} Technical Confluence Analysis",
                "reference": "Multi-timeframe Momentum Engine",
                "snippet": f"Signal: {res['overall_signal']}, RSI(14): {rsi}, MACD Trend: {macd_trend}, Nearest Sup: ₹{nearest_sup}."
            })
        elif tool_name == "search_financial_documents" and isinstance(res, list):
            for doc in res:
                citations.append({
                    "source_type": "FILING",
                    "title": doc.get("title", "Corporate Filing"),
                    "reference": doc.get("fiscal_year", "FY26"),
                    "snippet": doc.get("snippet", "")
                })

    return {
        "tool_calls": tool_logs,
        "collected_data": collected,
        "citations": citations
    }


def synthesize_research_node(state: ResearchState) -> Dict[str, Any]:
    """
    Synthesize factual research findings with strict grounding.
    Explicitly distinguishes verified facts from investment interpretations and uncertainties.
    """
    symbol = state.get("symbol") or "EQUITY"
    data = state["collected_data"]
    quote = data.get("get_stock_quote", {})
    fund = data.get("get_fundamentals", {})
    tech = data.get("get_technical_indicators", {})
    news = data.get("search_news", [])

    curr_p = quote.get("current_price")
    change_pct = quote.get("change_1d_pct")
    pe = fund.get("pe_ratio")
    roe = fund.get("roe")
    de = fund.get("debt_to_equity")
    mcap = fund.get("market_cap")
    rsi = tech.get("rsi_14")
    macd_trend = tech.get("macd", {}).get("trend")
    signal = tech.get("overall_signal")
    sr = tech.get("support_resistance", {})

    def _fmt_num(value, suffix="", precision: int = 2) -> str:
        if value is None:
            return "Unavailable"
        return f"{value:,.{precision}f}{suffix}"

    def _fmt_pct(value, precision: int = 2) -> str:
        if value is None:
            return "Unavailable"
        sign = "+" if value >= 0 else ""
        return f"{sign}{value:,.{precision}f}%"

    summary_parts = [
        f"Comprehensive research analysis for {symbol} ({quote.get('company_name', symbol)})."
    ]
    if curr_p is not None:
        summary_parts.append(f"The stock is currently trading at ₹{curr_p:,.2f} ({_fmt_pct(change_pct)}).")
    if pe is not None:
        summary_parts.append(f"The trailing P/E ratio is {pe:.2f}x.")
    if roe is not None:
        summary_parts.append(f"Return on equity stands at {roe:.2f}%.")
    if de is not None:
        summary_parts.append(f"Debt-to-Equity is {de:.2f}x.")
    if rsi is not None:
        summary_parts.append(f"14-day RSI is at {rsi:.1f}.")
    if signal:
        summary_parts.append(f"The technical confluence signal is '{signal}'" + (f" with MACD exhibiting a {macd_trend} structure." if macd_trend else "."))
    if not any(v is not None for v in (curr_p, pe, roe, de, rsi)):
        summary_parts.append("No live quote, fundamental, or technical data was retrievable for this symbol; the analysis below is therefore unavailable rather than approximate.")
    summary = " ".join(summary_parts)

    bulls = []
    if roe is not None:
        bulls.append(f"Robust return on equity ({roe:.2f}%) and healthy operational profitability.")
    if de is not None:
        bulls.append(f"Manageable leverage profile with Debt/Equity standing at {de:.2f}x.")
    if rsi is not None or macd_trend:
        bulls.append("Technical indicators reflect "
                     + (f"{macd_trend.lower()} momentum" if macd_trend else "mixed momentum")
                     + (f" with RSI positioned at {rsi:.1f}." if rsi is not None else "."))
    if not bulls:
        bulls.append("No live data was available to construct a bull-case thesis.")

    bears = []
    if pe is not None:
        bears.append(f"Valuation multiple at {pe:.2f}x requires sustained double-digit earnings compounding.")
    bears.append("Sector exposure remains sensitive to macro commodity swings and interest rate cycles.")
    if not bears:
        bears.append("No live data was available to construct a bear-case thesis.")

    risks = []
    if sr.get("nearest_support") is not None and curr_p is not None:
        risks.append(f"Near-term technical support at ₹{sr['nearest_support']:,.2f} must hold on elevated volume.")
    risks.append("Execution risk across high-capex digital and infrastructure initiatives.")

    findings = {
        "verified_facts": {
            "current_price": f"₹{curr_p:,.2f}" if curr_p is not None else "Unavailable",
            "market_cap": f"₹{mcap:,.0f} Cr" if mcap is not None else "Unavailable",
            "pe_ratio": f"{pe:.2f}x" if pe is not None else "Unavailable",
            "debt_to_equity": f"{de:.2f}x" if de is not None else "Unavailable",
            "rsi_14": f"{rsi:.1f}" if rsi is not None else "Unavailable",
            "overall_signal": signal or "Unavailable"
        },
        "interpretation": f"Based on the available multi-metric confluence for {symbol}, capital allocation signals are described only where live data was retrievable; metrics listed as Unavailable were not returned by the live provider and are not estimated.",
        "uncertainties": "Live provider data gaps, global energy transition pace, currency fluctuations, and quarterly enterprise spending commitments."
    }

    ai_summary = summary
    if AIService.get_available_provider() != "deterministic" and any(v is not None for v in (curr_p, pe, roe, de, rsi)):
        try:
            ai_prompt = (
                f"Synthesize an institutional equity research brief for {symbol} ({quote.get('company_name', symbol)}).\n"
                f"VERIFIED DATA (Do NOT invent numbers outside this context):\n"
                f"- Price: ₹{curr_p} ({_fmt_pct(change_pct) if curr_p is not None else 'N/A'})\n"
                f"- P/E: {pe}x, ROE: {roe}%, Debt/Equity: {de}x, Market Cap: ₹{mcap} Cr\n"
                f"- Technical RSI(14): {rsi}, MACD Trend: {macd_trend}, Signal: {signal}\n"
                f"- Support: ₹{sr.get('nearest_support')}, Resistance: ₹{sr.get('nearest_resistance')}\n"
                f"Draft 2 concise, professional paragraphs delivering an executive thesis, valuation perspective, and risk-reward profile."
            )
            ai_res = AIService.generate_completion(ai_prompt, max_tokens=600)
            if ai_res.get("status") == "SUCCESS" and ai_res.get("content"):
                ai_summary = ai_res["content"].strip()
        except Exception:
            pass

    return {
        "executive_summary": ai_summary,
        "structured_findings": findings,
        "bull_case": bulls,
        "bear_case": bears,
        "risks_to_monitor": risks,
        "tokens_estimated": 850
    }


def build_research_graph():
    if HAS_LANGGRAPH and StateGraph is not None:
        try:
            graph = StateGraph(ResearchState)
            graph.add_node("parse_intent", parse_intent_node)
            graph.add_node("execute_tools", execute_tools_node)
            graph.add_node("synthesize_research", synthesize_research_node)

            graph.set_entry_point("parse_intent")
            graph.add_edge("parse_intent", "execute_tools")
            graph.add_edge("execute_tools", "synthesize_research")
            graph.add_edge("synthesize_research", END)

            return graph.compile()
        except Exception:
            pass

    # Resilient sequential fallback executor
    class SequentialResearchRunner:
        def invoke(self, state: Dict[str, Any]) -> Dict[str, Any]:
            cur = dict(state)
            cur.update(parse_intent_node(cur))
            cur.update(execute_tools_node(cur))
            cur.update(synthesize_research_node(cur))
            return cur

    return SequentialResearchRunner()


research_graph = build_research_graph()


class NexusResearchAgent:
    @staticmethod
    def run_research(query: str, symbol: Optional[str] = None, user_id: Optional[int] = None) -> AgentRunResponse:
        start_time = time.time()
        run_id = f"nexus_run_{uuid.uuid4().hex[:10]}"

        initial_state: ResearchState = {
            "run_id": run_id,
            "query": query,
            "symbol": symbol,
            "user_id": user_id,
            "planned_tools": [],
            "tool_calls": [],
            "collected_data": {},
            "citations": [],
            "executive_summary": "",
            "structured_findings": {},
            "bull_case": [],
            "bear_case": [],
            "risks_to_monitor": [],
            "tokens_estimated": 0,
            "latency_ms": 0.0
        }

        result_state = research_graph.invoke(initial_state)
        total_latency = round((time.time() - start_time) * 1000, 2)

        tool_logs = [
            ToolCallLog(
                tool_name=tc["tool_name"],
                tool_input=tc["tool_input"],
                tool_output=tc["tool_output"],
                latency_ms=tc["latency_ms"],
                status=tc["status"]
            )
            for tc in result_state.get("tool_calls", [])
        ]

        citations = [
            EvidenceCitation(
                source_type=c["source_type"],
                title=c["title"],
                reference=c["reference"],
                snippet=c["snippet"]
            )
            for c in result_state.get("citations", [])
        ]

        return AgentRunResponse(
            run_id=run_id,
            query=query,
            agent_type="RESEARCH",
            state="COMPLETED",
            executive_summary=result_state["executive_summary"],
            structured_findings=result_state["structured_findings"],
            bull_case=result_state["bull_case"],
            bear_case=result_state["bear_case"],
            risks_to_monitor=result_state["risks_to_monitor"],
            evidence_citations=citations,
            tool_calls=tool_logs,
            tokens_estimated=result_state.get("tokens_estimated", 650),
            latency_ms=total_latency
        )
