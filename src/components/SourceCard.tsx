"use client";

import { useState } from "react";
import { SourceCardData } from "@/lib/types";
import { IconChevronDown, IconChevronUp, IconExternalLink } from "./Icons";

export function SourceCard({ source }: { source: SourceCardData }) {
  const [expanded, setExpanded] = useState(false);
  const passage = source.exactPassage || source.supports;

  return (
    <div
      className="rounded-xl border transition-colors overflow-hidden"
      style={{
        borderColor: "var(--surco-border-light)",
        background: expanded ? "var(--surco-bg)" : "#ffffff",
      }}
    >
      <div className="pl-3 pr-1.5 py-1 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-left flex-1 flex items-center gap-2 min-w-0 cursor-pointer py-1.5"
        >
          <span
            className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded shrink-0"
            style={{
              background: "var(--surco-green-tint)",
              color: "var(--surco-green)",
            }}
          >
            {source.sourceCode}
          </span>
          <span className="truncate text-[13px]" style={{ color: "var(--surco-ink)" }}>
            {source.institution}
            <span className="opacity-40 mx-1">·</span>
            <span style={{ color: "var(--surco-ink-muted)" }}>{source.title}</span>
          </span>
        </button>

        <div className="flex items-center gap-0.5 shrink-0">
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              title="Abrir enlace"
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5"
              style={{ color: "var(--surco-ink-muted)" }}
            >
              <IconExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors hover:bg-black/5"
            style={{ color: "var(--surco-ink-muted)" }}
          >
            {expanded ? <IconChevronUp className="w-3.5 h-3.5" /> : <IconChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {expanded && passage && (
        <div
          className="px-3.5 py-2.5 border-t text-xs leading-relaxed"
          style={{
            borderColor: "var(--surco-border-light)",
            background: "var(--surco-bg-alt)",
            color: "var(--surco-ink-soft)",
          }}
        >
          {passage}
        </div>
      )}
    </div>
  );
}
