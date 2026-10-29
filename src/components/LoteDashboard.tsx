"use client";

import { ChatThread, ProducerLote } from "@/lib/types";
import { SatelliteLoteMap } from "./SatelliteLoteMap";
import { IconChevronRight, IconMessage, IconPlus } from "./Icons";

interface Props {
  lote: ProducerLote;
  threads: ChatThread[];
  onOpenThread: (threadId: string) => void;
  onStartNewChat: () => void;
}

export function LoteDashboard({
  lote,
  threads,
  onOpenThread,
  onStartNewChat,
}: Props) {
  const apps = lote.previousApplications || [];

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
        className="rounded-2xl border bg-white p-3.5 sm:p-5 flex flex-col gap-4 shadow-2xs"
        style={{ borderColor: "var(--surco-border-light)" }}
      >
        {/* Mapa satelital destacado con proporciones amplias */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs px-0.5">
            <span className="text-[11px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
              Vista satelital del lote
            </span>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {lote.hectares} ha
            </span>
          </div>

          <div className="rounded-xl overflow-hidden border shadow-inner" style={{ borderColor: "var(--surco-border-light)" }}>
            <SatelliteLoteMap
              center={lote.coordinates || { lat: -37.2785, lng: -59.3612 }}
              polygon={lote.polygon || []}
              readOnly
              heightClassName="h-56 sm:h-72"
            />
          </div>
        </div>

        {/* 4 indicadores esenciales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div
            className="rounded-xl p-3 border flex flex-col gap-0.5"
            style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
          >
            <span className="text-[11px] block" style={{ color: "var(--surco-ink-muted)" }}>
              Cultivo y Estadio
            </span>
            <span className="font-semibold text-xs sm:text-sm" style={{ color: "var(--surco-ink)" }}>
              {lote.crop} · {lote.phenology}
            </span>
          </div>

          <div
            className="rounded-xl p-3 border flex flex-col gap-0.5"
            style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border-light)" }}
          >
            <span className="text-[11px] block" style={{ color: "var(--surco-ink-muted)" }}>
              Rinde Objetivo
            </span>
            <span className="font-semibold text-xs sm:text-sm" style={{ color: "var(--surco-ink)" }}>
              {lote.targetYieldTonHa} t/ha
            </span>
          </div>

          <div
            className="rounded-xl p-3 border flex flex-col gap-0.5"
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
            className="rounded-xl p-3 border flex flex-col gap-0.5"
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
            onClick={onStartNewChat}
            className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer hover:underline"
            style={{ color: "var(--surco-green)" }}
          >
            <IconPlus className="w-3.5 h-3.5" />
            <span>Nuevo chat</span>
          </button>
        </div>

        {threads.length === 0 ? (
          <div
            className="rounded-xl border p-8 text-center text-xs bg-white flex flex-col items-center justify-center gap-3"
            style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-ink-muted)" }}
          >
            <p>No hay chats previos en este lote.</p>
            <button
              type="button"
              onClick={onStartNewChat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: "var(--surco-green)" }}
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span>Nuevo chat</span>
            </button>
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
