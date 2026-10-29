"use client";

import { MouseEvent, useState } from "react";
import { calculatePolygonHectares } from "@/lib/local-knowledge";

export interface PresetLocation {
  label: string;
  municipality: string;
  locality: string;
  lat: number;
  lng: number;
}

export const TANDIL_ZONE_PRESETS: PresetLocation[] = [
  { label: "Gardey (Tandil)", municipality: "Tandil", locality: "Gardey", lat: -37.2785, lng: -59.3612 },
  { label: "María Ignacia — Vela (Tandil)", municipality: "Tandil", locality: "María Ignacia (Vela)", lat: -37.4025, lng: -59.5034 },
  { label: "Tandil Rural Norte", municipality: "Tandil", locality: "Paraje El Gallo", lat: -37.221, lng: -59.142 },
  { label: "Fulton (Tandil)", municipality: "Tandil", locality: "Fulton", lat: -37.428, lng: -58.915 },
  { label: "Balcarce", municipality: "Balcarce", locality: "Balcarce", lat: -37.846, lng: -58.255 },
  { label: "Ayacucho", municipality: "Ayacucho", locality: "Ayacucho", lat: -37.152, lng: -58.488 },
];

interface Props {
  center: { lat: number; lng: number };
  polygon: [number, number][];
  onChangePolygon?: (polygon: [number, number][], calculatedHectares: number) => void;
  onChangeCenter?: (center: { lat: number; lng: number }, preset?: PresetLocation) => void;
  readOnly?: boolean;
  compact?: boolean;
}

// Conversión Web Mercator (EPSG:3857) entre (lat, lng) y coordenadas de tile continuas
function latLngToTileXY(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

function tileXYToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const n = Math.pow(2, zoom);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lng };
}

