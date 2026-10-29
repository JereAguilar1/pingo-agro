"use client";

import { useState } from "react";
import { SourceCardData } from "@/lib/types";
import { IconChevronDown, IconChevronUp, IconExternalLink } from "./Icons";

export function SourceCard({ source }: { source: SourceCardData }) {
  const [expanded, setExpanded] = useState(false);
  const passage = source.exactPassage || source.supports;

  return (
    <div
      className="group rounded-xl border text-xs transition-all duration-150 overflow-hidden"
      style={{
        borderColor: expanded ? "var(--surco-border)" : "var(--surco-border-light)",
        background: expanded ? "var(--surco-bg)" : "var(--surco-card)",
      }}
    >
      <div className="px-3 py-2 flex items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-left flex-1 flex items-center gap-2 min-w-0 cursor-pointer"
        >
          <span
            className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded tracking-tight shrink-0 transition-colors"
            style={{
              background: "var(--surco-green-tint)",
              color: "var(--surco-green)",
            }}
          >
            {source.sourceCode}
          </span>
          <span className="truncate font-medium text-[13px]" style={{ color: "var(--surco-ink)" }}>
            {source.institution}
            <span className="opacity-40 mx-1.5 font-normal">|</span>
            <span style={{ color: "var(--surco-ink-soft)" }}>{source.title}</span>
          </span>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              title="Abrir fuente externa oficial"
              className="p-1 rounded-md hover:bg-black/5 transition-colors"
              style={{ color: "var(--surco-green-soft)" }}
            >
              <IconExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="p-1 rounded-md text-[11px] hover:bg-black/5 transition-colors cursor-pointer"
            style={{ color: "var(--surco-ink-muted)" }}
          >
            {expanded ? <IconChevronUp className="w-3.5 h-3.5" /> : <IconChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && passage && (
        <div
          className="px-3.5 py-2.5 border-t text-[12px] leading-relaxed animate-fadeIn"
          style={{
            borderColor: "var(--surco-border-light)",
            background: "var(--surco-bg-alt)",
            color: "var(--surco-ink-soft)",
          }}
        >
          <div className="flex items-start gap-2">
            <span className="text-emerald-700 font-serif text-sm leading-none shrink-0 select-none">“</span>
            <p className="flex-1">{passage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
