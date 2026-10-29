"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { TopNavbar } from "@/components/TopNavbar";
import { ProjectsSidebar } from "@/components/ProjectsSidebar";
import { LoteWizardModal } from "@/components/LoteWizardModal";
import { DEFAULT_PRODUCER_LOTES, getSavedLotes, getSavedThreads, saveLotes } from "@/lib/local-knowledge";
import { ChatThread, ProducerLote } from "@/lib/types";
import { IconSearch, IconSend } from "@/components/Icons";

export default function Home() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [lotes, setLotes] = useState<ProducerLote[]>(DEFAULT_PRODUCER_LOTES);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showLoteWizard, setShowLoteWizard] = useState(false);

  useEffect(() => {
    setLotes(getSavedLotes());
    setThreads(getSavedThreads());
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

  function handleSaveLoteFromWizard(saved: ProducerLote) {
    const next = [saved, ...lotes.filter((l) => l.id !== saved.id)];
    setLotes(next);
    saveLotes(next);
    setShowLoteWizard(false);
    router.push(`/chat?lote=${encodeURIComponent(saved.id)}`);
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen" style={{ background: "var(--surco-bg)" }}>
      {/* Nav superior con menú a la izquierda y logo Surco a la derecha (sin 'en línea') */}
      <TopNavbar
        onToggleSidebar={() => setShowSidebar((prev) => !prev)}
      />

      {/* Drawer lateral que muestra Proyectos (Lotes) e Historial de chats al abrir el menú */}
      <ProjectsSidebar
        lotes={lotes}
        threads={threads}
        activeLoteId={null}
        activeThreadId={null}
        onSelectGeneralChat={(threadId) => {
          setShowSidebar(false);
          if (threadId && threadId !== "new") {
            router.push(`/chat?lote=general&thread=${encodeURIComponent(threadId)}`);
          } else {
            router.push("/chat?lote=general");
          }
        }}
        onSelectLoteProject={(loteId, threadId) => {
          setShowSidebar(false);
          if (threadId && threadId !== "new") {
            router.push(`/chat?lote=${encodeURIComponent(loteId)}&thread=${encodeURIComponent(threadId)}`);
          } else {
            router.push(`/chat?lote=${encodeURIComponent(loteId)}`);
          }
        }}
        onOpenNewLoteWizard={() => {
          setShowSidebar(false);
          setShowLoteWizard(true);
        }}
        isOpenMobile={showSidebar}
        onCloseMobile={() => setShowSidebar(false)}
        isCollapsedDesktop={true}
      />

      <LoteWizardModal
        isOpen={showLoteWizard}
        onClose={() => setShowLoteWizard(false)}
        onSaveLote={handleSaveLoteFromWizard}
      />

      {/* Inicio limpio y minimalista: Solamente escribir una consulta */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16 sm:py-24">
        <div className="w-full max-w-xl mx-auto flex flex-col gap-8">
          <header className="flex flex-col items-center text-center gap-2">
            <h1
              className="text-2xl sm:text-3xl font-semibold tracking-tight"
              style={{ color: "var(--surco-ink)" }}
            >
              Asistente agronómico
            </h1>
            <p className="text-xs sm:text-sm text-gray-500">
              Consultas técnicas con respaldo de INTA, SENASA y vademécums oficiales.
            </p>
          </header>

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
                  className="w-full bg-transparent py-2.5 outline-none text-sm"
                  style={{ color: "var(--surco-ink)" }}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={!value.trim()}
                className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium text-white transition-opacity disabled:opacity-40 hover:opacity-90 cursor-pointer flex items-center gap-1.5"
                style={{ background: "var(--surco-green)" }}
                aria-label="Enviar consulta"
              >
                <span>Enviar</span>
                <IconSend className="w-3 h-3" />
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
