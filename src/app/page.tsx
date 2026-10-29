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
      <header
        className="sticky top-0 z-10 border-b px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <Link href="/" className="font-semibold text-lg" style={{ color: "var(--surco-green)" }}>
            Surco
          </Link>
          <NetworkBadge />
        </div>
        <div className="flex items-center gap-2">
          <ModelStatusButton
            onClick={() => setShowModelManager(true)}
            statusOverride={modelStatus}
          />
          <Link
            href="/chat"
            className="text-xs sm:text-sm font-medium rounded-xl px-3.5 py-1.5 text-white"
            style={{ background: "var(--surco-green)" }}
          >
            Abrir Mis Lotes →
          </Link>
        </div>
      </header>

      <ModelManager
        isOpen={showModelManager}
        onClose={() => setShowModelManager(false)}
        onStatusChange={setModelStatus}
      />

      <main
        className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6"
        style={{ background: "var(--surco-bg)" }}
      >
        <div className="w-full max-w-3xl mx-auto py-10 flex flex-col gap-8">
          <header className="flex flex-col items-center text-center gap-3">
            <h1
              className="text-3xl sm:text-4xl font-semibold leading-tight"
              style={{ color: "var(--surco-ink)" }}
            >
              Tus lotes como proyectos, con respaldo técnico verificado.
            </h1>

            <p
              className="text-sm sm:text-base max-w-xl"
              style={{ color: "var(--surco-ink-soft)" }}
            >
              Creá proyectos por lote ubicándolos con imágenes satelitales, análisis de suelo y el historial de lo que se aplicó previamente, o abrí un chat general con fuentes confiables.
            </p>
          </header>

          {/* Barra de Consulta General */}
          <form onSubmit={handleSubmit}>
            <div
              className="flex flex-col sm:flex-row gap-2.5 p-2 rounded-2xl border shadow-2xs"
              style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
            >
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    goToChat(value);
                  }
                }}
                rows={2}
                placeholder="Hacé una consulta general o seleccioná uno de tus lotes abajo…"
                className="flex-1 resize-none bg-transparent px-3 py-2 outline-none text-base"
                style={{ color: "var(--surco-ink)" }}
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl px-5 py-3 font-medium text-white transition-colors cursor-pointer"
                style={{ background: "var(--surco-green)" }}
              >
                Chat General
              </button>
            </div>
          </form>

          {/* Proyectos de Lotes (Estilo Claude Projects) */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--surco-ink-soft)" }}
              >
                🌾 Mis Lotes (Proyectos con Contexto Satelital e Historial)
              </span>
              <Link
                href="/chat?newLote=1"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border"
                style={{
                  background: "#e4efe4",
                  borderColor: "var(--surco-green)",
                  color: "var(--surco-green)",
                }}
              >
                + Crear Nuevo Lote Satelital
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lotes.map((l) => (
                <Link
                  key={l.id}
                  href={`/chat?lote=${encodeURIComponent(l.id)}`}
                  className="rounded-2xl border p-4 transition-all hover:shadow-xs flex flex-col gap-2"
                  style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate" style={{ color: "var(--surco-ink)" }}>
                      🌾 {l.name}
                    </span>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: "var(--surco-bg-alt)", color: "var(--surco-green)" }}
                    >
                      {l.hectares} ha · {l.crop}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--surco-ink-soft)" }}>
                    📍 {l.locality ? `${l.locality}, ` : ""}
                    {l.municipality} · Tosca {l.toscaDepthCm}cm · N {l.soilNitrateKgHa}kg/ha
                  </div>
                  {l.previousApplications && l.previousApplications.length > 0 && (
                    <div className="text-[11px] truncate" style={{ color: "var(--surco-ink-muted)" }}>
                      🚜 Aplicado: {l.previousApplications.map((a) => a.productName).join(", ")}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
