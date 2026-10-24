"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Calculator,
  Sparkles,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";

interface ChatGPTMessageRendererProps {
  content: string;
  role: "user" | "assistant";
  onFollowUp?: (prompt: string) => void;
}

/**
 * Cleans LaTeX formatting artifacts, environments, and typography
 */
function cleanMathString(raw: string): string {
  let clean = raw
    .replace(/\\\[/g, "")
    .replace(/\\\]/g, "")
    .replace(/\$\$/g, "")
    .replace(/\\boxed\{/g, "")
    .replace(/\\displaystyle/g, "")
    .replace(/\\mathbf\{([^}]+)\}/g, "$1")
    .replace(/\\mathrm\{([^}]+)\}/g, "$1")
    .replace(/\\mathit\{([^}]+)\}/g, "$1")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\left[\[{(|.]/g, "(")
    .replace(/\\right[\]})|.]/g, ")")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\%/g, "%")
    .replace(/[\u2013\u2014]/g, "-") // normalize en-dash and em-dash
    .trim();

  // Strip dangling closing brace from \boxed{...} if unmatched
  const openBraces = (clean.match(/\{/g) || []).length;
  const closeBraces = (clean.match(/\}/g) || []).length;
  if (closeBraces > openBraces && clean.endsWith("}")) {
    clean = clean.slice(0, -1).trim();
  }
  return clean;
}

/**
 * Parses and renders mathematical fraction expressions like:
 * A / B,  \frac{A}{B},  LHS = Num / Den
 * into a beautifully styled vertical fraction with a clear divider bar.
 */
export function FractionRenderer({ raw }: { raw: string }) {
  const clean = cleanMathString(raw);

  // Check if there is an equality (LHS = RHS)
  const eqIndex = clean.indexOf("=");
  let lhs = "";
  let rhs = clean;
  if (eqIndex !== -1) {
    lhs = clean.substring(0, eqIndex).trim();
    rhs = clean.substring(eqIndex + 1).trim();
  }

  // Check for LaTeX \frac{num}{den} with optional trailing multiplier
  const fracMatch = rhs.match(/\\frac\{([^}]+)\}\{([^}]+)\}(.*)/);
  if (fracMatch) {
    const [, num, den, extra] = fracMatch;
    return (
      <span className="inline-flex items-center align-middle mx-1 font-mono text-xs">
        {lhs && <span className="font-bold text-white mr-1.5">{lhs} =</span>}
        <span className="inline-flex flex-col items-center justify-center leading-none">
          <span className="px-2 text-center text-accent-cyan font-bold border-b border-accent-cyan/60 pb-0.5">
            {num.trim()}
          </span>
          <span className="px-2 text-center text-slate-300 pt-0.5">
            {den.trim()}
          </span>
        </span>
        {extra && extra.trim() && (
          <span className="ml-1.5 text-accent-amber font-semibold">{extra.trim()}</span>
        )}
      </span>
    );
  }

  // Check for single-slash fraction "A / B" with optional trailing multiplier
  const slashMatch = rhs.match(/^([^(/\n]+|\([^)]+\))\s*\/\s*([^*/×\n]+|\([^)]+\))\s*([*×].+)?$/);
  if (slashMatch) {
    const numPart = slashMatch[1].replace(/^\((.+)\)$/, "$1").trim();
    const denPart = slashMatch[2].replace(/^\((.+)\)$/, "$1").trim();
    const extraPart = slashMatch[3]?.trim() || "";

    if (numPart.length < 80 && denPart.length < 80) {
      return (
        <span className="inline-flex items-center align-middle mx-1 font-mono text-xs">
          {lhs && <span className="font-bold text-white mr-1.5">{lhs} =</span>}
          <span className="inline-flex flex-col items-center justify-center align-middle leading-tight">
            <span className="px-2 text-center text-accent-cyan font-semibold border-b border-accent-cyan/60 pb-0.5">
              {numPart}
            </span>
            <span className="px-2 text-center text-slate-300 pt-0.5">
              {denPart}
            </span>
          </span>
          {extraPart && (
            <span className="ml-1.5 text-accent-amber font-semibold">{extraPart}</span>
          )}
        </span>
      );
    }
  }

  // Fallback for general math expression
  return (
    <span className="font-mono text-accent-cyan font-semibold">
      {lhs ? `${lhs} = ${rhs}` : clean}
    </span>
  );
}