export function SatelliteLoteMap({
  center,
  polygon,
  onChangePolygon,
  onChangeCenter,
  readOnly = false,
  compact = false,
}: Props) {
  const [zoom, setZoom] = useState(14);
  const centerTile = latLngToTileXY(center.lat, center.lng, zoom);
  const baseTileX = Math.floor(centerTile.x) - 1;
  const baseTileY = Math.floor(centerTile.y) - 1;

  // Grilla 3x3 de tiles satelitales Esri World Imagery (768x768 lógico)
  const tiles: { tx: number; ty: number; gx: number; gy: number; url: string }[] = [];
  for (let gy = 0; gy < 3; gy++) {
    for (let gx = 0; gx < 3; gx++) {
      const tx = baseTileX + gx;
      const ty = baseTileY + gy;
      tiles.push({
        tx,
        ty,
        gx,
        gy,
        url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`,
      });
    }
  }

  function latLngToSvgPoint(lat: number, lng: number): { px: number; py: number } {
    const t = latLngToTileXY(lat, lng, zoom);
    const px = ((t.x - baseTileX) / 3) * 100;
    const py = ((t.y - baseTileY) / 3) * 100;
    return { px, py };
  }

  function handleMapClick(e: MouseEvent<SVGSVGElement>) {
    if (readOnly || !onChangePolygon) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    const tileX = baseTileX + relX * 3;
    const tileY = baseTileY + relY * 3;
    const { lat, lng } = tileXYToLatLng(tileX, tileY, zoom);

    const nextPoly: [number, number][] = [
      ...polygon,
      [Math.round(lat * 10000) / 10000, Math.round(lng * 10000) / 10000],
    ];
    const ha = calculatePolygonHectares(nextPoly);
    onChangePolygon(nextPoly, ha);
  }

  function handleGenerateSquareLote() {
    if (!onChangePolygon) return;
    const dLat = 0.0042;
    const dLng = 0.0052;
    const square: [number, number][] = [
      [Number((center.lat + dLat).toFixed(4)), Number((center.lng - dLng).toFixed(4))],
      [Number((center.lat + dLat).toFixed(4)), Number((center.lng + dLng).toFixed(4))],
      [Number((center.lat - dLat).toFixed(4)), Number((center.lng + dLng).toFixed(4))],
      [Number((center.lat - dLat).toFixed(4)), Number((center.lng - dLng).toFixed(4))],
    ];
    onChangePolygon(square, calculatePolygonHectares(square));
  }

  const svgPoints = polygon.map(([lat, lng]) => latLngToSvgPoint(lat, lng));
  const polygonPointsAttr = svgPoints.map((p) => `${p.px},${p.py}`).join(" ");
  const centerPoint = latLngToSvgPoint(center.lat, center.lng);

  return (
    <div className="flex flex-col gap-2">
      {!readOnly && !compact && (
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium" style={{ color: "var(--surco-ink-soft)" }}>
              🛰️ Ir a zona:
            </span>
            {TANDIL_ZONE_PRESETS.slice(0, 4).map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => onChangeCenter?.({ lat: p.lat, lng: p.lng }, p)}
                className="px-2 py-1 rounded-md border text-[11px] cursor-pointer hover:opacity-80"
                style={{
                  background: "var(--surco-bg)",
                  borderColor: "var(--surco-border)",
                  color: "var(--surco-ink)",
                }}
              >
                {p.locality}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleGenerateSquareLote}
              className="px-2.5 py-1 rounded-md border text-[11px] font-medium cursor-pointer"
              style={{
                background: "#e4efe4",
                borderColor: "var(--surco-green)",
                color: "var(--surco-green)",
              }}
            >
              ⬠ Trazar lote automático
            </button>
            {polygon.length > 0 && (
              <button
                type="button"
                onClick={() => onChangePolygon?.([], 0)}
                className="px-2 py-1 rounded-md border text-[11px] cursor-pointer"
                style={{
                  background: "var(--surco-bg)",
                  borderColor: "var(--surco-border)",
                  color: "var(--surco-ink-soft)",
                }}
              >
                Limpiar puntos
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className={`relative w-full overflow-hidden rounded-xl border select-none ${
          compact ? "h-28" : "h-60 sm:h-72"
        }`}
        style={{ borderColor: "var(--surco-border)", background: "#1b2e1e" }}
      >
        {/* Mosaico 3x3 de imágenes satelitales reales Esri World Imagery */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
          {tiles.map((t) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${zoom}-${t.tx}-${t.ty}`}
              src={t.url}
              alt=""
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
            />
          ))}
        </div>

        {/* Capa vectorial interactiva para dibujar y visualizar el polígono del lote */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          onClick={handleMapClick}
          className={`absolute inset-0 w-full h-full ${readOnly ? "" : "cursor-crosshair"}`}
        >
          {svgPoints.length >= 2 && (
            <polygon
              points={polygonPointsAttr}
              fill="rgba(54, 185, 92, 0.32)"
              stroke="#4ade80"
              strokeWidth="0.9"
            />
          )}

          {svgPoints.map((pt, i) => (
            <circle
              key={i}
              cx={pt.px}
              cy={pt.py}
              r={compact ? "1.8" : "1.3"}
              fill="#ffffff"
              stroke="#15803d"
              strokeWidth="0.6"
            />
          ))}

          {svgPoints.length === 0 && (
            <circle
              cx={centerPoint.px}
              cy={centerPoint.py}
              r="2"
              fill="#4ade80"
              stroke="#ffffff"
              strokeWidth="0.8"
            />
          )}
        </svg>

        {/* Controles de zoom e información de coordenadas sobre la imagen satelital */}
        {!compact && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 pointer-events-none">
            <span className="px-2 py-1 rounded bg-black/65 text-white text-[11px] font-mono">
              🛰️ {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
              {polygon.length >= 3 ? ` · ${polygon.length} vértices` : ""}
            </span>

            <div className="flex items-center gap-1 pointer-events-auto">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(12, z - 1))}
                className="w-6 h-6 rounded bg-black/70 text-white text-xs font-bold cursor-pointer"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(16, z + 1))}
                className="w-6 h-6 rounded bg-black/70 text-white text-xs font-bold cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>

      {!readOnly && !compact && (
        <p className="text-[11px]" style={{ color: "var(--surco-ink-soft)" }}>
          Hacé clic sobre la imagen satelital para marcar los vértices del lote (o usá “Trazar lote automático”). La superficie en hectáreas se calcula sola.
        </p>
      )}
    </div>
  );
}
