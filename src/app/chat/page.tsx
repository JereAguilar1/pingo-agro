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
      <header
        className="sticky top-0 z-20 border-b px-4 sm:px-6 py-3 flex items-center justify-between"
        style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowSidebarMobile(true)}
            className="md:hidden px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer"
            style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
          >
            ☰ Lotes y Chats
          </button>
          <Link href="/" className="font-semibold text-lg" style={{ color: "var(--surco-green)" }}>
            Surco
          </Link>
          <NetworkBadge />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingLote(null);
              setShowLoteWizard(true);
            }}
            className="text-xs font-semibold rounded-lg border px-3 py-1.5 cursor-pointer"
            style={{
              background: "#e4efe4",
              borderColor: "var(--surco-green)",
              color: "var(--surco-green)",
            }}
          >
            + Crear Lote Satelital
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
        {/* Sidebar de Proyectos de Lotes + Chats Generales */}
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

        {/* Área Principal de Trabajo (Lote o Chat General) */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-5 flex flex-col gap-4">
            {/* Si está dentro de un Proyecto de Lote, muestra su cabecera satelital/técnica */}
            {activeLote && (
              <LoteHeaderCard
                lote={activeLote}
                onEditLote={() => {
                  setEditingLote(activeLote);
                  setShowLoteWizard(true);
                }}
              />
            )}

            {messages.length === 0 && !loading && (
              <div className="my-auto py-8 text-center flex flex-col items-center gap-3">
                <h2 className="text-lg sm:text-xl font-semibold" style={{ color: "var(--surco-ink)" }}>
                  {activeLote
                    ? `Consultá sobre ${activeLote.name}`
                    : "Chat General (basado en fuentes verificadas)"}
                </h2>
                <p className="text-xs sm:text-sm max-w-md" style={{ color: "var(--surco-ink-soft)" }}>
                  {activeLote
                    ? "Este chat ya tiene como contexto la ubicación satelital del lote, su análisis de suelo, las aplicaciones previas y las malezas registradas."
                    : "Hacé consultas agronómicas generales fuera de un lote específico, respaldadas en la biblioteca documental y búsqueda oficial."}
                </p>

                {activeLote && (
                  <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-xl">
                    {[
                      "¿Qué restricciones de rotación tengo según lo que se le echó previamente al lote?",
                      "¿Cuánta urea y fósforo necesito aplicar en este lote?",
                      "¿Cómo manejo las malezas registradas en el lote sin repetir modo de acción?",
                      "¿Qué normativa y recaudos aplican para pulverizar según la ubicación satelital de este lote?",
                    ].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => void sendMessage(q)}
                        className="text-xs px-3 py-1.5 rounded-full border cursor-pointer hover:opacity-80"
                        style={{
                          background: "var(--surco-card)",
                          borderColor: "var(--surco-border)",
                          color: "var(--surco-ink)",
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} onSubmitForm={handleFormSubmit} />
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl rounded-tl-sm border px-4 py-3 text-sm animate-pulse"
                  style={{
                    background: "var(--surco-card)",
                    borderColor: "var(--surco-border)",
                    color: "var(--surco-ink-soft)",
                  }}
                >
                  Consultando contexto y verificando fuentes…
                </div>
              </div>
            )}

            {error && (
              <div
                className="rounded-xl border px-4 py-3 text-sm"
                style={{ background: "#fbeaea", borderColor: "#e8b4b4", color: "#7a2222" }}
              >
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </main>

          <form
            onSubmit={handleSubmit}
            className="sticky bottom-0 border-t px-4 sm:px-6 py-3.5"
            style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border)" }}
          >
            <div className="max-w-3xl mx-auto flex flex-col gap-2">
              {uploadedDocs.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  {uploadedDocs.map((d) => (
                    <span
                      key={d.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border"
                      style={{
                        background: "var(--surco-card)",
                        borderColor: "var(--surco-border)",
                        color: "var(--surco-ink)",
                      }}
                    >
                      <span>📄 {d.title}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setUploadedDocs((prev) => prev.filter((item) => item.id !== d.id))
                        }
                        className="opacity-60 hover:opacity-100 cursor-pointer"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div
                className="flex items-center gap-2 p-1.5 rounded-xl border"
                style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
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
                  className="px-2.5 py-2 rounded-lg text-xs font-medium border cursor-pointer shrink-0"
                  style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
                  title="Cargar documento propio (.txt, .md, .csv)"
                >
                  📎 Documento
                </button>

                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    activeLote
                      ? `Preguntá sobre ${activeLote.name}…`
                      : "Escribí una consulta general…"
                  }
                  className="flex-1 bg-transparent px-2 py-2 outline-none text-sm"
                  style={{ color: "var(--surco-ink)" }}
                />

                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 cursor-pointer shrink-0"
                  style={{ background: "var(--surco-green)" }}
                >
                  Enviar
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
