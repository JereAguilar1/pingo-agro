"use client";

import { FormEvent, useState } from "react";
import { ChatThread, ProducerLote } from "@/lib/types";
import { SatelliteLoteMap } from "./SatelliteLoteMap";
import { IconChevronRight, IconMessage, IconPlus, IconSend } from "./Icons";

interface Props {
  lote: ProducerLote;
  threads: ChatThread[];
  onOpenThread: (threadId: string) => void;
  onStartNewChat: (initialQuestion?: string) => void;
}

export function LoteDashboard({
  lote,
  threads,
  onOpenThread,
  onStartNewChat,
}: Props) {
  const [question, setQuestion] = useState("");
  const apps = lote.previousApplications || [];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setQuestion("");
    onStartNewChat(q);
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-4 sm:py-6 flex flex-col gap-6">
      {/* Cabecera minimalista del lote */}
      <div className="flex flex-col gap-1">
        <h1
          className="text-xl sm:text-2xl font-semibold tracking-tight"
          style={{ color: "var(--surco-ink)" }}
        >
          {lote.name}
        </h1>
        <p className="text-xs sm:text-sm" style={{ color: "var(--surco-ink-muted)" }}>
          {lote.locality ? `${lote.locality}, ` : ""}
          {lote.municipality} · {lote.hectares} ha
        </p>
      </div>

      {/* Datos principales del lote (minimalista, sin sobrecarga) */}
      <section
        className="rounded-2xl border bg-white p-4 flex flex-col gap-4"
        style={{ borderColor: "var(--surco-border-light)" }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          {/* Vista satelital compacta */}
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--surco-border-light)" }}>
            <SatelliteLoteMap
              center={lote.coordinates || { lat: -37.2785, lng: -59.3612 }}
              polygon={lote.polygon || []}
              readOnly
              compact
            />
          </div>

          {/* 4 indicadores esenciales */}
          <div className="sm:col-span-2 grid grid-cols-2 gap-2.5 text-xs">
            <div
              className="rounded-xl p-2.5 border"
              style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
            >
              <span className="text-[11px] block" style={{ color: "var(--surco-ink-muted)" }}>
                Cultivo y Estadio
              </span>
              <span className="font-semibold text-sm" style={{ color: "var(--surco-ink)" }}>
                {lote.crop} · {lote.phenology}
              </span>
            </div>

            <div
              className="rounded-xl p-2.5 border"
              style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
            >
              <span className="text-[11px] block" style={{ color: "var(--surco-ink-muted)" }}>
                Rinde Objetivo
              </span>
              <span className="font-semibold text-sm" style={{ color: "var(--surco-ink)" }}>
                {lote.targetYieldTonHa} t/ha
              </span>
            </div>

            <div
              className="rounded-xl p-2.5 border"
              style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
            >
              <span className="text-[11px] block" style={{ color: "var(--surco-ink-muted)" }}>
                Suelo (N · P · Tosca)
              </span>
              <span className="font-semibold text-xs sm:text-sm" style={{ color: "var(--surco-ink)" }}>
                {lote.soilNitrateKgHa} kg · {lote.soilPhosphorusPpm} ppm · {lote.toscaDepthCm} cm
              </span>
            </div>

            <div
              className="rounded-xl p-2.5 border"
              style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
            >
              <span className="text-[11px] block" style={{ color: "var(--surco-ink-muted)" }}>
                Aplicaciones previas
              </span>
              <span className="font-semibold text-xs sm:text-sm truncate block" style={{ color: "var(--surco-ink)" }}>
                {apps.length > 0
                  ? `${apps.length} registrada${apps.length > 1 ? "s" : ""}`
                  : "Ninguna"}
              </span>
            </div>
          </div>
        </div>

        {apps.length > 0 && (
          <div
            className="pt-3 border-t flex flex-wrap items-center gap-1.5 text-xs"
            style={{ borderColor: "var(--surco-border-light)" }}
          >
            <span className="text-[11px]" style={{ color: "var(--surco-ink-muted)" }}>
              Aplicado:
            </span>
            {apps.map((a) => (
              <span
                key={a.id}
                className="px-2 py-0.5 rounded-md border text-[11px]"
                style={{
                  background: "var(--surco-bg)",
                  borderColor: "var(--surco-border-light)",
                  color: "var(--surco-ink-soft)",
                }}
              >
                {a.productName} ({a.dose})
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Opción de un Chat Nuevo en el lote */}
      <section className="flex flex-col gap-2">
        <form onSubmit={handleSubmit}>
          <div
            className="flex items-center gap-2 p-1.5 rounded-xl border bg-white transition-all focus-within:border-emerald-800/40"
            style={{ borderColor: "var(--surco-border)" }}
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={`Iniciar nuevo chat en ${lote.name}…`}
              className="flex-1 bg-transparent px-2.5 py-2 outline-none text-sm"
              style={{ color: "var(--surco-ink)" }}
            />
            <button
              type="submit"
              disabled={!question.trim()}
              className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium text-white disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
              style={{ background: "var(--surco-green)" }}
            >
              <span>Consultar</span>
              <IconSend className="w-3 h-3" />
            </button>
          </div>
        </form>
      </section>

      {/* Historial de chats del lote */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--surco-ink-muted)" }}
          >
            Historial de chats
          </span>
          <button
            type="button"
            onClick={() => onStartNewChat()}
            className="inline-flex items-center gap-1 text-xs font-medium cursor-pointer hover:underline"
            style={{ color: "var(--surco-green)" }}
          >
            <IconPlus className="w-3 h-3" />
            <span>Nuevo chat</span>
          </button>
        </div>

        {threads.length === 0 ? (
          <div
            className="rounded-xl border p-6 text-center text-xs bg-white"
            style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-ink-muted)" }}
          >
            No hay chats previos en este lote.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onOpenThread(t.id)}
                className="w-full text-left rounded-xl border px-3.5 py-3 bg-white transition-all hover:border-emerald-800/30 flex items-center justify-between gap-3 cursor-pointer group"
                style={{ borderColor: "var(--surco-border-light)" }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <IconMessage className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span
                    className="text-xs sm:text-sm font-medium truncate group-hover:text-emerald-900"
                    style={{ color: "var(--surco-ink)" }}
                  >
                    {t.title}
                  </span>
                </div>
                <IconChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
