"use client";

import { ChatMessage } from "@/lib/types";
import { SourceCard } from "./SourceCard";

const KIND_LABEL: Record<string, string> = {
  calculation: "Cálculo verificado",
  insufficient_info: "Faltan datos",
  no_evidence: "Sin evidencia suficiente",
  grounded_answer: "Respuesta con fuentes",
  general: "Respuesta",
};

export function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] sm:max-w-[70%] rounded-2xl rounded-tr-sm px-4 py-3 text-white"
          style={{ background: "var(--surco-green)" }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  const r = message.response;

  return (
    <div className="flex justify-start">
      <div
        className="max-w-[90%] sm:max-w-[80%] rounded-2xl rounded-tl-sm border px-4 py-4 flex flex-col gap-3"
        style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
      >
        {r && (
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
              style={{ background: "var(--surco-bg-alt)", color: "var(--surco-green)" }}
            >
              {KIND_LABEL[r.kind] ?? "Respuesta"}
            </span>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full border"
              style={{
                borderColor: "var(--surco-border)",
                color: r.mode === "ai" ? "var(--surco-green-soft)" : "var(--surco-ink-soft)",
              }}
              title={
                r.mode === "ai"
                  ? "Redactado por el modelo de IA conectado, a partir de la evidencia recuperada."
                  : "Modo de demostración: respuesta determinista, sin modelo de IA conectado."
              }
            >
              {r.mode === "ai" ? "Generado con IA" : "Modo demostración"}
            </span>
          </div>
        )}

        <p className="whitespace-pre-wrap leading-relaxed" style={{ color: "var(--surco-ink)" }}>
          {message.content}
        </p>

        {r?.calculation && (
          <div
            className="rounded-lg border px-3 py-3 font-mono text-sm"
            style={{ background: "var(--surco-bg-alt)", borderColor: "var(--surco-border)" }}
          >
            <p className="font-sans font-medium mb-2" style={{ color: "var(--surco-ink)" }}>
              {r.calculation.title}
            </p>
            {r.calculation.steps.map((s) => (
              <div key={s.label} className="mb-1">
                <span className="font-sans" style={{ color: "var(--surco-ink-soft)" }}>
                  {s.label}:{" "}
                </span>
                {s.expression}
              </div>
            ))}
          </div>
        )}

        {r && r.warnings.length > 0 && (
          <div
            className="rounded-lg border px-3 py-2 text-sm flex flex-col gap-1"
            style={{ background: "var(--surco-warn-bg)", borderColor: "var(--surco-warn-border)" }}
          >
            {r.warnings.map((w, i) => (
              <p key={i} style={{ color: "#6b5414" }}>
                ⚠ {w}
              </p>
            ))}
          </div>
        )}

        {r && r.followUpQuestions && r.followUpQuestions.length > 0 && (
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium" style={{ color: "var(--surco-ink-soft)" }}>
              Para avanzar, necesito saber:
            </span>
            <ul className="list-disc pl-5" style={{ color: "var(--surco-ink)" }}>
              {r.followUpQuestions.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {r && r.sources.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            <span className="text-sm font-medium" style={{ color: "var(--surco-ink-soft)" }}>
              Fuentes ({r.sources.length})
            </span>
            {r.sources.map((s) => (
              <SourceCard key={s.sourceCode + s.title} source={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
