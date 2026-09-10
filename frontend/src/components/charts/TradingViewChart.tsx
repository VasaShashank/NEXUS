"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  IChartApi,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  BarSeries,
  HistogramSeries,
} from "lightweight-charts";
import {
  HistoricalCandle,
  SupportResistanceLevels,
  TechnicalIndicatorsResponse,
  CandlestickPatternAnnotation
} from "@/lib/api";
import {
  BarChart3,
  LineChart,
  CandlestickChart,
  Layers,
  Sparkles,
  Sliders,
  Info,
  Clock,
  CheckCircle2,
  X
} from "lucide-react";

interface TradingViewChartProps {
  candles: HistoricalCandle[];
  symbol: string;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  supportResistance?: SupportResistanceLevels;
  technicalResponse?: TechnicalIndicatorsResponse;
  sma20?: number;
  sma50?: number;
  height?: number;
  dataSource?: string;
  asOf?: string;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  candles,
  symbol,
  timeframe,
  onTimeframeChange,
  supportResistance,
  technicalResponse,
  sma20,
  sma50,
  height = 440,
  dataSource = "NSE Delayed 15m",
  asOf,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const oscillatorContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const oscillatorChartRef = useRef<IChartApi | null>(null);

  // Chart type
  const [chartType, setChartType] = useState<"candlestick" | "bar" | "line" | "area">("candlestick");

  // Indicator Overlay Toggles
  const [showVolume, setShowVolume] = useState<boolean>(true);
  const [showSR, setShowSR] = useState<boolean>(true);
  const [showSMA20, setShowSMA20] = useState<boolean>(true);
  const [showSMA50, setShowSMA50] = useState<boolean>(false);
  const [showEMA21, setShowEMA21] = useState<boolean>(false);
  const [showVWAP, setShowVWAP] = useState<boolean>(false);
  const [showBollinger, setShowBollinger] = useState<boolean>(false);
  const [showPatterns, setShowPatterns] = useState<boolean>(true);

  // Sub-pane Oscillator: "none" | "rsi" | "macd" | "stochastic" | "adx"
  const [activeOscillator, setActiveOscillator] = useState<"none" | "rsi" | "macd" | "stochastic" | "adx">("rsi");

