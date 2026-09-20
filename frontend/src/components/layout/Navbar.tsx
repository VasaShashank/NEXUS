"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Moon,
  Sun,
  Wallet,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  UserRound,
} from "lucide-react";
import { api, StockQuote } from "@/lib/api";

interface NavbarProps {
  onSelectStock: (symbol: string) => void;
  cashBalance?: number;
  onNavigate: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectStock,
  cashBalance = 1000000.0,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockQuote[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  };

  // Debounced stock search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Searches the full NSE/BSE universe via yfinance — any ticker, not just famous ones
        const results = await api.searchStocks(searchQuery);
        setSearchResults(results);
        setShowDropdown(true);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce — yfinance full-universe search needs slightly more time

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full h-16 glass-navbar px-4 lg:px-6 flex items-center justify-between">
      {/* Left: Brand & Market Pulse */}
      <div className="flex items-center space-x-6">
        <button
          onClick={() => onNavigate("overview")}
          className="flex items-center space-x-2.5 text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-cyan via-accent-blue to-accent-violet flex items-center justify-center text-white font-black text-sm tracking-wider shadow-glow-sm">
            N
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display font-bold text-[17px] tracking-tight text-foreground group-hover:text-accent-cyan transition-colors duration-300">
                NEXUS
              </span>
              <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-md badge-glow text-accent-cyan tracking-wider">
                PRO
              </span>
            </div>
          </div>
        </button>

        {/* Real-time market status badge */}
        <div className="hidden md:flex items-center space-x-2.5 text-xs glass-pill px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-accent-emerald status-live" />
          <span className="font-medium text-slate-300">NSE Feed: Live</span>
        </div>
      </div>

      {/* Middle: Universal Stock Search */}
      <div ref={searchRef} className="relative w-72 sm:w-96">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search ANY NSE/BSE stock, SME, microcap..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowDropdown(true)}
            className="w-full pl-10 pr-8 py-2 text-[14px] rounded-xl glass-input text-foreground placeholder-slate-500 focus:outline-none font-sans"
          />
          {isSearching && (
            <div className="absolute right-3 w-3.5 h-3.5 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-2xl overflow-hidden z-50">
            <div className="p-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 flex items-center justify-between">
              <span>NSE / BSE — All Equities</span>
              <span className="text-accent-cyan">{searchResults.length} results</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {searchResults.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => {
                    onSelectStock(stock.symbol);
                    setShowDropdown(false);
                    setSearchQuery("");
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-white/[0.03] transition-all duration-200 text-left group"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-[13.5px] text-foreground group-hover:text-accent-cyan transition-colors">{stock.symbol}</span>
                      <span className="text-[11.5px] text-slate-500 truncate max-w-[160px]">
                        {stock.company_name}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">{stock.sector}</span>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="text-[13.5px] font-semibold text-foreground">
                      <span className="rupee">₹</span>{stock.current_price?.toFixed(2)}
                    </div>
                    <div
                      className={`text-[11px] font-bold ${
                        stock.change_1d_pct >= 0 ? "text-accent-emerald" : "text-accent-rose"
                      }`}
                    >
                      {stock.change_1d_pct >= 0 ? "+" : ""}
                      {stock.change_1d_pct?.toFixed(2)}%
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Virtual Capital, Theme, and Profile */}
      <div className="flex items-center space-x-3">
        {/* Virtual Cash Pill */}
        <button
          onClick={() => onNavigate("portfolio")}
          className="flex items-center space-x-2.5 px-3.5 py-2 rounded-xl glass-pill hover:border-accent-cyan/30 transition-all duration-300 text-left group"
          title="Virtual Paper Trading Cash"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan/20 to-accent-violet/10 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-accent-cyan" />
          </div>
          <div className="tabular-nums">
            <div className="text-[10px] uppercase font-bold text-slate-500 leading-none tracking-wider">
              Virtual Cash
            </div>
            <div className="text-[14px] font-bold text-foreground leading-tight">
              <span className="rupee">₹</span>
              {mounted ? cashBalance?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : cashBalance?.toFixed(0)}
            </div>
          </div>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-slate-500 hover:text-foreground hover:bg-white/[0.04] transition-all duration-300"
          title="Toggle Light/Dark Theme"
          suppressHydrationWarning
        >
          {mounted ? (isDark ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />) : <Sun className="w-4.5 h-4.5" />}
        </button>

        {/* User Badge */}
        <div className="flex items-center space-x-2 pl-3 border-l border-white/[0.06]">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-violet/20 to-accent-cyan/10 border border-white/[0.08] flex items-center justify-center text-slate-300">
            <UserRound className="w-4 h-4" />
          </div>
        </div>
      </div>
    </header>
  );
};
