"use client";

import { useState } from "react";
import { SourceCardData } from "@/lib/types";

export function SourceCard({ source }: { source: SourceCardData }) {
  const [expanded, setExpanded] = useState(false);
  const passage = source.exactPassage || source.supports;

  return (
    <div
      className="rounded-lg border text-xs transition-colors"
      style={{ borderColor: "var(--surco-border)", background: "var(--surco-bg)" }}
    >
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-left flex-1 flex items-center gap-2 min-w-0 cursor-pointer"
        >
          <span
            className="font-mono font-semibold text-[11px] px-1.5 py-0.5 rounded shrink-0"
            style={{ background: "#e4efe4", color: "var(--surco-green)" }}
          >
            {source.sourceCode}
          </span>
          <span className="truncate font-medium" style={{ color: "var(--surco-ink)" }}>
            {source.institution} — {source.title}
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="underline text-[11px]"
              style={{ color: "var(--surco-green-soft)" }}
            >
              Fuente ↗
            </a>
          )}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="text-[11px] px-1.5 py-0.5 rounded cursor-pointer"
            style={{ color: "var(--surco-ink-soft)" }}
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {expanded && passage && (
        <div
          className="px-3 pb-2.5 pt-1.5 border-t text-xs leading-relaxed"
          style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
        >
          {passage}
        </div>
      )}
    </div>
  );
}
