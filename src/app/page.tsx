"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { NetworkBadge } from "@/components/NetworkBadge";
import { ModelManager } from "@/components/ModelManager";
import { ModelStatusButton } from "@/components/ModelStatusButton";
import { LocalLLMStatus } from "@/lib/local-llm";
import { DEFAULT_PRODUCER_LOTES, getSavedLotes } from "@/lib/local-knowledge";
import { ProducerLote } from "@/lib/types";
import {
  IconChevronRight,
  IconFolder,
  IconLayers,
  IconMapPin,
  IconPlus,
  IconSearch,
  IconSend,
  IconSparkles,
} from "@/components/Icons";

export default function Home() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [showModelManager, setShowModelManager] = useState(false);
  const [modelStatus, setModelStatus] = useState<LocalLLMStatus>("unloaded");
  const [lotes, setLotes] = useState<ProducerLote[]>(DEFAULT_PRODUCER_LOTES);

  useEffect(() => {
    setLotes(getSavedLotes());
  }, []);

  function goToChat(question: string) {
    const q = question.trim();
    if (!q) {
      router.push("/chat?lote=general");
      return;
    }
    router.push(`/chat?lote=general&q=${encodeURIComponent(q)}`);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    goToChat(value);
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen" style={{ background: "var(--surco-bg)" }}>
      {/* Barra superior limpia */}
      <header
        className="sticky top-0 z-20 border-b px-4 sm:px-8 py-3 flex items-center justify-between backdrop-blur-md"
        style={{
          background: "rgba(252, 251, 249, 0.88)",
          borderColor: "var(--surco-border-light)",
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold text-lg tracking-tight" style={{ color: "var(--surco-green)" }}>
            Surco
          </Link>
          <NetworkBadge />
        </div>
        <div className="flex items-center gap-2.5">
          <ModelStatusButton
            onClick={() => setShowModelManager(true)}
            statusOverride={modelStatus}
          />
          <Link
            href="/chat"
            className="text-xs sm:text-sm font-medium rounded-xl px-3.5 py-1.5 text-white transition-opacity hover:opacity-90 shadow-2xs"
            style={{ background: "var(--surco-green)" }}
          >
            Abrir Espacio de Trabajo →
          </Link>
        </div>
      </header>

      <ModelManager
        isOpen={showModelManager}
        onClose={() => setShowModelManager(false)}
        onStatusChange={setModelStatus}
      />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-10">
          {/* Hero Section */}
          <header className="flex flex-col items-center text-center gap-3.5">
            <div
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border shadow-2xs"
              style={{
                background: "var(--surco-green-tint)",
                borderColor: "var(--surco-border)",
                color: "var(--surco-green)",
              }}
            >
              <IconSparkles className="w-3.5 h-3.5" />
              <span>Lotes como Proyectos · Inteligencia Agronómica</span>
            </div>

            <h1
              className="text-2xl sm:text-4xl font-semibold tracking-tight leading-tight"
              style={{ color: "var(--surco-ink)" }}
            >
              Tus lotes agrícolas con respaldo técnico verificado.
            </h1>

            <p
              className="text-xs sm:text-sm max-w-xl leading-relaxed"
              style={{ color: "var(--surco-ink-soft)" }}
            >
              Ubicá lotes con imágenes satelitales, análisis de suelo e historial de aplicaciones previas. Respuestas deterministas y precisas basadas en INTA y SENASA.
            </p>
          </header>

          {/* Barra de Consulta General */}
          <form onSubmit={handleSubmit} className="w-full">
            <div
              className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl border shadow-sm transition-all focus-within:shadow-md focus-within:border-emerald-800/40"
              style={{
                background: "var(--surco-card)",
                borderColor: "var(--surco-border)",
              }}
            >
              <div className="flex items-center gap-2 flex-1 px-2">
                <IconSearch className="w-4 h-4 shrink-0" style={{ color: "var(--surco-ink-muted)" }} />
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Hacé una consulta técnica o seleccioná un lote abajo…"
                  className="w-full bg-transparent py-2.5 outline-none text-sm sm:text-[15px]"
                  style={{ color: "var(--surco-ink)" }}
                />
              </div>

              <button
                type="submit"
                className="shrink-0 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium text-white transition-opacity hover:opacity-90 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                style={{ background: "var(--surco-green)" }}
              >
                <span>Consultar</span>
                <IconSend className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sugerencias rápidas sin saturación */}
            <div className="flex items-center justify-center flex-wrap gap-1.5 mt-3 text-xs">
              {[
                "Dosis de urea para 10 t/ha de maíz",
                "Residualidad de atrazina en barbecho",
                "Distancia a escuela rural en Tandil",
                "Umbrales de P Bray en el Sudeste",
              ].map((query) => (
                <button
                  key={query}
                  type="button"
                  onClick={() => goToChat(query)}
                  className="px-2.5 py-1 rounded-full border transition-colors hover:border-emerald-800/30 cursor-pointer"
                  style={{
                    background: "var(--surco-card)",
                    borderColor: "var(--surco-border-light)",
                    color: "var(--surco-ink-soft)",
                  }}
                >
                  {query}
                </button>
              ))}
            </div>
          </form>

          {/* Proyectos de Lotes */}
          <section className="flex flex-col gap-3.5 pt-4">
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: "var(--surco-ink-muted)" }}
              >
                <IconFolder className="w-3.5 h-3.5" />
                Mis Lotes (Proyectos)
              </span>
              <Link
                href="/chat?newLote=1"
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all hover:bg-black/5"
                style={{
                  background: "var(--surco-card)",
                  borderColor: "var(--surco-border)",
                  color: "var(--surco-green)",
                }}
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>Nuevo Lote Satelital</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lotes.map((l) => (
                <Link
                  key={l.id}
                  href={`/chat?lote=${encodeURIComponent(l.id)}`}
                  className="rounded-2xl border p-4 transition-all hover:shadow-xs hover:border-emerald-800/30 flex flex-col justify-between gap-3 group"
                  style={{
                    background: "var(--surco-card)",
                    borderColor: "var(--surco-border-light)",
                  }}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                          style={{
                            background: "var(--surco-green-tint)",
                            color: "var(--surco-green)",
                          }}
                        >
                          <IconLayers className="w-3.5 h-3.5" />
                        </div>
                        <h2 className="font-semibold text-sm group-hover:text-emerald-900 transition-colors truncate" style={{ color: "var(--surco-ink)" }}>
                          {loteShortName(l.name)}
                        </h2>
                      </div>
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: "var(--surco-bg-alt)",
                          color: "var(--surco-ink-soft)",
                        }}
                      >
                        {l.hectares} ha
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--surco-ink-soft)" }}>
                      <IconMapPin className="w-3 h-3 text-emerald-800 shrink-0" />
                      <span className="truncate">
                        {l.locality ? `${l.locality}, ` : ""}{l.municipality} · {l.crop} ({l.phenology})
                      </span>
                    </div>

                    <div className="text-[11px] pt-1 border-t border-gray-100 flex items-center justify-between text-gray-500">
                      <span>Tosca: {l.toscaDepthCm}cm · P: {l.soilPhosphorusPpm}ppm</span>
                      {l.previousApplications && l.previousApplications.length > 0 && (
                        <span className="text-emerald-800 font-medium">
                          {l.previousApplications.length} aplicaciones
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs font-medium text-emerald-800">
                    <span>Abrir proyecto</span>
                    <IconChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Pie de página sutil */}
      <footer
        className="border-t py-4 text-center text-xs"
        style={{
          borderColor: "var(--surco-border-light)",
          color: "var(--surco-ink-muted)",
        }}
      >
        Surco · Asistente agronómico para ingenieros y productores · Red de fuentes oficiales
      </footer>
    </div>
  );
}

function loteShortName(fullName: string): string {
  const parts = fullName.split("—");
  return parts.length > 1 ? parts[1].trim() : fullName;
}