/**
 * Renders an institutional mathematical formula card with distinct LHS,
 * vertical fraction layout, and multiplier.
 */
export function FormulaCard({ rawFormula, keyIdx }: { rawFormula: string; keyIdx: number }) {
  const clean = cleanMathString(rawFormula);

  // Split into LHS and RHS if there is an equal sign
  const eqIndex = clean.indexOf("=");
  const lhs = eqIndex !== -1 ? clean.substring(0, eqIndex).trim() : "";
  const rhs = eqIndex !== -1 ? clean.substring(eqIndex + 1).trim() : clean;

  // Check if RHS has \frac{num}{den} or A / B
  let num = "";
  let den = "";
  let trailing = "";

  const fracMatch = rhs.match(/\\frac\{([^}]+)\}\{([^}]+)\}(.*)/);
  if (fracMatch) {
    num = fracMatch[1].trim();
    den = fracMatch[2].trim();
    trailing = fracMatch[3]?.trim() || "";
  } else {
    // Check for A / B in RHS
    const slashMatch = rhs.match(/^([^(/\n]+|\([^)]+\))\s*\/\s*([^*/×\n]+|\([^)]+\))\s*([*×].+)?$/);
    if (slashMatch) {
      num = slashMatch[1].replace(/^\((.+)\)$/, "$1").trim();
      den = slashMatch[2].replace(/^\((.+)\)$/, "$1").trim();
      trailing = slashMatch[3]?.trim() || "";
    }
  }

  return (
    <div
      key={`formula-card-${keyIdx}`}
      className="my-3.5 p-4 rounded-xl bg-gradient-to-r from-accent-cyan/[0.08] to-accent-blue/[0.03] border border-accent-cyan/30 shadow-md"
    >
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-accent-cyan/15">
        <span className="text-[10px] font-bold uppercase tracking-wider text-accent-cyan flex items-center gap-1.5">
          <Calculator className="w-3.5 h-3.5 text-accent-emerald" />
          <span>Institutional Valuation Formula</span>
        </span>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent-cyan/20 text-accent-cyan font-mono font-bold tracking-wider">
          EQUATION
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 p-3.5 rounded-lg bg-black/60 border border-white/[0.08] text-xs sm:text-sm">
        {lhs && (
          <span className="font-mono font-bold text-white tracking-wide text-sm sm:text-base">
            {lhs} =
          </span>
        )}

        {num && den ? (
          <div className="inline-flex items-center gap-2">
            <div className="inline-flex flex-col items-center justify-center font-mono">
              <span className="px-3 text-center text-accent-cyan font-bold border-b-2 border-accent-cyan/60 pb-1 leading-snug">
                {num}
              </span>
              <span className="px-3 text-center text-slate-200 pt-1 leading-snug">
                {den}
              </span>
            </div>
            {trailing && (
              <span className="font-mono font-semibold text-accent-amber text-sm sm:text-base">
                {trailing}
              </span>
            )}
          </div>
        ) : (
          <FractionRenderer raw={rhs} />
        )}
      </div>
    </div>
  );
}

/**
 * Renders inline formatting: **bold**, *italic*, `code`, equations, and clean math notation
 */
