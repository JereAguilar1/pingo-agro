"use client";

import { useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { MessageBubble } from "@/components/MessageBubble";
import { TopNavbar } from "@/components/TopNavbar";
import { ProjectsSidebar } from "@/components/ProjectsSidebar";
import { LoteDashboard } from "@/components/LoteDashboard";
import { LoteWizardModal } from "@/components/LoteWizardModal";
import {
  IconArrowLeft,
  IconClose,
  IconPaperclip,
  IconSend,
} from "@/components/Icons";
import {
  ChatMessage,
  ChatThread,
  FormSubmission,
  ProducerLote,
  UploadedDocument,
} from "@/lib/types";
import { resolveChatQuery } from "@/lib/offline-client";
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

  const [showSidebarMobile, setShowSidebarMobile] = useState(false);
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(false);
  const [showLoteWizard, setShowLoteWizard] = useState(false);
  const [editingLote, setEditingLote] = useState<ProducerLote | null>(null);
  const [showLoteDashboard, setShowLoteDashboard] = useState(true);

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
    const paramThread = searchParams.get("thread");
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
      setShowLoteDashboard(false);
      const targetLote = savedLotes.find((l) => l.id === initialLoteId) ?? null;
      void sendMessage(initialQuestion, undefined, targetLote);
    } else if (paramThread) {
      setShowLoteDashboard(false);
      const foundThread = savedThreads.find((t) => t.id === paramThread);
      if (foundThread) {
        setActiveThreadId(foundThread.id);
        setMessages(foundThread.messages);
      }
    } else if (initialLoteId) {
      // Abrir dashboard del lote por defecto cuando se selecciona un lote
      setShowLoteDashboard(true);
      setActiveThreadId(null);
      setMessages([]);
    } else {
      setShowLoteDashboard(false);
      setActiveThreadId(null);
      setMessages([]);
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
      : "Consulta";

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
    setShowLoteDashboard(false);
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
      setShowLoteDashboard(false);
      setActiveThreadId(null);
      setMessages([]);
      return;
    }

    if (threadId) {
      const found = threads.find((t) => t.id === threadId);
      if (found) {
        setShowLoteDashboard(false);
        setActiveThreadId(found.id);
        setMessages(found.messages);
        return;
      }
    }

    // Al abrir el lote sin especificar un chat, mostrar el Dashboard del lote
    setShowLoteDashboard(true);
    setActiveThreadId(null);
    setMessages([]);
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
    setShowLoteDashboard(true);
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
      {/* Barra de navegación superior idéntica y unificada */}
      <TopNavbar
        onToggleSidebar={() => {
          if (typeof window !== "undefined" && window.innerWidth < 768) {
            setShowSidebarMobile((prev) => !prev);
          } else {
            setIsCollapsedDesktop((prev) => !prev);
          }
        }}
        activeTitle={activeLote ? activeLote.name : "Chat General"}
        onEditLote={
          activeLote
            ? () => {
                setEditingLote(activeLote);
                setShowLoteWizard(true);
              }
            : undefined
        }
      />

      <LoteWizardModal
        key={editingLote?.id || "new-lote"}
        isOpen={showLoteWizard}
        initialLote={editingLote}
        onClose={() => setShowLoteWizard(false)}
        onSaveLote={handleSaveLoteFromWizard}
      />

      <div className="flex-1 flex min-h-0">
        {/* Sidebar minimalista */}
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
          isCollapsedDesktop={isCollapsedDesktop}
        />

        {/* Espacio principal: Dashboard del lote o Conversación */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeLote && showLoteDashboard ? (
            <main className="flex-1 w-full px-4 sm:px-6">
              <LoteDashboard
                lote={activeLote}
                threads={threads.filter((t) => t.loteId === activeLote.id)}
                onOpenThread={(threadId) => handleSelectLoteProject(activeLote.id, threadId)}
                onStartNewChat={() => {
                  setShowLoteDashboard(false);
                  setActiveThreadId(null);
                  setMessages([]);
                }}
              />
            </main>
          ) : (
            <>
              <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-3">
                {/* Botón sutil para volver al dashboard del lote cuando estamos en un chat del lote */}
                {activeLote && (
                  <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "var(--surco-border-light)" }}>
                    <button
                      type="button"
                      onClick={() => setShowLoteDashboard(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer hover:underline"
                      style={{ color: "var(--surco-ink-soft)" }}
                    >
                      <IconArrowLeft className="w-3.5 h-3.5" />
                      <span>Volver a {activeLote.name}</span>
                    </button>
                    <span className="text-[11px]" style={{ color: "var(--surco-ink-muted)" }}>
                      {activeLote.hectares} ha · {activeLote.crop} ({activeLote.phenology})
                    </span>
                  </div>
                )}

                {/* Estado vacío minimalista: Sin sugerencias ni recomendaciones que distraigan */}
                {messages.length === 0 && !loading && (
                  <div className="my-auto py-16 text-center flex flex-col items-center gap-1.5">
                    <h2 className="text-base sm:text-lg font-semibold tracking-tight" style={{ color: "var(--surco-ink)" }}>
                      {activeLote ? `Nuevo chat en ${activeLote.name}` : "Chat General"}
                    </h2>

                    <p className="text-xs" style={{ color: "var(--surco-ink-muted)" }}>
                      {activeLote
                        ? `${activeLote.hectares} ha · ${activeLote.crop} (${activeLote.phenology})`
                        : "Consultas técnicas respaldadas por fuentes oficiales"}
                    </p>
                  </div>
                )}

                {/* Mensajes */}
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} onSubmitForm={handleFormSubmit} />
                ))}

                {loading && (
                  <div className="flex justify-start my-1.5">
                    <div
                      className="rounded-xl border px-3.5 py-2.5 text-xs flex items-center gap-2 text-gray-500 bg-white"
                      style={{ borderColor: "var(--surco-border-light)" }}
                    >
                      <span className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                      <span>Consultando fuentes…</span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border px-3.5 py-2.5 text-xs text-red-800 bg-red-50 border-red-200">
                    {error}
                  </div>
                )}

                <div ref={bottomRef} />
              </main>

              {/* Formulario de entrada minimalista */}
              <form
                onSubmit={handleSubmit}
                className="sticky bottom-0 px-4 sm:px-6 py-3"
                style={{
                  background: "var(--surco-bg)",
                  borderTop: "1px solid var(--surco-border-light)",
                }}
              >
                <div className="max-w-2xl mx-auto flex flex-col gap-2">
                  {uploadedDocs.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      {uploadedDocs.map((d) => (
                        <span
                          key={d.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] bg-white"
                          style={{ borderColor: "var(--surco-border-light)" }}
                        >
                          <span className="truncate max-w-[150px]">{d.title}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setUploadedDocs((prev) => prev.filter((item) => item.id !== d.id))
                            }
                            className="opacity-40 hover:opacity-100 cursor-pointer"
                          >
                            <IconClose className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    className="flex items-center gap-1.5 p-1 rounded-xl border bg-white transition-all focus-within:border-emerald-800/40"
                    style={{ borderColor: "var(--surco-border)" }}
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
                      className="p-2 rounded-lg text-xs font-medium cursor-pointer transition-colors hover:bg-black/5 shrink-0"
                      style={{ color: "var(--surco-ink-soft)" }}
                      title="Adjuntar documento (.txt, .md, .csv)"
                    >
                      <IconPaperclip className="w-4 h-4 text-gray-500" />
                    </button>

                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={
                        activeLote
                          ? `Consulta sobre ${activeLote.name}…`
                          : "Escribí tu consulta…"
                      }
                      className="flex-1 bg-transparent px-2 py-2 outline-none text-sm"
                      style={{ color: "var(--surco-ink)" }}
                    />

                    <button
                      type="submit"
                      disabled={loading || !input.trim()}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 transition-opacity cursor-pointer shrink-0 flex items-center gap-1"
                      style={{ background: "var(--surco-green)" }}
                      aria-label="Enviar mensaje"
                    >
                      <IconSend className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
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
