"use client";

import { useState } from "react";
import { ChatThread, ProducerLote } from "@/lib/types";
import { SatelliteLoteMap } from "./SatelliteLoteMap";
import { IconArrowLeft, IconChevronRight, IconEdit, IconMapPin, IconMessage, IconPlus, IconSparkles } from "./Icons";
import { daysSincePlanting, formatShortDate } from "@/lib/lote-utils";

interface Props {
  lote: ProducerLote;
  threads: ChatThread[];
  onOpenThread: (threadId: string) => void;
  onStartNewChat: () => void;
  onEditLote?: () => void;
  onBack?: () => void;
}

type Tab = "resumen" | "suelo" | "aplicaciones" | "consultas";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div
      className="rounded-2xl p-3.5 border bg-white flex flex-col gap-0.5"
      style={{ borderColor: "var(--surco-border-light)" }}
    >
      <span className="text-[11.5px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
        {label}
      </span>
      <span className="text-[15px] font-bold leading-snug" style={{ color: "var(--surco-ink)" }}>
        {value}
      </span>
      {hint && (
        <span className="text-[11px]" style={{ color: "var(--surco-ink-muted)" }}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function LoteDashboard({ lote, threads, onOpenThread, onStartNewChat, onEditLote, onBack }: Props) {
  const [tab, setTab] = useState<Tab>("resumen");
  const apps = lote.previousApplications || [];
  const days = daysSincePlanting(lote.plantingDate);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "suelo", label: "Suelo" },
    { id: "aplicaciones", label: "Aplicaciones", count: apps.length },
    { id: "consultas", label: "Consultas", count: threads.length },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-6 pb-28 flex flex-col gap-5">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="self-start inline-flex items-center gap-1.5 text-[13px] font-medium cursor-pointer hover:underline"
          style={{ color: "var(--surco-ink-soft)" }}
        >
          <IconArrowLeft className="w-4 h-4" />
          <span>Tus lotes</span>
        </button>
      )}

      {/* Hero: mapa satelital con datos superpuestos */}
      <section
        className="relative rounded-[22px] overflow-hidden border shadow-sm"
        style={{ borderColor: "var(--surco-border-light)" }}
      >
        <SatelliteLoteMap
          center={lote.coordinates || { lat: -37.2785, lng: -59.3612 }}
          polygon={lote.polygon || []}
          readOnly
          heightClassName="h-64 sm:h-80"
        />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex items-end justify-between gap-3 pointer-events-none">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-white/85 text-xs font-medium mb-1">
              <IconMapPin className="w-3.5 h-3.5" />
              <span className="truncate">
                {lote.locality ? `${lote.locality}, ` : ""}
                {lote.municipality}
              </span>
            </div>
            <h1 className="text-white text-xl sm:text-2xl font-extrabold tracking-tight leading-tight line-clamp-2">
              {lote.name}
            </h1>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.92)", color: "var(--surco-green)" }}
            >
              {lote.crop}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
              {lote.hectares} ha
            </span>
          </div>
        </div>
      </section>

      {/* Acciones rápidas */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onStartNewChat}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer transition-all hover:opacity-95 active:scale-[0.98]"
          style={{ background: "var(--surco-green)" }}
        >
          <IconSparkles className="w-4 h-4" />
          <span>Preguntar sobre este lote</span>
        </button>
        {onEditLote && (
          <button
            type="button"
            onClick={onEditLote}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border bg-white cursor-pointer transition-colors hover:bg-black/[0.02]"
            style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
          >
            <IconEdit className="w-4 h-4" />
            <span className="hidden sm:inline">Editar</span>
          </button>
        )}
      </div>

      {/* Pestañas */}
      <nav
        className="flex items-center gap-1 p-1 rounded-2xl overflow-x-auto no-scrollbar"
        style={{ background: "var(--surco-bg-alt)" }}
      >
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="flex-1 shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold cursor-pointer transition-all whitespace-nowrap"
              style={{
                background: active ? "white" : "transparent",
                color: active ? "var(--surco-ink)" : "var(--surco-ink-muted)",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              <span>{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span
                  className="text-[10.5px] font-bold px-1.5 rounded-full"
                  style={{
                    background: active ? "var(--surco-green-tint)" : "rgba(0,0,0,0.06)",
                    color: active ? "var(--surco-green)" : "var(--surco-ink-muted)",
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Contenido de pestañas */}
      {tab === "resumen" && (
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Stat label="Cultivo" value={lote.crop} hint={lote.hybrid} />
          <Stat label="Estadio" value={lote.phenology} />
          <Stat
            label="Siembra"
            value={formatShortDate(lote.plantingDate)}
            hint={days !== null ? `Hace ${days} días` : undefined}
          />
          <Stat label="Rinde objetivo" value={`${lote.targetYieldTonHa} t/ha`} />
          <Stat
            label="Densidad"
            value={lote.targetDensityPlantsHa ? `${lote.targetDensityPlantsHa.toLocaleString("es-AR")} pl/ha` : "—"}
            hint={lote.rowSpacingCm ? `Surcos a ${lote.rowSpacingCm} cm` : undefined}
          />
          <Stat label="Antecesor" value={lote.previousCrop || "—"} />
          {lote.relief && <Stat label="Relieve" value={lote.relief} />}
          {lote.sensitiveZoneType && lote.sensitiveZoneType !== "Ninguna cercana" && (
            <Stat
              label="Zona sensible"
              value={lote.sensitiveZoneType}
              hint={lote.sensitiveZoneDistanceM ? `a ${lote.sensitiveZoneDistanceM} m` : undefined}
            />
          )}
        </section>
      )}

      {tab === "suelo" && (
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Stat label="Nitratos (N)" value={`${lote.soilNitrateKgHa} kg/ha`} />
          <Stat label="Fósforo (P)" value={`${lote.soilPhosphorusPpm} ppm`} />
          <Stat label="Azufre (S)" value={lote.sulfurPpm !== undefined ? `${lote.sulfurPpm} ppm` : "—"} />
          <Stat
            label="Materia orgánica"
            value={lote.organicMatterPercent !== undefined ? `${lote.organicMatterPercent} %` : "—"}
          />
          <Stat label="pH" value={lote.ph !== undefined ? String(lote.ph) : "—"} />
          <Stat label="Tosca" value={`${lote.toscaDepthCm} cm`} />
          {lote.soilTexture && <Stat label="Textura" value={lote.soilTexture} />}
        </section>
      )}

      {tab === "aplicaciones" && (
        <section className="flex flex-col gap-2">
          {apps.length === 0 ? (
            <div
              className="rounded-2xl border p-8 text-center text-sm bg-white"
              style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-ink-muted)" }}
            >
              No hay aplicaciones registradas.
            </div>
          ) : (
            apps.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border bg-white p-4 flex gap-3"
                style={{ borderColor: "var(--surco-border-light)" }}
              >
                <div className="flex flex-col items-center pt-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--surco-green)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                      style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
                    >
                      {a.category}
                    </span>
                    <span className="text-[11.5px]" style={{ color: "var(--surco-ink-muted)" }}>
                      {formatShortDate(a.date)}
                    </span>
                  </div>
                  <div className="text-sm font-bold mt-1.5" style={{ color: "var(--surco-ink)" }}>
                    {a.productName}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--surco-ink-soft)" }}>
                    {a.activeIngredient} · {a.dose}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {tab === "consultas" && (
        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onStartNewChat}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-colors hover:bg-white"
            style={{ border: "2px dashed var(--surco-border)" }}
          >
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--surco-green-tint)" }}
            >
              <IconPlus className="w-4 h-4" style={{ color: "var(--surco-green)" }} />
            </span>
            <span className="text-sm font-bold" style={{ color: "var(--surco-ink)" }}>
              Nueva consulta
            </span>
          </button>

          {threads.length === 0 ? (
            <div className="text-center text-sm py-6" style={{ color: "var(--surco-ink-muted)" }}>
              Todavía no hiciste consultas sobre este lote.
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onOpenThread(t.id)}
                className="w-full text-left rounded-2xl border px-4 py-3.5 bg-white transition-all hover:shadow-sm hover:border-emerald-800/20 flex items-center justify-between gap-3 cursor-pointer group"
                style={{ borderColor: "var(--surco-border-light)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <IconMessage className="w-4 h-4 shrink-0" style={{ color: "var(--surco-ink-muted)" }} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--surco-ink)" }}>
                      {t.title}
                    </div>
                    <div className="text-[11.5px]" style={{ color: "var(--surco-ink-muted)" }}>
                      {new Date(t.updatedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })} ·{" "}
                      {t.messages.length} mensajes
                    </div>
                  </div>
                </div>
                <IconChevronRight
                  className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform"
                  style={{ color: "var(--surco-ink-muted)" }}
                />
              </button>
            ))
          )}
        </section>
      )}
    </div>
  );
}
