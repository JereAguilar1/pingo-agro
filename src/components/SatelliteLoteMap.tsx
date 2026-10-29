"use client";

import { MouseEvent, useState } from "react";
import { calculatePolygonHectares } from "@/lib/local-knowledge";
import { IconSatellite } from "./Icons";

export interface PresetLocation {
  label: string;
  municipality: string;
  locality: string;
  lat: number;
  lng: number;
}

interface Props {
  center: { lat: number; lng: number };
  polygon: [number, number][];
  onChangePolygon?: (polygon: [number, number][], calculatedHectares: number) => void;
  onChangeCenter?: (center: { lat: number; lng: number }, preset?: PresetLocation) => void;
  readOnly?: boolean;
  compact?: boolean;
}

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
  readOnly = false,
  compact = false,
}: Props) {
  const [zoom, setZoom] = useState(14);
  const centerTile = latLngToTileXY(center.lat, center.lng, zoom);
  const baseTileX = Math.floor(centerTile.x) - 1;
  const baseTileY = Math.floor(centerTile.y) - 1;

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
    <div className="flex flex-col gap-1.5">
      {!readOnly && !compact && (
        <div className="flex items-center justify-end gap-1.5 text-xs">
          <button
            type="button"
            onClick={handleGenerateSquareLote}
            className="px-2.5 py-1 rounded-md border text-[11px] font-medium cursor-pointer transition-colors hover:bg-black/5"
            style={{
              borderColor: "var(--surco-border-light)",
              color: "var(--surco-ink)",
              background: "#ffffff",
            }}
          >
            Trazar lote automático
          </button>
          {polygon.length > 0 && (
            <button
              type="button"
              onClick={() => onChangePolygon?.([], 0)}
              className="px-2 py-1 rounded-md text-[11px] text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      <div
        className={`relative w-full overflow-hidden rounded-xl border select-none ${
          compact ? "h-24" : "h-60 sm:h-64"
        }`}
        style={{ borderColor: "var(--surco-border-light)", background: "#1b2e1e" }}
      >
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

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          onClick={handleMapClick}
          className={`absolute inset-0 w-full h-full ${readOnly ? "" : "cursor-crosshair"}`}
        >
          {svgPoints.length >= 2 && (
            <polygon
              points={polygonPointsAttr}
              fill="rgba(54, 185, 92, 0.35)"
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

        {!compact && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
            <span className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono flex items-center gap-1">
              <IconSatellite className="w-3 h-3 text-emerald-400" />
              <span>{center.lat.toFixed(4)}, {center.lng.toFixed(4)}</span>
            </span>

            <div className="flex items-center gap-1 pointer-events-auto">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(12, z - 1))}
                className="w-5 h-5 rounded bg-black/60 text-white text-xs cursor-pointer hover:bg-black/80 flex items-center justify-center"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(16, z + 1))}
                className="w-5 h-5 rounded bg-black/60 text-white text-xs cursor-pointer hover:bg-black/80 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
