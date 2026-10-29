"use client";

import { useState } from "react";
import { ProducerLote } from "@/lib/types";
import { SatelliteLoteMap } from "./SatelliteLoteMap";
import { IconChevronDown, IconChevronUp, IconEdit, IconLayers, IconMapPin } from "./Icons";

interface Props {
  lote: ProducerLote;
  onEditLote: () => void;
}

export function LoteHeaderCard({ lote, onEditLote }: Props) {
  const [expanded, setExpanded] = useState(false);
  const apps = lote.previousApplications || [];
  const weeds = lote.detectedPestsAndWeeds || [];

  return (
    <div
      className="rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs"
      style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
    >
      {/* Barra principal compacta */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--surco-green-tint)", color: "var(--surco-green)" }}
          >
            <IconLayers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-sm sm:text-[15px] truncate" style={{ color: "var(--surco-ink)" }}>
                {lote.name}
              </h2>
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "var(--surco-bg-alt)", color: "var(--surco-ink-soft)" }}
              >
                {lote.hectares} ha · {lote.crop}
              </span>
            </div>
            <div className="text-[12px] truncate mt-0.5" style={{ color: "var(--surco-ink-muted)" }}>
              {lote.locality ? `${lote.locality}, ` : ""}
              {lote.municipality} · Híbrido {lote.hybrid} ({lote.phenology})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium cursor-pointer transition-colors hover:bg-black/5"
            style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-ink-soft)" }}
          >
            <span>{expanded ? "Ocultar ficha" : "Ver ficha y satélite"}</span>
            {expanded ? <IconChevronUp className="w-3.5 h-3.5" /> : <IconChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onEditLote}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium cursor-pointer transition-colors hover:bg-black/5"
            style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-green)" }}
            title="Editar datos del lote"
          >
            <IconEdit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Editar</span>
          </button>
        </div>
      </div>

      {/* Ficha técnica desplegable con diseño limpio en pestañas/grilla */}
      {expanded && (
        <div
          className="border-t p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-fadeIn"
          style={{
            borderColor: "var(--surco-border-light)",
            background: "var(--surco-bg)",
          }}
        >
          {/* Columna 1: Vista satelital compacta */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-900">
              <span className="inline-flex items-center gap-1">
                <IconMapPin className="w-3 h-3" /> Polígono Satelital
              </span>
              <span className="text-[10px] text-gray-500 font-normal">Esri Imagery</span>
            </div>
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--surco-border-light)" }}>
              <SatelliteLoteMap
                center={lote.coordinates || { lat: -37.2785, lng: -59.3612 }}
                polygon={lote.polygon || []}
                readOnly
                compact
              />
            </div>
            {lote.sensitiveZoneDistanceM && (
              <div className="text-[11px] text-amber-800 bg-amber-50 rounded-lg p-2 border border-amber-200/60 leading-tight">
                ⚠️ A <strong>{lote.sensitiveZoneDistanceM} m</strong> de {lote.sensitiveZoneType?.toLowerCase() || "zona sensible"}. Respetar zona de amortiguamiento [R08].
              </div>
            )}
          </div>

          {/* Columna 2: Suelo y Campaña */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-900">
              Suelo y Campaña
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-xl p-2.5 border" style={{ borderColor: "var(--surco-border-light)" }}>
                <span className="text-[10px] text-gray-500 block">N-NO3 (0–60cm)</span>
                <span className="text-sm font-semibold text-gray-800">{lote.soilNitrateKgHa} kg N/ha</span>
              </div>
              <div className="bg-white rounded-xl p-2.5 border" style={{ borderColor: "var(--surco-border-light)" }}>
                <span className="text-[10px] text-gray-500 block">Fósforo Bray</span>
                <span className="text-sm font-semibold text-gray-800">{lote.soilPhosphorusPpm} ppm</span>
              </div>
              <div className="bg-white rounded-xl p-2.5 border" style={{ borderColor: "var(--surco-border-light)" }}>
                <span className="text-[10px] text-gray-500 block">Prof. Tosca</span>
                <span className="text-sm font-semibold text-gray-800">{lote.toscaDepthCm} cm</span>
              </div>
              <div className="bg-white rounded-xl p-2.5 border" style={{ borderColor: "var(--surco-border-light)" }}>
                <span className="text-[10px] text-gray-500 block">Rinde Objetivo</span>
                <span className="text-sm font-semibold text-gray-800">{lote.targetYieldTonHa} t/ha</span>
              </div>
            </div>

            <div className="text-[11px] text-gray-600 bg-white rounded-xl p-2.5 border leading-relaxed" style={{ borderColor: "var(--surco-border-light)" }}>
              <div><strong>Materia Orgánica:</strong> {lote.organicMatterPercent ?? 4.5}% · <strong>pH:</strong> {lote.ph ?? 6.2}</div>
              <div><strong>Relieve:</strong> {lote.relief || "Loma"} · <strong>Antecesor:</strong> {lote.previousCrop}</div>
              {weeds.length > 0 && (
                <div className="mt-1 pt-1 border-t border-gray-100">
                  <span className="text-red-700 font-medium">Malezas / Plagas:</span> {weeds.join(", ")}
                </div>
              )}
            </div>
          </div>

          {/* Columna 3: Historial de aplicaciones previas */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-900">
                Aplicaciones Previas ({apps.length})
              </span>
            </div>

            <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[190px] pr-1">
              {apps.length === 0 ? (
                <div className="text-[11px] text-gray-500 italic p-3 bg-white rounded-xl border border-dashed border-gray-200 text-center">
                  Sin aplicaciones previas registradas.
                </div>
              ) : (
                apps.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white rounded-xl p-2 border text-[11px] leading-tight flex flex-col gap-0.5"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 truncate">{a.productName}</span>
                      <span className="font-mono text-[10px] text-emerald-800 shrink-0">{a.date}</span>
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {a.category} · <strong>Dosis:</strong> {a.dose}
                    </div>
                    {a.modeOfAction && (
                      <div className="text-[10px] text-emerald-700 font-medium">
                        Modo de acción: {a.modeOfAction}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
