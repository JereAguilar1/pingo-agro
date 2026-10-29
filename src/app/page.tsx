"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { TopNavbar } from "@/components/TopNavbar";
import { ProjectsSidebar } from "@/components/ProjectsSidebar";
import { LoteWizardModal } from "@/components/LoteWizardModal";
import { DEFAULT_PRODUCER_LOTES, getSavedLotes, getSavedThreads, saveLotes } from "@/lib/local-knowledge";
import { ChatThread, ProducerLote } from "@/lib/types";
import {
  IconChevronRight,
  IconClose,
  IconFolder,
  IconMic,
  IconPlus,
  IconSearch,
  IconSend,
} from "@/components/Icons";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

export default function Home() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [lotes, setLotes] = useState<ProducerLote[]>(DEFAULT_PRODUCER_LOTES);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showLoteWizard, setShowLoteWizard] = useState(false);

  const {
    isRecording,
    isTranscribing,
    recordingTime,
    liveTranscript,
    error: audioError,
    startRecording,
    stopAndSend,
    cancelRecording,
  } = useAudioRecorder();

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

          {audioError && (
            <div className="rounded-xl border px-3.5 py-2 text-xs text-red-800 bg-red-50 border-red-200 text-center">
              {audioError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full">
            {isRecording || isTranscribing ? (
              <div
                className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border bg-white shadow-xs transition-all"
                style={{ borderColor: "rgba(220, 38, 38, 0.4)" }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
                  </span>

                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold tabular-nums text-red-600 shrink-0">
                      {Math.floor(recordingTime / 60)}:
                      {recordingTime % 60 < 10 ? "0" : ""}
                      {recordingTime % 60}
                    </span>
                    <span
                      className="text-xs truncate italic"
                      style={{ color: "var(--surco-ink-muted)" }}
                    >
                      {isTranscribing
                        ? "Transcribiendo audio…"
                        : liveTranscript
                        ? `"${liveTranscript}"`
                        : "Grabando… hablá tu consulta"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={cancelRecording}
                    disabled={isTranscribing}
                    className="p-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                    title="Cancelar audio"
                  >
                    <IconClose className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const transcribed = await stopAndSend();
                      if (transcribed) {
                        goToChat(transcribed);
                      }
                    }}
                    disabled={isTranscribing}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 transition-opacity cursor-pointer flex items-center gap-1"
                    style={{ background: "var(--surco-green)" }}
                    title="Enviar audio y consultar"
                  >
                    <span>Enviar</span>
                    <IconSend className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 p-1.5 rounded-xl border bg-white shadow-xs transition-all"
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

                {value.trim() ? (
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 cursor-pointer flex items-center gap-1.5"
                    style={{ background: "var(--surco-green)" }}
                    aria-label="Enviar consulta"
                  >
                    <span>Enviar</span>
                    <IconSend className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void startRecording()}
                    className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 cursor-pointer flex items-center gap-1.5"
                    style={{ background: "var(--surco-green)" }}
                    aria-label="Grabar audio"
                    title="Grabar consulta por audio"
                  >
                    <IconMic className="w-3.5 h-3.5" />
                    <span>Grabar</span>
                  </button>
                )}
              </div>
            )}
          </form>

          {/* Tus lotes */}
          <section className="flex flex-col gap-3 pt-2">
            <div className="flex items-center justify-between">
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--surco-ink-muted)" }}
              >
                Tus lotes
              </span>
              <button
                type="button"
                onClick={() => setShowLoteWizard(true)}
                className="inline-flex items-center gap-1 text-xs font-medium cursor-pointer hover:underline"
                style={{ color: "var(--surco-green)" }}
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>Nuevo lote</span>
              </button>
            </div>

            {lotes.length === 0 ? (
              <div
                className="rounded-xl border p-5 text-center text-xs bg-white"
                style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-ink-muted)" }}
              >
                No tenés lotes creados aún.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {lotes.map((lote) => (
                  <button
                    key={lote.id}
                    type="button"
                    onClick={() => router.push(`/chat?lote=${encodeURIComponent(lote.id)}`)}
                    className="text-left rounded-xl border p-3 bg-white transition-all hover:border-emerald-800/30 hover:shadow-xs flex items-center justify-between gap-3 cursor-pointer group"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                        style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
                      >
                        <IconFolder className="w-4 h-4 text-emerald-800" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span
                          className="text-xs sm:text-sm font-medium truncate group-hover:text-emerald-900"
                          style={{ color: "var(--surco-ink)" }}
                        >
                          {lote.name}
                        </span>
                        <span className="text-[11px] truncate" style={{ color: "var(--surco-ink-muted)" }}>
                          {lote.hectares} ha · {lote.crop} ({lote.phenology})
                        </span>
                      </div>
                    </div>
                    <IconChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
