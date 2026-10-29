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
  IconPlus,
  IconSearch,
  IconSend,
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
      {/* Barra superior minimalista */}
      <header
        className="sticky top-0 z-20 border-b px-4 sm:px-8 py-3 flex items-center justify-between"
        style={{
          background: "var(--surco-bg)",
          borderColor: "var(--surco-border-light)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <Link href="/" className="font-semibold text-lg tracking-tight" style={{ color: "var(--surco-green)" }}>
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
            className="text-xs sm:text-sm font-medium rounded-lg px-3 py-1.5 text-white transition-opacity hover:opacity-90 cursor-pointer"
            style={{ background: "var(--surco-green)" }}
          >
            Abrir chat
          </Link>
        </div>
      </header>

      <ModelManager
        isOpen={showModelManager}
        onClose={() => setShowModelManager(false)}
        onStatusChange={setModelStatus}
      />

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-20">
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-10">
          {/* Título minimalista sin marketing ni textos redundantes */}
          <header className="flex flex-col items-center text-center gap-2">
            <h1
              className="text-2xl sm:text-3xl font-semibold tracking-tight"
              style={{ color: "var(--surco-ink)" }}
            >
              Asistente agronómico
            </h1>
            <p className="text-xs sm:text-sm" style={{ color: "var(--surco-ink-muted)" }}>
              Consultas técnicas con respaldo de INTA, SENASA y vademécums oficiales.
            </p>
          </header>

          {/* Barra de Consulta sin sugerencias ni distracciones */}
          <form onSubmit={handleSubmit} className="w-full">
            <div
              className="flex items-center gap-2 p-1.5 rounded-xl border bg-white shadow-xs transition-all focus-within:border-emerald-800/40 focus-within:shadow-sm"
              style={{ borderColor: "var(--surco-border)" }}
            >
              <div className="flex items-center gap-2 flex-1 pl-2.5">
                <IconSearch className="w-4 h-4 shrink-0" style={{ color: "var(--surco-ink-muted)" }} />
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Escribí una consulta agronómica…"
                  className="w-full bg-transparent py-2 outline-none text-sm"
                  style={{ color: "var(--surco-ink)" }}
                />
              </div>

              <button
                type="submit"
                disabled={!value.trim()}
                className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium text-white transition-opacity disabled:opacity-40 hover:opacity-90 cursor-pointer flex items-center gap-1.5"
                style={{ background: "var(--surco-green)" }}
              >
                <span>Enviar</span>
                <IconSend className="w-3 h-3" />
              </button>
            </div>
          </form>

          {/* Lista limpia de Lotes */}
          <section className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: "var(--surco-ink-muted)" }}
              >
                <IconFolder className="w-3.5 h-3.5" />
                Mis Lotes
              </span>
              <Link
                href="/chat?newLote=1"
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors hover:bg-black/5"
                style={{
                  background: "var(--surco-card)",
                  borderColor: "var(--surco-border-light)",
                  color: "var(--surco-green)",
                }}
              >
                <IconPlus className="w-3 h-3" />
                <span>Nuevo lote</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {lotes.map((l) => (
                <Link
                  key={l.id}
                  href={`/chat?lote=${encodeURIComponent(l.id)}`}
                  className="rounded-xl border p-3.5 transition-all hover:border-emerald-800/30 flex items-center justify-between gap-3 group bg-white"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-xs sm:text-sm truncate group-hover:text-emerald-900" style={{ color: "var(--surco-ink)" }}>
                      {l.name}
                    </div>
                    <div className="text-[11px] mt-0.5 truncate" style={{ color: "var(--surco-ink-muted)" }}>
                      {l.hectares} ha · {l.crop} ({l.phenology})
                    </div>
                  </div>

                  <IconChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
