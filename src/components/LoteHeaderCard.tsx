"use client";

import { useState } from "react";
import { ProducerLote } from "@/lib/types";
import { SatelliteLoteMap } from "./SatelliteLoteMap";
import { IconChevronDown, IconChevronUp, IconEdit } from "./Icons";

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
      className="rounded-xl border transition-all overflow-hidden bg-white"
      style={{ borderColor: "var(--surco-border-light)" }}
    >
      {/* Barra compacta */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-semibold text-xs sm:text-sm truncate" style={{ color: "var(--surco-ink)" }}>
            {lote.name}
          </h2>
          <span className="text-[11px] text-gray-400">·</span>
          <span className="text-[11px] truncate" style={{ color: "var(--surco-ink-muted)" }}>
            {lote.hectares} ha · {lote.crop} ({lote.phenology})
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border cursor-pointer hover:bg-black/5"
            style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-ink-soft)" }}
          >
            <span>{expanded ? "Ocultar ficha" : "Ficha técnica"}</span>
            {expanded ? <IconChevronUp className="w-3 h-3" /> : <IconChevronDown className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={onEditLote}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 cursor-pointer"
            title="Editar lote"
          >
            <IconEdit className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Ficha técnica desplegable */}
      {expanded && (
        <div
          className="border-t p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs"
          style={{
            borderColor: "var(--surco-border-light)",
            background: "var(--surco-bg)",
          }}
        >
          {/* Mapa satelital */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase text-gray-400">Ubicación</span>
            <div className="rounded-lg overflow-hidden border" style={{ borderColor: "var(--surco-border-light)" }}>
              <SatelliteLoteMap
                center={lote.coordinates || { lat: -37.2785, lng: -59.3612 }}
                polygon={lote.polygon || []}
                readOnly
                compact
              />
            </div>
            <span className="text-[11px] text-gray-500">
              {lote.locality ? `${lote.locality}, ` : ""}{lote.municipality}
              {lote.sensitiveZoneDistanceM ? ` (${lote.sensitiveZoneDistanceM}m de ${lote.sensitiveZoneType?.toLowerCase()})` : ""}
            </span>
          </div>

          {/* Suelo y Campaña */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase text-gray-400">Suelo y Rendimiento</span>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-white rounded-lg p-2 border" style={{ borderColor: "var(--surco-border-light)" }}>
                <span className="text-[10px] text-gray-400 block">N Suelo</span>
                <span className="font-semibold text-gray-800">{lote.soilNitrateKgHa} kg/ha</span>
              </div>
              <div className="bg-white rounded-lg p-2 border" style={{ borderColor: "var(--surco-border-light)" }}>
                <span className="text-[10px] text-gray-400 block">P Bray</span>
                <span className="font-semibold text-gray-800">{lote.soilPhosphorusPpm} ppm</span>
              </div>
              <div className="bg-white rounded-lg p-2 border" style={{ borderColor: "var(--surco-border-light)" }}>
                <span className="text-[10px] text-gray-400 block">Prof. Tosca</span>
                <span className="font-semibold text-gray-800">{lote.toscaDepthCm} cm</span>
              </div>
              <div className="bg-white rounded-lg p-2 border" style={{ borderColor: "var(--surco-border-light)" }}>
                <span className="text-[10px] text-gray-400 block">Rinde Obj.</span>
                <span className="font-semibold text-gray-800">{lote.targetYieldTonHa} t/ha</span>
              </div>
            </div>
            <div className="text-[11px] text-gray-500 bg-white rounded-lg p-2 border" style={{ borderColor: "var(--surco-border-light)" }}>
              MO: {lote.organicMatterPercent ?? 4.5}% · pH: {lote.ph ?? 6.2} · Relieve: {lote.relief || "Loma"}
              {weeds.length > 0 && <div>Malezas: {weeds.join(", ")}</div>}
            </div>
          </div>

          {/* Aplicaciones Previas */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase text-gray-400">
              Aplicaciones Previas ({apps.length})
            </span>
            <div className="flex flex-col gap-1 overflow-y-auto max-h-[170px]">
              {apps.length === 0 ? (
                <div className="text-[11px] text-gray-400 italic p-2 bg-white rounded-lg border text-center" style={{ borderColor: "var(--surco-border-light)" }}>
                  Sin aplicaciones registradas.
                </div>
              ) : (
                apps.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white rounded-lg p-2 border text-[11px] flex flex-col gap-0.5"
                    style={{ borderColor: "var(--surco-border-light)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 truncate">{a.productName}</span>
                      <span className="font-mono text-[10px] text-gray-400 shrink-0">{a.date}</span>
                    </div>
                    <div className="text-[10px] text-gray-500">
                      {a.category} · {a.dose}
                    </div>
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
