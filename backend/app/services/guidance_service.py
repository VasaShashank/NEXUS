"""
NEXUS 2.0 Management Guidance & Commentary Longitudinal Drift Engine.
Tracks management commitments across multiple reporting periods and detects
guidance revisions, delayed timelines, and changes in conditionality.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.document_intelligence import ManagementGuidanceStatement
from app.schemas.document_intelligence import GuidanceDriftComparison


class GuidanceService:
    """Service for tracking management commitments and detecting guidance drift."""

    def get_statements(self, symbol: str, db: Session) -> List[ManagementGuidanceStatement]:
        norm = symbol.upper().split(".")[0]
        return db.query(ManagementGuidanceStatement).filter(
            ManagementGuidanceStatement.symbol == norm
        ).order_by(ManagementGuidanceStatement.fiscal_period.desc()).all()

    def detect_guidance_drift(self, symbol: str, db: Session) -> List[GuidanceDriftComparison]:
        norm = symbol.upper().split(".")[0]
        statements = db.query(ManagementGuidanceStatement).filter(
            ManagementGuidanceStatement.symbol == norm
        ).order_by(ManagementGuidanceStatement.fiscal_period.asc()).all()

        if len(statements) < 2:
            return []

        # Group statements by category
        by_category: Dict[str, List[ManagementGuidanceStatement]] = {}
        for s in statements:
            if s.statement_category not in by_category:
                by_category[s.statement_category] = []
            by_category[s.statement_category].append(s)

        drift_results: List[GuidanceDriftComparison] = []

        for cat, items in by_category.items():
            if len(items) >= 2:
                # Compare historical with latest
                hist = items[0]
                latest = items[-1]

                drift_type = "UNCHANGED"
                explanation = "Management maintained consistent guidance."

                if hist.numeric_target is not None and latest.numeric_target is not None:
                    if latest.numeric_target > hist.numeric_target:
                        drift_type = "TARGET_INCREASED" if cat != "CAPEX_PLAN" else "CAPEX_EXPANDED"
                        explanation = f"Target revised upward from {hist.numeric_target:,.1f} {hist.target_unit or ''} in {hist.fiscal_period} to {latest.numeric_target:,.1f} {latest.target_unit or ''} in {latest.fiscal_period}."
                    elif latest.numeric_target < hist.numeric_target:
                        drift_type = "TARGET_REDUCED" if cat != "CAPEX_PLAN" else "CAPEX_NORMALIZED"
                        explanation = f"Target revised downward from {hist.numeric_target:,.1f} {hist.target_unit or ''} in {hist.fiscal_period} to {latest.numeric_target:,.1f} {latest.target_unit or ''} in {latest.fiscal_period}."

                if hist.modality == "COMMITTED" and latest.modality in ["CONDITIONAL", "ASPIRATIONAL"]:
                    drift_type = "NEW_CONDITIONALITY"
                    explanation = f"Tone shifted from a committed stance in {hist.fiscal_period} to a conditional or aspirational outlook in {latest.fiscal_period}."

                drift_results.append(GuidanceDriftComparison(
                    category=cat,
                    historical_period=hist.fiscal_period,
                    historical_statement=hist.raw_quote,
                    historical_target=hist.numeric_target,
                    historical_modality=hist.modality,
                    current_period=latest.fiscal_period,
                    current_statement=latest.raw_quote,
                    current_target=latest.numeric_target,
                    current_modality=latest.modality,
                    drift_type=drift_type,
                    explanation=explanation,
                ))

        return drift_results


guidance_service = GuidanceService()
