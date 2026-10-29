"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { MessageBubble } from "@/components/MessageBubble";
import { NetworkBadge } from "@/components/NetworkBadge";
import { ModelManager } from "@/components/ModelManager";
import { ModelStatusButton } from "@/components/ModelStatusButton";
import { ProjectsSidebar } from "@/components/ProjectsSidebar";
import { LoteHeaderCard } from "@/components/LoteHeaderCard";
import { LoteWizardModal } from "@/components/LoteWizardModal";
import {
  IconClose,
  IconMenu,
  IconPaperclip,
  IconPlus,
  IconSend,
  IconSparkles,
} from "@/components/Icons";
import {
  ChatMessage,
  ChatThread,
  FormSubmission,
  ProducerLote,
  UploadedDocument,
} from "@/lib/types";
import { resolveChatQuery } from "@/lib/offline-client";
import { LocalLLMStatus } from "@/lib/local-llm";
import {
  DEFAULT_PRODUCER_LOTES,
  getActiveLoteId,
  getSavedLotes,
  getSavedThreads,
  saveLotes,
  saveThreads,
  setActiveLoteId,
} from "@/lib/local-knowledge";

function ChatInner() {
  const searchParams = useSearchParams();
  const [lotes, setLotes] = useState<ProducerLote[]>(DEFAULT_PRODUCER_LOTES);
  const [activeLoteId, setActiveLoteState] = useState<string | null>("lote-la-loma");
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);

  const [showModelManager, setShowModelManager] = useState(false);
  const [modelStatus, setModelStatus] = useState<LocalLLMStatus>("unloaded");
  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [showLoteWizard, setShowLoteWizard] = useState(false);
  const [editingLote, setEditingLote] = useState<ProducerLote | null>(null);

  const docInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const activeLote = lotes.find((l) => l.id === activeLoteId) ?? null;

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const savedLotes = getSavedLotes();
    setLotes(savedLotes);

    const savedThreads = getSavedThreads();
    setThreads(savedThreads);

    const paramLote = searchParams.get("lote");
    const paramNewLote = searchParams.get("newLote");
    if (paramNewLote === "1") {
      setEditingLote(null);
      setShowLoteWizard(true);
    }

    let initialLoteId: string | null = getActiveLoteId();
    if (paramLote === "general") {
      initialLoteId = null;
    } else if (paramLote && savedLotes.some((l) => l.id === paramLote)) {
      initialLoteId = paramLote;
    } else if (initialLoteId === null) {
      initialLoteId = savedLotes[0]?.id ?? null;
    }

    setActiveLoteState(initialLoteId);
    setActiveLoteId(initialLoteId);

    const initialQuestion = searchParams.get("q");
    if (initialQuestion) {
      const targetLote = savedLotes.find((l) => l.id === initialLoteId) ?? null;
      void sendMessage(initialQuestion, undefined, targetLote);
    } else {
      const matchingThreads = savedThreads.filter((t) => t.loteId === initialLoteId);
      if (matchingThreads.length > 0) {
        setActiveThreadId(matchingThreads[0].id);
        setMessages(matchingThreads[0].messages);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function syncMessagesToThread(
    nextMessages: ChatMessage[],
    loteIdForThread: string | null
  ) {
    if (nextMessages.length === 0) return;
    const firstUserMsg = nextMessages.find((m) => m.role === "user");
    const threadTitle = firstUserMsg
      ? firstUserMsg.content.slice(0, 42)
      : "Consulta agronómica";

    setThreads((prev) => {
      let currentId = activeThreadId;
      let nextThreads: ChatThread[];
      if (currentId && prev.some((t) => t.id === currentId)) {
        nextThreads = prev.map((t) =>
          t.id === currentId
            ? { ...t, title: threadTitle, messages: nextMessages, updatedAt: Date.now() }
            : t
        );
      } else {
        currentId = `thread-${Date.now()}`;
        setActiveThreadId(currentId);
        const created: ChatThread = {
          id: currentId,
          title: threadTitle,
          loteId: loteIdForThread,
          messages: nextMessages,
          updatedAt: Date.now(),
        };
        nextThreads = [created, ...prev];
      }
      saveThreads(nextThreads);
      return nextThreads;
    });
  }

  function handleSelectGeneralChat(threadId?: string) {
    setActiveLoteState(null);
    setActiveLoteId(null);
    setError(null);

    if (threadId === "new" || !threadId) {
      setActiveThreadId(null);
      setMessages([]);
      return;
    }

    const found = threads.find((t) => t.id === threadId);
    if (found) {
      setActiveThreadId(found.id);
      setMessages(found.messages);
    }
  }

  function handleSelectLoteProject(loteId: string, threadId?: string) {
    setActiveLoteState(loteId);
    setActiveLoteId(loteId);
    setError(null);

    if (threadId === "new") {
      setActiveThreadId(null);
      setMessages([]);
      return;
    }

    if (threadId) {
      const found = threads.find((t) => t.id === threadId);
      if (found) {
        setActiveThreadId(found.id);
        setMessages(found.messages);
        return;
      }
    }

    const loteThreads = threads.filter((t) => t.loteId === loteId);
    if (loteThreads.length > 0) {
      setActiveThreadId(loteThreads[0].id);
      setMessages(loteThreads[0].messages);
    } else {
      setActiveThreadId(null);
      setMessages([]);
    }
  }

  function handleSaveLoteFromWizard(saved: ProducerLote) {
    setLotes((prev) => {
      const exists = prev.some((l) => l.id === saved.id);
      const next = exists
        ? prev.map((l) => (l.id === saved.id ? saved : l))
        : [saved, ...prev];
      saveLotes(next);
      return next;
    });
    setActiveLoteState(saved.id);
    setActiveLoteId(saved.id);
    setActiveThreadId(null);
    setMessages([]);
  }

  function handleDocUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : "";
      if (content.trim()) {
        const newDoc: UploadedDocument = {
          id: `doc-${Date.now()}`,
          title: file.name,
          content: content.slice(0, 15000),
          uploadedAt: new Date().toISOString().slice(0, 10),
        };
        setUploadedDocs((prev) => [...prev, newDoc]);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function sendMessage(
    question: string,
    form?: FormSubmission,
    overrideLote?: ProducerLote | null
  ) {
    const q = question.trim();
    if (!q || loading) return;

    const effectiveLote = overrideLote !== undefined ? overrideLote : activeLote;
    const effectiveLoteId = effectiveLote?.id ?? null;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: q,
      createdAt: Date.now(),
    };
    const withUser = [...messages, userMsg];
    setMessages(withUser);
    setInput("");
    setLoading(true);
    setError(null);

    const assistantId = crypto.randomUUID();
    let hasStreamed = false;

    try {
      const result = await resolveChatQuery({
        question: q,
        form,
        activeLote: effectiveLote,
        uploadedDocs,
        onToken: (partial) => {
          if (!hasStreamed) {
            hasStreamed = true;
            setMessages((prev) => [
              ...prev,
              {
                id: assistantId,
                role: "assistant",
                content: partial,
                createdAt: Date.now(),
              },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: partial } : m
              )
            );
          }
        },
      });

      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: result.response.answer,
        response: result.response,
        createdAt: Date.now(),
      };

      const finalMessages = [...withUser, assistantMsg];
      setMessages(finalMessages);
      syncMessagesToThread(finalMessages, effectiveLoteId);
    } catch {
      setError("Ocurrió un error inesperado al procesar la consulta.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  function handleFormSubmit(messageId: string, data: Record<string, string>) {
    const target = messages.find((m) => m.id === messageId);
    const form = target?.response?.clarificationForm;
    if (!form) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, formAnswered: true } : m))
    );

    const displayText = form.fields
      .map((f) => `${f.label}: ${data[f.id]?.trim() || "(sin especificar)"}`)
      .join("\n");

    void sendMessage(displayText, {
      kind: form.kind,
      data,
      round: form.round ?? 1,
      originalQuestion: form.originalQuestion,
      accumulatedData: form.accumulatedData,
    });
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen" style={{ background: "var(--surco-bg)" }}>
      {/* Barra de navegación superior compacta y limpia */}
      <header
        className="sticky top-0 z-20 border-b px-3 sm:px-6 py-2.5 flex items-center justify-between backdrop-blur-md transition-all"
        style={{
          background: "rgba(252, 251, 249, 0.88)",
          borderColor: "var(--surco-border-light)",
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setShowSidebarMobile(true)}
            className="md:hidden p-1.5 rounded-lg border text-xs font-medium cursor-pointer hover:bg-black/5"
            style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-ink)" }}
            aria-label="Abrir menú de lotes"
          >
            <IconMenu className="w-4 h-4" />
          </button>

          <Link href="/" className="font-semibold text-base sm:text-lg tracking-tight flex items-center gap-1.5" style={{ color: "var(--surco-green)" }}>
            <span>Surco</span>
          </Link>

          <span className="text-gray-300 hidden sm:inline">/</span>

          <span className="text-xs font-medium truncate max-w-[140px] sm:max-w-xs" style={{ color: "var(--surco-ink-soft)" }}>
            {activeLote ? activeLote.name : "Chat General"}
          </span>

          <NetworkBadge />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingLote(null);
              setShowLoteWizard(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium rounded-lg px-2.5 sm:px-3 py-1.5 cursor-pointer transition-all hover:opacity-90 shadow-2xs"
            style={{
              background: "var(--surco-green-tint)",
              color: "var(--surco-green)",
              border: "1px solid var(--surco-border)",
            }}
          >
            <IconPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nuevo Lote</span>
          </button>

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

      <LoteWizardModal
        key={editingLote?.id || "new-lote"}
        isOpen={showLoteWizard}
        initialLote={editingLote}
        onClose={() => setShowLoteWizard(false)}
        onSaveLote={handleSaveLoteFromWizard}
      />

      <div className="flex-1 flex min-h-0">
        {/* Sidebar elegante */}
        <ProjectsSidebar
          lotes={lotes}
          threads={threads}
          activeLoteId={activeLoteId}
          activeThreadId={activeThreadId}
          onSelectGeneralChat={handleSelectGeneralChat}
          onSelectLoteProject={handleSelectLoteProject}
          onOpenNewLoteWizard={() => {
            setEditingLote(null);
            setShowLoteWizard(true);
          }}
          isOpenMobile={showSidebarMobile}
          onCloseMobile={() => setShowSidebarMobile(false)}
        />

        {/* Espacio principal de conversación */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 w-full max-w-3xl mx-auto px-3.5 sm:px-6 py-4 sm:py-5 flex flex-col gap-3.5">
            {/* Cabecera del lote activo */}
            {activeLote && (
              <LoteHeaderCard
                lote={activeLote}
                onEditLote={() => {
                  setEditingLote(activeLote);
                  setShowLoteWizard(true);
                }}
              />
            )}

            {/* Estado vacío confortable con sugerencias útiles */}
            {messages.length === 0 && !loading && (
              <div className="my-auto py-10 text-center flex flex-col items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
                  style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
                >
                  <IconSparkles className="w-5 h-5" />
                </div>

                <h2 className="text-base sm:text-lg font-semibold tracking-tight" style={{ color: "var(--surco-ink)" }}>
                  {activeLote
                    ? `Consultas sobre ${activeLote.name}`
                    : "Consulta agronómica general"}
                </h2>

                <p className="text-xs sm:text-sm max-w-md leading-relaxed" style={{ color: "var(--surco-ink-muted)" }}>
                  {activeLote
                    ? "El asistente ya integra el polígono satelital, análisis de suelo, historial de aplicaciones y malezas registradas de este lote."
                    : "Respuestas respaldadas con fuentes oficiales de INTA, SENASA y vademécums agronómicos."}
                </p>

                {activeLote && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 max-w-xl w-full text-left">
                    {[
                      {
                        label: "Rotación y Residualidad",
                        desc: "¿Qué restricciones tengo según lo aplicado previamente?",
                      },
                      {
                        label: "Fertilización Balanceada",
                        desc: "¿Cuánta urea y fósforo aplicar según el suelo y rinde objetivo?",
                      },
                      {
                        label: "Manejo de Malezas",
                        desc: "¿Cómo controlar las malezas del lote sin repetir modo de acción?",
                      },
                      {
                        label: "Normativa Satelital",
                        desc: "¿Qué recaudos de pulverización aplican por distancia a zonas sensibles?",
                      },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => void sendMessage(item.desc)}
                        className="p-3 rounded-xl border text-left transition-all hover:border-emerald-800/30 hover:shadow-xs cursor-pointer group"
                        style={{
                          background: "var(--surco-card)",
                          borderColor: "var(--surco-border-light)",
                        }}
                      >
                        <div className="font-semibold text-xs group-hover:text-emerald-900" style={{ color: "var(--surco-ink)" }}>
                          {item.label}
                        </div>
                        <div className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--surco-ink-soft)" }}>
                          {item.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mensajes */}
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onSubmitForm={handleFormSubmit} />
            ))}

            {loading && (
              <div className="flex justify-start my-1.5">
                <div
                  className="rounded-2xl rounded-tl-sm border px-4 py-3 text-xs sm:text-sm flex items-center gap-2.5 shadow-2xs"
                  style={{
                    background: "var(--surco-card)",
                    borderColor: "var(--surco-border-light)",
                    color: "var(--surco-ink-soft)",
                  }}
                >
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                  <span>Consultando contexto y verificando fuentes…</span>
                </div>
              </div>
            )}

            {error && (
              <div
                className="rounded-xl border px-4 py-3 text-xs sm:text-sm text-red-800 bg-red-50 border-red-200"
              >
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </main>

          {/* Formulario de entrada limpio y flotante al pie */}
          <form
            onSubmit={handleSubmit}
            className="sticky bottom-0 px-3.5 sm:px-6 py-3 backdrop-blur-md"
            style={{
              background: "rgba(252, 251, 249, 0.92)",
              borderTop: "1px solid var(--surco-border-light)",
            }}
          >
            <div className="max-w-3xl mx-auto flex flex-col gap-2">
              {uploadedDocs.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  {uploadedDocs.map((d) => (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px]"
                      style={{
                        background: "var(--surco-card)",
                        borderColor: "var(--surco-border-light)",
                        color: "var(--surco-ink)",
                      }}
                    >
                      <IconPaperclip className="w-3 h-3 text-emerald-800" />
                      <span className="truncate max-w-[150px]">{d.title}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setUploadedDocs((prev) => prev.filter((item) => item.id !== d.id))
                        }
                        className="opacity-50 hover:opacity-100 cursor-pointer"
                        title="Quitar documento"
                      >
                        <IconClose className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div
                className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl border shadow-xs transition-all focus-within:border-emerald-800/40 focus-within:shadow-sm"
                style={{
                  background: "var(--surco-card)",
                  borderColor: "var(--surco-border)",
                }}
              >
                <input
                  ref={docInputRef}
                  type="file"
                  accept=".txt,.md,.csv,.json"
                  onChange={handleDocUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  className="p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-medium cursor-pointer transition-colors hover:bg-black/5 shrink-0 flex items-center gap-1.5"
                  style={{ color: "var(--surco-ink-soft)" }}
                  title="Adjuntar documento de campo (.txt, .md, .csv)"
                >
                  <IconPaperclip className="w-4 h-4 text-emerald-900" />
                  <span className="hidden sm:inline">Adjuntar</span>
                </button>

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    activeLote
                      ? `Preguntá sobre ${activeLote.name}…`
                      : "Escribí tu consulta agronómica…"
                  }
                  className="flex-1 bg-transparent px-2 py-2 outline-none text-[14px] sm:text-[15px]"
                  style={{ color: "var(--surco-ink)" }}
                />

                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="rounded-xl px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white disabled:opacity-40 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs hover:opacity-95"
                  style={{ background: "var(--surco-green)" }}
                  aria-label="Enviar mensaje"
                >
                  <span className="hidden sm:inline">Enviar</span>
                  <IconSend className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatInner />
    </Suspense>
  );
}
