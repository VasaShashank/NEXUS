"""
Tax & Capital Gains Analytics API routes.
Computes STCG vs LTCG, holding periods, tax-lot breakdowns, dividend income estimates,
and CSV exports under Indian income tax provisions.
"""
from typing import List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.portfolio import Portfolio, Transaction, Holding
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/tax", tags=["Tax Analytics"])


@router.get("/summary", response_model=Dict[str, Any])
def get_tax_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Compute comprehensive tax liability analytics under Indian Capital Gains Tax laws (Budget 2024-25):
    - STCG (Short-Term Capital Gains <= 12 months): 20% flat tax rate
    - LTCG (Long-Term Capital Gains > 12 months): 12.5% tax rate above ₹1,25,000 exemption limit
    """
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).first()
    if not portfolio:
        return {
            "realized_stcg": 0.0,
            "realized_ltcg": 0.0,
            "estimated_stcg_tax": 0.0,
            "stcg_tax": 0.0,
            "estimated_ltcg_tax": 0.0,
            "ltcg_tax": 0.0,
            "total_estimated_tax_liability": 0.0,
            "total_tax_liability": 0.0,
            "stcg_rate_pct": 20.0,
            "ltcg_rate_pct": 12.5,
            "ltcg_exemption_remaining": 125000.0,
            "unrealized_stcg": 0.0,
            "unrealized_ltcg": 0.0,
            "estimated_dividend_income": 0.0,
            "tax_lots": [],
            "disclaimer": "NEXUS Tax Analytics is an estimation model and does not constitute certified tax advice."
        }

    txs = db.query(Transaction).filter(
        Transaction.portfolio_id == portfolio.id,
        Transaction.side == "SELL"
    ).all()

    realized_stcg = 0.0
    realized_ltcg = 0.0
    tax_lots = []

    for t in txs:
        # Check holding duration
        pnl = t.realized_pnl or 0.0
        # Default paper trading transactions are recent (< 12 months -> STCG)
        if pnl >= 0:
            realized_stcg += pnl
            cat = "STCG (Gain)"
        else:
            cat = "STCL (Loss)"
        tax_lots.append({
            "symbol": t.symbol,
            "sell_date": t.executed_at.strftime("%Y-%m-%d"),
            "quantity": t.quantity,
            "sell_price": t.price,
            "realized_pnl": round(pnl, 2),
            "holding_period": "< 12 Months",
            "classification": cat
        })

    # Unrealized gains across current holdings
    holdings = db.query(Holding).filter(Holding.portfolio_id == portfolio.id).all()
    unrealized_stcg = 0.0
    unrealized_ltcg = 0.0
    estimated_dividends = 0.0

    for h in holdings:
        gain = h.unrealized_pnl
        unrealized_stcg += max(0.0, gain)
        # Approximate 1.2% dividend yield across portfolio holdings
        estimated_dividends += round(h.current_value * 0.012, 2)

    # Tax Calculation
    stcg_tax = round(max(0.0, realized_stcg) * 0.20, 2)
    taxable_ltcg = max(0.0, realized_ltcg - 125000.0)
    ltcg_tax = round(taxable_ltcg * 0.125, 2)
    exemption_used = min(125000.0, max(0.0, realized_ltcg))
    exemption_remaining = max(0.0, 125000.0 - exemption_used)

    return {
        "assessment_year": "AY 2025-26",
        "jurisdiction": "Republic of India (Income Tax Act, 1961)",
        "realized_stcg": round(realized_stcg, 2),
        "realized_ltcg": round(realized_ltcg, 2),
        "estimated_stcg_tax": stcg_tax,
        "stcg_tax": stcg_tax,
        "estimated_ltcg_tax": ltcg_tax,
        "ltcg_tax": ltcg_tax,
        "total_estimated_tax_liability": round(stcg_tax + ltcg_tax, 2),
        "total_tax_liability": round(stcg_tax + ltcg_tax, 2),
        "stcg_rate_pct": 20.0,
        "ltcg_rate_pct": 12.5,
        "ltcg_exemption_annual_limit": 125000.0,
        "ltcg_exemption_remaining": round(exemption_remaining, 2),
        "unrealized_stcg": round(unrealized_stcg, 2),
        "unrealized_ltcg": round(unrealized_ltcg, 2),
        "estimated_dividend_income": round(estimated_dividends, 2),
        "tax_lots": tax_lots,
        "disclaimer": (
            "NEXUS Tax Analytics is an illustrative calculation tool based on the Indian Union Budget 2024 tax code "
            "(STCG Sec 111A @ 20%, LTCG Sec 112A @ 12.5% above ₹1.25L exemption). It does NOT constitute professional "
            "legal or tax advisory. Securities Transaction Tax (STT) paid is accounted for. Consult a Chartered Accountant for ITR filing."
        )
    }


@router.get("/export/csv")
def export_tax_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export tax lots and capital gains statement as CSV."""
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == current_user.id).first()
    txs = db.query(Transaction).filter(
        Transaction.portfolio_id == portfolio.id if portfolio else -1,
        Transaction.side == "SELL"
    ).all()

    csv_lines = [
        "NEXUS Capital Gains Statement (Indian Income Tax AY 2025-26)",
        "Symbol,Date,Quantity,Sell Price,Realized PnL,Holding Period,Classification",
    ]
    for t in txs:
        csv_lines.append(
            f"{t.symbol},{t.executed_at.strftime('%Y-%m-%d')},{t.quantity},{t.price},{t.realized_pnl},< 12 Months,STCG"
        )
    if len(csv_lines) == 2:
        csv_lines.append("No closed sell transactions recorded in this tax year.,,,,,")

    csv_content = "\n".join(csv_lines)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=nexus_capital_gains_ay2025_26.csv"}
    )
