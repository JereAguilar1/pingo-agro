"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { MessageBubble } from "@/components/MessageBubble";
import { NetworkBadge } from "@/components/NetworkBadge";
import { ModelManager } from "@/components/ModelManager";
import { ModelStatusButton } from "@/components/ModelStatusButton";
import { ChatMessage, FormSubmission } from "@/lib/types";
import { resolveChatQuery } from "@/lib/offline-client";
import { LocalLLMStatus } from "@/lib/local-llm";

// v2: el esquema de AssistantResponse ganó `clarificationForm`; se bumpea la
// clave para que las conversaciones guardadas antes de esta función (sin
// formulario) no se muestren como si fueran la versión actual.
const STORAGE_KEY = "surco-chat-v2";

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
    // almacenamiento no disponible (modo privado, cuota excedida): se pierde el
    // historial al recargar, pero la conversación en curso sigue funcionando.
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

    void sendMessage(displayText, { kind: form.kind, data });
  }

  function handleNewChat() {
    setMessages([]);
    setError(null);
    window.localStorage.removeItem(STORAGE_KEY);
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
          <button
            onClick={handleNewChat}
            className="text-sm rounded-lg border px-3 py-1.5"
            style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
          >
            Nueva consulta
          </button>
        </div>
      </header>

      <ModelManager
        isOpen={showModelManager}
        onClose={() => setShowModelManager(false)}
        onStatusChange={setModelStatus}
      />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        {messages.length === 0 && !loading && (
          <div className="space-y-4 my-4">
            <p className="text-center text-sm" style={{ color: "var(--surco-ink-soft)" }}>
              Escribí tu primera consulta agronómica para esta sesión.
            </p>
            <div className="rounded-2xl border p-3.5 sm:p-4 bg-stone-50/80 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
              <div className="flex items-start gap-2.5">
                <span className="text-xl">⚡</span>
                <div>
                  <h3 className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                    Modo Campo: IA Local sin señal celular
                  </h3>
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
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onSubmitForm={handleFormSubmit} />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-tl-sm border px-4 py-3 text-sm animate-pulse"
              style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
            >
              Surco está revisando la biblioteca documental…
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
        className="sticky bottom-0 border-t px-4 sm:px-6 py-4"
        style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border)" }}
      >
        <div
          className="max-w-3xl mx-auto flex gap-2 p-1.5 rounded-xl border"
          style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí una consulta…"
            className="flex-1 bg-transparent px-3 py-2 outline-none text-sm"
            style={{ color: "var(--surco-ink)" }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--surco-green)" }}
          >
            Enviar
          </button>
        </div>
        <p className="text-center text-xs mt-2" style={{ color: "var(--surco-ink-soft)" }}>
          El historial se guarda solo en este navegador, para esta sesión.
        </p>
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
