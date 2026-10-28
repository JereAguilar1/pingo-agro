"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { NetworkBadge } from "@/components/NetworkBadge";
import { ModelManager } from "@/components/ModelManager";
import { ModelStatusButton } from "@/components/ModelStatusButton";
import { LocalLLMStatus } from "@/lib/local-llm";

export default function Home() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [showModelManager, setShowModelManager] = useState(false);
  const [modelStatus, setModelStatus] = useState<LocalLLMStatus>("unloaded");

  function goToChat(question: string) {
    const q = question.trim();
    if (!q) {
      router.push("/chat");
      return;
    }
    router.push(`/chat?q=${encodeURIComponent(q)}`);
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
          <Link href="/" className="font-semibold text-lg flex items-center gap-1.5" style={{ color: "var(--surco-green)" }}>
            <span>🌽 Surco</span>
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
            className="text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-1.5 text-white"
            style={{ background: "var(--surco-green)" }}
          >
            Abrir Asistente →
          </Link>
        </div>
      </header>

      <ModelManager
        isOpen={showModelManager}
        onClose={() => setShowModelManager(false)}
        onStatusChange={setModelStatus}
      />

      <main
        className="flex-1 flex flex-col items-center px-4 sm:px-6"
        style={{ background: "var(--surco-bg)" }}
      >
        <div className="w-full max-w-4xl mx-auto pt-8 sm:pt-12 pb-16">
          <header className="flex flex-col items-center text-center gap-4">
            <span
              className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border"
              style={{
                color: "var(--surco-green)",
                borderColor: "var(--surco-border)",
                background: "#e4efe4",
              }}
            >
              📱 Dispositivo — Funciona sin conexión · Tandil y Sudeste Bonaerense
            </span>

            <h1
              className="text-3xl sm:text-4xl font-bold leading-tight max-w-2xl"
              style={{ color: "var(--surco-ink)" }}
            >
              Asistente experto en maíz · versión simple
            </h1>

            <p
              className="text-base sm:text-lg max-w-2xl font-medium"
              style={{ color: "var(--surco-ink-soft)" }}
            >
              El código decide y calcula; el modelo solo redacta; un verificador revisa antes de mostrar.
            </p>

            {/* Tarjeta de configuración de SLM Local */}
            <div className="w-full mt-1 p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-50/80 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-left">
              <div className="flex items-start gap-2.5">
                <span className="text-xl">⚡</span>
                <div>
                  <h2 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                    Etapa 3 · REDACTA con SLM Local On-Device (Llama 3.2 1B)
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                    Descargá el modelo en tu dispositivo para redactar respuestas 100% offline a costo $0, sin inventar números.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModelManager(true)}
                className="shrink-0 w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer shadow-xs text-center"
                style={{ background: "var(--surco-green)" }}
              >
                Configurar IA Offline
              </button>
            </div>
          </header>

          {/* Barra de consulta principal */}
          <form onSubmit={handleSubmit} className="mt-7">
            <div
              className="flex flex-col sm:flex-row gap-3 p-2 rounded-2xl border shadow-sm"
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
                placeholder="Consultá por chat, voz o foto sobre tu lote de maíz (ej. fertilización N/P, densidad por tosca, cogollero, cosecha)…"
                className="flex-1 resize-none bg-transparent px-3 py-2 outline-none text-base"
                style={{ color: "var(--surco-ink)" }}
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl px-5 py-3 font-semibold text-white transition-colors cursor-pointer"
                style={{ background: "var(--surco-green)" }}
              >
                Consultar en Flujo →
              </button>
            </div>
          </form>

          {/* Diagrama visual del flujo implementado */}
          <section
            className="mt-8 rounded-2xl border p-4 flex flex-col gap-3"
            style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--surco-ink-soft)" }}>
                Arquitectura de Trabajo Implementada (/public/flujo.png)
              </span>
              <Link href="/chat" className="text-xs font-semibold underline" style={{ color: "var(--surco-green)" }}>
                Probar las 4 etapas en vivo →
              </Link>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/flujo.png"
              alt="Flujo del Asistente Experto en Maíz"
              className="w-full rounded-xl border"
              style={{ borderColor: "var(--surco-border)" }}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
