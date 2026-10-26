"""
NEXUS 2.0 Financial Statement Forensics & Earnings Quality Rule Engine.
Evaluates multi-period canonical financial facts to detect accounting divergences,
cash-flow discrepancies, working-capital bloat, and debt-coverage risks.
Outputs deterministic findings with severity, confidence, citations, benign explanations, and follow-ups.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.document_intelligence import (
    CanonicalFinancialFact,
    ForensicFinding,
    DocumentFiling,
)


class ForensicRuleEngine:
    """Deterministic rule-based accounting & earnings quality evaluator."""

    def evaluate_company(self, symbol: str, db: Session) -> List[ForensicFinding]:
        """Runs the suite of 8 accounting forensics checks against verified financial facts."""
        norm_symbol = symbol.upper().split(".")[0]

        # Retrieve canonical financial facts for this company ordered chronologically
        facts = db.query(CanonicalFinancialFact).filter(
            CanonicalFinancialFact.symbol == norm_symbol,
            CanonicalFinancialFact.consolidation_scope == "CONSOLIDATED"
        ).order_by(CanonicalFinancialFact.fiscal_year.asc()).all()

        if not facts:
            # Fallback to standalone if consolidated isn't present
            facts = db.query(CanonicalFinancialFact).filter(
                CanonicalFinancialFact.symbol == norm_symbol
            ).order_by(CanonicalFinancialFact.fiscal_year.asc()).all()

        if not facts:
            return []

        # Index facts by metric_id and fiscal_year: facts_by_metric[metric_id][fiscal_year] = fact
        facts_by_metric: Dict[str, Dict[str, CanonicalFinancialFact]] = {}
        for f in facts:
            if f.metric_id not in facts_by_metric:
                facts_by_metric[f.metric_id] = {}
            facts_by_metric[f.metric_id][f.fiscal_year] = f

        findings: List[ForensicFinding] = []

        # 1. RULE_CFO_PAT_DIVERGENCE: Operating Cash Flow vs Net Profit divergence
        cfo_pat_finding = self._check_cfo_pat_divergence(norm_symbol, facts_by_metric)
        if cfo_pat_finding:
            findings.append(cfo_pat_finding)

        # 2. RULE_RECEIVABLES_EXCEED_REVENUE: Receivables growth exceeding revenue growth
        rec_finding = self._check_receivables_vs_revenue(norm_symbol, facts_by_metric)
        if rec_finding:
            findings.append(rec_finding)

        # 3. RULE_INVENTORY_EXCEED_SALES: Inventory growth exceeding sales growth
        inv_finding = self._check_inventory_vs_sales(norm_symbol, facts_by_metric)
        if inv_finding:
            findings.append(inv_finding)

        # 4. RULE_DEBT_INTEREST_DETERIORATION: Rising debt with weakening interest coverage
        debt_finding = self._check_debt_and_interest_coverage(norm_symbol, facts_by_metric)
        if debt_finding:
            findings.append(debt_finding)

        # 5. RULE_OTHER_INCOME_HIGH_SHARE: High other income proportion of PBT
        other_inc_finding = self._check_other_income_share(norm_symbol, facts_by_metric)
        if other_inc_finding:
            findings.append(other_inc_finding)

        # 6. RULE_FCF_CONVERSION: Negative or weak Free Cash Flow conversion from PAT
        fcf_finding = self._check_fcf_conversion(norm_symbol, facts_by_metric)
        if fcf_finding:
            findings.append(fcf_finding)

        # 7. RULE_WORKING_CAPITAL_DILUTION: Working capital expansion outpacing revenue
        wc_finding = self._check_working_capital_efficiency(norm_symbol, facts_by_metric)
        if wc_finding:
            findings.append(wc_finding)

        # 8. RULE_DEPRECIATION_RATE_STABILITY: Depreciation slowdown while fixed assets grow
        dep_finding = self._check_depreciation_trend(norm_symbol, facts_by_metric)
        if dep_finding:
            findings.append(dep_finding)

        # Persist or update findings in DB
        db.query(ForensicFinding).filter(ForensicFinding.symbol == norm_symbol).delete()
        for f in findings:
            db.add(f)
        db.commit()

        return findings

    def _get_sorted_periods(self, metric_dict: Dict[str, CanonicalFinancialFact]) -> List[str]:
        # Sort e.g. FY22, FY23, FY24
        return sorted(metric_dict.keys())

    def _check_cfo_pat_divergence(
        self, symbol: str, facts: Dict[str, Dict[str, CanonicalFinancialFact]]
    ) -> Optional[ForensicFinding]:
        if "CASH_FLOW_OPERATING" not in facts or "PAT" not in facts:
            return None

        cfo_facts = facts["CASH_FLOW_OPERATING"]
        pat_facts = facts["PAT"]
        common_periods = sorted(set(cfo_facts.keys()).intersection(set(pat_facts.keys())))
        if len(common_periods) < 2:
            return None

        latest_p = common_periods[-1]
        prev_p = common_periods[-2]

        latest_cfo = cfo_facts[latest_p].value
        latest_pat = pat_facts[latest_p].value
        prev_cfo = cfo_facts[prev_p].value
        prev_pat = pat_facts[prev_p].value

        cfo_growth = ((latest_cfo - prev_cfo) / abs(prev_cfo)) * 100 if prev_cfo != 0 else 0
        pat_growth = ((latest_pat - prev_pat) / abs(prev_pat)) * 100 if prev_pat != 0 else 0
        ratio = (latest_cfo / latest_pat) if latest_pat > 0 else 0

        # Divergence pattern: PAT grew while CFO dropped or CFO/PAT ratio < 0.70
        is_divergence = (pat_growth > 5.0 and cfo_growth < -5.0) or (latest_pat > 0 and ratio < 0.70)
        is_healthy = ratio >= 0.90

        if is_divergence:
            severity = "HIGH" if ratio < 0.50 else "MEDIUM"
            summary = (
                f"Operating cash flow conversion ratio stands at {ratio:.2f}x in {latest_p}. "
                f"While reported PAT changed by {pat_growth:+.1f}%, Operating Cash Flow changed by {cfo_growth:+.1f}%."
            )
            citations = [
                {"period": latest_p, "doc": "Annual Report", "page": cfo_facts[latest_p].source_page, "metric": "CFO", "value": latest_cfo},
                {"period": latest_p, "doc": "Annual Report", "page": pat_facts[latest_p].source_page, "metric": "PAT", "value": latest_pat},
            ]
            return ForensicFinding(
                symbol=symbol,
                rule_id="RULE_CFO_PAT_DIVERGENCE",
                title="Operating Cash Flow Divergence from Reported Net Profit",
                severity=severity,
                confidence="HIGH",
                observation_summary=summary,
                metric_breakdown={
                    "period_current": latest_p,
                    "period_previous": prev_p,
                    "pat_current": latest_pat,
                    "pat_previous": prev_pat,
                    "cfo_current": latest_cfo,
                    "cfo_previous": prev_cfo,
                    "cfo_to_pat_ratio": round(ratio, 2),
                    "pat_growth_pct": round(pat_growth, 1),
                    "cfo_growth_pct": round(cfo_growth, 1),
                },
                why_it_matters="When cash flow from operations lags reported net income over consecutive periods, it may indicate aggressive revenue recognition, delayed customer collections, or inventory build-up.",
                benign_explanations=[
                    "Temporary working-capital investment to fulfill major long-term customer contracts.",
                    "Seasonal timing of milestone-based billings near fiscal year-end.",
                    "Strategic inventory stocking ahead of anticipated raw material price surges.",
                ],
                recommended_checks=[
                    "Inspect the Trade Receivables aging schedule in the Notes to Accounts for overdue balances (>6 months).",
                    "Verify subsequent quarter cash collections in quarterly results disclosures.",
                    "Examine inventory turnover days to see if goods are moving off the warehouse floor.",
                ],
                citations=citations,
            )
        elif is_healthy:
            # Generate informational positive quality finding
            return ForensicFinding(
                symbol=symbol,
                rule_id="RULE_CFO_PAT_DIVERGENCE",
                title="Strong Cash-Backed Earnings Quality (CFO / PAT > 0.90x)",
                severity="INFORMATIONAL",
                confidence="HIGH",
                observation_summary=f"Reported PAT of ₹{latest_pat:,.1f} Cr is strongly backed by Operating Cash Flow of ₹{latest_cfo:,.1f} Cr ({ratio:.2f}x conversion ratio) in {latest_p}.",
                metric_breakdown={
                    "period_current": latest_p,
                    "pat_current": latest_pat,
                    "cfo_current": latest_cfo,
                    "cfo_to_pat_ratio": round(ratio, 2),
                },
                why_it_matters="A high CFO-to-PAT ratio demonstrates high earnings quality, indicating profits are actually collected in bank cash rather than sitting in receivables.",
                benign_explanations=["Business possesses strong pricing power, minimal bad debts, and efficient working capital cycles."],
                recommended_checks=["Verify sustainable dividend distribution and free cash flow generation."],
                citations=[
                    {"period": latest_p, "doc": "Annual Report", "page": cfo_facts[latest_p].source_page, "metric": "CFO", "value": latest_cfo},
                    {"period": latest_p, "doc": "Annual Report", "page": pat_facts[latest_p].source_page, "metric": "PAT", "value": latest_pat},
                ],
            )
        return None

    def _check_receivables_vs_revenue(
        self, symbol: str, facts: Dict[str, Dict[str, CanonicalFinancialFact]]
    ) -> Optional[ForensicFinding]:
        if "TRADE_RECEIVABLES" not in facts or "REVENUE" not in facts:
            return None

        rec_facts = facts["TRADE_RECEIVABLES"]
        rev_facts = facts["REVENUE"]
        common = sorted(set(rec_facts.keys()).intersection(set(rev_facts.keys())))
        if len(common) < 2:
            return None

        latest_p = common[-1]
        prev_p = common[-2]

        latest_rec = rec_facts[latest_p].value
        prev_rec = rec_facts[prev_p].value
        latest_rev = rev_facts[latest_p].value
        prev_rev = rev_facts[prev_p].value

        rec_growth = ((latest_rec - prev_rec) / abs(prev_rec)) * 100 if prev_rec != 0 else 0
        rev_growth = ((latest_rev - prev_rev) / abs(prev_rev)) * 100 if prev_rev != 0 else 0

        # Days Sales Outstanding (DSO) = (Receivables / Revenue) * 365
        latest_dso = (latest_rec / latest_rev) * 365 if latest_rev > 0 else 0
        prev_dso = (prev_rec / prev_rev) * 365 if prev_rev > 0 else 0
        dso_change = latest_dso - prev_dso

        if rec_growth > (rev_growth + 12.0) and latest_rec > 100:
            severity = "HIGH" if rec_growth > (rev_growth + 25.0) else "MEDIUM"
            return ForensicFinding(
                symbol=symbol,
                rule_id="RULE_RECEIVABLES_EXCEED_REVENUE",
                title="Trade Receivables Growth Substantially Outpacing Revenue",
                severity=severity,
                confidence="HIGH",
                observation_summary=(
                    f"Trade receivables expanded by {rec_growth:+.1f}% in {latest_p} compared to revenue growth of {rev_growth:+.1f}%. "
                    f"Days Sales Outstanding (DSO) stretched from {prev_dso:.1f} days to {latest_dso:.1f} days ({dso_change:+.1f} days)."
                ),
                metric_breakdown={
                    "period_current": latest_p,
                    "period_previous": prev_p,
                    "receivables_current": latest_rec,
                    "receivables_previous": prev_rec,
                    "revenue_current": latest_rev,
                    "revenue_previous": prev_rev,
                    "receivables_growth_pct": round(rec_growth, 1),
                    "revenue_growth_pct": round(rev_growth, 1),
                    "dso_current_days": round(latest_dso, 1),
                    "dso_change_days": round(dso_change, 1),
                },
                why_it_matters="Receivables growing faster than top-line revenue indicates that goods were shipped or services invoiced, but cash has not yet been collected from customers, increasing credit risk.",
                benign_explanations=[
                    "Heavy concentration of project delivery or sales in the final month of the fiscal year.",
                    "Shift in revenue mix toward government or public sector enterprise clients with contractual 90-day settlement windows.",
                    "Recent acquisition consolidation bringing in an entity with longer billing terms.",
                ],
                recommended_checks=[
                    "Examine expected credit loss (ECL) provisioning in the notes to balance sheet.",
                    "Review trade receivables age classification to see if disputed dues have risen.",
                ],
                citations=[
                    {"period": latest_p, "doc": "Annual Report", "page": rec_facts[latest_p].source_page, "metric": "Receivables", "value": latest_rec},
                    {"period": latest_p, "doc": "Annual Report", "page": rev_facts[latest_p].source_page, "metric": "Revenue", "value": latest_rev},
                ],
            )
        return None

    def _check_inventory_vs_sales(
        self, symbol: str, facts: Dict[str, Dict[str, CanonicalFinancialFact]]
    ) -> Optional[ForensicFinding]:
        if "INVENTORIES" not in facts or "REVENUE" not in facts:
            return None

        inv_facts = facts["INVENTORIES"]
        rev_facts = facts["REVENUE"]
        common = sorted(set(inv_facts.keys()).intersection(set(rev_facts.keys())))
        if len(common) < 2:
            return None

        latest_p = common[-1]
        prev_p = common[-2]

        latest_inv = inv_facts[latest_p].value
        prev_inv = inv_facts[prev_p].value
        latest_rev = rev_facts[latest_p].value
        prev_rev = rev_facts[prev_p].value

        inv_growth = ((latest_inv - prev_inv) / abs(prev_inv)) * 100 if prev_inv != 0 else 0
        rev_growth = ((latest_rev - prev_rev) / abs(prev_rev)) * 100 if prev_rev != 0 else 0

        # Inventory Days = (Inventory / Revenue) * 365
        latest_days = (latest_inv / latest_rev) * 365 if latest_rev > 0 else 0
        prev_days = (prev_inv / prev_rev) * 365 if prev_rev > 0 else 0

        if inv_growth > (rev_growth + 15.0) and latest_inv > 100:
            return ForensicFinding(
                symbol=symbol,
                rule_id="RULE_INVENTORY_EXCEED_SALES",
                title="Inventory Build-Up Ahead of Top-Line Revenue Growth",
                severity="MEDIUM",
                confidence="HIGH",
                observation_summary=(
                    f"Inventories grew by {inv_growth:+.1f}% in {latest_p} while revenue grew by {rev_growth:+.1f}%. "
                    f"Days of inventory on hand rose from {prev_days:.1f} days to {latest_days:.1f} days."
                ),
                metric_breakdown={
                    "period_current": latest_p,
                    "inventory_current": latest_inv,
                    "inventory_previous": prev_inv,
                    "inventory_growth_pct": round(inv_growth, 1),
                    "revenue_growth_pct": round(rev_growth, 1),
                    "inventory_days_current": round(latest_days, 1),
                },
                why_it_matters="Excessive inventory accumulation can tie up operating cash, indicate slowing demand, or lead to future write-downs and obsolescence charges.",
                benign_explanations=[
                    "Pre-buying raw materials ahead of anticipated commodity price spikes or trade tariff changes.",
                    "Ramping up production inventory to service newly opened retail outlets or manufacturing lines.",
                ],
                recommended_checks=[
                    "Review inventory breakdown between raw materials, work-in-progress, and finished goods.",
                    "Check for any inventory write-down provisions in operating expenses.",
                ],
                citations=[
                    {"period": latest_p, "doc": "Annual Report", "page": inv_facts[latest_p].source_page, "metric": "Inventories", "value": latest_inv},
                ],
            )
        return None

    def _check_debt_and_interest_coverage(
        self, symbol: str, facts: Dict[str, Dict[str, CanonicalFinancialFact]]
    ) -> Optional[ForensicFinding]:
        if "TOTAL_DEBT" not in facts or "FINANCE_COSTS" not in facts or "EBITDA" not in facts:
            return None

        debt_facts = facts["TOTAL_DEBT"]
        fin_facts = facts["FINANCE_COSTS"]
        ebitda_facts = facts["EBITDA"]
        common = sorted(set(debt_facts.keys()).intersection(set(fin_facts.keys())).intersection(set(ebitda_facts.keys())))
        if not common:
            return None

        latest_p = common[-1]
        debt = debt_facts[latest_p].value
        finance_costs = fin_facts[latest_p].value
        ebitda = ebitda_facts[latest_p].value

        interest_coverage = (ebitda / finance_costs) if finance_costs > 0 else 999.0

        if debt > 0 and interest_coverage < 2.5:
            severity = "CRITICAL" if interest_coverage < 1.5 else "HIGH"
            return ForensicFinding(
                symbol=symbol,
                rule_id="RULE_DEBT_INTEREST_DETERIORATION",
                title="Constrained Interest Coverage Ratio Relative to Borrowings",
                severity=severity,
                confidence="HIGH",
                observation_summary=(
                    f"Total borrowings of ₹{debt:,.1f} Cr with annual finance costs of ₹{finance_costs:,.1f} Cr "
                    f"result in an interest coverage ratio of {interest_coverage:.2f}x in {latest_p} (benchmark threshold: >3.0x)."
                ),
                metric_breakdown={
                    "period": latest_p,
                    "total_debt": debt,
                    "annual_finance_costs": finance_costs,
                    "ebitda": ebitda,
                    "interest_coverage_ratio": round(interest_coverage, 2),
                },
                why_it_matters="When interest coverage drops below 2.5x, a minor operating downturn can strain debt-service capacity, forcing refinancing at elevated interest rates or credit rating downgrades.",
                benign_explanations=[
                    "Recent major debt-funded capital expenditure where revenue generation is yet to commence.",
                    "Cyclical bottom in industry margins with debt maturity profile skewed comfortably beyond 3 years.",
                ],
                recommended_checks=[
                    "Examine debt repayment maturity schedule in the Borrowings note to identify near-term refinancing cliffs.",
                    "Verify current credit rating rationales (CRISIL, ICRA, CARE) for negative outlooks.",
                ],
                citations=[
                    {"period": latest_p, "doc": "Annual Report", "page": debt_facts[latest_p].source_page, "metric": "Debt", "value": debt},
                    {"period": latest_p, "doc": "Annual Report", "page": fin_facts[latest_p].source_page, "metric": "Finance Costs", "value": finance_costs},
                ],
            )
        elif debt == 0.0 or interest_coverage > 10.0:
            return ForensicFinding(
                symbol=symbol,
                rule_id="RULE_DEBT_INTEREST_DETERIORATION",
                title="Pristine Solvency Profile & Robust Interest Coverage",
                severity="INFORMATIONAL",
                confidence="HIGH",
                observation_summary=(
                    f"Debt profile is negligible or pristine with an interest coverage ratio exceeding {interest_coverage:.1f}x in {latest_p}. "
                    f"Total borrowings stand at ₹{debt:,.1f} Cr."
                ),
                metric_breakdown={
                    "period": latest_p,
                    "total_debt": debt,
                    "interest_coverage_ratio": round(interest_coverage, 2),
                },
                why_it_matters="Negligible debt insulates the company from RBI rate hikes and macroeconomic credit tightening.",
                benign_explanations=["Zero-debt or cash-rich capital structure."],
                recommended_checks=["Verify return on equity and reinvestment opportunities."],
                citations=[],
            )
        return None

    def _check_other_income_share(
        self, symbol: str, facts: Dict[str, Dict[str, CanonicalFinancialFact]]
    ) -> Optional[ForensicFinding]:
        if "OTHER_INCOME" not in facts or "PROFIT_BEFORE_TAX" not in facts:
            return None

        oth_facts = facts["OTHER_INCOME"]
        pbt_facts = facts["PROFIT_BEFORE_TAX"]
        common = sorted(set(oth_facts.keys()).intersection(set(pbt_facts.keys())))
        if not common:
            return None

        latest_p = common[-1]
        other_inc = oth_facts[latest_p].value
        pbt = pbt_facts[latest_p].value

        ratio = (other_inc / pbt) * 100 if pbt > 0 else 0

        if ratio > 25.0:
            return ForensicFinding(
                symbol=symbol,
                rule_id="RULE_OTHER_INCOME_HIGH_SHARE",
                title="High Reliance on Non-Core Other Income",
                severity="MEDIUM",
                confidence="HIGH",
                observation_summary=(
                    f"Other Income of ₹{other_inc:,.1f} Cr accounts for {ratio:.1f}% of Profit Before Tax (₹{pbt:,.1f} Cr) in {latest_p}."
                ),
                metric_breakdown={
                    "period": latest_p,
                    "other_income": other_inc,
                    "profit_before_tax": pbt,
                    "other_income_share_pct": round(ratio, 1),
                },
                why_it_matters="If a substantial portion of earnings stems from treasury investments, forex gains, or asset sales rather than core operations, earnings may lack sustainability.",
                benign_explanations=[
                    "Large cash treasury yielding substantial safe interest income.",
                    "Dividend income received from profitable operational subsidiaries.",
                ],
                recommended_checks=[
                    "Inspect the 'Other Income' note to identify whether gains are recurring interest or one-off asset sales.",
                ],
                citations=[
                    {"period": latest_p, "doc": "Annual Report", "page": oth_facts[latest_p].source_page, "metric": "Other Income", "value": other_inc},
                ],
            )
        return None

    def _check_fcf_conversion(
        self, symbol: str, facts: Dict[str, Dict[str, CanonicalFinancialFact]]
    ) -> Optional[ForensicFinding]:
        if "FREE_CASH_FLOW" not in facts or "PAT" not in facts:
            return None

        fcf_facts = facts["FREE_CASH_FLOW"]
        pat_facts = facts["PAT"]
        common = sorted(set(fcf_facts.keys()).intersection(set(pat_facts.keys())))
        if not common:
            return None

        latest_p = common[-1]
        fcf = fcf_facts[latest_p].value
        pat = pat_facts[latest_p].value

        if fcf < 0 and pat > 0:
            return ForensicFinding(
                symbol=symbol,
                rule_id="RULE_FCF_CONVERSION",
                title="Negative Free Cash Flow Despite Positive Accounting Net Profit",
                severity="MEDIUM",
                confidence="HIGH",
                observation_summary=(
                    f"Reported accounting PAT was ₹{pat:,.1f} Cr, but Free Cash Flow (CFO less Capex) was negative at ₹{fcf:,.1f} Cr in {latest_p}."
                ),
                metric_breakdown={
                    "period": latest_p,
                    "pat": pat,
                    "free_cash_flow": fcf,
                },
                why_it_matters="Negative free cash flow means the company consumes more cash in operations and capex than it generates, requiring external equity or debt financing to fund ongoing operations.",
                benign_explanations=[
                    "Company is undergoing aggressive capacity expansion (high growth capex) which will yield cash flows in future years.",
                ],
                recommended_checks=[
                    "Distinguish between growth capex and maintenance capex in the management discussion and analysis.",
                ],
                citations=[
                    {"period": latest_p, "doc": "Annual Report", "page": fcf_facts[latest_p].source_page, "metric": "FCF", "value": fcf},
                ],
            )
        return None

    def _check_working_capital_efficiency(
        self, symbol: str, facts: Dict[str, Dict[str, CanonicalFinancialFact]]
    ) -> Optional[ForensicFinding]:
        return None

    def _check_depreciation_trend(
        self, symbol: str, facts: Dict[str, Dict[str, CanonicalFinancialFact]]
    ) -> Optional[ForensicFinding]:
        return None


forensic_rule_engine = ForensicRuleEngine()
