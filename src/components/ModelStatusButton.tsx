"use client";

import { useEffect, useState } from "react";
import { getLocalLLMStatus, LocalLLMStatus } from "@/lib/local-llm";
import { IconSparkles } from "./Icons";

interface ModelStatusButtonProps {
  onClick: () => void;
  statusOverride?: LocalLLMStatus;
}

export function ModelStatusButton({ onClick, statusOverride }: ModelStatusButtonProps) {
  const [status, setStatus] = useState<LocalLLMStatus>("unloaded");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const current = getLocalLLMStatus();
    setStatus(current.status);
  }, []);

  const effectiveStatus = statusOverride ?? status;

  if (effectiveStatus === "ready") {
    return (
      <button
        onClick={onClick}
        title="Modelo SLM activo en memoria del dispositivo"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-emerald-50 text-emerald-800 border-emerald-200 cursor-pointer shadow-2xs"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
        <span>SLM Listo</span>
      </button>
    );
  }

  if (effectiveStatus === "loading") {
    return (
      <button
        onClick={onClick}
        title="Descargando pesos del modelo..."
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-blue-50 text-blue-800 border-blue-200 cursor-pointer shadow-2xs"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
        <span>Descargando...</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      title="Configurar modelo SLM offline"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors hover:bg-black/5 cursor-pointer"
      style={{
        borderColor: "var(--surco-border-light)",
        color: "var(--surco-ink-soft)",
        background: "var(--surco-card)",
      }}
    >
      <IconSparkles className="w-3.5 h-3.5 text-emerald-800" />
      <span className="hidden sm:inline">IA Offline</span>
    </button>
  );
}
