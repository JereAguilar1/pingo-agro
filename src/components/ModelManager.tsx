"use client";

import { useEffect, useState } from "react";
import {
  initLocalLLM,
  unloadLocalLLM,
  getLocalLLMStatus,
  detectWebGPUCapability,
  LocalLLMStatus,
  ProgressCallbackData,
  DEFAULT_MODEL_ID,
  F16_MODEL_ID,
  TINY_MODEL_ID,
} from "@/lib/local-llm";

interface ModelManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: LocalLLMStatus) => void;
}

const AVAILABLE_MODELS = [
  {
    id: DEFAULT_MODEL_ID,
    name: "Llama 3.2 1B (FP32 Universal)",
    size: "~1.1 GB",
    description: "Máxima compatibilidad con cualquier GPU/teléfono con WebGPU.",
  },
  {
    id: F16_MODEL_ID,
    name: "Llama 3.2 1B (FP16 Acelerado)",
    size: "~850 MB",
    description: "Más liviano y veloz. Requiere GPU con soporte float16.",
  },
  {
    id: TINY_MODEL_ID,
    name: "TinyLlama 1.1B (Ultraliviano)",
    size: "~650 MB",
    description: "Muy bajo consumo de RAM y descarga más rápida.",
  },
];

export function ModelManager({ isOpen, onClose, onStatusChange }: ModelManagerProps) {
  const [gpuInfo, setGpuInfo] = useState<{
    checked: boolean;
    supported: boolean;
    hasF16: boolean;
    adapterName?: string;
    errorMessage?: string;
  }>({
    checked: false,
    supported: false,
    hasF16: false,
  });

  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);
  const [status, setStatus] = useState<LocalLLMStatus>("unloaded");
  const [progress, setProgress] = useState<ProgressCallbackData>({ progress: 0, text: "" });

  useEffect(() => {
    if (typeof window === "undefined" || !isOpen) return;

    void detectWebGPUCapability().then((cap) => {
      setGpuInfo({
        checked: true,
        supported: cap.supported,
        hasF16: cap.hasF16,
        adapterName: cap.adapterName,
        errorMessage: cap.errorMessage,
      });

      if (cap.supported && cap.hasF16) {
        setSelectedModel(F16_MODEL_ID);
      }
    });

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
    }, selectedModel);
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
        className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto"
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

        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">⚡</span>
          <h2 className="text-lg font-semibold" style={{ color: "var(--surco-green, #166534)" }}>
            Modelo On-Device (IA Offline)
          </h2>
        </div>

        <p className="text-xs text-stone-600 dark:text-stone-400 mb-4 leading-relaxed">
          Permite que Surco redacte explicaciones técnicas en el medio del lote sin señal de celular ni costos de API, ejecutando el modelo dentro del chip de tu propio teléfono.
        </p>

        {gpuInfo.checked && !gpuInfo.supported ? (
          <div className="space-y-3">
            <div className="rounded-xl p-3.5 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1.5">
              <p className="font-semibold">⚠️ WebGPU no está activo en este dispositivo</p>
              <p className="text-[11px] leading-relaxed">
                {gpuInfo.errorMessage || "Tu navegador o dispositivo no soporta aceleración WebGPU para ejecutar modelos de lenguaje en JavaScript."}
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                En Android/Chrome, a veces podés habilitarlo escribiendo <code className="bg-amber-200/60 dark:bg-amber-900/60 px-1 py-0.5 rounded font-mono">chrome://flags/#enable-unsafe-webgpu</code> en la barra de direcciones.
              </p>
            </div>

            <div className="rounded-xl p-3 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 text-xs text-emerald-900 dark:text-emerald-200">
              <strong className="block mb-1">✅ No te preocupes:</strong>
              Surco sigue funcionando al 100% en modo offline: los 18 escenarios agronómicos (C01 a C18), cálculos de dosis de urea y toda la biblioteca de fuentes reales se resuelven en memoria local sin necesidad de descargar este modelo.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {gpuInfo.checked && (
              <div className="text-[11px] flex flex-wrap gap-2 text-stone-500">
                <span className="bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md">
                  GPU: {gpuInfo.adapterName}
                </span>
                <span className="bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md">
                  Float16: {gpuInfo.hasF16 ? "Soportado" : "No soportado (usa FP32)"}
                </span>
              </div>
            )}

            {status !== "loading" && status !== "ready" && (
              <div>
                <label className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                  Seleccionar variante del modelo:
                </label>
                <div className="space-y-2">
                  {AVAILABLE_MODELS.map((m) => (
                    <label
                      key={m.id}
                      className={`block p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        selectedModel === m.id
                          ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20"
                          : "border-stone-200 dark:border-stone-800 hover:border-stone-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="modelChoice"
                            value={m.id}
                            checked={selectedModel === m.id}
                            onChange={() => setSelectedModel(m.id)}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="font-medium text-stone-900 dark:text-stone-100">
                            {m.name}
                          </span>
                        </div>
                        <span className="font-mono text-stone-500 text-[11px]">{m.size}</span>
                      </div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 pl-5">
                        {m.description}
                      </p>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {status === "loading" && (
              <div className="space-y-2 p-3 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-800">
                <div className="flex justify-between text-xs text-stone-700 dark:text-stone-300">
                  <span className="font-medium">Descargando pesos neuronales...</span>
                  <span className="font-mono font-semibold">{Math.round(progress.progress * 100)}%</span>
                </div>
                <div className="w-full bg-stone-200 dark:bg-stone-800 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(5, Math.round(progress.progress * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-stone-500 font-mono truncate">{progress.text}</p>
                <p className="text-[10px] text-stone-400">
                  No cierres esta pestaña hasta que finalice la descarga.
                </p>
              </div>
            )}

            {status === "ready" && (
              <div className="rounded-xl p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                    Modelo activo en memoria para uso offline
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleUnload}
                  className="text-xs text-rose-600 hover:text-rose-800 underline cursor-pointer"
                >
                  Liberar memoria
                </button>
              </div>
            )}

            {status === "unloaded" && (
              <button
                type="button"
                onClick={handleDownload}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer shadow-xs"
                style={{ background: "var(--surco-green, #166534)" }}
              >
                Comenzar descarga para uso sin señal
              </button>
            )}

            {status === "error" && (
              <div className="space-y-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl">
                <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-200 font-semibold text-xs">
                  <span>❌</span>
                  <span>No se pudo completar la carga</span>
                </div>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 font-mono break-all leading-tight">
                  {progress.text}
                </p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full py-2 px-3 rounded-lg text-xs font-semibold border border-rose-300 dark:border-rose-800 bg-white dark:bg-stone-900 text-rose-800 dark:text-rose-200 hover:bg-rose-50 cursor-pointer"
                >
                  Reintentar descarga
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-stone-200 dark:border-stone-800 flex justify-end">
          <button
            type="button"
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
