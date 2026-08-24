"use client";

import { useState } from "react";
import { displayLanguage, highlightCode } from "@/lib/codeBlocks";

// Renders one fenced code block in its own bordered box — separate from
// surrounding prose, monospaced, syntax-colored — the same shape Claude's
// web chat uses for code. `copyable` is turned off wherever this ends up
// nested inside another <button> (MC choice buttons): a <button> can't
// contain an interactive descendant, so the Copy control has to disappear
// there rather than double up as a nested button.
export function CodeBlock({ lang, code, copyable = true }: { lang?: string; code: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — silently no-op
    }
  }

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-amber-900/15 bg-amber-900/5 text-left">
      <div className="flex items-center justify-between border-b border-amber-900/15 bg-amber-900/10 px-3 py-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-amber-950/50">
          {displayLanguage(lang)}
        </span>
        {copyable ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void copy();
            }}
            className="rounded px-1.5 py-0.5 text-[11px] font-medium text-amber-950/50 transition hover:bg-amber-900/15 hover:text-amber-950/80"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        ) : null}
      </div>
      <pre className="overflow-x-auto px-3 py-2 text-[13px] leading-relaxed">
        <code className="font-mono">{highlightCode(code, lang)}</code>
      </pre>
    </div>
  );
}
