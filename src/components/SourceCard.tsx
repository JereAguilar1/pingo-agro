"use client";

import { useState } from "react";
import { SourceCardData } from "@/lib/types";
import { IconChevronDown, IconChevronUp, IconExternalLink } from "./Icons";

export function SourceCard({ source }: { source: SourceCardData }) {
  const [expanded, setExpanded] = useState(false);
  const passage = source.exactPassage || source.supports;

  return (
    <div
      className="rounded-lg border text-xs transition-colors overflow-hidden"
      style={{
        borderColor: "var(--surco-border-light)",
        background: expanded ? "var(--surco-bg)" : "#ffffff",
      }}
    >
      <div className="px-2.5 py-1.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="text-left flex-1 flex items-center gap-1.5 min-w-0 cursor-pointer"
        >
          <span
            className="font-mono text-[10px] font-semibold px-1 py-0.5 rounded shrink-0"
            style={{
              background: "var(--surco-green-tint)",
              color: "var(--surco-green)",
            }}
          >
            {source.sourceCode}
          </span>
          <span className="truncate text-[12px]" style={{ color: "var(--surco-ink)" }}>
            {source.institution}
            <span className="opacity-40 mx-1">·</span>
            <span style={{ color: "var(--surco-ink-muted)" }}>{source.title}</span>
          </span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              title="Abrir enlace"
              className="p-1 rounded text-gray-400 hover:text-gray-700"
            >
              <IconExternalLink className="w-3 h-3" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="p-1 rounded text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            {expanded ? <IconChevronUp className="w-3 h-3" /> : <IconChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {expanded && passage && (
        <div
          className="px-3 py-2 border-t text-[11px] leading-relaxed text-gray-600"
          style={{
            borderColor: "var(--surco-border-light)",
            background: "var(--surco-bg-alt)",
          }}
        >
          {passage}
        </div>
      )}
    </div>
  );
}
