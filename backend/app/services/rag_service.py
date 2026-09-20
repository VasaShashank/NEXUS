"""
Financial Document RAG & Vector Retrieval Engine.
Indexes real issuer filings retrieved from the BSE corporate-filings provider,
performs similarity retrieval, and strips potential prompt injections.
No curated or placeholder document text is ever indexed as if it were a real filing.
"""
from typing import List, Dict, Any, Optional
import re
from app.providers.bse_filings_provider import bse_filings_provider


class RAGService:
    def __init__(self):
        self._chunks: List[Dict[str, Any]] = []

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

    def _index_symbol(self, symbol: str):
        """Index only real filings for a symbol (metadata + disclosure text supplied by the issuer feed)."""
        try:
            docs = bse_filings_provider.get_documents(symbol)
        except Exception:
            docs = []

        existing_ids = {c["chunk_id"] for c in self._chunks}
        for doc in docs:
            symbol_norm = doc["symbol"].upper().split(".")[0]
            title = doc.get("title") or ""
            fiscal_year = doc.get("fiscal_year")
            doc_type = doc.get("doc_type") or "FILING"
            content = self._clean_text(doc.get("content") or title)
            chunk_id = f"{symbol_norm}_{doc_type}_{fiscal_year or 'n/a'}_{doc.get('id')}"
            if chunk_id in existing_ids:
                continue
            existing_ids.add(chunk_id)
            self._chunks.append({
                "chunk_id": chunk_id,
                "symbol": symbol_norm,
                "title": title,
                "doc_type": doc_type,
                "fiscal_year": fiscal_year,
                "snippet": content,
                "keywords": set(content.lower().replace(",", " ").replace(".", " ").split())
            })

    def search(self, query: str, symbol: Optional[str] = None, top_k: int = 3) -> List[Dict[str, Any]]:
        # Real filings are fetched from the live issuer feed before each search so
        # we never serve stale curated text as if it were a current filing.
        if symbol:
            self._index_symbol(symbol)

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