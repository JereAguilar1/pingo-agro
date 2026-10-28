"use client";

import { useState } from "react";
import { SourceCardData } from "@/lib/types";

export function SourceCard({ source }: { source: SourceCardData }) {
  const [showPassage, setShowPassage] = useState(false);

  const pageLabel = source.page || source.section || "Sección técnica";
  const dateLabel = source.date || source.accessedOn || "2026-10";
  const passageText = source.exactPassage || source.supports;

  return (
    <div
      className="rounded-xl border text-sm transition-all"
      style={{ borderColor: "var(--surco-border)", background: "var(--surco-card)" }}
    >
      <div className="px-3.5 py-2.5 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-md font-mono"
              style={{
                background: source.verification === "verified" ? "#e4efe4" : "#f3e9d2",
                color: source.verification === "verified" ? "var(--surco-green)" : "#8a6a1f",
              }}
            >
              📄 {source.sourceCode}
            </span>
            <span
              className="text-[11px] px-2 py-0.5 rounded-md font-medium"
              style={{ background: "var(--surco-bg-alt)", color: "var(--surco-ink-soft)" }}
            >
              {pageLabel}
            </span>
            <span
              className="text-[11px] px-2 py-0.5 rounded-md"
              style={{ background: "var(--surco-bg-alt)", color: "var(--surco-ink-muted)" }}
            >
              Fecha: {dateLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowPassage((prev) => !prev)}
            className="text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors cursor-pointer"
            style={{
              borderColor: showPassage ? "var(--surco-green)" : "var(--surco-border)",
              background: showPassage ? "var(--surco-green)" : "var(--surco-bg-alt)",
              color: showPassage ? "#ffffff" : "var(--surco-green)",
            }}
          >
            {showPassage ? "Ocultar pasaje original" : "Ver pasaje original"}
          </button>
        </div>

        <p className="font-medium text-xs sm:text-sm" style={{ color: "var(--surco-ink)" }}>
          {source.institution} — {source.title}
        </p>

        {showPassage && (
          <div
            className="mt-1.5 rounded-lg p-3 text-xs flex flex-col gap-2 border"
            style={{
              background: "#faf7f0",
              borderColor: "#dfd6c3",
              color: "var(--surco-ink)",
            }}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#7a6332" }}>
              <span>Pasaje original de la Base de Conocimiento Local</span>
              <span>
                {pageLabel} · {dateLabel}
              </span>
            </div>
            <blockquote
              className="pl-3 italic leading-relaxed border-l-2"
              style={{ borderColor: "var(--surco-green)", color: "var(--surco-ink)" }}
            >
              “{passageText}”
            </blockquote>
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t" style={{ borderColor: "#ebe4d4" }}>
              <span className="text-[11px]" style={{ color: "var(--surco-ink-soft)" }}>
                <strong>Respalda en esta consulta:</strong> {source.supports}
              </span>
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-medium underline"
                  style={{ color: "var(--surco-green-soft)" }}
                >
                  Abrir fuente externa ↗
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
