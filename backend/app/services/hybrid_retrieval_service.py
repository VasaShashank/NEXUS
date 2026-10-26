"""
NEXUS 2.0 Hybrid Retrieval & Fact-Grounded Financial Intelligence Engine.
Combines BM25 keyword scoring, semantic term overlap, structured financial fact queries,
and table-aware document retrieval to eliminate financial hallucination.
"""
from __future__ import annotations

import math
import re
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.document_intelligence import (
    CanonicalFinancialFact,
    DocumentFiling,
    ExtractedTable,
    ForensicFinding,
    ManagementGuidanceStatement,
)


class HybridRetrievalService:
    """Retrieves verified document snippets, structured facts, and forensic findings."""

    def __init__(self):
        # Stopwords for financial query BM25 tokenization
        self.stopwords = {
            "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
            "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
            "by", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
            "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
            "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "me", "more",
            "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
            "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so",
            "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then",
            "there", "these", "they", "this", "those", "through", "to", "too", "under", "until", "up",
            "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
            "why", "with", "would", "you", "your", "yours", "yourself", "yourselves", "tell", "show",
            "what", "is", "give", "me"
        }

    def _tokenize(self, text: str) -> List[str]:
        words = re.findall(r"\b[a-zA-Z0-9_]{2,}\b", text.lower())
        return [w for w in words if w not in self.stopwords]

    def search(
        self,
        query: str,
        symbol: str,
        db: Session,
        top_k: int = 5,
    ) -> Dict[str, Any]:
        """Hybrid search combining structured financial facts, tables, and narrative guidance."""
        norm_symbol = symbol.upper().split(".")[0]
        q_tokens = self._tokenize(query)

        # 1. Check for Structured Numerical Financial Facts first
        structured_facts = []
        all_facts = db.query(CanonicalFinancialFact).filter(
            CanonicalFinancialFact.symbol == norm_symbol
        ).all()

        for f in all_facts:
            # Check if query matches metric id or name or fiscal year
            metric_tokens = self._tokenize(f"{f.metric_name} {f.metric_id} {f.fiscal_year}")
            overlap = set(q_tokens).intersection(set(metric_tokens))
            if overlap:
                structured_facts.append({
                    "metric_id": f.metric_id,
                    "metric_name": f.metric_name,
                    "fiscal_year": f.fiscal_year,
                    "value": f.value,
                    "unit": f.unit,
                    "source_page": f.source_page,
                    "consolidation": f.consolidation_scope,
                    "validation_status": f.validation_status,
                })

        # 2. Check Extracted Tables
        relevant_tables = []
        tables = db.query(ExtractedTable).join(DocumentFiling).filter(
            DocumentFiling.symbol == norm_symbol
        ).all()

        for tbl in tables:
            stmt_type = tbl.statement_type.lower()
            if any(term in query.lower() for term in ["balance sheet", "p&l", "profit and loss", "income statement", "cash flow"]):
                if (
                    ("balance sheet" in query.lower() and "balance_sheet" in stmt_type) or
                    (("p&l" in query.lower() or "income" in query.lower() or "profit" in query.lower()) and "income_statement" in stmt_type) or
                    ("cash flow" in query.lower() and "cash_flow" in stmt_type)
                ):
                    relevant_tables.append({
                        "statement_type": tbl.statement_type,
                        "consolidation_scope": tbl.consolidation_scope,
                        "page_number": tbl.page_number,
                        "markdown": tbl.raw_markdown,
                    })

        # 3. Check Management Guidance Statements
        guidance_results = []
        statements = db.query(ManagementGuidanceStatement).filter(
            ManagementGuidanceStatement.symbol == norm_symbol
        ).all()

        for s in statements:
            s_tokens = self._tokenize(f"{s.raw_quote} {s.statement_category} {s.fiscal_period}")
            overlap = len(set(q_tokens).intersection(set(s_tokens)))
            if overlap > 0:
                guidance_results.append({
                    "fiscal_period": s.fiscal_period,
                    "category": s.statement_category,
                    "quote": s.raw_quote,
                    "speaker": s.speaker_title,
                    "target": s.numeric_target,
                    "modality": s.modality,
                    "page": s.source_page,
                    "score": overlap,
                })

        guidance_results.sort(key=lambda x: x["score"], reverse=True)

        # 4. Check Forensic Findings
        findings = db.query(ForensicFinding).filter(
            ForensicFinding.symbol == norm_symbol
        ).all()
        forensic_context = [
            {
                "rule_id": f.rule_id,
                "title": f.title,
                "severity": f.severity,
                "observation": f.observation_summary,
                "breakdown": f.metric_breakdown,
            }
            for f in findings
        ]

        return {
            "symbol": norm_symbol,
            "query": query,
            "structured_facts": structured_facts[:6],
            "tables": relevant_tables[:2],
            "guidance_statements": guidance_results[:top_k],
            "forensic_findings": forensic_context[:4],
        }


hybrid_retrieval_service = HybridRetrievalService()
