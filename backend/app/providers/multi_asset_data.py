"""
Multi-Asset Financial Intelligence Provider.
Provides authoritative structured data for Indian Mutual Funds, ETFs, Bonds,
Commodities, FX, and Macroeconomic Indicators.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime

# -------------------------------------------------------------------
# 1. MUTUAL FUNDS
# -------------------------------------------------------------------
MUTUAL_FUNDS_DATA: List[Dict[str, Any]] = [
    {
        "id": "PPFC-FLEXI",
        "scheme_name": "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
        "amc": "PPFAS Mutual Fund",
        "category": "Flexi Cap Fund",
        "aum_crores": 72450.0,
        "expense_ratio": 0.62,
        "nav": 86.42,
        "cagr_1y": 28.4,
        "cagr_3y": 22.1,
        "cagr_5y": 24.8,
        "benchmark": "NIFTY 500 TRI",
        "risk_grade": "Very High",
        "turnover_ratio": 18.5,
        "min_sip": 1000,
        "min_lumpsum": 1000,
        "exit_load": "2% if redeemed within 365 days; 1% if redeemed within 730 days",
        "top_holdings": [
            {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "weight": 7.8},
            {"symbol": "ITC", "name": "ITC Ltd", "weight": 6.9},
            {"symbol": "BAJFINANCE", "name": "Bajaj Finance Ltd", "weight": 5.8},
            {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "weight": 5.4},
            {"symbol": "HINDUNILVR", "name": "Hindustan Unilever Ltd", "weight": 4.6},
            {"symbol": "TCS", "name": "Tata Consultancy Services Ltd", "weight": 4.1},
            {"symbol": "GOOGL", "name": "Alphabet Inc (Foreign Holding)", "weight": 4.0},
            {"symbol": "MSFT", "name": "Microsoft Corp (Foreign Holding)", "weight": 3.8},
        ]
    },
    {
        "id": "HDFC-TOP100",
        "scheme_name": "HDFC Top 100 Fund - Direct Plan - Growth",
        "amc": "HDFC Mutual Fund",
        "category": "Large Cap Fund",
        "aum_crores": 38200.0,
        "expense_ratio": 0.98,
        "nav": 1140.50,
        "cagr_1y": 32.5,
        "cagr_3y": 20.8,
        "cagr_5y": 18.2,
        "benchmark": "NIFTY 100 TRI",
        "risk_grade": "Very High",
        "turnover_ratio": 24.0,
        "min_sip": 500,
        "min_lumpsum": 5000,
        "exit_load": "1% if redeemed within 30 days",
        "top_holdings": [
            {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "weight": 9.4},
            {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "weight": 8.9},
            {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "weight": 8.2},
            {"symbol": "INFY", "name": "Infosys Ltd", "weight": 6.1},
            {"symbol": "LT", "name": "Larsen & Toubro Ltd", "weight": 5.5},
            {"symbol": "TCS", "name": "Tata Consultancy Services Ltd", "weight": 4.8},
            {"symbol": "BHARTIARTL", "name": "Bharti Airtel Ltd", "weight": 4.2},
        ]
    },
    {
        "id": "SBI-BLUECHIP",
        "scheme_name": "SBI Bluechip Fund - Direct Plan - Growth",
        "amc": "SBI Mutual Fund",
        "category": "Large Cap Fund",
        "aum_crores": 46800.0,
        "expense_ratio": 0.85,
        "nav": 92.15,
        "cagr_1y": 26.2,
        "cagr_3y": 17.5,
        "cagr_5y": 17.1,
        "benchmark": "S&P BSE 100 TRI",
        "risk_grade": "Very High",
        "turnover_ratio": 22.0,
        "min_sip": 500,
        "min_lumpsum": 5000,
        "exit_load": "1% if redeemed within 365 days",
        "top_holdings": [
            {"symbol": "HDFCBANK", "name": "HDFC Bank Ltd", "weight": 8.5},
            {"symbol": "ICICIBANK", "name": "ICICI Bank Ltd", "weight": 7.4},
            {"symbol": "RELIANCE", "name": "Reliance Industries Ltd", "weight": 7.1},
            {"symbol": "INFY", "name": "Infosys Ltd", "weight": 5.9},
            {"symbol": "LT", "name": "Larsen & Toubro Ltd", "weight": 4.9},
            {"symbol": "ITC", "name": "ITC Ltd", "weight": 4.2},
            {"symbol": "TRENT", "name": "Trent Ltd", "weight": 3.5},
        ]
    },
    {
        "id": "NIPPON-SMALLCAP",
        "scheme_name": "Nippon India Small Cap Fund - Direct Plan - Growth",
        "amc": "Nippon Life India AMC",
        "category": "Small Cap Fund",
        "aum_crores": 58400.0,
        "expense_ratio": 0.68,
        "nav": 176.80,
        "cagr_1y": 44.2,
        "cagr_3y": 32.8,
        "cagr_5y": 31.5,
        "benchmark": "NIFTY Smallcap 250 TRI",
        "risk_grade": "Very High",
        "turnover_ratio": 34.0,
        "min_sip": 500,
        "min_lumpsum": 5000,
        "exit_load": "1% if redeemed within 30 days",
        "top_holdings": [
            {"symbol": "BEL", "name": "Bharat Electronics Ltd", "weight": 3.8},
            {"symbol": "APOLLOHOSP", "name": "Apollo Hospitals Enterprise", "weight": 2.9},
            {"symbol": "TRENT", "name": "Trent Ltd", "weight": 2.5},
            {"symbol": "ZOMATO", "name": "Zomato Ltd", "weight": 2.2},
            {"symbol": "HAL", "name": "Hindustan Aeronautics Ltd", "weight": 2.0},
        ]
    }
]

# -------------------------------------------------------------------
# 2. ETFs (Exchange Traded Funds) & Look-Through Baskets
# -------------------------------------------------------------------
ETFS_DATA: List[Dict[str, Any]] = [
    {
        "symbol": "NIFTYBEES",
        "name": "Nippon India ETF Nifty 50 BeES",
        "underlying_index": "NIFTY 50",
        "nav": 272.85,
        "aum_crores": 28400.0,
        "expense_ratio": 0.04,
        "tracking_error_pct": 0.03,
        "volume_daily": 4500000,
        "asset_class": "Equities",
        "constituents": [
            {"symbol": "RELIANCE", "weight": 9.12},
            {"symbol": "HDFCBANK", "weight": 8.75},
            {"symbol": "ICICIBANK", "weight": 7.82},
            {"symbol": "INFY", "weight": 5.64},
            {"symbol": "TCS", "weight": 4.12},
            {"symbol": "BHARTIARTL", "weight": 4.05},
            {"symbol": "LT", "weight": 3.85},
            {"symbol": "ITC", "weight": 3.65},
            {"symbol": "HINDUNILVR", "weight": 3.10},
            {"symbol": "SBIN", "weight": 2.95},
            {"symbol": "BAJFINANCE", "weight": 2.45},
            {"symbol": "MARUTI", "weight": 1.85},
            {"symbol": "TRENT", "weight": 1.62},
            {"symbol": "BEL", "weight": 1.48},
        ]
    },
    {
        "symbol": "GOLDBEES",
        "name": "Nippon India ETF Gold BeES",
        "underlying_index": "Domestic Price of Physical Gold 995 Purity",
        "nav": 64.92,
        "aum_crores": 14200.0,
        "expense_ratio": 0.79,
        "tracking_error_pct": 0.08,
        "volume_daily": 3200000,
        "asset_class": "Commodities",
        "constituents": [
            {"symbol": "GOLD_PHYSICAL_BARS", "weight": 98.8},
            {"symbol": "TREPS_CASH", "weight": 1.2},
        ]
    },
    {
        "symbol": "BANKBEES",
        "name": "Nippon India ETF Bank BeES",
        "underlying_index": "NIFTY Bank Index",
        "nav": 514.20,
        "aum_crores": 12800.0,
        "expense_ratio": 0.16,
        "tracking_error_pct": 0.05,
        "volume_daily": 1800000,
        "asset_class": "Equities",
        "constituents": [
            {"symbol": "HDFCBANK", "weight": 28.5},
            {"symbol": "ICICIBANK", "weight": 24.2},
            {"symbol": "SBIN", "weight": 12.4},
            {"symbol": "KOTAKBANK", "weight": 10.8},
            {"symbol": "AXISBANK", "weight": 9.8},
        ]
    },
    {
        "symbol": "LIQUIDBEES",
        "name": "Nippon India ETF Liquid BeES",
        "underlying_index": "NIFTY 1D Rate Index (TREPS)",
        "nav": 1000.00,
        "aum_crores": 16500.0,
        "expense_ratio": 0.69,
        "tracking_error_pct": 0.01,
        "volume_daily": 950000,
        "asset_class": "Cash & Cash Equivalents",
        "constituents": [
            {"symbol": "TREPS_OVERNIGHT", "weight": 85.0},
            {"symbol": "T_BILLS_91D", "weight": 15.0},
        ]
    }
]

# -------------------------------------------------------------------
# 3. BONDS (Sovereign G-Secs & Corporate Debt)
# -------------------------------------------------------------------
BONDS_DATA: List[Dict[str, Any]] = [
    {
        "isin": "IN0020230085",
        "symbol": "GS2033-7.18",
        "name": "7.18% Government of India Sovereign Benchmark 2033",
        "issuer": "Reserve Bank of India on behalf of Government of India",
        "bond_type": "SOVEREIGN",
        "face_value": 100.0,
        "market_price": 100.95,
        "coupon_rate": 7.18,
        "payment_frequency": "SEMI_ANNUAL",
        "ytm": 7.04,
        "macauley_duration_years": 6.82,
        "modified_duration_years": 6.58,
        "maturity_date": "2033-08-14",
        "credit_rating": "SOVEREIGN (AAA Domestic)",
        "seniority": "Senior Unsecured Sovereign",
        "taxation": "Taxable as per slab (exempt from TDS)"
    },
    {
        "isin": "IN0020240019",
        "symbol": "GS2034-7.10",
        "name": "7.10% Government of India Sovereign Benchmark 2034",
        "issuer": "Reserve Bank of India on behalf of Government of India",
        "bond_type": "SOVEREIGN",
        "face_value": 100.0,
        "market_price": 100.40,
        "coupon_rate": 7.10,
        "payment_frequency": "SEMI_ANNUAL",
        "ytm": 7.05,
        "macauley_duration_years": 7.24,
        "modified_duration_years": 6.99,
        "maturity_date": "2034-04-08",
        "credit_rating": "SOVEREIGN (AAA Domestic)",
        "seniority": "Senior Unsecured Sovereign",
        "taxation": "Taxable as per slab"
    },
    {
        "isin": "INE261F08DV6",
        "symbol": "NABARD-7.65-2029",
        "name": "NABARD 7.65% Priority Sector Infrastructure Bond 2029",
        "issuer": "National Bank for Agriculture and Rural Development",
        "bond_type": "PSU_CORPORATE",
        "face_value": 1000.0,
        "market_price": 1012.50,
        "coupon_rate": 7.65,
        "payment_frequency": "ANNUAL",
        "ytm": 7.32,
        "macauley_duration_years": 4.12,
        "modified_duration_years": 3.96,
        "maturity_date": "2029-03-23",
        "credit_rating": "CRISIL AAA / ICRA AAA",
        "seniority": "Senior Secured",
        "taxation": "Taxable as per investor slab"
    },
    {
        "isin": "INE020B08DF5",
        "symbol": "REC-7.55-2030",
        "name": "REC Limited 7.55% Power Infrastructure Bond 2030",
        "issuer": "REC Limited (Maharatna CPSE)",
        "bond_type": "PSU_CORPORATE",
        "face_value": 1000.0,
        "market_price": 1008.00,
        "coupon_rate": 7.55,
        "payment_frequency": "ANNUAL",
        "ytm": 7.38,
        "macauley_duration_years": 5.04,
        "modified_duration_years": 4.86,
        "maturity_date": "2030-06-15",
        "credit_rating": "CARE AAA / CRISIL AAA",
        "seniority": "Senior Secured",
        "taxation": "Taxable as per investor slab"
    },
    {
        "isin": "INE040A08492",
        "symbol": "HDFC-7.80-2032",
        "name": "HDFC Bank 7.80% Tier-II Subordinated Bond 2032",
        "issuer": "HDFC Bank Limited",
        "bond_type": "PRIVATE_BANKING",
        "face_value": 100000.0,
        "market_price": 100500.00,
        "coupon_rate": 7.80,
        "payment_frequency": "ANNUAL",
        "ytm": 7.68,
        "macauley_duration_years": 6.10,
        "modified_duration_years": 5.88,
        "maturity_date": "2032-11-20",
        "credit_rating": "CRISIL AA+ / ICRA AA+",
        "seniority": "Subordinated Debt Tier-II",
        "taxation": "Taxable as per investor slab"
    }
]

# -------------------------------------------------------------------
# 4. COMMODITIES & FX
# -------------------------------------------------------------------
COMMODITIES_FX_DATA: List[Dict[str, Any]] = [
    {
        "symbol": "GOLD",
        "name": "Gold 24 Karat (999 Purity)",
        "asset_class": "COMMODITY",
        "unit": "₹ per 10 Grams",
        "current_price": 72850.0,
        "change_1d": 240.0,
        "change_1d_pct": 0.33,
        "week_52_high": 75100.0,
        "week_52_low": 58900.0,
        "annualized_volatility": 12.8,
        "as_of": "2026-09-10T16:00:00Z",
        "macro_impact": "Hedge against currency depreciation and geopolitical risk. Negatively correlated with US 10Y real yields."
    },
    {
        "symbol": "SILVER",
        "name": "Silver (999 Purity)",
        "asset_class": "COMMODITY",
        "unit": "₹ per 1 Kilogram",
        "current_price": 86400.0,
        "change_1d": 450.0,
        "change_1d_pct": 0.52,
        "week_52_high": 96500.0,
        "week_52_low": 68200.0,
        "annualized_volatility": 24.2,
        "as_of": "2026-09-10T16:00:00Z",
        "macro_impact": "Dual monetary and industrial demand driver (solar PV panels, electronics, EV components)."
    },
    {
        "symbol": "BRENT_CRUDE",
        "name": "Brent Crude Oil",
        "asset_class": "COMMODITY",
        "unit": "$ per Barrel",
        "current_price": 74.80,
        "change_1d": -0.85,
        "change_1d_pct": -1.12,
        "week_52_high": 92.40,
        "week_52_low": 68.50,
        "annualized_volatility": 28.5,
        "as_of": "2026-09-10T16:00:00Z",
        "macro_impact": "Direct impact on Indian Current Account Deficit (CAD) and retail fuel inflation. Lower crude eases margin pressure for Paints and OMCs."
    },
    {
        "symbol": "USD_INR",
        "name": "US Dollar to Indian Rupee",
        "asset_class": "FOREX",
        "unit": "INR per 1 USD",
        "current_price": 83.92,
        "change_1d": 0.04,
        "change_1d_pct": 0.05,
        "week_52_high": 84.15,
        "week_52_low": 82.80,
        "annualized_volatility": 2.9,
        "as_of": "2026-09-10T16:00:00Z",
        "macro_impact": "Depreciation supports IT/Pharma export realizations; increases import bill for electronics and petroleum."
    }
]

# -------------------------------------------------------------------
# 5. MACROECONOMIC INDICATORS
# -------------------------------------------------------------------
MACRO_INDICATORS_DATA: List[Dict[str, Any]] = [
    {
        "id": "CPI_INFLATION",
        "indicator": "CPI_INFLATION",
        "name": "Consumer Price Index (CPI Inflation)",
        "current_value": 3.65,
        "unit": "% YoY",
        "frequency": "Monthly",
        "trend": "COOLING",
        "target_band": "4.0% (±2.0% tolerance band)",
        "last_updated": "August 2026",
        "historical_series": [
            {"period": "Mar 2026", "value": 4.85},
            {"period": "Apr 2026", "value": 4.83},
            {"period": "May 2026", "value": 4.75},
            {"period": "Jun 2026", "value": 5.08},
            {"period": "Jul 2026", "value": 3.54},
            {"period": "Aug 2026", "value": 3.65},
        ],
        "sector_linkage": "Cooling CPI improves purchasing power for FMCG (HUL, ITC) and increases probability of RBI easing cycle."
    },
    {
        "id": "GDP_GROWTH",
        "indicator": "GDP_GROWTH",
        "name": "Real GDP Growth",
        "current_value": 6.70,
        "unit": "% YoY",
        "frequency": "Quarterly",
        "trend": "RESILIENT",
        "target_band": "6.5% - 7.0% projected FY26",
        "last_updated": "Q1 FY26",
        "historical_series": [
            {"period": "Q4 FY24", "value": 7.80},
            {"period": "Q1 FY25", "value": 6.70},
            {"period": "Q2 FY25", "value": 6.90},
            {"period": "Q3 FY25", "value": 7.20},
            {"period": "Q4 FY25", "value": 7.00},
            {"period": "Q1 FY26", "value": 6.70},
        ],
        "sector_linkage": "Strong capital expenditure tailwinds for Infrastructure (LT) and Capital Goods (BEL, Siemens)."
    },
    {
        "id": "REPO_RATE",
        "indicator": "REPO_RATE",
        "name": "RBI Policy Repo Rate",
        "current_value": 6.50,
        "unit": "% p.a.",
        "frequency": "Bi-Monthly MPC",
        "trend": "NEUTRAL",
        "target_band": "Liquidity management neutral stance",
        "last_updated": "August 2026 MPC",
        "historical_series": [
            {"period": "Oct 2025", "value": 6.50},
            {"period": "Dec 2025", "value": 6.50},
            {"period": "Feb 2026", "value": 6.50},
            {"period": "Apr 2026", "value": 6.50},
            {"period": "Jun 2026", "value": 6.50},
            {"period": "Aug 2026", "value": 6.50},
        ],
        "sector_linkage": "Stable cost of funds for banks (HDFCBANK, ICICIBANK). Rate cut anticipation boosts rate-sensitives like Auto & Realty."
    },
    {
        "id": "10Y_GSEC",
        "indicator": "10Y_GSEC",
        "name": "India 10-Year Benchmark Sovereign Yield",
        "current_value": 6.84,
        "unit": "% Yield to Maturity",
        "frequency": "Daily Market",
        "trend": "SOFTENING",
        "target_band": "6.80% - 7.20%",
        "last_updated": "Daily Close",
        "historical_series": [
            {"period": "Mar 2026", "value": 7.06},
            {"period": "Apr 2026", "value": 7.12},
            {"period": "May 2026", "value": 7.00},
            {"period": "Jun 2026", "value": 6.98},
            {"period": "Jul 2026", "value": 6.92},
            {"period": "Aug 2026", "value": 6.84},
        ],
        "sector_linkage": "Benchmark discount rate for DCF valuation models. Softening yields expand equity valuation multiples."
    },
    {
        "id": "MANUFACTURING_PMI",
        "indicator": "MANUFACTURING_PMI",
        "name": "HSBC India Manufacturing PMI",
        "current_value": 57.5,
        "unit": "Index Points (>50 Expansion)",
        "frequency": "Monthly",
        "trend": "EXPANDING",
        "target_band": "> 50.0 indicates expansion",
        "last_updated": "August 2026",
        "historical_series": [
            {"period": "Mar 2026", "value": 59.1},
            {"period": "Apr 2026", "value": 58.8},
            {"period": "May 2026", "value": 57.5},
            {"period": "Jun 2026", "value": 58.3},
            {"period": "Jul 2026", "value": 58.1},
            {"period": "Aug 2026", "value": 57.5},
        ],
        "sector_linkage": "Indicates robust order backlogs for industrial producers, metals, and chemical manufacturers."
    }
]
