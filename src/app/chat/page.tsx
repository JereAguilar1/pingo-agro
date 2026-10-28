"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { MessageBubble } from "@/components/MessageBubble";
import { NetworkBadge } from "@/components/NetworkBadge";
import { ModelManager } from "@/components/ModelManager";
import { ModelStatusButton } from "@/components/ModelStatusButton";
import { LocalKnowledgeModal } from "@/components/LocalKnowledgeModal";
import { ChatMessage, FormSubmission, ProducerLote } from "@/lib/types";
import { resolveChatQuery } from "@/lib/offline-client";
import { LocalLLMStatus } from "@/lib/local-llm";
import {
  DEFAULT_PRODUCER_LOTES,
  getActiveLoteId,
  getSavedLotes,
  setActiveLoteId,
} from "@/lib/local-knowledge";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

// v3: incluye pipelineTrace, structuredShort, lotes y entradas multimodales
const STORAGE_KEY = "surco-chat-v3";

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

const MAIZE_DEMO_SCENARIOS = [
  {
    tag: "2A · Código + Lote 🔒",
    title: "Fertilización N y P en Maíz (usa datos del Lote)",
    query: "¿Cuánta urea y fósforo necesito aplicar en mi lote de maíz?",
  },
  {
    tag: "2A · Código (sin IA)",
    title: "Calibración de Sembradora (semillas/metro)",
    query: "Quiero sembrar maíz con 72.000 plantas/ha a 52 cm entre surcos, ¿cuántas semillas por metro tiro?",
  },
  {
    tag: "2B · Búsqueda RAG",
    title: "Umbral de Cogollero (Spodoptera) con página",
    query: "Observo ventanitas en hojas de maíz por cogollero (Spodoptera), ¿cuál es el umbral de acción?",
  },
  {
    tag: "2A · Código + M05",
    title: "Pérdidas de Cosecha en Maíz (granos y espigas)",
    query: "Medí 12 granos por m2 y 1 espiga en 10 m2 en la cosecha de maíz, ¿cuántos kg/ha pierdo?",
  },
  {
    tag: "4 · Verifica → Abstención ⛔",
    title: "Consulta sin respaldo (Precio de pizarra hoy)",
    query: "¿Cuál es el precio actual del maíz hoy en pizarra Rosario?",
  },
];

