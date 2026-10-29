"use client";

import { useState } from "react";
import { ProducerLote } from "@/lib/types";
import { SatelliteLoteMap } from "./SatelliteLoteMap";

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
      className="rounded-2xl border px-4 py-3 flex flex-col gap-2.5 transition-all"
      style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-md shrink-0"
            style={{ background: "#e4efe4", color: "var(--surco-green)" }}
          >
            🌾 Proyecto de Lote
          </span>
          <h2 className="font-semibold text-sm sm:text-base truncate" style={{ color: "var(--surco-ink)" }}>
            {lote.name}
          </h2>
          <span className="text-xs shrink-0" style={{ color: "var(--surco-ink-soft)" }}>
            · {lote.hectares} ha · {lote.crop} ({lote.phenology})
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="text-xs px-2.5 py-1 rounded-lg border cursor-pointer"
            style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink-soft)" }}
          >
            {expanded ? "Ocultar ficha satelital ▲" : "Ver ficha y aplicaciones ▼"}
          </button>
          <button
            type="button"
            onClick={onEditLote}
            className="text-xs px-2.5 py-1 rounded-lg border font-medium cursor-pointer"
            style={{ borderColor: "var(--surco-border)", color: "var(--surco-green)" }}
          >
            Editar lote
          </button>
        </div>
      </div>

      {/* Resumen de 1 línea siempre visible */}
      <div className="flex items-center gap-3 flex-wrap text-xs" style={{ color: "var(--surco-ink-soft)" }}>
        <span>
          📍 {lote.locality ? `${lote.locality}, ` : ""}
          {lote.municipality}
          {lote.sensitiveZoneDistanceM
            ? ` (${lote.sensitiveZoneDistanceM}m de ${lote.sensitiveZoneType?.toLowerCase() || "zona sensible"})`
            : ""}
        </span>
        <span>·</span>
        <span>
          🧪 Tosca {lote.toscaDepthCm}cm · N {lote.soilNitrateKgHa}kg · P {lote.soilPhosphorusPpm}ppm
        </span>
        {apps.length > 0 && (
          <>
            <span>·</span>
            <span>
              🚜 Aplicado: {apps.map((a) => a.productName.split("+")[0].trim()).join(", ")}
            </span>
          </>
        )}
      </div>

      {expanded && (
        <div
          className="pt-2.5 border-t grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
          style={{ borderColor: "var(--surco-border)" }}
        >
          <div>
            <SatelliteLoteMap
              center={lote.coordinates || { lat: -37.2785, lng: -59.3612 }}
              polygon={lote.polygon || []}
              readOnly
              compact
            />
          </div>

          <div className="flex flex-col gap-1" style={{ color: "var(--surco-ink-soft)" }}>
            <div className="font-semibold" style={{ color: "var(--surco-ink)" }}>
              Datos del Lote y Suelo
            </div>
            <div>
              <strong>Híbrido:</strong> {lote.hybrid} · <strong>Rinde Obj.:</strong> {lote.targetYieldTonHa} t/ha
            </div>
            <div>
              <strong>Antecesor:</strong> {lote.previousCrop} · <strong>Relieve:</strong> {lote.relief || "Loma"}
            </div>
            <div>
              <strong>Suelo:</strong> MO {lote.organicMatterPercent ?? 4.5}% · pH {lote.ph ?? 6.2} · Textura{" "}
              {lote.soilTexture || "Franco"}
            </div>
            {weeds.length > 0 && (
              <div>
                <strong>Malezas/Plagas:</strong> {weeds.join(", ")}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1" style={{ color: "var(--surco-ink-soft)" }}>
            <div className="font-semibold" style={{ color: "var(--surco-ink)" }}>
              Aplicaciones Previas ({apps.length})
            </div>
            {apps.length === 0 ? (
              <div>Sin aplicaciones previas registradas.</div>
            ) : (
              apps.map((a) => (
                <div key={a.id} className="leading-snug">
                  <span className="font-mono font-semibold" style={{ color: "var(--surco-green)" }}>
                    {a.date}:
                  </span>{" "}
                  {a.productName} ({a.dose})
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
