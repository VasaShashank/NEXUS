"use client";

import React, { useState, useEffect } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  PieChart,
  ShoppingBag,
  AlertCircle,
} from "lucide-react";
import { api, PortfolioSummaryResponse, HoldingResponse } from "@/lib/api";
import { InfoTooltip } from "@/components/common/InfoTooltip";

interface PortfolioViewProps {
  onSelectStock: (symbol: string) => void;
  onNavigate: (view: string) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({ onSelectStock, onNavigate }) => {
  const [portfolio, setPortfolio] = useState<PortfolioSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState<boolean>(false);
  const [orderSymbol, setOrderSymbol] = useState<string>("RELIANCE");
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [orderQty, setOrderQty] = useState<number>(10);
  const [tradeMessage, setTradeMessage] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const fetchPortfolio = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await api.getPortfolioSummary();
      setPortfolio(res);
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
      setLoadError("Could not reach the NEXUS portfolio service. Retry below.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExecuting(true);
    setTradeMessage(null);
    try {
      const res = await api.executeOrder({
        symbol: orderSymbol,
        side: orderSide,
        quantity: orderQty,
      });
      setTradeMessage(res.message);
      await fetchPortfolio();
      setTimeout(() => {
        setShowOrderModal(false);
        setTradeMessage(null);
      }, 1200);
    } catch (err: any) {
      setTradeMessage(`Error: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleResetPortfolio = async () => {
    if (!confirm("Are you sure you want to reset your virtual portfolio back to ₹10,00,000 cash?"))
      return;
    try {
      const res = await api.resetPortfolio();
      setPortfolio(res);
    } catch (err) {
      console.error("Reset failed:", err);
    }
  };

  if (loadError && !portfolio) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-4">
          <span>{loadError}</span>
          <button
            onClick={fetchPortfolio}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-rose-500/15 border border-rose-500/30 text-rose-200 hover:bg-rose-500/25 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !portfolio) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const isUnrealizedProfitable = portfolio.unrealized_pnl >= 0;

  return (
    <div className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.05] animate-float-up">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
              Portfolio & Paper Trading
            </h1>
            <InfoTooltip
              title="Portfolio & Paper Trading"
              definition="Real-time simulated position tracking, cost-basis calculation, cash management, and order accounting."
              decisionImpact="Allows testing new trading setups, risk-per-trade rules, and emotional discipline with ₹10,00,000 virtual capital without risking real money."
            />
          </div>
          <p className="text-[13px] text-slate-400 mt-1 font-light">
            Real-time simulated position tracking, cash management, and order accounting.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setOrderSymbol("RELIANCE");
              setOrderSide("BUY");
              setShowOrderModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-accent-cyan to-accent-blue text-white text-[13px] font-bold hover:shadow-glow-md transition-all duration-300 shadow-[0_0_15px_rgba(14,165,233,0.3)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Order</span>
          </button>
          <button
            onClick={handleResetPortfolio}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl glass-pill text-[12px] font-medium text-slate-400 hover:text-foreground hover:border-accent-cyan/30 transition-all duration-300"
            title="Reset back to ₹10,00,000 virtual balance"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Cash</span>
          </button>
        </div>
      </div>

      {/* 1. Summary Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Value */}
        <div className="p-5 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-semibold text-slate-400 tracking-wide">Total Portfolio Value</span>
            <InfoTooltip
              title="Total Portfolio Value (NAV)"
              definition="Net Asset Value: Marked-to-market valuation of all equity holdings plus current liquid cash balance."
              decisionImpact="Dictates maximum risk per trade. Standard risk management dictates never risking more than 1-2% of total portfolio value on a single trade stop-loss."
            />
          </div>
          <div className="text-[25px] font-display font-extrabold text-foreground tabular-nums tracking-tight">
            <span className="rupee">₹</span>{portfolio.total_value?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[12px] text-slate-400 mt-3 pt-3 border-t border-white/[0.05]">
            Liquid Cash: <span className="rupee">₹</span>
            {portfolio.cash_balance?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Invested Capital */}
        <div className="p-5 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-semibold text-slate-400 tracking-wide">Invested in Equities</span>
            <InfoTooltip
              title="Invested Capital"
              definition="The aggregate cost basis paid to acquire all currently active equity holdings."
              decisionImpact="Tracks cash-to-equity allocation ratio. If invested capital exceeds 85-90% in uncertain macro environments, consider raising cash for risk mitigation."
            />
          </div>
          <div className="text-[25px] font-display font-extrabold text-foreground tabular-nums tracking-tight">
            <span className="rupee">₹</span>{portfolio.invested_value?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[12px] text-slate-400 mt-3 pt-3 border-t border-white/[0.05]">
            {portfolio.holdings_count} Active Positions
          </div>
        </div>

        {/* Unrealized P&L */}
        <div className="p-5 rounded-2xl glass-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] font-semibold text-slate-400 tracking-wide">Unrealized P&L</span>
            <InfoTooltip
              title="Unrealized Profit & Loss"
              definition="Marked-to-market gain or loss on open positions that has not yet been locked in through a sell transaction."
              decisionImpact="Guides trade management: trigger predefined trailing stop-losses when profits are high, and strictly execute stop-losses when losses hit your risk limit."
            />
          </div>
          <div
            className={`text-[25px] font-display font-extrabold tabular-nums tracking-tight ${
              isUnrealizedProfitable ? "text-accent-emerald" : "text-accent-rose"
            }`}
          >
            {isUnrealizedProfitable ? "+" : ""}<span className="rupee">₹</span>
            {portfolio.unrealized_pnl?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <div
            className={`text-[12px] font-bold mt-3 pt-3 border-t border-white/[0.05] tabular-nums ${
              isUnrealizedProfitable ? "text-accent-emerald" : "text-accent-rose"
            }`}
          >
            {isUnrealizedProfitable ? "+" : ""}
            {portfolio.unrealized_pnl_pct?.toFixed(2)}% All-Time Return
          </div>
        </div>

        {/* Realized P&L */}
        <div className="p-5 rounded-2xl glass-card">
          <span className="text-[13px] font-semibold text-slate-400 block mb-1.5 tracking-wide">Realized Net P&L</span>
          <div
            className={`text-[25px] font-display font-extrabold tabular-nums tracking-tight ${
              portfolio.realized_pnl >= 0 ? "text-accent-emerald" : "text-accent-rose"
            }`}
          >
            {portfolio.realized_pnl >= 0 ? "+" : ""}<span className="rupee">₹</span>
            {portfolio.realized_pnl?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[12px] text-slate-400 mt-3 pt-3 border-t border-white/[0.05]">
            Closed Trade Gains / Losses
          </div>
        </div>
      </div>

      {/* 2. Holdings Table */}
      <div className="p-5 rounded-2xl glass-card">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.05] mb-4">
          <h2 className="text-[15px] font-display font-bold text-foreground">
            Equity Holdings ({portfolio.holdings.length})
          </h2>
          <button
            onClick={() => onNavigate("analytics")}
            className="text-[12px] font-semibold text-accent-cyan hover:text-accent-cyan/80 flex items-center space-x-1 transition-colors"
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>View Risk & Analytics</span>
          </button>
        </div>

        {portfolio.holdings.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <ShoppingBag className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">
              Your portfolio has no active equity positions.
            </p>
            <button
              onClick={() => onNavigate("research")}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-accent-cyan text-slate-950 hover:bg-sky-400 transition-all"
            >
              Explore Stocks to Trade
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500 border-b border-white/[0.04] text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 font-semibold">Symbol</th>
                  <th className="py-2.5 font-semibold">Sector</th>
                  <th className="py-2.5 font-semibold text-right">Shares</th>
                  <th className="py-2.5 font-semibold text-right">Avg Cost</th>
                  <th className="py-2.5 font-semibold text-right">Current Price</th>
                  <th className="py-2.5 font-semibold text-right">Current Value</th>
                  <th className="py-2.5 font-semibold text-right">Unrealized P&L</th>
                  <th className="py-2.5 font-semibold text-right">Allocation</th>
                  <th className="py-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03] tabular-nums">
                {portfolio.holdings.map((h) => {
                  const isPos = h.unrealized_pnl >= 0;
                  return (
                    <tr
                      key={h.symbol}
                      className="table-row-hover group cursor-pointer"
                      onClick={() => onSelectStock(h.symbol)}
                    >
                      <td className="py-3.5 font-bold text-foreground text-[14px]">
                        <div>{h.symbol}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {h.company_name}
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-400 text-[13px]">{h.sector}</td>
                      <td className="py-3.5 text-right font-semibold text-foreground text-[13.5px]">
                        {h.quantity}
                      </td>
                      <td className="py-3.5 text-right text-slate-300 text-[13.5px]">
                        <span className="rupee">₹</span>{h.average_buy_price?.toFixed(2)}
                      </td>
                      <td className="py-3.5 text-right font-semibold text-foreground text-[13.5px]">
                        <span className="rupee">₹</span>{h.current_price?.toFixed(2)}
                      </td>
                      <td className="py-3.5 text-right font-bold text-foreground text-[13.5px]">
                        <span className="rupee">₹</span>{h.current_value?.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                      </td>
                      <td
                        className={`py-3.5 text-right font-bold text-[13.5px] ${
                          isPos ? "text-accent-emerald" : "text-accent-rose"
                        }`}
                      >
                        <div>
                          {isPos ? "+" : ""}<span className="rupee">₹</span>{h.unrealized_pnl?.toFixed(2)}
                        </div>
                        <div className="text-[11px]">
                          ({isPos ? "+" : ""}
                          {h.unrealized_pnl_pct?.toFixed(2)}%)
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <div className="w-16 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                            <div
                              style={{ width: `${h.allocation_pct}%` }}
                              className="h-full bg-accent-cyan"
                            />
                          </div>
                          <span className="text-slate-300 font-medium">{h.allocation_pct}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrderSymbol(h.symbol);
                              setOrderSide("SELL");
                              setOrderQty(Math.min(h.quantity, 10));
                              setShowOrderModal(true);
                            }}
                            className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg bg-accent-rose/10 text-accent-rose hover:bg-accent-rose/20 border border-accent-rose/20 transition-all duration-300"
                          >
                            Sell
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrderSymbol(h.symbol);
                              setOrderSide("BUY");
                              setOrderQty(10);
                              setShowOrderModal(true);
                            }}
                            className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg btn-research"
                          >
                            Buy +
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. New Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 rounded-2xl glass-card shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.05]">
              <h3 className="text-[15px] font-display font-bold text-foreground">Execute Paper Trade</h3>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-slate-400 hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOrderSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-white/[0.03] p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setOrderSide("BUY")}
                  className={`py-2 text-xs font-bold rounded-md transition-all ${
                    orderSide === "BUY"
                      ? "bg-accent-emerald text-slate-950 shadow-sm"
                      : "text-slate-400"
                  }`}
                >
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setOrderSide("SELL")}
                  className={`py-2 text-xs font-bold rounded-md transition-all ${
                    orderSide === "SELL" ? "bg-accent-rose text-white shadow-sm" : "text-slate-400"
                  }`}
                >
                  SELL
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Equity Symbol
                </label>
                <select
                  value={orderSymbol}
                  onChange={(e) => setOrderSymbol(e.target.value)}
                  className="w-full px-3 py-2.5 text-[13px] rounded-xl glass-input text-foreground focus:outline-none"
                >
                  <option value="RELIANCE">RELIANCE (Reliance Industries)</option>
                  <option value="TCS">TCS (Tata Consultancy Services)</option>
                  <option value="HDFCBANK">HDFCBANK (HDFC Bank)</option>
                  <option value="INFY">INFY (Infosys)</option>
                  <option value="ICICIBANK">ICICIBANK (ICICI Bank)</option>
                  <option value="BHARTIARTL">BHARTIARTL (Bharti Airtel)</option>
                  <option value="SBIN">SBIN (State Bank of India)</option>
                  <option value="LT">LT (Larsen & Toubro)</option>
                  <option value="ITC">ITC (ITC Limited)</option>
                  <option value="TATAMOTORS">TATAMOTORS (Tata Motors)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={orderQty}
                  onChange={(e) => setOrderQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2.5 text-[13px] rounded-xl glass-input text-foreground focus:outline-none"
                />
              </div>

              {tradeMessage && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${
                    tradeMessage.startsWith("Error")
                      ? "bg-accent-rose/15 text-accent-rose"
                      : "bg-accent-emerald/15 text-accent-emerald"
                  }`}
                >
                  {tradeMessage}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-400 hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isExecuting}
                  className={`px-5 py-2 text-xs font-bold rounded-lg text-slate-950 transition-all ${
                    orderSide === "BUY"
                      ? "bg-accent-emerald hover:bg-emerald-400"
                      : "bg-accent-rose text-white hover:bg-rose-500"
                  }`}
                >
                  {isExecuting ? "Placing..." : `Submit ${orderSide} Order`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