  // Active Tooltip
  const [activeTooltip, setActiveTooltip] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  } | null>(null);

  // Selected Pattern Detail Modal
  const [selectedPattern, setSelectedPattern] = useState<CandlestickPatternAnnotation | null>(null);

  const timeframes = ["1D", "1W", "1M", "6M", "1Y", "5Y"];

  // Pattern detection from candles if not supplied by technicalResponse
  const patterns: CandlestickPatternAnnotation[] = technicalResponse?.patterns || [];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clean up existing charts
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    if (oscillatorChartRef.current) {
      oscillatorChartRef.current.remove();
      oscillatorChartRef.current = null;
    }

    const container = chartContainerRef.current;
    const mainHeight = activeOscillator !== "none" ? height - 120 : height;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: mainHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94A3B8",
        fontSize: 11,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.05)" },
        horzLines: { color: "rgba(148, 163, 184, 0.05)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(14, 165, 233, 0.3)", width: 1, style: LineStyle.Dashed },
        horzLine: { color: "rgba(14, 165, 233, 0.3)", width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.12)",
        scaleMargins: { top: 0.08, bottom: showVolume ? 0.22 : 0.08 },
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.12)",
        timeVisible: timeframe === "1D" || timeframe === "1W",
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // 1. Add Main Series
    let mainSeries: any;
    if (chartType === "candlestick") {
      mainSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#10B981",
        downColor: "#F43F5E",
        borderVisible: false,
        wickUpColor: "#10B981",
        wickDownColor: "#F43F5E",
      });
    } else if (chartType === "bar") {
      mainSeries = chart.addSeries(BarSeries, {
        upColor: "#10B981",
        downColor: "#F43F5E",
      });
    } else if (chartType === "area") {
      mainSeries = chart.addSeries(AreaSeries, {
        topColor: "rgba(14, 165, 233, 0.32)",
        bottomColor: "rgba(14, 165, 233, 0.0)",
        lineColor: "#0EA5E9",
        lineWidth: 2,
      });
    } else {
      mainSeries = chart.addSeries(LineSeries, {
        color: "#0EA5E9",
        lineWidth: 2,
      });
    }

    // 2. Add Volume Series
    let volumeSeries: any = null;
    if (showVolume) {
      volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
      });
      chart.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
      });
    }

    // 3. Add Overlay Indicator Series (SMA, EMA, VWAP, Bollinger Bands)
    let sma20Series: any = null;
    let sma50Series: any = null;
    let ema21Series: any = null;
    let vwapSeries: any = null;
    let bbUpperSeries: any = null;
    let bbLowerSeries: any = null;

    if (showSMA20) {
      sma20Series = chart.addSeries(LineSeries, {
        color: "#38BDF8",
        lineWidth: 1,
        title: "SMA 20",
      });
    }
    if (showSMA50) {
      sma50Series = chart.addSeries(LineSeries, {
        color: "#F59E0B",
        lineWidth: 1,
        title: "SMA 50",
      });
    }
    if (showEMA21) {
      ema21Series = chart.addSeries(LineSeries, {
        color: "#A855F7",
        lineWidth: 1,
        title: "EMA 21",
      });
    }
    if (showVWAP) {
      vwapSeries = chart.addSeries(LineSeries, {
        color: "#10B981",
        lineWidth: 2,
        title: "VWAP",
        lineStyle: LineStyle.Dashed,
      });
    }
    if (showBollinger) {
      bbUpperSeries = chart.addSeries(LineSeries, {
        color: "rgba(139, 92, 246, 0.6)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        title: "BB Upper",
      });
      bbLowerSeries = chart.addSeries(LineSeries, {
        color: "rgba(139, 92, 246, 0.6)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        title: "BB Lower",
      });
    }

    // 4. Populate Candles and Overlays
    if (candles && candles.length > 0) {
      const formattedCandles = candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        value: c.close,
      }));
      mainSeries.setData(formattedCandles);

      if (showVolume && volumeSeries) {
        const volumeData = candles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)",
        }));
        volumeSeries.setData(volumeData);
      }

      // Compute & set SMA 20 data
      if (showSMA20 && sma20Series) {
        const smaData = [];
        for (let i = 19; i < candles.length; i++) {
          const slice = candles.slice(i - 19, i + 1);
          const avg = slice.reduce((sum, item) => sum + item.close, 0) / 20;
          smaData.push({ time: candles[i].time, value: roundTwo(avg) });
        }
        sma20Series.setData(smaData);
      }

      // Compute & set SMA 50 data
      if (showSMA50 && sma50Series && candles.length >= 50) {
        const smaData = [];
        for (let i = 49; i < candles.length; i++) {
          const slice = candles.slice(i - 49, i + 1);
          const avg = slice.reduce((sum, item) => sum + item.close, 0) / 50;
          smaData.push({ time: candles[i].time, value: roundTwo(avg) });
        }
        sma50Series.setData(smaData);
      }

      // Compute & set EMA 21
      if (showEMA21 && ema21Series && candles.length >= 21) {
        const k = 2 / (21 + 1);
        let ema = candles[0].close;
        const emaData = [];
        for (let i = 0; i < candles.length; i++) {
          ema = candles[i].close * k + ema * (1 - k);
          if (i >= 20) {
            emaData.push({ time: candles[i].time, value: roundTwo(ema) });
          }
        }
        ema21Series.setData(emaData);
      }

      // Compute & set VWAP
      if (showVWAP && vwapSeries) {
        let cumVol = 0;
        let cumPV = 0;
        const vwapData = [];
        for (let i = 0; i < candles.length; i++) {
          cumVol += candles[i].volume;
          cumPV += candles[i].close * candles[i].volume;
          if (cumVol > 0) {
            vwapData.push({ time: candles[i].time, value: roundTwo(cumPV / cumVol) });
          }
        }
        vwapSeries.setData(vwapData);
      }

      // Compute & set Bollinger Bands
      if (showBollinger && bbUpperSeries && bbLowerSeries && candles.length >= 20) {
        const upperData = [];
        const lowerData = [];
        for (let i = 19; i < candles.length; i++) {
          const slice = candles.slice(i - 19, i + 1);
          const mean = slice.reduce((sum, item) => sum + item.close, 0) / 20;
          const variance = slice.reduce((sum, item) => sum + Math.pow(item.close - mean, 2), 0) / 20;
          const std = Math.sqrt(variance);
          upperData.push({ time: candles[i].time, value: roundTwo(mean + 2 * std) });
          lowerData.push({ time: candles[i].time, value: roundTwo(mean - 2 * std) });
        }
        bbUpperSeries.setData(upperData);
        bbLowerSeries.setData(lowerData);
      }

      // 5. Add Support & Resistance Price Lines
      if (showSR && supportResistance) {
        const { nearest_support, nearest_resistance, classic } = supportResistance;
        if (nearest_resistance > 0) {
          mainSeries.createPriceLine({
            price: nearest_resistance,
            color: "#F43F5E",
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: `Res ₹${nearest_resistance}`,
          });
        }
        if (nearest_support > 0) {
          mainSeries.createPriceLine({
            price: nearest_support,
            color: "#10B981",
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: true,
            title: `Sup ₹${nearest_support}`,
          });
        }
        if (classic?.pivot > 0) {
          mainSeries.createPriceLine({
            price: classic.pivot,
            color: "#F59E0B",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: `Pivot ₹${classic.pivot}`,
          });
        }
      }

      // 6. Add Candlestick Pattern Markers
      if (showPatterns && patterns.length > 0 && chartType === "candlestick") {
        const markers = patterns.map((p) => {
          const isBull = p.pattern_type.includes("BULLISH");
          return {
            time: p.time,
            position: isBull ? ("belowBar" as const) : ("aboveBar" as const),
            color: isBull ? "#10B981" : "#F43F5E",
            shape: isBull ? ("arrowUp" as const) : ("arrowDown" as const),
            text: p.pattern_name,
            id: p.pattern_name,
          };
        });
        try {
          mainSeries.setMarkers(markers);
        } catch (err) {
          console.warn("Could not attach pattern markers to chart series:", err);
        }
      }

      chart.timeScale().fitContent();
    }

    // 7. Render Sub-Pane Oscillator if active
    if (activeOscillator !== "none" && oscillatorContainerRef.current && candles.length > 14) {
      const oscContainer = oscillatorContainerRef.current;
      const oscChart = createChart(oscContainer, {
        width: oscContainer.clientWidth,
        height: 110,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#94A3B8",
          fontSize: 10,
        },
        grid: {
          vertLines: { color: "rgba(148, 163, 184, 0.05)" },
          horzLines: { color: "rgba(148, 163, 184, 0.05)" },
        },
        rightPriceScale: {
          borderColor: "rgba(148, 163, 184, 0.12)",
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: "rgba(148, 163, 184, 0.12)",
          visible: false,
        },
      });
      oscillatorChartRef.current = oscChart;

      if (activeOscillator === "rsi") {
        const rsiSeries = oscChart.addSeries(LineSeries, {
          color: "#8B5CF6",
          lineWidth: 2,
          title: "RSI 14",
        });
        const rsiData = computeClientRSI(candles, 14);
        rsiSeries.setData(rsiData);

        // 70 and 30 Overbought/Oversold Reference Lines
        rsiSeries.createPriceLine({ price: 70, color: "rgba(244, 63, 94, 0.5)", lineStyle: LineStyle.Dotted, title: "70 OB" });
        rsiSeries.createPriceLine({ price: 30, color: "rgba(16, 185, 129, 0.5)", lineStyle: LineStyle.Dotted, title: "30 OS" });
      } else if (activeOscillator === "macd") {
        const histSeries = oscChart.addSeries(HistogramSeries, {
          priceScaleId: "",
        });
        const macdLine = oscChart.addSeries(LineSeries, { color: "#0EA5E9", lineWidth: 2, title: "MACD" });
        const signalLine = oscChart.addSeries(LineSeries, { color: "#F59E0B", lineWidth: 2, title: "Signal" });

        const macdResult = computeClientMACD(candles);
        histSeries.setData(macdResult.histogram);
        macdLine.setData(macdResult.macd);
        signalLine.setData(macdResult.signal);
      } else if (activeOscillator === "stochastic") {
        const kSeries = oscChart.addSeries(LineSeries, { color: "#0EA5E9", lineWidth: 2, title: "%K" });
        const dSeries = oscChart.addSeries(LineSeries, { color: "#F43F5E", lineWidth: 2, title: "%D" });
        const stochData = computeClientStochastic(candles);
        kSeries.setData(stochData.k);
        dSeries.setData(stochData.d);
      }

      // Synchronize time scales
      chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (oscChart && range) {
          oscChart.timeScale().setVisibleRange(range);
        }
      });
    }

    // Crosshair hover listener
    chart.subscribeCrosshairMove((param) => {
      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > container.clientWidth ||
        param.point.y < 0 ||
        param.point.y > mainHeight
      ) {
        if (candles.length > 0) {
          const last = candles[candles.length - 1];
          setActiveTooltip({
            time: last.time,
            open: last.open,
            high: last.high,
            low: last.low,
            close: last.close,
            volume: last.volume,
          });
        }
      } else {
        const data = param.seriesData.get(mainSeries) as any;
        if (data) {
          setActiveTooltip({
            time: String(param.time),
            open: data.open ?? data.value,
            high: data.high ?? data.value,
            low: data.low ?? data.value,
            close: data.close ?? data.value,
          });
        }
      }
    });

    // Default tooltip to latest candle
    if (candles.length > 0) {
      const last = candles[candles.length - 1];
      setActiveTooltip({
        time: last.time,
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
        volume: last.volume,
      });
    }

    // Responsive window resize
    const handleResize = () => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({ width: container.clientWidth });
      }
      if (oscillatorChartRef.current && oscillatorContainerRef.current) {
        oscillatorChartRef.current.applyOptions({ width: oscillatorContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      if (oscillatorChartRef.current) {
        oscillatorChartRef.current.remove();
        oscillatorChartRef.current = null;
      }
    };
  }, [
    candles,
    chartType,
    showVolume,
    showSR,
    showSMA20,
    showSMA50,
    showEMA21,
    showVWAP,
    showBollinger,
    showPatterns,
    activeOscillator,
    supportResistance,
    technicalResponse,
    timeframe,
    height,
  ]);

  return (
    <div className="w-full bg-surface-50 dark:bg-surface-50 border border-border rounded-xl p-4 shadow-sm flex flex-col space-y-3">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        {/* Left: Timeframe Selectors & Data Freshness */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-white/[0.04] p-1 rounded-lg">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => onTimeframeChange(tf)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  timeframe === tf
                    ? "bg-accent-blue/20 text-accent-cyan font-semibold shadow-sm border border-accent-blue/30"
                    : "text-slate-400 hover:text-foreground"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-white/[0.02] border border-white/[0.05] text-[11px] text-slate-400">
            <Clock className="w-3 h-3 text-emerald-400" />
            <span>{dataSource}</span>
            {asOf && <span className="text-slate-500">· {asOf}</span>}
          </div>
        </div>

        {/* Middle: Active OHLC Tooltip */}
        {activeTooltip && (
          <div className="hidden md:flex items-center space-x-4 text-xs tabular-nums text-slate-400">
            <span>
              O: <span className="text-foreground font-medium">₹{activeTooltip.open?.toFixed(2)}</span>
            </span>
            <span>
              H: <span className="text-foreground font-medium">₹{activeTooltip.high?.toFixed(2)}</span>
            </span>
            <span>
              L: <span className="text-foreground font-medium">₹{activeTooltip.low?.toFixed(2)}</span>
            </span>
            <span>
              C:{" "}
              <span
                className={`font-semibold ${
                  activeTooltip.close >= activeTooltip.open ? "text-accent-emerald" : "text-accent-rose"
                }`}
              >
                ₹{activeTooltip.close?.toFixed(2)}
              </span>
            </span>
          </div>
        )}

        {/* Right: Chart Type & Indicator Toggles */}
        <div className="flex items-center space-x-2">
          {/* Chart Type */}
          <div className="flex items-center space-x-1 bg-white/[0.03] p-1 rounded-lg">
            <button
              onClick={() => setChartType("candlestick")}
              title="Candlestick Chart"
              className={`p-1 rounded ${chartType === "candlestick" ? "bg-white/[0.08] text-foreground" : "text-slate-400"}`}
            >
              <CandlestickChart className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType("bar")}
              title="OHLC Bar Chart"
              className={`p-1 rounded ${chartType === "bar" ? "bg-white/[0.08] text-foreground" : "text-slate-400"}`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType("line")}
              title="Line Chart"
              className={`p-1 rounded ${chartType === "line" ? "bg-white/[0.08] text-foreground" : "text-slate-400"}`}
            >
              <LineChart className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* S/R Level Overlay */}
          <button
            onClick={() => setShowSR(!showSR)}
            className={`flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-md border transition-all ${
              showSR ? "bg-accent-blue/10 border-accent-blue/30 text-accent-cyan" : "border-border text-slate-400"
            }`}
          >
            <Layers className="w-3 h-3" />
            <span className="hidden sm:inline">Pivots</span>
          </button>

          {/* Pattern Intelligence Toggle */}
          <button
            onClick={() => setShowPatterns(!showPatterns)}
            className={`flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-md border transition-all ${
              showPatterns ? "bg-accent-violet/10 border-accent-violet/30 text-accent-violet" : "border-border text-slate-400"
            }`}
            title="Toggle Rule-Based Candlestick Patterns"
          >
            <Sparkles className="w-3 h-3" />
            <span className="hidden sm:inline">Patterns ({patterns.length})</span>
          </button>
        </div>
      </div>

      {/* Secondary Indicator Ribbon (Overlays & Oscillator Switcher) */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Left: Overlays */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500 mr-1 font-medium">Overlays:</span>
          <button
            onClick={() => setShowSMA20(!showSMA20)}
            className={`px-2 py-0.5 rounded text-[11px] border transition-all ${
              showSMA20 ? "bg-sky-500/10 border-sky-400/40 text-sky-400 font-medium" : "border-white/[0.06] text-slate-500"
            }`}
          >
            SMA 20
          </button>
          <button
            onClick={() => setShowSMA50(!showSMA50)}
            className={`px-2 py-0.5 rounded text-[11px] border transition-all ${
              showSMA50 ? "bg-amber-500/10 border-amber-400/40 text-amber-400 font-medium" : "border-white/[0.06] text-slate-500"
            }`}
          >
            SMA 50
          </button>
          <button
            onClick={() => setShowEMA21(!showEMA21)}
            className={`px-2 py-0.5 rounded text-[11px] border transition-all ${
              showEMA21 ? "bg-purple-500/10 border-purple-400/40 text-purple-400 font-medium" : "border-white/[0.06] text-slate-500"
            }`}
          >
            EMA 21
          </button>
          <button
            onClick={() => setShowVWAP(!showVWAP)}
            className={`px-2 py-0.5 rounded text-[11px] border transition-all ${
              showVWAP ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-400 font-medium" : "border-white/[0.06] text-slate-500"
            }`}
          >
            VWAP
          </button>
          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`px-2 py-0.5 rounded text-[11px] border transition-all ${
              showBollinger ? "bg-violet-500/10 border-violet-400/40 text-violet-400 font-medium" : "border-white/[0.06] text-slate-500"
            }`}
          >
            Bollinger (20,2)
          </button>
        </div>

        {/* Right: Oscillator Sub-pane Switcher */}
        <div className="flex items-center space-x-1 bg-white/[0.02] p-0.5 rounded-lg border border-white/[0.05]">
          <span className="text-[11px] text-slate-500 px-1.5 font-medium">Sub-Pane:</span>
          {(["none", "rsi", "macd", "stochastic"] as const).map((osc) => (
            <button
              key={osc}
              onClick={() => setActiveOscillator(osc)}
              className={`px-2 py-0.5 rounded text-[11px] uppercase font-medium transition-all ${
                activeOscillator === osc
                  ? "bg-white/[0.08] text-accent-cyan border border-white/[0.1]"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {osc}
            </button>
          ))}
        </div>
      </div>

      {/* Pattern Ribbon (Clickable Candlestick Formations) */}
      {showPatterns && patterns.length > 0 && (
        <div className="flex items-center space-x-2 overflow-x-auto py-1.5 px-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <span className="text-[11px] font-medium text-slate-400 flex items-center space-x-1 shrink-0">
            <Sparkles className="w-3 h-3 text-accent-violet" />
            <span>Observed Patterns:</span>
          </span>
          <div className="flex items-center space-x-2">
            {patterns.map((p, idx) => {
              const isBull = p.pattern_type.includes("BULLISH");
              return (
                <button
                  key={`${p.pattern_name}-${idx}`}
                  onClick={() => setSelectedPattern(p)}
                  className={`px-2 py-0.5 text-[11px] rounded border transition-all flex items-center space-x-1 shrink-0 ${
                    isBull
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                  }`}
                >
                  <span>{p.pattern_name}</span>
                  <span className="text-[9px] text-slate-400">({p.time.slice(5)})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Chart Canvas */}
      <div ref={chartContainerRef} className="w-full relative" />

      {/* Oscillator Sub-Pane Canvas */}
      {activeOscillator !== "none" && (
        <div className="pt-2 border-t border-white/[0.05]">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 px-1">
            <span className="font-medium text-foreground uppercase tracking-wider">{activeOscillator} (Sub-Pane)</span>
            <span className="text-slate-500">Oscillator computed over OHLCV series</span>
          </div>
          <div ref={oscillatorContainerRef} className="w-full relative" />
        </div>
      )}

      {/* Pattern Detail Modal Popover */}
      {selectedPattern && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0A0D14] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-accent-cyan" />
                <h4 className="font-semibold text-foreground text-sm">{selectedPattern.pattern_name}</h4>
                <span className="px-2 py-0.5 text-[10px] rounded bg-white/[0.05] border border-white/[0.1] text-slate-300">
                  {selectedPattern.pattern_type}
                </span>
              </div>
              <button
                onClick={() => setSelectedPattern(null)}
                className="text-slate-400 hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-500">Date Observed:</span>
                <span className="font-medium text-foreground">{selectedPattern.time}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/[0.04]">
                <span className="text-slate-500">Reference Price:</span>
                <span className="font-medium text-foreground">₹{selectedPattern.price?.toFixed(2)}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 block mb-1">Candle Structure:</span>
                <p className="text-slate-200 bg-white/[0.03] p-2.5 rounded-lg border border-white/[0.05]">
                  {selectedPattern.candle_structure}
                </p>
              </div>
              <div className="py-1">
                <span className="text-slate-500 block mb-1">Historical Observation / Traditional Interpretation:</span>
                <p className="text-slate-200 bg-white/[0.03] p-2.5 rounded-lg border border-white/[0.05] leading-relaxed">
                  {selectedPattern.historical_observation}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-accent-blue/5 border border-accent-blue/20 text-[11px] text-slate-400 leading-relaxed">
              <span className="font-semibold text-accent-cyan block mb-0.5">Compliance Notice</span>
              Candlestick patterns are historical geometric observations of past trading sessions and do NOT guarantee future price trajectory. Never treat patterns as direct buy/sell predictions.
            </div>

            <button
              onClick={() => setSelectedPattern(null)}
              className="w-full py-2 bg-white/[0.06] hover:bg-white/[0.1] text-foreground text-xs font-medium rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper utilities for Client-Side Indicators
function roundTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function computeClientRSI(candles: HistoricalCandle[], period = 14) {
  const result = [];
  if (candles.length <= period) return [];

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - 100 / (1 + rs);
  result.push({ time: candles[period].time, value: roundTwo(rsi) });

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - 100 / (1 + rs);
    result.push({ time: candles[i].time, value: roundTwo(rsi) });
  }

  return result;
}

function computeClientMACD(candles: HistoricalCandle[]) {
  const closes = candles.map((c) => c.close);
  const times = candles.map((c) => c.time);

  const k12 = 2 / 13;
  const k26 = 2 / 27;
  const k9 = 2 / 10;

  let ema12 = closes[0];
  let ema26 = closes[0];

  const macdValues: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    ema12 = closes[i] * k12 + ema12 * (1 - k12);
    ema26 = closes[i] * k26 + ema26 * (1 - k26);
    macdValues.push(ema12 - ema26);
  }

  let signal = macdValues[0];
  const macdData = [];
  const signalData = [];
  const histData = [];

  for (let i = 0; i < macdValues.length; i++) {
    signal = macdValues[i] * k9 + signal * (1 - k9);
    if (i >= 26) {
      const hist = macdValues[i] - signal;
      macdData.push({ time: times[i], value: roundTwo(macdValues[i]) });
      signalData.push({ time: times[i], value: roundTwo(signal) });
      histData.push({
        time: times[i],
        value: roundTwo(hist),
        color: hist >= 0 ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.4)",
      });
    }
  }

  return { macd: macdData, signal: signalData, histogram: histData };
}

function computeClientStochastic(candles: HistoricalCandle[], period = 14) {
  const kData = [];
  const dData = [];

  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const low = Math.min(...slice.map((s) => s.low));
    const high = Math.max(...slice.map((s) => s.high));
    const denom = high - low;
    const k = denom > 0 ? ((candles[i].close - low) / denom) * 100 : 50;
    kData.push({ time: candles[i].time, value: roundTwo(k) });
  }

  for (let i = 2; i < kData.length; i++) {
    const avg = (kData[i].value + kData[i - 1].value + kData[i - 2].value) / 3;
    dData.push({ time: kData[i].time, value: roundTwo(avg) });
  }

  return { k: kData, d: dData };
}