function renderInline(text: string): React.ReactNode {
  // If the cell/text is entirely an equation like "ROCE = EBIT / (Total Assets – Current Liabilities)"
  const trimmed = text.trim();
  const isWholeFormula =
    /^(Alternative:\s*)?[A-Za-z0-9\s()-]{1,40}\s*=\s*.+[/\\].+/.test(trimmed) ||
    /^\\text\{.+?\}\s*=\s*.+/.test(trimmed);

  if (isWholeFormula) {
    return <FractionRenderer raw={trimmed} />;
  }

  // Clean up LaTeX inline wrappers
  const sanitized = text
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\%/g, "%")
    .replace(/\\times/g, "×")
    .replace(/[\u2013\u2014]/g, "-");

  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\$[^$]+\$|\*[^*]+\*|\\\([^)]+\\\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sanitized)) !== null) {
    if (match.index > lastIndex) {
      parts.push(sanitized.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-white/[0.08] text-accent-cyan font-mono text-[11px] border border-white/[0.06]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("$") && token.endsWith("$")) {
      parts.push(
        <span key={match.index} className="inline-block px-1.5 py-0.5 rounded bg-accent-cyan/[0.08] text-accent-cyan font-mono text-xs border border-accent-cyan/20">
          <FractionRenderer raw={token.slice(1, -1)} />
        </span>
      );
    } else if (token.startsWith("\\(") && token.endsWith("\\)")) {
      parts.push(
        <span key={match.index} className="inline-block px-1.5 py-0.5 rounded bg-accent-cyan/[0.08] text-accent-cyan font-mono text-xs border border-accent-cyan/20">
          <FractionRenderer raw={token.slice(2, -2)} />
        </span>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={match.index} className="text-slate-300 italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < sanitized.length) {
    parts.push(sanitized.substring(lastIndex));
  }

  return parts.length > 0 ? parts : sanitized;
}

export const ChatGPTMessageRenderer: React.FC<ChatGPTMessageRendererProps> = ({
  content,
  role,
  onFollowUp,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === "user") {
    return (
      <div className="ml-8 rounded-2xl bg-white/[0.06] border border-white/[0.10] p-4 text-xs text-slate-100 shadow-sm leading-relaxed">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan"></span> You
        </div>
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    );
  }

  // Pre-process multiline LaTeX and markdown tables
  let normalizedContent = content
    // Replace \[ ... \] (multi-line or single-line) with $$ ... $$
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => `\n$$\n${eq.trim()}\n$$\n`)
    // Standalone \[ on its own line
    .replace(/(^|\n)\s*\\\[\s*(\n|$)/g, "$1$$\n")
    // Standalone \] on its own line
    .replace(/(^|\n)\s*\\\]\s*(\n|$)/g, "$1$$\n")
    // \begin{equation} ... \end{equation}
    .replace(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, (_, eq) => `\n$$\n${eq.trim()}\n$$\n`)
    // Replace inline \( ... \) with $ ... $
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, eq) => `$${eq.trim()}$`);

  // Normalize markdown tables: remove empty lines between rows if the next line starts with |
  normalizedContent = normalizedContent.replace(/(\|.*?\|)\s*\n\s*\n\s*(\|)/g, "$1\n$2");
  normalizedContent = normalizedContent.replace(/(\|.*?\|)\s*\n\s*\n\s*(\|)/g, "$1\n$2");
  normalizedContent = normalizedContent.replace(/(\|.*?\|)\s*\n\s*\n\s*(\|)/g, "$1\n$2");

  const lines = normalizedContent.split("\n");
  const renderedElements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inLatexMathBlock = false;
  let latexMathBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code block ``` toggle
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        renderedElements.push(
          <div key={`code-${i}`} className="my-2.5 rounded-xl bg-black/60 border border-white/10 p-3 font-mono text-[11px] text-accent-cyan overflow-x-auto">
            <pre className="whitespace-pre-wrap">{codeBuffer.join("\n")}</pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // 2. Multiline LaTeX $$ or \[ block toggle
    if (trimmed === "$$" || trimmed === "\\[" || trimmed === "\\]") {
      if (inLatexMathBlock) {
        const fullFormula = latexMathBuffer.join(" ").trim();
        if (fullFormula) {
          renderedElements.push(<FormulaCard keyIdx={i} rawFormula={fullFormula} key={`fc-${i}`} />);
        }
        latexMathBuffer = [];
        inLatexMathBlock = false;
      } else {
        inLatexMathBlock = true;
      }
      continue;
    }
    if (inLatexMathBlock) {
      latexMathBuffer.push(line);
      continue;
    }

    // Single line $$ formula $$
    if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
      renderedElements.push(<FormulaCard keyIdx={i} rawFormula={trimmed.slice(2, -2).trim()} key={`fc-${i}`} />);
      continue;
    }

    // Single line \[ formula \]
    if (trimmed.startsWith("\\[") && trimmed.endsWith("\\]")) {
      renderedElements.push(<FormulaCard keyIdx={i} rawFormula={trimmed.slice(2, -2).trim()} key={`fc-${i}`} />);
      continue;
    }

    // Line starting with standalone equation like: ROCE = EBIT / (Total Assets – Current Liabilities)
    const isNamedFormulaLine = /^[A-Z][A-Za-z0-9\s-]{1,30}\s*=\s*.+[/\\].+/.test(trimmed);
    const isTexFormulaLine = /^\\text\{.+?\}\s*=\s*.+/.test(trimmed);
    if ((isNamedFormulaLine || isTexFormulaLine) && !trimmed.startsWith("|")) {
      renderedElements.push(<FormulaCard keyIdx={i} rawFormula={trimmed} key={`fc-${i}`} />);
      continue;
    }

    // 3. Markdown Tables: lines starting with | and ending with |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [trimmed];
      while (i + 1 < lines.length) {
        const nextTrimmed = lines[i + 1].trim();
        if (nextTrimmed.startsWith("|") && nextTrimmed.endsWith("|")) {
          i++;
          tableLines.push(nextTrimmed);
        } else if (nextTrimmed === "" && i + 2 < lines.length && lines[i + 2].trim().startsWith("|") && lines[i + 2].trim().endsWith("|")) {
          // Skip one blank line between table rows if present
          i += 2;
          tableLines.push(lines[i].trim());
        } else {
          break;
        }
      }

      if (tableLines.length >= 2) {
        // Parse header
        const rawHeaders = tableLines[0].split("|").slice(1, -1);
        const headers = rawHeaders.map((h) => h.trim());

        // Rows (skip separator row like |---|---|)
        const rowLines = tableLines.slice(1).filter((l) => !/^\|?[\s-:]+\|?$/.test(l.replace(/\|/g, "-")));
        const rows = rowLines.map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));

        renderedElements.push(
          <div key={`table-${i}`} className="my-3.5 overflow-x-auto rounded-xl border border-white/[0.08] bg-black/40 shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.10] bg-white/[0.04]">
                  {headers.map((h, hi) => (
                    <th
                      key={hi}
                      className="px-3.5 py-2.5 font-mono font-bold text-[11px] text-accent-cyan uppercase tracking-wider"
                    >
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rows.map((row, ri) => (
                  <tr key={ri} className="hover:bg-white/[0.02] transition-colors">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`px-3.5 py-2.5 text-slate-300 leading-relaxed ${
                          ci === 0 ? "font-semibold text-white" : ""
                        }`}
                      >
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 4. Horizontal dividers
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      renderedElements.push(<hr key={`hr-${i}`} className="my-3.5 border-white/[0.08]" />);
      continue;
    }

    // 5. Numbered Steps (Handles both "1. Step" and orphan number on line before text)
    const isSingleDigit = /^[1-9]$/.test(trimmed);
    if (isSingleDigit && i + 1 < lines.length && lines[i + 1].trim()) {
      const stepNum = trimmed;
      const stepText = lines[i + 1].trim();
      i++; // advance past step text
      renderedElements.push(
        <div key={`step-${i}`} className="flex items-start gap-2.5 text-xs text-slate-200 my-2 leading-relaxed pl-1">
          <span className="w-5 h-5 rounded-full bg-accent-cyan/15 text-accent-cyan font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-accent-cyan/30 shadow-sm">
            {stepNum}
          </span>
          <div className="flex-1 font-sans">{renderInline(stepText)}</div>
        </div>
      );
      continue;
    }

    const numListMatch = trimmed.match(/^(\d+)[\.\)]\s+(.*)/);
    if (numListMatch) {
      renderedElements.push(
        <div key={`num-${i}`} className="flex items-start gap-2.5 text-xs text-slate-200 my-1.5 leading-relaxed pl-1">
          <span className="w-5 h-5 rounded-full bg-white/[0.08] text-accent-cyan font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-white/10">
            {numListMatch[1]}
          </span>
          <div className="flex-1 font-sans">{renderInline(numListMatch[2])}</div>
        </div>
      );
      continue;
    }

    // 6. Markdown Headings
    if (trimmed.startsWith("#### ")) {
      renderedElements.push(
        <h4 key={`h4-${i}`} className="text-xs font-bold text-slate-200 mt-3 mb-1.5 uppercase tracking-wide">
          {renderInline(trimmed.slice(5))}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith("### ")) {
      renderedElements.push(
        <h3 key={`h3-${i}`} className="text-xs sm:text-sm font-bold text-accent-cyan mt-3.5 mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-3.5 rounded-full bg-accent-cyan" />
          <span>{renderInline(trimmed.slice(4))}</span>
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      renderedElements.push(
        <h2 key={`h2-${i}`} className="text-sm font-bold text-white mt-4 mb-2 pb-1 border-b border-white/[0.08] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
          <span>{renderInline(trimmed.slice(3))}</span>
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      renderedElements.push(
        <h1 key={`h1-${i}`} className="text-base font-bold text-white mt-4 mb-2 pb-1 border-b border-white/[0.12]">
          {renderInline(trimmed.slice(2))}
        </h1>
      );
      continue;
    }

    // 7. Bullet lists
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      renderedElements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 text-xs text-slate-200 my-1.5 leading-relaxed pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan/80 shrink-0 mt-1.5" />
          <div className="flex-1 font-sans">{renderInline(trimmed.slice(2))}</div>
        </div>
      );
      continue;
    }

    // 8. Callout boxes for Risks, Warnings, Takeaways, Disclaimers
    if (trimmed.startsWith("⚠️") || trimmed.toLowerCase().startsWith("risk:") || trimmed.toLowerCase().startsWith("warning:")) {
      renderedElements.push(
        <div key={`warn-${i}`} className="my-2.5 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/25 text-xs text-amber-200 leading-relaxed flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-sans">{renderInline(trimmed)}</div>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith("📌") || trimmed.toLowerCase().startsWith("takeaway:") || trimmed.toLowerCase().startsWith("key takeaway")) {
      renderedElements.push(
        <div key={`takeaway-${i}`} className="my-2.5 p-3 rounded-xl bg-accent-cyan/[0.06] border border-accent-cyan/25 text-xs text-slate-200 leading-relaxed flex items-start gap-2.5">
          <Lightbulb className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" />
          <div className="flex-1 font-sans">{renderInline(trimmed)}</div>
        </div>
      );
      continue;
    }

    if (trimmed.toLowerCase().startsWith("disclaimer:") || trimmed.startsWith("⚖️")) {
      renderedElements.push(
        <div key={`disc-${i}`} className="my-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[10px] text-slate-400 leading-relaxed">
          {renderInline(trimmed)}
        </div>
      );
      continue;
    }

    // 9. Standard paragraphs & empty lines
    if (!trimmed) {
      renderedElements.push(<div key={`sp-${i}`} className="h-1" />);
      continue;
    }

    renderedElements.push(
      <p key={`p-${i}`} className="text-xs text-slate-200 leading-relaxed font-sans">
        {renderInline(line)}
      </p>
    );
  }

  return (
    <div className="mr-6 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.02] border border-white/[0.08] p-4 text-xs text-slate-200 shadow-md space-y-2 relative group">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 mb-1 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-lg bg-accent-cyan/15 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
            <Sparkles className="w-3 h-3" />
          </div>
          <span className="text-[11px] font-bold text-foreground">NEXUS Financial Copilot</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
            Institutional AI
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all"
          title="Copy response"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      {/* Rendered Markdown, Table & Math Elements */}
      <div className="space-y-1.5">{renderedElements}</div>

      {/* Interactive Quick Prompts for fast follow-up */}
      {onFollowUp && (
        <div className="pt-2.5 mt-2 border-t border-white/[0.06] flex flex-wrap gap-1.5">
          <span className="text-[10px] text-slate-500 self-center mr-1">Quick follow-ups:</span>
          <button
            onClick={() => onFollowUp("Give me a real-world company example with numbers")}
            className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[10px] text-slate-300 hover:text-accent-cyan transition-all flex items-center gap-1"
          >
            <Lightbulb className="w-3 h-3 text-accent-cyan" />
            <span>Real Company Example</span>
          </button>
          <button
            onClick={() => onFollowUp("Explain this formula step-by-step with simple arithmetic")}
            className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[10px] text-slate-300 hover:text-accent-cyan transition-all flex items-center gap-1"
          >
            <Calculator className="w-3 h-3 text-accent-emerald" />
            <span>Step-by-Step Math</span>
          </button>
          <button
            onClick={() => onFollowUp("Give me a checkpoint quiz question to test my understanding")}
            className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-[10px] text-slate-300 hover:text-accent-cyan transition-all flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3 text-accent-violet" />
            <span>Quiz Me</span>
          </button>
        </div>
      )}
    </div>
  );
};
