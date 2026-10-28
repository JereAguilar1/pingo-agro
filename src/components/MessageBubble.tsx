"use client";

import { ChatMessage } from "@/lib/types";
import { SourceCard } from "./SourceCard";
import { ClarificationForm } from "./ClarificationForm";
import { PipelineTraceBar } from "./PipelineTraceBar";

const KIND_LABEL: Record<string, string> = {
  calculation: "🧮 Cálculo verificado (Código sin IA)",
  insufficient_info: "⛔ Faltan datos → Repregunta",
  no_evidence: "⛔ Sin respaldo en Base Local",
  grounded_answer: "📋 Respuesta corta verificada",
  general: "📋 Respuesta",
};

interface Props {
  message: ChatMessage;
  onSubmitForm?: (messageId: string, data: Record<string, string>) => void;
}

export function MessageBubble({ message, onSubmitForm }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] sm:max-w-[70%] rounded-2xl rounded-tr-sm px-4 py-3 text-white flex flex-col gap-2"
          style={{ background: "var(--surco-green)" }}
        >
          {(message.inputModality && message.inputModality !== "chat") || message.loteName ? (
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] opacity-90">
              {message.inputModality === "voice" && (
                <span className="px-2 py-0.5 rounded-full bg-white/20 font-medium">
                  🎙️ Dictado por voz
                </span>
              )}
              {message.inputModality === "photo" && (
                <span className="px-2 py-0.5 rounded-full bg-white/20 font-medium">
                  📷 Consulta con foto
                </span>
              )}
              {message.loteName && (
                <span className="px-2 py-0.5 rounded-full bg-white/20 font-medium">
                  🔒 {message.loteName}
                </span>
              )}
            </div>
          ) : null}

          {message.photoAttachment && (
            <div className="rounded-lg bg-black/20 p-2 flex items-center gap-2.5 text-xs">
              {message.photoAttachment.dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.photoAttachment.dataUrl}
                  alt={message.photoAttachment.name}
                  className="w-12 h-12 object-cover rounded-md border border-white/30"
                />
              ) : (
                <span className="text-lg">📷</span>
              )}
              <div className="flex flex-col">
                <span className="font-medium">{message.photoAttachment.name}</span>
                {message.photoAttachment.note && (
                  <span className="text-[11px] opacity-80">{message.photoAttachment.note}</span>
                )}
              </div>
            </div>
          )}

          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  const r = message.response;
  const abstention = r?.structuredShort?.abstentionBlock;

  return (
    <div className="flex justify-start">
      <div
        className="w-full max-w-[96%] sm:max-w-[86%] rounded-2xl rounded-tl-sm border px-4 py-4 flex flex-col gap-3"
        style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
      >
        {/* Barra de traza en vivo de las 4 etapas de flujo.png */}
        {r?.pipelineTrace && <PipelineTraceBar trace={r.pipelineTrace} />}

        {/* Encabezado de 📋 RESPUESTA corta */}
        {r && (
          <div className="flex items-center justify-between gap-2 flex-wrap border-b pb-2.5" style={{ borderColor: "var(--surco-border)" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
                style={{
                  background: abstention ? "#fdecec" : "var(--surco-bg-alt)",
                  color: abstention ? "#99231a" : "var(--surco-green)",
                }}
              >
                {KIND_LABEL[r.kind] ?? "📋 Respuesta corta"}
              </span>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full border"
                style={{
                  borderColor: "var(--surco-border)",
                  color: r.mode === "ai" ? "var(--surco-green-soft)" : "var(--surco-ink-soft)",
                }}
              >
                {r.mode === "ai"
                  ? "⚡ 3 · REDACTA: SLM Local (Llama 3.2 1B)"
                  : "⚙️ Código Determinista + Tablas Curadas"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--surco-ink-muted)" }}>
              <span>📄 Fuente</span>
              <span>·</span>
              <span>🧮 Cálculo</span>
              <span>·</span>
              <span>💡 Interpretación</span>
            </div>
          </div>
        )}

        {/* Bloque Rojo de Abstención / Repregunta (Etapa 4 · VERIFICA -> "si no -> se abstiene" / "⛔ sin respaldo: necesito X") */}
        {abstention && (
          <div
            className="rounded-xl p-3.5 text-sm flex flex-col gap-1.5"
            style={{
              background: "#fdf2f2",
              border: "1.5px dashed #c23b30",
              color: "#7f1d1d",
            }}
          >
            <div className="font-bold flex items-center gap-1.5 text-xs sm:text-sm" style={{ color: "#991b1b" }}>
              <span>⛔</span>
              <span>“Sin respaldo: necesito {abstention.neededData}”</span>
            </div>
            <p className="text-xs leading-relaxed opacity-90">{abstention.reason}</p>
          </div>
        )}

        {/* Estructura de 3 pilares: 1) 📄 Fuente, 2) 🧮 Cálculo, 3) 💡 Interpretación */}
        <div className="flex flex-col gap-2.5">
          {/* 1. 📄 Fuente */}
          {r?.structuredShort?.fuenteSummary && (
            <div
              className="rounded-xl px-3.5 py-2.5 text-xs sm:text-sm border"
              style={{
                background: "var(--surco-bg)",
                borderColor: "var(--surco-border)",
                color: "var(--surco-ink)",
              }}
            >
              <span className="font-semibold mr-1.5" style={{ color: "var(--surco-green)" }}>
                📄 Fuente:
              </span>
              <span style={{ color: "var(--surco-ink-soft)" }}>{r.structuredShort.fuenteSummary}</span>
            </div>
          )}

          {/* 2. 🧮 Cálculo (CÓDIGO sin IA) */}
          {r?.calculation && (
            <div
              className="rounded-xl border px-3.5 py-3 text-xs sm:text-sm"
              style={{ background: "#edf6f0", borderColor: "#9dc4a7" }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                <span className="font-bold text-xs uppercase tracking-wide" style={{ color: "#205430" }}>
                  🧮 Cálculo Determinista — CÓDIGO (sin IA)
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/80" style={{ color: "#205430" }}>
                  0% alucinación numérica
                </span>
              </div>
              <p className="font-medium mb-2" style={{ color: "var(--surco-ink)" }}>
                {r.calculation.title}
              </p>
              <div className="font-mono text-xs flex flex-col gap-1 bg-white/75 rounded-lg p-2.5 border" style={{ borderColor: "#c5decb" }}>
                {r.calculation.steps.map((s) => (
                  <div key={s.label}>
                    <span className="font-sans font-medium" style={{ color: "var(--surco-ink-soft)" }}>
                      {s.label}:{" "}
                    </span>
                    <span style={{ color: "var(--surco-ink)" }}>{s.expression}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. 💡 Interpretación */}
          <div
            className="rounded-xl px-3.5 py-3 border"
            style={{ background: "#fcfaf5", borderColor: "var(--surco-border)" }}
          >
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#8a5a10" }}>
              💡 Interpretación y Recomendación Acotada
            </div>
            <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-[15px]" style={{ color: "var(--surco-ink)" }}>
              {message.content}
            </p>
          </div>
        </div>

        {/* Advertencias de vigencia / límites del Verificador */}
        {r && r.warnings.length > 0 && (
          <div
            className="rounded-lg border px-3 py-2 text-xs sm:text-sm flex flex-col gap-1"
            style={{ background: "var(--surco-warn-bg)", borderColor: "var(--surco-warn-border)" }}
          >
            {r.warnings.map((w, i) => (
              <p key={i} style={{ color: "#6b5414" }}>
                ⚠ <strong>Límite / Vigencia:</strong> {w}
              </p>
            ))}
          </div>
        )}

        {/* Formulario de repregunta (Circuito rojo punteado de Etapa 1 / Etapa 4 al Productor) */}
        {r?.clarificationForm ? (
          <ClarificationForm
            form={r.clarificationForm}
            disabled={message.formAnswered || !onSubmitForm}
            onSubmit={(data) => onSubmitForm?.(message.id, data)}
          />
        ) : (
          r &&
          r.followUpQuestions &&
          r.followUpQuestions.length > 0 && (
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium" style={{ color: "var(--surco-ink-soft)" }}>
                🔄 Datos solicitados al productor para destrabar la consulta:
              </span>
              <ul className="list-disc pl-5" style={{ color: "var(--surco-ink)" }}>
                {r.followUpQuestions.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )
        )}

        {/* Tarjetas de la Base de Conocimiento Local con botón "Ver pasaje original" */}
        {r && r.sources.length > 0 && (
          <div className="flex flex-col gap-2 mt-1">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--surco-ink-soft)" }}>
              🗄️ Citas de la Base de Conocimiento Local ({r.sources.length}) — Tocá “Ver pasaje original”
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
