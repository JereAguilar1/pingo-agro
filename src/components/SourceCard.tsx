"use client";

import { useState } from "react";
import { SourceCardData } from "@/lib/types";

export function SourceCard({ source }: { source: SourceCardData }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl border text-sm"
      style={{ borderColor: "var(--surco-border)", background: "var(--surco-card)" }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3"
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{
                background: source.verification === "verified" ? "#e4efe4" : "#f3e9d2",
                color: source.verification === "verified" ? "var(--surco-green)" : "#8a6a1f",
              }}
            >
              {source.verification === "verified" ? "Fuente consultada" : "Referencia pendiente de verificar"}
            </span>
            <span className="text-xs" style={{ color: "var(--surco-ink-soft)" }}>
              {source.sourceCode}
            </span>
          </div>
          <p className="font-medium mt-1" style={{ color: "var(--surco-ink)" }}>
            {source.institution} — {source.title}
          </p>
        </div>
        <span style={{ color: "var(--surco-ink-soft)" }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div
          className="px-4 pb-4 pt-1 text-sm flex flex-col gap-1.5 border-t"
          style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
        >
          {source.section && (
            <p>
              <strong style={{ color: "var(--surco-ink)" }}>Sección:</strong> {source.section}
            </p>
          )}
          {source.date && (
            <p>
              <strong style={{ color: "var(--surco-ink)" }}>Fecha:</strong> {source.date}
            </p>
          )}
          {source.accessedOn && (
            <p>
              <strong style={{ color: "var(--surco-ink)" }}>Verificado el:</strong> {source.accessedOn}
            </p>
          )}
          <p>
            <strong style={{ color: "var(--surco-ink)" }}>Respalda:</strong> {source.supports}
          </p>
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="underline break-all"
              style={{ color: "var(--surco-green-soft)" }}
            >
              Ver documento original
            </a>
          )}
        </div>
      )}
    </div>
  );
}
