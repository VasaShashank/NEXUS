"""
Watchlists API routes.
Provides multi-list tracking, real-time performance evaluation, and asset management.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database.session import get_db
from app.models.stock import Watchlist
from app.models.user import User
from app.api.deps import get_current_user
from app.providers.market_data import market_data_provider

router = APIRouter(prefix="/watchlists", tags=["Watchlists"])


class CreateWatchlistRequest(BaseModel):
    name: str
    symbols: List[str] = []


class AddSymbolRequest(BaseModel):
    symbol: str


@router.get("", response_model=List[Dict[str, Any]])
def list_watchlists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all watchlists for authenticated user, with fallback seeding."""
    lists = db.query(Watchlist).filter(Watchlist.user_id == current_user.id).all()
    if not lists:
        default_wl = Watchlist(
            user_id=current_user.id,
            name="Primary Focus",
            symbols=["RELIANCE", "TCS", "HINDUNILVR", "HDFCBANK", "INFY"]
        )
        db.add(default_wl)
        db.commit()
        db.refresh(default_wl)
        lists = [default_wl]

    results = []
    for wl in lists:
        syms = wl.symbols or []
        quotes = []
        for s in syms:
            q = market_data_provider.get_quote(s)
            if q:
                quotes.append(q.model_dump())

        results.append({
            "id": wl.id,
            "name": wl.name,
            "symbols_count": len(syms),
            "symbols": syms,
            "quotes": quotes,
            "created_at": wl.created_at.isoformat() if wl.created_at else ""
        })
    return results


@router.post("", response_model=Dict[str, Any])
def create_watchlist(
    payload: CreateWatchlistRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new named watchlist."""
    norm_symbols = [s.strip().upper() for s in payload.symbols if s.strip()]
    wl = Watchlist(
        user_id=current_user.id,
        name=payload.name.strip() or "New Watchlist",
        symbols=norm_symbols
    )
    db.add(wl)
    db.commit()
    db.refresh(wl)
    return {
        "id": wl.id,
        "name": wl.name,
        "symbols": wl.symbols,
        "message": "Watchlist created successfully"
    }


@router.get("/{watchlist_id}", response_model=Dict[str, Any])
def get_watchlist_detail(
    watchlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single watchlist with live quotes and aggregate daily performance."""
    wl = db.query(Watchlist).filter(
        Watchlist.id == watchlist_id,
        Watchlist.user_id == current_user.id
    ).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found.")

    syms = wl.symbols or []
    quotes = []
    total_change = 0.0

    for s in syms:
        q = market_data_provider.get_quote(s)
        if q:
            quotes.append(q.model_dump())
            total_change += q.change_1d_pct

    avg_change = round(total_change / len(quotes), 2) if quotes else 0.0

    return {
        "id": wl.id,
        "name": wl.name,
        "symbols": syms,
        "quotes": quotes,
        "average_1d_change_pct": avg_change
    }


@router.post("/{watchlist_id}/symbols", response_model=Dict[str, Any])
def add_symbol_to_watchlist(
    watchlist_id: int,
    payload: AddSymbolRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add an asset symbol to the watchlist."""
    wl = db.query(Watchlist).filter(
        Watchlist.id == watchlist_id,
        Watchlist.user_id == current_user.id
    ).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found.")

    sym = payload.symbol.strip().upper()
    existing = list(wl.symbols or [])
    if sym not in existing:
        existing.append(sym)
        wl.symbols = existing
        db.commit()
        db.refresh(wl)

    return {"id": wl.id, "symbols": wl.symbols, "added": sym}


@router.post("/{watchlist_id}/stocks/{symbol}", response_model=Dict[str, Any])
def add_stock_to_watchlist_path(
    watchlist_id: int,
    symbol: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a stock symbol to the watchlist via path parameter."""
    return add_symbol_to_watchlist(watchlist_id, AddSymbolRequest(symbol=symbol), db, current_user)


@router.delete("/{watchlist_id}/symbols/{symbol}", response_model=Dict[str, Any])
def remove_symbol_from_watchlist(
    watchlist_id: int,
    symbol: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove an asset symbol from the watchlist."""
    wl = db.query(Watchlist).filter(
        Watchlist.id == watchlist_id,
        Watchlist.user_id == current_user.id
    ).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found.")

    sym = symbol.strip().upper()
    existing = list(wl.symbols or [])
    if sym in existing:
        existing.remove(sym)
        wl.symbols = existing
        db.commit()
        db.refresh(wl)

    return {"id": wl.id, "symbols": wl.symbols, "removed": sym}


@router.delete("/{watchlist_id}", response_model=Dict[str, Any])
def delete_watchlist(
    watchlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a watchlist."""
    wl = db.query(Watchlist).filter(
        Watchlist.id == watchlist_id,
        Watchlist.user_id == current_user.id
    ).first()
    if not wl:
        raise HTTPException(status_code=404, detail="Watchlist not found.")

    db.delete(wl)
    db.commit()
    return {"message": f"Watchlist '{wl.name}' deleted successfully."}
