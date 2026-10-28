"use client";

import { useState } from "react";
import { PipelineTrace } from "@/lib/types";

interface Props {
  trace: PipelineTrace;
}

type StepKey = "s1" | "s2" | "s3" | "s4";

export function PipelineTraceBar({ trace }: Props) {
  const [activeStep, setActiveStep] = useState<StepKey | null>(null);

  function toggleStep(step: StepKey) {
    setActiveStep((prev) => (prev === step ? null : step));
  }

  const steps: {
    key: StepKey;
    number: string;
    label: string;
    badge: string;
    borderColor: string;
    bgColor: string;
    textColor: string;
    detailTitle: string;
    detailBody: string;
  }[] = [
    {
      key: "s1",
      number: "1",
      label: "ENTIENDE",
      badge: trace.step1Understand.usedLoteName
        ? `🔒 ${trace.step1Understand.usedLoteName.split("—")[0].trim()}`
        : trace.step1Understand.queryType === "insufficient_data"
        ? "Repregunta"
        : "Plan listo",
      borderColor: "#7c8a58",
      bgColor: "#f3f5ec",
      textColor: "#46512c",
      detailTitle: "1 · ENTIENDE (Mixto: Reglas + SLM)",
      detailBody: trace.step1Understand.planSummary,
    },
    {
      key: "s2",
      number: "2",
      label: "RESUELVE",
      badge:
        trace.step2Resolve.codeExecuted && trace.step2Resolve.ragFragmentsCount > 0
          ? `Código + ${trace.step2Resolve.ragFragmentsCount} citas`
          : trace.step2Resolve.codeExecuted
          ? "Código (sin IA)"
          : `${trace.step2Resolve.ragFragmentsCount} fichas RAG`,
      borderColor: trace.step2Resolve.codeExecuted ? "#3d7a4f" : "#c78b30",
      bgColor: trace.step2Resolve.codeExecuted ? "#edf6f0" : "#fcf6ea",
      textColor: trace.step2Resolve.codeExecuted ? "#205430" : "#8a5a10",
      detailTitle: "2 · RESUELVE (Código sin IA + Búsqueda RAG en Base Local)",
      detailBody: `${trace.step2Resolve.codeSummary || "Sin cálculo numérico."} · Fuentes leídas de la Base Local: ${
        trace.step2Resolve.ragSources.length > 0
          ? trace.step2Resolve.ragSources.join(", ")
          : "ninguna coincidente"
      }.`,
    },
    {
      key: "s3",
      number: "3",
      label: "REDACTA",
      badge:
        trace.step3Draft.engine === "local_slm"
          ? "⚡ SLM Local"
          : trace.step3Draft.engine === "cloud_llm"
          ? "IA Cloud"
          : "Plantilla fiel",
      borderColor: "#c78b30",
      bgColor: "#fcf6ea",
      textColor: "#8a5a10",
      detailTitle: "3 · REDACTA (SLM Local: usa solo lo que le dieron; no inventa números)",
      detailBody: trace.step3Draft.summary,
    },
    {
      key: "s4",
      number: "4",
      label: "VERIFICA",
      badge: trace.step4Verify.abstained ? "⛔ Se abstiene" : "✓ Aprobado",
      borderColor: "#c23b30",
      bgColor: trace.step4Verify.abstained ? "#fdecec" : "#fdf4f3",
      textColor: "#99231a",
      detailTitle: "4 · VERIFICA (¿La cita sostiene el dato? ¿Está vigente?)",
      detailBody: trace.step4Verify.verificationSummary,
    },
  ];

  const selectedDetail = steps.find((s) => s.key === activeStep);

  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((step, idx) => {
          const isSelected = activeStep === step.key;
          return (
            <div key={step.key} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => toggleStep(step.key)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                style={{
                  background: step.bgColor,
                  border: `1.5px solid ${step.borderColor}`,
                  color: step.textColor,
                  boxShadow: isSelected ? `0 0 0 2px ${step.borderColor}33` : "none",
                }}
                title="Tocá para inspeccionar esta etapa del flujo"
              >
                <span className="font-bold">
                  {step.number} · {step.label}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                  style={{
                    background: "rgba(255,255,255,0.75)",
                    color: step.textColor,
                  }}
                >
                  {step.badge}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <span className="text-[11px] select-none" style={{ color: "var(--surco-ink-muted)" }}>
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>

      {selectedDetail && (
        <div
          className="mt-2 rounded-lg px-3 py-2 text-xs transition-all"
          style={{
            background: selectedDetail.bgColor,
            border: `1px solid ${selectedDetail.borderColor}`,
            color: selectedDetail.textColor,
          }}
        >
          <div className="font-semibold mb-0.5 flex items-center justify-between">
            <span>{selectedDetail.detailTitle}</span>
            <button
              type="button"
              onClick={() => setActiveStep(null)}
              className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
          <p className="leading-relaxed opacity-95">{selectedDetail.detailBody}</p>
        </div>
      )}
    </div>
  );
}
