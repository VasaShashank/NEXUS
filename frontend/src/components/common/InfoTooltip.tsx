"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { HelpCircle, Target, Lightbulb } from "lucide-react";

interface InfoTooltipProps {
  title: string;
  definition: string;
  decisionImpact?: string;
  example?: string;
  children?: React.ReactNode;
  iconSize?: number;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  definition,
  decisionImpact,
  example,
  children,
  iconSize = 13,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: "top" | "bottom" }>({
    top: 0,
    left: 0,
    placement: "bottom",
  });
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 340;
    const tooltipHeight = 280; // realistic height
    const margin = 10;
    const navbarHeight = 72; // navbar height + safe buffer

    const spaceAbove = triggerRect.top - navbarHeight;
    const spaceBelow = window.innerHeight - triggerRect.bottom;

    // Prefer opening below because web apps have scrollable content below.
    // Only open above if space below is too cramped (< 260px) AND space above is plentiful (> 300px).
    let placement: "top" | "bottom" = "bottom";
    let top = 0;

    if (spaceBelow < 280 && spaceAbove >= 300) {
      placement = "top";
      top = Math.max(navbarHeight + 6, triggerRect.top - margin);
    } else {
      placement = "bottom";
      top = triggerRect.bottom + margin;
    }

    // Determine horizontal placement (centered on trigger, but clamped within viewport)
    let left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;

    // Clamp left and right boundaries with 16px padding
    const minLeft = 16;
    const maxLeft = window.innerWidth - tooltipWidth - 16;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    setCoords({ top, left, placement });
  };

  const handleMouseEnter = () => {
    calculatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  // Recalculate if window resizes or user scrolls while open
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const tooltipElement = isOpen && mounted ? (
    <div
      ref={tooltipRef}
      style={{
        position: "fixed",
        top: coords.placement === "top" ? undefined : `${coords.top}px`,
        bottom: coords.placement === "top" ? `${window.innerHeight - coords.top}px` : undefined,
        left: `${coords.left}px`,
        width: "340px",
        maxHeight: "calc(100vh - 100px)",
        zIndex: 999999,
      }}
      className="p-4 rounded-2xl bg-[#070B14]/98 backdrop-blur-2xl border border-accent-cyan/35 shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(14,165,233,0.25)] text-left animate-in fade-in zoom-in-95 duration-150 pointer-events-none space-y-3 overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.08]">
        <span className="font-display font-bold text-[13.5px] text-white tracking-wide flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan shadow-[0_0_8px_rgba(14,165,233,0.9)]" />
          {title}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/25 shrink-0">
          Technical Guide
        </span>
      </div>

      {/* Definition */}
      <div>
        <div className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider mb-1">
          What it means:
        </div>
        <p className="text-[12.5px] leading-relaxed text-slate-200 font-normal">
          {definition}
        </p>
      </div>

      {/* How it is useful in taking decisions */}
      {decisionImpact && (
        <div className="pt-2.5 border-t border-white/[0.06] space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] uppercase font-bold text-accent-cyan tracking-wider">
            <Target className="w-3.5 h-3.5 text-accent-cyan" />
            <span>Decision Use:</span>
          </div>
          <p className="text-[12.5px] leading-relaxed text-slate-300 font-medium">
            {decisionImpact}
          </p>
        </div>
      )}

      {/* Example / Benchmark */}
      {example && (
        <div className="pt-2 border-t border-white/[0.04] flex items-start gap-1.5 text-[11.5px] text-accent-emerald">
          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-accent-emerald" />
          <span className="leading-snug text-emerald-300/95">{example}</span>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex items-center group ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children ? (
        children
      ) : (
        <button
          type="button"
          aria-label={`Understand ${title} and decision impact`}
          className="text-slate-500 hover:text-accent-cyan p-0.5 rounded-full transition-colors duration-200 cursor-help inline-flex items-center justify-center focus:outline-none"
        >
          <HelpCircle style={{ width: iconSize, height: iconSize }} />
        </button>
      )}

      {/* Portal rendered to document.body so no parent overflow:hidden or z-index can clip it */}
      {mounted && typeof document !== "undefined"
        ? createPortal(tooltipElement, document.body)
        : tooltipElement}
    </div>
  );
};