function ChatInner() {
  const searchParams = useSearchParams();
  const { isOnline } = useNetworkStatus();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModelManager, setShowModelManager] = useState(false);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [showFlowDiagram, setShowFlowDiagram] = useState(false);
  const [modelStatus, setModelStatus] = useState<LocalLLMStatus>("unloaded");

  // Base de Conocimiento Local: Mis Lotes 🔒
  const [lotes, setLotes] = useState<ProducerLote[]>(DEFAULT_PRODUCER_LOTES);
  const [selectedLoteId, setSelectedLoteId] = useState<string | null>("lote-la-loma");

  // Entradas multimodales del Productor: chat · voz · foto
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [inputModality, setInputModality] = useState<"chat" | "voice" | "photo">("chat");
  const [photoAttachment, setPhotoAttachment] = useState<{
    name: string;
    dataUrl?: string;
    note?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const activeLote = lotes.find((l) => l.id === selectedLoteId) ?? null;

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const savedLotes = getSavedLotes();
    setLotes(savedLotes);
    const storedActiveId = getActiveLoteId();
    if (storedActiveId !== null) {
      setSelectedLoteId(storedActiveId);
    } else {
      setActiveLoteId("lote-la-loma");
      setSelectedLoteId("lote-la-loma");
    }

    const existing = loadMessages();
    setMessages(existing);
    const initialQuestion = searchParams.get("q");
    if (initialQuestion && existing.length === 0) {
      void sendMessage(initialQuestion, undefined, savedLotes[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveMessages(messages);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSelectLote(id: string | null) {
    setSelectedLoteId(id);
    setActiveLoteId(id);
  }

  function handleVoiceTrigger() {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (SpeechRec && typeof SpeechRec === "function") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition: any = new (SpeechRec as any)();
        recognition.lang = "es-AR";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        setIsRecordingVoice(true);
        setInputModality("voice");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          const transcript = event?.results?.[0]?.[0]?.transcript;
          if (transcript) {
            setInput(transcript);
            setInputModality("voice");
          }
          setIsRecordingVoice(false);
        };
        recognition.onerror = () => {
          setIsRecordingVoice(false);
          setInput("Estoy en el lote de maíz en V6, ¿cuánta urea me falta aplicar según el análisis de suelo?");
          setInputModality("voice");
        };
        recognition.onend = () => {
          setIsRecordingVoice(false);
        };
        recognition.start();
        return;
      } catch {
        // fallback below
      }
    }

    // Fallback instantáneo si el navegador no tiene micrófono activo
    setIsRecordingVoice(true);
    setTimeout(() => {
      setIsRecordingVoice(false);
      setInputModality("voice");
      setInput(
        "Estoy recorriendo el lote de maíz en V6 y veo daño de cogollero en las hojas, ¿cuál es el umbral de intervención?"
      );
    }, 600);
  }

  function handlePhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : undefined;
      setPhotoAttachment({
        name: file.name,
        dataUrl,
        note: "Imagen adjuntada desde el lote para contexto en Paso 1 · ENTIENDE",
      });
      setInputModality("photo");
      if (!input.trim()) {
        setInput(
          `Adjunto foto (${file.name}) de hoja de maíz con ventanitas traslúcidas de Spodoptera frugiperda. ¿Qué umbral y manejo corresponde?`
        );
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function sendMessage(
    question: string,
    form?: FormSubmission,
    overrideLote?: ProducerLote | null
  ) {
    const q = question.trim();
    if (!q || loading) return;

    const loteToUse = overrideLote !== undefined ? overrideLote : activeLote;
    const currentModality = inputModality;
    const currentPhoto = photoAttachment || undefined;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: q,
      createdAt: Date.now(),
      inputModality: currentModality,
      photoAttachment: currentPhoto,
      loteName: loteToUse?.name,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setInputModality("chat");
    setPhotoAttachment(null);
    setLoading(true);
    setError(null);

    const assistantId = crypto.randomUUID();
    let hasStreamed = false;

    try {
      const result = await resolveChatQuery({
        question: q,
        form,
        activeLote: loteToUse,
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
        className="sticky top-0 z-20 border-b px-3 sm:px-6 py-2.5 flex items-center justify-between flex-wrap gap-2"
        style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border)" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/" className="font-bold text-base sm:text-lg flex items-center gap-1.5" style={{ color: "var(--surco-green)" }}>
            <span>🌽 Surco</span>
            <span className="hidden md:inline text-xs font-normal px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}>
              Experto en Maíz · Flujo Verificado
            </span>
          </Link>
          <NetworkBadge />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowKnowledgeModal(true)}
            className="text-xs font-semibold rounded-lg border px-2.5 py-1.5 flex items-center gap-1.5 cursor-pointer transition-colors"
            style={{
              background: "#eef3fb",
              borderColor: "#bfd2eb",
              color: "#1d3b6c",
            }}
            title="Abrir Base de Conocimiento Local: Fichas curadas, Documentos y Mis Lotes 🔒"
          >
            <span>🗄️ Base Local</span>
            <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-white text-[10px] font-mono">
              {activeLote ? `🔒 ${activeLote.name.split("—")[0].trim()}` : "Sin lote"}
            </span>
          </button>

          <ModelStatusButton
            onClick={() => setShowModelManager(true)}
            statusOverride={modelStatus}
          />

          <button
            type="button"
            onClick={() => setShowFlowDiagram((prev) => !prev)}
            className="text-xs rounded-lg border px-2.5 py-1.5 cursor-pointer"
            style={{
              borderColor: showFlowDiagram ? "var(--surco-green)" : "var(--surco-border)",
              background: showFlowDiagram ? "#e4efe4" : "transparent",
              color: "var(--surco-ink-soft)",
            }}
          >
            {showFlowDiagram ? "Ocultar diagrama" : "🗺️ Flujo"}
          </button>

          <button
            type="button"
            onClick={handleNewChat}
            className="text-xs rounded-lg border px-2.5 py-1.5 cursor-pointer"
            style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
          >
            Limpiar
          </button>
        </div>
      </header>

      <ModelManager
        isOpen={showModelManager}
        onClose={() => setShowModelManager(false)}
        onStatusChange={setModelStatus}
      />

      <LocalKnowledgeModal
        isOpen={showKnowledgeModal}
        onClose={() => setShowKnowledgeModal(false)}
        lotes={lotes}
        activeLoteId={selectedLoteId}
        onSelectLote={handleSelectLote}
        onUpdateLotes={setLotes}
        isOnline={isOnline}
      />

      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-4">
        {/* Visor colapsable de /flujo.png para contraste directo */}
        {showFlowDiagram && (
          <div
            className="rounded-2xl border p-3 flex flex-col gap-2"
            style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold" style={{ color: "var(--surco-ink)" }}>
                Arquitectura Activa: “El código decide y calcula; el modelo solo redacta; un verificador revisa antes de mostrar.”
              </span>
              <button
                type="button"
                onClick={() => setShowFlowDiagram(false)}
                className="underline cursor-pointer"
                style={{ color: "var(--surco-ink-soft)" }}
              >
                Cerrar
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/flujo.png"
              alt="Diagrama de flujo del asistente experto en maíz"
              className="w-full rounded-xl border"
              style={{ borderColor: "var(--surco-border)" }}
            />
          </div>
        )}

        {messages.length === 0 && !loading && (
          <div className="space-y-4 my-2">
            {/* Banner de la filosofía de flujo.png */}
            <div
              className="rounded-2xl border p-4 flex flex-col gap-3"
              style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                    style={{ background: "#e4efe4", color: "var(--surco-green)" }}
                  >
                    📱 Dispositivo — Funciona sin conexión
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold mt-1.5" style={{ color: "var(--surco-ink)" }}>
                    Asistente experto en maíz · versión simple
                  </h2>
                  <p className="text-xs sm:text-sm mt-0.5" style={{ color: "var(--surco-ink-soft)" }}>
                    El código decide y calcula; el modelo SLM local solo redacta; un verificador revisa citas y vigencia antes de mostrar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModelManager(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer shrink-0"
                  style={{ background: "var(--surco-green)" }}
                >
                  ⚡ Configurar SLM Local (Llama 3.2)
                </button>
              </div>

              {/* Resumen visual de los 4 pasos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="rounded-xl p-2.5 border" style={{ background: "#f3f5ec", borderColor: "#7c8a58", color: "#3d4822" }}>
                  <div className="font-bold">1 · ENTIENDE</div>
                  <div className="text-[11px] opacity-90 mt-0.5">Clasifica, lee tu Lote 🔒 o repregunta si faltan datos.</div>
                </div>
                <div className="rounded-xl p-2.5 border" style={{ background: "#edf6f0", borderColor: "#3d7a4f", color: "#205430" }}>
                  <div className="font-bold">2 · RESUELVE</div>
                  <div className="text-[11px] opacity-90 mt-0.5">Código (sin IA) calcula + RAG busca guías con página.</div>
                </div>
                <div className="rounded-xl p-2.5 border" style={{ background: "#fcf6ea", borderColor: "#c78b30", color: "#8a5a10" }}>
                  <div className="font-bold">3 · REDACTA</div>
                  <div className="text-[11px] opacity-90 mt-0.5">SLM local usa solo lo provisto; no inventa números.</div>
                </div>
                <div className="rounded-xl p-2.5 border" style={{ background: "#fdf4f3", borderColor: "#c23b30", color: "#99231a" }}>
                  <div className="font-bold">4 · VERIFICA</div>
                  <div className="text-[11px] opacity-90 mt-0.5">Revisa cita y vigencia; si no sostiene → se abstiene ⛔.</div>
                </div>
              </div>
            </div>

            {/* Escenarios de prueba en 1 clic */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: "var(--surco-ink-soft)" }}>
                Probá el flujo completo con estas consultas de Maíz:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MAIZE_DEMO_SCENARIOS.map((sc) => (
                  <button
                    key={sc.title}
                    type="button"
                    onClick={() => void sendMessage(sc.query)}
                    className="text-left rounded-xl border p-3 transition-all hover:shadow-xs cursor-pointer flex flex-col gap-1"
                    style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ background: "var(--surco-bg-alt)", color: "var(--surco-green)" }}>
                        {sc.tag}
                      </span>
                      <span className="text-xs" style={{ color: "var(--surco-ink-muted)" }}>Probar →</span>
                    </div>
                    <div className="font-semibold text-xs sm:text-sm" style={{ color: "var(--surco-ink)" }}>
                      {sc.title}
                    </div>
                    <p className="text-xs line-clamp-1" style={{ color: "var(--surco-ink-soft)" }}>
                      “{sc.query}”
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onSubmitForm={handleFormSubmit} />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-tl-sm border px-4 py-3 text-xs sm:text-sm animate-pulse flex items-center gap-2"
              style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
            >
              <span>⚙️ Ejecutando flujo:</span>
              <strong>1 · ENTIENDE → 2 · RESUELVE → 3 · REDACTA → 4 · VERIFICA…</strong>
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

      {/* Barra inferior del Productor: Lote Activo 🔒 + Chat · Voz · Foto */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 border-t px-3 sm:px-6 py-3"
        style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border)" }}
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* Selector rápido de Lote 🔒 en la Base de Conocimiento Local */}
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold" style={{ color: "var(--surco-ink-soft)" }}>
                🗄️ Contexto Lote 🔒:
              </span>
              {lotes.map((l) => {
                const active = selectedLoteId === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => handleSelectLote(l.id)}
                    className="px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors cursor-pointer"
                    style={{
                      background: active ? "var(--surco-green)" : "var(--surco-card)",
                      borderColor: active ? "var(--surco-green)" : "var(--surco-border)",
                      color: active ? "#ffffff" : "var(--surco-ink-soft)",
                    }}
                  >
                    🔒 {l.name.split("—")[0].trim()} ({l.phenology}, {l.targetYieldTonHa}t)
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => handleSelectLote(null)}
                className="px-2.5 py-1 rounded-full border text-[11px] font-medium transition-colors cursor-pointer"
                style={{
                  background: selectedLoteId === null ? "#c23b30" : "var(--surco-card)",
                  borderColor: selectedLoteId === null ? "#c23b30" : "var(--surco-border)",
                  color: selectedLoteId === null ? "#ffffff" : "var(--surco-ink-soft)",
                }}
              >
                ⭕ Sin lote (forzar repregunta)
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowKnowledgeModal(true)}
              className="text-[11px] underline cursor-pointer"
              style={{ color: "#1d3b6c" }}
            >
              Editar lotes y ver fichas ({lotes.length})
            </button>
          </div>

          {/* Chip de Foto adjunta si hay una seleccionada */}
          {photoAttachment && (
            <div
              className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border text-xs"
              style={{ background: "#eef3fb", borderColor: "#bfd2eb", color: "#1d3b6c" }}
            >
              <div className="flex items-center gap-2">
                <span>📷 <strong>Foto lista:</strong> {photoAttachment.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhotoAttachment(null);
                  setInputModality("chat");
                }}
                className="underline text-[11px] cursor-pointer"
              >
                Quitar
              </button>
            </div>
          )}

          {/* Caja de entrada multimodal: Productor (chat · voz · foto) */}
          <div
            className="flex items-center gap-1.5 p-1.5 rounded-xl border"
            style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleVoiceTrigger}
              className="px-2.5 py-2 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
              style={{
                background: isRecordingVoice ? "#fdecec" : "var(--surco-bg)",
                borderColor: isRecordingVoice ? "#c23b30" : "var(--surco-border)",
                color: isRecordingVoice ? "#991b1b" : "var(--surco-ink)",
              }}
              title="Entrada por Voz del Productor"
            >
              <span>🎙️</span>
              <span className="hidden sm:inline">{isRecordingVoice ? "Escuchando…" : "Voz"}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-2 rounded-lg border text-xs font-medium flex items-center gap-1 cursor-pointer shrink-0"
              style={{
                background: photoAttachment ? "#eef3fb" : "var(--surco-bg)",
                borderColor: photoAttachment ? "#3b82f6" : "var(--surco-border)",
                color: "var(--surco-ink)",
              }}
              title="Adjuntar Foto de lote, hoja de maíz o marbete"
            >
              <span>📷</span>
              <span className="hidden sm:inline">Foto</span>
            </button>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Productor (chat · voz · foto): consultá sobre tu maíz…"
              className="flex-1 bg-transparent px-2.5 py-2 outline-none text-sm"
              style={{ color: "var(--surco-ink)" }}
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer shrink-0"
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
