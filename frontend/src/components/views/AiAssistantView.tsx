"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Trash2,
  Briefcase,
  TrendingUp,
  Cpu,
  Layers,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { api, AssistantChatMessage } from "@/lib/api";
import { ChatGPTMessageRenderer } from "./ChatGPTMessageRenderer";

interface AiAssistantViewProps {
  selectedSymbol?: string;
  onSelectStock?: (symbol: string) => void;
}

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
  latency_ms?: number;
  context_used?: string[];
  timestamp: string;
}

const STARTER_PROMPTS = [
  {
    title: "Comparative Equity Valuation",
    prompt: "Compare Tata Motors vs Mahindra & Mahindra (M&M) across EV transition strategy, EBITDA margins, and forward P/E multiples. Who has the better risk-reward?",
    icon: TrendingUp,
    badge: "VALUATION",
  },
  {
    title: "Market Drivers & Macro",
    prompt: "Why did IT stocks (TCS, Infosys) face selling pressure recently? What are the key support levels and forward demand catalysts?",
    icon: Cpu,
    badge: "SECTOR",
  },
  {
    title: "Portfolio Health & Risk Audit",
    prompt: "Audit my current portfolio holdings and cash balance. What is my single-stock concentration risk and what rebalancing steps do you advise?",
    icon: Briefcase,
    badge: "PORTFOLIO",
  },
  {
    title: "Quantitative Formula Derivation",
    prompt: "Show me how to calculate the Weighted Average Cost of Capital (WACC) step-by-step with real equations, and apply it to a capital-intensive stock like Reliance.",
    icon: Layers,
    badge: "QUANT MATH",
  },
];

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  selectedSymbol = "RELIANCE",
  onSelectStock,
}) => {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [includePortfolio, setIncludePortfolio] = useState(true);
  const [activeSymbol, setActiveSymbol] = useState(selectedSymbol);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (selectedSymbol && selectedSymbol !== activeSymbol) {
      setActiveSymbol(selectedSymbol);
    }
  }, [selectedSymbol]);

  // Load chat history from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nexus_copilot_chat");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem("nexus_copilot_chat", JSON.stringify(messages.slice(-30)));
      }
    } catch {
      // ignore
    }
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend ?? inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: DisplayMessage = {
      id: `msg_${Date.now()}_u`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage("");
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // Format payload for backend
      const apiPayload: AssistantChatMessage[] = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.chatWithAiAssistant({
        messages: apiPayload,
        symbol: activeSymbol || undefined,
        include_portfolio: includePortfolio,
      });

      const assistantMsg: DisplayMessage = {
        id: `msg_${Date.now()}_a`,
        role: "assistant",
        content: res.message.content,
        provider: res.provider,
        model: res.model,
        latency_ms: res.latency_ms,
        context_used: res.context_used,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("AI Copilot error:", err);
      setErrorMessage(
        err?.message || "Could not reach the NEXUS AI Copilot. Please check your backend AI provider API key."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem("nexus_copilot_chat");
    setErrorMessage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-6xl mx-auto p-4 sm:p-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-accent-cyan/15 border border-accent-cyan/30 text-accent-cyan shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-display font-bold text-foreground">
                  NEXUS Financial Copilot
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold tracking-wide rounded bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30">
                  LIVE AI COPILOT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-light">
                Context-aware conversational financial analyst with live quote grounding and portfolio ledger awareness.
              </p>
            </div>
          </div>
        </div>

        {/* Controls & Quick Toggles */}
        <div className="flex items-center space-x-2.5">
          {/* Active Symbol Pill */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-surface-50 dark:bg-white/[0.04] border border-white/[0.08] text-xs">
            <span className="text-slate-400">Context:</span>
            <input
              type="text"
              value={activeSymbol}
              onChange={(e) => setActiveSymbol(e.target.value.toUpperCase())}
              placeholder="e.g. RELIANCE"
              className="w-24 bg-transparent font-mono font-bold text-accent-cyan focus:outline-none uppercase text-xs"
            />
          </div>

          {/* Portfolio Context Toggle */}
          <button
            onClick={() => setIncludePortfolio(!includePortfolio)}
            title="Inject real-time virtual portfolio holdings & cash into context"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              includePortfolio
                ? "bg-accent-emerald/15 border-accent-emerald/30 text-accent-emerald shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                : "bg-surface-50 dark:bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-foreground"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Portfolio Ledger</span>
            <span className="text-[10px] px-1 py-0.2 rounded bg-white/10 uppercase font-mono">
              {includePortfolio ? "ON" : "OFF"}
            </span>
          </button>

          {/* Clear Chat */}
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              title="Clear conversation"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Conversation Stream */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center max-w-2xl mx-auto py-12 space-y-8">
            <div className="space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan mb-2">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">
                How can I assist your investment research today?
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Ask me to compare valuations, explain price shocks, calculate financial formulas step-by-step, or audit your portfolio risk.
              </p>
            </div>

            {/* Quick Starter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
              {STARTER_PROMPTS.map((starter, idx) => {
                const Icon = starter.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(starter.prompt)}
                    className="p-3.5 rounded-xl glass-card hover:border-accent-cyan/40 hover:bg-white/[0.04] transition-all group flex flex-col justify-between text-left space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-white/[0.06] text-accent-cyan border border-white/[0.08]">
                        {starter.badge}
                      </span>
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-accent-cyan transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xs font-semibold text-foreground group-hover:text-accent-cyan transition-colors">
                        {starter.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {starter.prompt}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              } space-y-1.5`}
            >
              {/* Message Header / Meta */}
              <div className="flex items-center space-x-2 text-[10px] text-slate-500 px-1 font-mono">
                <span>{msg.role === "user" ? "You" : "NEXUS Copilot"}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
                {msg.latency_ms && (
                  <>
                    <span>•</span>
                    <span className="text-accent-cyan">{msg.latency_ms}ms</span>
                  </>
                )}
                {msg.model && (
                  <>
                    <span>•</span>
                    <span className="text-slate-400">{msg.model}</span>
                  </>
                )}
              </div>

              {/* Message Bubble / Content */}
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl ${
                  msg.role === "user"
                    ? "bg-accent-cyan/15 text-slate-100 border border-accent-cyan/30 px-4 py-3 rounded-tr-sm"
                    : "glass-card text-foreground px-5 py-4 rounded-tl-sm w-full"
                }`}
              >
                {msg.role === "user" ? (
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-sans">
                    {msg.content}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* Context Used Badges */}
                    {msg.context_used && msg.context_used.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-white/[0.06]">
                        <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-accent-emerald" />
                          <span>Grounded Context:</span>
                        </span>
                        {msg.context_used.map((ctx, ci) => (
                          <span
                            key={ci}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent-cyan/10 border border-accent-cyan/20 text-accent-cyan"
                          >
                            {ctx}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* ChatGPT Markdown & Math Fraction Renderer */}
                    <ChatGPTMessageRenderer
                      role={msg.role}
                      content={msg.content}
                      onFollowUp={(query) => handleSendMessage(query)}
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start space-y-2">
            <div className="glass-card px-5 py-4 rounded-2xl rounded-tl-sm w-full max-w-[85%] space-y-3 animate-pulse border border-accent-cyan/20">
              <div className="flex items-center space-x-2 text-xs text-accent-cyan font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>NEXUS Copilot is evaluating order books, valuations & technicals...</span>
              </div>
              <div className="space-y-2 pt-1">
                <div className="h-2.5 bg-white/[0.06] rounded w-3/4" />
                <div className="h-2.5 bg-white/[0.06] rounded w-5/6" />
                <div className="h-2.5 bg-white/[0.06] rounded w-1/2" />
              </div>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between gap-4">
            <span>{errorMessage}</span>
            <button
              onClick={() => handleSendMessage()}
              className="shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-rose-500/15 border border-rose-500/30 text-rose-200 hover:bg-rose-500/25 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="pt-4 mt-2 border-t border-white/[0.08]">
        {/* Quick Ticker Chips */}
        <div className="flex items-center space-x-1.5 mb-2 overflow-x-auto pb-1 text-[11px] text-slate-400">
          <span className="text-[10px] text-slate-400 shrink-0 uppercase tracking-wide">
            Quick Focus:
          </span>
          {["RELIANCE", "TCS", "TATAMOTORS", "HDFCBANK", "INFY", "M&M"].map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => setActiveSymbol(sym)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                activeSymbol === sym
                  ? "bg-accent-cyan text-slate-950"
                  : "bg-surface-50 dark:bg-white/[0.04] text-slate-300 hover:text-foreground border border-white/[0.05]"
              }`}
            >
              {sym}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-end gap-2"
        >
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask the Financial Copilot anything about ${activeSymbol}, valuation math, or your portfolio... (Shift+Enter for newline)`}
              className="w-full resize-none px-4 py-3 text-xs sm:text-sm bg-surface-50 dark:bg-white/[0.03] border border-white/[0.1] rounded-xl text-foreground placeholder:text-slate-400 focus:outline-none focus:border-accent-cyan/50 focus:ring-1 focus:ring-accent-cyan/50 pr-12 transition-all font-sans"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="absolute right-2.5 bottom-3.5 p-2 rounded-lg bg-accent-cyan text-slate-950 font-bold hover:bg-accent-cyan/90 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        <p className="text-[10px] text-slate-400 text-center mt-2 font-light">
          NEXUS Financial Copilot leverages live market quotes and multi-factor models. Educational financial analysis — verify before capital allocation.
        </p>
      </div>
    </div>
  );
};
