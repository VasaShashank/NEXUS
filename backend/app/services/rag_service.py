"""
Financial Document RAG & Vector Retrieval Engine.
Parses filings, creates semantic chunks, indexes documents, performs similarity retrieval,
and strips potential prompt injections.
"""
from typing import List, Dict, Any, Optional
import re
from app.providers.indian_equities_data import FINANCIAL_DOCUMENTS_DATA


class RAGService:
    def __init__(self):
        self._chunks: List[Dict[str, Any]] = []
        self._build_index()

    def _clean_text(self, text: str) -> str:
        # Prompt injection protection: sanitize instruction overrides
        patterns = [
            r"ignore all previous instructions",
            r"system prompt",
            r"disregard safety guidelines",
            r"you are now in developer mode"
        ]
        sanitized = text
        for p in patterns:
            sanitized = re.sub(p, "[REDACTED]", sanitized, flags=re.IGNORECASE)
        return sanitized

    def _build_index(self):
        self._chunks = []
        for doc in FINANCIAL_DOCUMENTS_DATA:
            symbol = doc["symbol"]
            title = doc["title"]
            content = self._clean_text(doc["content"])
            doc_type = doc["doc_type"]
            year = doc.get("fiscal_year", "FY25")

            # Chunk by sections or lines
            paragraphs = [p.strip() for p in content.split("\n") if len(p.strip()) > 30]
            for idx, para in enumerate(paragraphs):
                self._chunks.append({
                    "chunk_id": f"{symbol}_{doc_type}_{idx}",
                    "symbol": symbol,
                    "title": title,
                    "doc_type": doc_type,
                    "fiscal_year": year,
                    "snippet": para,
                    "keywords": set(para.lower().replace(",", " ").replace(".", " ").split())
                })

    def search(self, query: str, symbol: Optional[str] = None, top_k: int = 3) -> List[Dict[str, Any]]:
        query_words = set(query.lower().split())
        results = []

        for chunk in self._chunks:
            if symbol and chunk["symbol"].upper() != symbol.upper().split(".")[0]:
                continue
            
            # Compute term overlap score
            overlap = len(query_words.intersection(chunk["keywords"]))
            score = overlap / max(1, len(query_words))
            
            if symbol and chunk["symbol"].upper() == symbol.upper().split(".")[0]:
                score += 0.5  # Boost exact symbol match

            if score > 0.1:
                results.append({
                    "symbol": chunk["symbol"],
                    "title": chunk["title"],
                    "doc_type": chunk["doc_type"],
                    "fiscal_year": chunk["fiscal_year"],
                    "snippet": chunk["snippet"],
                    "relevance_score": round(score, 3)
                })

        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        return results[:top_k]


rag_service = RAGService()
