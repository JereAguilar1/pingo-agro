"use client";

import { useEffect, useState } from "react";
import {
  initLocalLLM,
  unloadLocalLLM,
  getLocalLLMStatus,
  isWebGPUSupported,
  LocalLLMStatus,
  ProgressCallbackData,
  DEFAULT_MODEL_ID,
} from "@/lib/local-llm";

interface ModelManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: LocalLLMStatus) => void;
}

export function ModelManager({ isOpen, onClose, onStatusChange }: ModelManagerProps) {
  const [hasWebGPU, setHasWebGPU] = useState<boolean>(true);
  const [status, setStatus] = useState<LocalLLMStatus>("unloaded");
  const [progress, setProgress] = useState<ProgressCallbackData>({ progress: 0, text: "" });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasWebGPU(isWebGPUSupported());
    const current = getLocalLLMStatus();
    setStatus(current.status);
    setProgress(current.progress);
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleDownload() {
    setStatus("loading");
    onStatusChange?.("loading");
    const success = await initLocalLLM((p) => {
      setProgress(p);
    });
    const nextStatus = success ? "ready" : "error";
    setStatus(nextStatus);
    onStatusChange?.(nextStatus);
  }

  async function handleUnload() {
    await unloadLocalLLM();
    setStatus("unloaded");
    setProgress({ progress: 0, text: "" });
    onStatusChange?.("unloaded");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-md rounded-2xl border p-6 shadow-2xl relative"
        style={{
          background: "var(--surco-card, #ffffff)",
          borderColor: "var(--surco-border, #e5e7eb)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-sm font-semibold px-2 py-1 rounded-md text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 cursor-pointer"
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">⚡</span>
          <h2 className="text-lg font-semibold" style={{ color: "var(--surco-green, #166534)" }}>
            Modelo On-Device (IA Offline)
          </h2>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-400 mb-4 leading-relaxed">
          Permite que Surco redacte explicaciones técnicas en el campo sin señal de celular ni costos de API, procesando todo dentro del procesador de tu teléfono.
        </p>

        {!hasWebGPU ? (
          <div className="rounded-xl p-4 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
            <strong>WebGPU no detectado:</strong> Tu dispositivo o navegador no soporta aceleración WebGPU para modelos de lenguaje en el cliente. Surco seguirá operando de forma determinista offline con la biblioteca documental sin problemas.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border rounded-xl p-3 bg-stone-50/50 dark:bg-stone-900/50 border-stone-200 dark:border-stone-800 text-xs">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-stone-700 dark:text-stone-300">Modelo:</span>
                <span className="font-mono text-stone-900 dark:text-stone-100">{DEFAULT_MODEL_ID}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium text-stone-700 dark:text-stone-300">Tamaño cuantizado:</span>
                <span className="text-stone-600 dark:text-stone-400">~850 MB (descarga única)</span>
              </div>
            </div>

            {status === "loading" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-stone-600 dark:text-stone-400">
                  <span>Descargando pesos...</span>
                  <span className="font-mono">{Math.round(progress.progress * 100)}%</span>
                </div>
                <div className="w-full bg-stone-200 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(progress.progress * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-stone-500 font-mono truncate">{progress.text}</p>
              </div>
            )}

            {status === "ready" && (
              <div className="rounded-xl p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                    Llama 3.2 1B activo en memoria
                  </span>
                </div>
                <button
                  onClick={handleUnload}
                  className="text-xs text-rose-600 hover:text-rose-800 underline ml-2 cursor-pointer"
                >
                  Liberar memoria
                </button>
              </div>
            )}

            {status === "unloaded" && (
              <button
                onClick={handleDownload}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer shadow-sm"
                style={{ background: "var(--surco-green, #166534)" }}
              >
                Descargar Llama 3.2 1B para uso sin señal
              </button>
            )}

            {status === "error" && (
              <div className="space-y-2">
                <p className="text-xs text-rose-600">Error durante la carga: {progress.text}</p>
                <button
                  onClick={handleDownload}
                  className="w-full py-2 px-3 rounded-xl text-xs font-medium border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Reintentar descarga
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
