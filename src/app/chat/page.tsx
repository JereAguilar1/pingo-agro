"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { MessageBubble } from "@/components/MessageBubble";
import { NetworkBadge } from "@/components/NetworkBadge";
import { ModelManager } from "@/components/ModelManager";
import { ModelStatusButton } from "@/components/ModelStatusButton";
import { ChatMessage, FormSubmission, UploadedDocument } from "@/lib/types";
import { resolveChatQuery } from "@/lib/offline-client";
import { LocalLLMStatus } from "@/lib/local-llm";

const STORAGE_KEY = "surco-chat-v4";

function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // ignore storage quota errors
  }
}

function ChatInner() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModelManager, setShowModelManager] = useState(false);
  const [modelStatus, setModelStatus] = useState<LocalLLMStatus>("unloaded");
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);

  const docInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const existing = loadMessages();
    setMessages(existing);
    const initialQuestion = searchParams.get("q");
    if (initialQuestion && existing.length === 0) {
      void sendMessage(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveMessages(messages);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  async function sendMessage(question: string, form?: FormSubmission) {
    const q = question.trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: q,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);

    const assistantId = crypto.randomUUID();
    let hasStreamed = false;

    try {
      const result = await resolveChatQuery({
        question: q,
        form,
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

      setMessages((prev) => {
        const exists = prev.some((m) => m.id === assistantId);
        if (exists) {
          return prev.map((m) => (m.id === assistantId ? assistantMsg : m));
        }
        return [...prev, assistantMsg];
      });
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

  function handleNewChat() {
    setMessages([]);
    setError(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen" style={{ background: "var(--surco-bg)" }}>
      <header
        className="sticky top-0 z-20 border-b px-4 sm:px-6 py-3 flex items-center justify-between"
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
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleNewChat}
              className="text-xs sm:text-sm rounded-lg border px-3 py-1.5 cursor-pointer"
              style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
            >
              Nueva consulta
            </button>
          )}
        </div>
      </header>

      <ModelManager
        isOpen={showModelManager}
        onClose={() => setShowModelManager(false)}
        onStatusChange={setModelStatus}
      />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        {messages.length === 0 && !loading && (
          <div className="my-auto py-12 text-center flex flex-col items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: "var(--surco-ink)" }}>
              ¿Qué consulta agronómica querés resolver?
            </h2>
            <p className="text-sm max-w-md" style={{ color: "var(--surco-ink-soft)" }}>
              Escribí tu pregunta o adjuntá un documento técnico. Si falta algún dato de contexto, te lo pediré paso a paso antes de responder con la fuente verificada.
            </p>
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
              Consultando fuentes y verificando respuesta…
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
                  style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
                >
                  <span>📄 {d.title}</span>
                  <button
                    type="button"
                    onClick={() => setUploadedDocs((prev) => prev.filter((item) => item.id !== d.id))}
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
              title="Cargar documento propio (.txt, .md, .csv) para consultar"
            >
              📎 Documento
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribí tu consulta…"
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
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatInner />
    </Suspense>
  );
}
