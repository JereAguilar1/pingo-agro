"use client";

import { useEffect, useState } from "react";
import { getLocalLLMStatus, LocalLLMStatus } from "@/lib/local-llm";

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
        title="Modelo Llama 3.2 1B activo en memoria"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/60 cursor-pointer"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        IA Offline: Lista
      </button>
    );
  }

  if (effectiveStatus === "loading") {
    return (
      <button
        onClick={onClick}
        title="Descargando pesos del modelo..."
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700/60 cursor-pointer"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Descargando IA...
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      title="Configurar modelo de IA para uso sin señal"
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-dashed text-stone-600 dark:text-stone-400 border-stone-300 dark:border-stone-700 hover:border-stone-400 cursor-pointer"
    >
      <span>⚡</span>
      <span>IA Offline</span>
    </button>
  );
}
