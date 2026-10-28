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
    if (!q) return;
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
        <div className="w-full max-w-3xl mx-auto pt-8 sm:pt-14 pb-16">
          <header className="flex flex-col items-center text-center gap-5">
            <div className="flex items-center gap-2">
              <SurcoMark />
              <span
                className="text-2xl font-semibold tracking-tight"
                style={{ color: "var(--surco-green)" }}
              >
                Surco
              </span>
            </div>

            <span
              className="text-xs uppercase tracking-wider px-3 py-1 rounded-full border"
              style={{
                color: "var(--surco-ink-soft)",
                borderColor: "var(--surco-border)",
                background: "var(--surco-bg-alt)",
              }}
            >
              Prototipo · Agricultura extensiva de Tandil y zona
            </span>

            <div className="w-full mt-2 p-3 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-50/80 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-left">
              <div className="flex items-start gap-2.5">
                <span className="text-xl">⚡</span>
                <div>
                  <h2 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                    Modo Campo: IA Local sin señal celular
                  </h2>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                    Podés descargar el modelo Llama 3.2 1B (~850 MB) para redactar consultas 100% offline a costo $0.
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

          <h1
            className="text-3xl sm:text-4xl font-semibold leading-tight max-w-2xl"
            style={{ color: "var(--surco-ink)" }}
          >
            Información técnica agronómica, con las fuentes a la vista.
          </h1>

          <p
            className="text-base sm:text-lg max-w-xl"
            style={{ color: "var(--surco-ink-soft)" }}
          >
            Consultá en lenguaje natural. Surco distingue hechos respaldados por
            documentos, cálculos verificables e interpretaciones — y te avisa
            cuando la evidencia disponible no alcanza para concluir.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-10">
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
              placeholder="Escribí tu consulta agronómica…"
              className="flex-1 resize-none bg-transparent px-3 py-2 outline-none text-base"
              style={{ color: "var(--surco-ink)" }}
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl px-5 py-3 font-medium text-white transition-colors"
              style={{ background: "var(--surco-green)" }}
            >
              Consultar
            </button>
          </div>
        </form>

        <section
          className="mt-10 rounded-xl border px-4 py-4 text-sm flex gap-3"
          style={{
            borderColor: "var(--surco-warn-border)",
            background: "var(--surco-warn-bg)",
            color: "var(--surco-ink)",
          }}
        >
          <span aria-hidden>ℹ️</span>
          <p>
            Cada respuesta muestra de dónde sale cada dato, distingue cálculos de
            recomendaciones, y reconoce explícitamente cuándo la evidencia
            disponible no es suficiente para concluir. Es un prototipo acotado:
            la biblioteca documental es pequeña y curada para esta demo.
          </p>
        </section>
      </div>
    </main>
  </div>
  );
}

function SurcoMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
      <rect width="34" height="34" rx="9" fill="var(--surco-green)" />
      <path
        d="M9 24c3-7 7-11 16-13"
        stroke="#f2ead8"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M9 18c3-4 7-6 13-7.5"
        stroke="#9fc2a8"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
