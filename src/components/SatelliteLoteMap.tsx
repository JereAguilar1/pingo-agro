"use client";

import {
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
  WheelEvent as ReactWheelEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { calculatePolygonHectares } from "@/lib/local-knowledge";
import {
  IconCheck,
  IconClose,
  IconMaximize,
  IconSatellite,
  IconTrash,
  IconUndo,
} from "./Icons";

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
  heightClassName?: string;
}

// Conversión Web Mercator (EPSG:3857)
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
  center: initialCenter,
  polygon: initialPolygon,
  onChangePolygon,
  onChangeCenter,
  readOnly = false,
  compact = false,
  heightClassName,
}: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(15);
  const [mapCenter, setMapCenter] = useState(initialCenter);
  const [currentPolygon, setCurrentPolygon] = useState<[number, number][]>(initialPolygon);
  const [history, setHistory] = useState<[number, number][][]>([]);

  // Panning interactivo
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggedVertexIndex, setDraggedVertexIndex] = useState<number | null>(null);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Dimensiones del contenedor del mapa
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewSize, setViewSize] = useState({ width: 600, height: 400 });

  // Sincronizar con props
  useEffect(() => {
    setMapCenter(initialCenter);
  }, [initialCenter]);

  useEffect(() => {
    setCurrentPolygon(initialPolygon);
    if (initialPolygon && initialPolygon.length >= 3) {
      const avgLat = initialPolygon.reduce((acc, p) => acc + p[0], 0) / initialPolygon.length;
      const avgLng = initialPolygon.reduce((acc, p) => acc + p[1], 0) / initialPolygon.length;
      setMapCenter({ lat: avgLat, lng: avgLng });
    }
  }, [initialPolygon]);

  // Actualizar tamaño de viewport en resize o pantalla completa
  useEffect(() => {
    function updateSize() {
      if (isFullscreen) {
        setViewSize({ width: window.innerWidth, height: window.innerHeight });
      } else if (containerRef.current) {
        setViewSize({
          width: containerRef.current.clientWidth || 600,
          height: containerRef.current.clientHeight || (compact ? 112 : 280),
        });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isFullscreen, compact, heightClassName]);

  // Atajos de teclado: Escape para salir de pantalla completa, Ctrl+Z para deshacer
  useEffect(() => {
    if (!isFullscreen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeFullscreen(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen, history, currentPolygon]);

  function pushPolygonChange(nextPoly: [number, number][]) {
    setHistory((prev) => [...prev, currentPolygon]);
    setCurrentPolygon(nextPoly);
    const ha = calculatePolygonHectares(nextPoly);
    onChangePolygon?.(nextPoly, ha);
  }

  function handleUndo() {
    if (history.length === 0 && currentPolygon.length === 0) return;
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setCurrentPolygon(prev);
      const ha = calculatePolygonHectares(prev);
      onChangePolygon?.(prev, ha);
    } else {
      const next = currentPolygon.slice(0, -1);
      setCurrentPolygon(next);
      const ha = calculatePolygonHectares(next);
      onChangePolygon?.(next, ha);
    }
  }

  function handleClear() {
    pushPolygonChange([]);
  }

  function handleAutoSquare() {
    const dLat = 0.0035;
    const dLng = 0.0045;
    const square: [number, number][] = [
      [Number((mapCenter.lat + dLat).toFixed(4)), Number((mapCenter.lng - dLng).toFixed(4))],
      [Number((mapCenter.lat + dLat).toFixed(4)), Number((mapCenter.lng + dLng).toFixed(4))],
      [Number((mapCenter.lat - dLat).toFixed(4)), Number((mapCenter.lng + dLng).toFixed(4))],
      [Number((mapCenter.lat - dLat).toFixed(4)), Number((mapCenter.lng - dLng).toFixed(4))],
    ];
    pushPolygonChange(square);
  }

  function closeFullscreen(apply: boolean) {
    if (!apply) {
      setCurrentPolygon(initialPolygon);
      onChangePolygon?.(initialPolygon, calculatePolygonHectares(initialPolygon));
    }
    setIsFullscreen(false);
  }

  // Coordenadas Web Mercator del centro del mapa
  const centerTile = latLngToTileXY(mapCenter.lat, mapCenter.lng, zoom);

  // Conversión entre (lat, lng) y píxeles de pantalla
  function latLngToScreenPixel(lat: number, lng: number): { x: number; y: number } {
    const tile = latLngToTileXY(lat, lng, zoom);
    const px = viewSize.width / 2 + (tile.x - centerTile.x) * 256 + panOffset.x;
    const py = viewSize.height / 2 + (tile.y - centerTile.y) * 256 + panOffset.y;
    return { x: px, y: py };
  }

  function screenPixelToLatLng(px: number, py: number): { lat: number; lng: number } {
    const tileX = centerTile.x + (px - viewSize.width / 2 - panOffset.x) / 256;
    const tileY = centerTile.y + (py - viewSize.height / 2 - panOffset.y) / 256;
    return tileXYToLatLng(tileX, tileY, zoom);
  }

  // Generación de mosaico de tiles satelitales
  const tilesRadius = isFullscreen ? 4 : 2;
  const tileFractionX = centerTile.x - Math.floor(centerTile.x);
  const tileFractionY = centerTile.y - Math.floor(centerTile.y);
  const tileOriginX = viewSize.width / 2 - tileFractionX * 256 + panOffset.x;
  const tileOriginY = viewSize.height / 2 - tileFractionY * 256 + panOffset.y;

  const tiles: { tx: number; ty: number; left: number; top: number; url: string }[] = [];
  const baseTileX = Math.floor(centerTile.x);
  const baseTileY = Math.floor(centerTile.y);

  for (let gy = -tilesRadius; gy <= tilesRadius; gy++) {
    for (let gx = -tilesRadius; gx <= tilesRadius; gx++) {
      const tx = baseTileX + gx;
      const ty = baseTileY + gy;
      const left = tileOriginX + gx * 256;
      const top = tileOriginY + gy * 256;
      tiles.push({
        tx,
        ty,
        left,
        top,
        url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`,
      });
    }
  }

  // Manejo de eventos de Mouse / Touch
  function handlePointerDown(clientX: number, clientY: number, vertexIdx?: number) {
    if (readOnly) return;
    panStartRef.current = { x: clientX, y: clientY };
    hasMovedRef.current = false;
    if (vertexIdx !== undefined) {
      setDraggedVertexIndex(vertexIdx);
    } else {
      setIsPanning(true);
    }
  }

  function handlePointerMove(clientX: number, clientY: number) {
    const dx = clientX - panStartRef.current.x;
    const dy = clientY - panStartRef.current.y;

    if (Math.hypot(dx, dy) > 4) {
      hasMovedRef.current = true;
    }

    if (draggedVertexIndex !== null) {
      if (containerRef.current || isFullscreen) {
        const rect = isFullscreen
          ? { left: 0, top: 0 }
          : containerRef.current!.getBoundingClientRect();
        const px = clientX - rect.left;
        const py = clientY - rect.top;
        const newCoords = screenPixelToLatLng(px, py);
        const rounded: [number, number] = [
          Math.round(newCoords.lat * 10000) / 10000,
          Math.round(newCoords.lng * 10000) / 10000,
        ];
        setCurrentPolygon((prev) => {
          const next = [...prev];
          next[draggedVertexIndex] = rounded;
          return next;
        });
      }
    } else if (isPanning) {
      setPanOffset({ x: dx, y: dy });
    }
  }

  function handlePointerUp(clientX: number, clientY: number) {
    if (draggedVertexIndex !== null) {
      setDraggedVertexIndex(null);
      const ha = calculatePolygonHectares(currentPolygon);
      onChangePolygon?.(currentPolygon, ha);
      return;
    }

    if (isPanning) {
      setIsPanning(false);
      if (hasMovedRef.current) {
        const newCenterTileX = centerTile.x - panOffset.x / 256;
        const newCenterTileY = centerTile.y - panOffset.y / 256;
        const newCenter = tileXYToLatLng(newCenterTileX, newCenterTileY, zoom);
        setMapCenter(newCenter);
        onChangeCenter?.(newCenter);
        setPanOffset({ x: 0, y: 0 });
      } else if (!readOnly) {
        const rect = isFullscreen
          ? { left: 0, top: 0 }
          : containerRef.current!.getBoundingClientRect();
        const px = clientX - rect.left;
        const py = clientY - rect.top;
        const coords = screenPixelToLatLng(px, py);
        const newPt: [number, number] = [
          Math.round(coords.lat * 10000) / 10000,
          Math.round(coords.lng * 10000) / 10000,
        ];
        pushPolygonChange([...currentPolygon, newPt]);
      }
    }
  }

  function handleWheel(e: ReactWheelEvent) {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(18, z + 1));
    } else if (e.deltaY > 0) {
      setZoom((z) => Math.max(12, z - 1));
    }
  }

  const screenPoints = currentPolygon.map(([lat, lng]) => latLngToScreenPixel(lat, lng));
  const polygonPointsAttr = screenPoints.map((p) => `${p.x},${p.y}`).join(" ");
  const currentHectares = calculatePolygonHectares(currentPolygon);

  // Render del visor de mapa
  const mapCanvas = (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={(e: ReactMouseEvent) => handlePointerDown(e.clientX, e.clientY)}
      onMouseMove={(e: ReactMouseEvent) => handlePointerMove(e.clientX, e.clientY)}
      onMouseUp={(e: ReactMouseEvent) => handlePointerUp(e.clientX, e.clientY)}
      onTouchStart={(e: ReactTouchEvent) => {
        if (e.touches.length === 1) {
          handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchMove={(e: ReactTouchEvent) => {
        if (e.touches.length === 1) {
          handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }}
      onTouchEnd={(e: ReactTouchEvent) => {
        if (e.changedTouches.length === 1) {
          handlePointerUp(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
      }}
      className={`relative w-full overflow-hidden select-none ${
        isFullscreen
          ? "flex-1 h-full cursor-crosshair"
          : heightClassName
          ? `${heightClassName} rounded-xl border`
          : compact
          ? "h-28 rounded-xl border"
          : "h-64 sm:h-72 rounded-xl border"
      } ${!readOnly ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"}`}
      style={{
        background: "#0f1712",
        borderColor: "var(--surco-border-light)",
        touchAction: "none",
      }}
    >
      {/* Botón flotante para ver en pantalla completa en modo de sólo lectura */}
      {readOnly && !isFullscreen && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsFullscreen(true);
          }}
          className="absolute top-2.5 right-2.5 z-10 p-1.5 px-2.5 rounded-lg bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-md flex items-center gap-1.5 text-xs"
          title="Ver en pantalla completa"
          aria-label="Ver mapa en pantalla completa"
        >
          <IconMaximize className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium hidden sm:inline">Pantalla completa</span>
        </button>
      )}

      {/* Capa de mosaico de imágenes satelitales */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${zoom}-${t.tx}-${t.ty}`}
            src={t.url}
            alt=""
            style={{
              position: "absolute",
              left: `${t.left}px`,
              top: `${t.top}px`,
              width: "256px",
              height: "256px",
            }}
            className="pointer-events-none"
            draggable={false}
          />
        ))}
      </div>

      {/* Capa vectorial SVG de trazado */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {screenPoints.length >= 2 && (
          <polygon
            points={polygonPointsAttr}
            fill="rgba(34, 197, 94, 0.32)"
            stroke="#22c55e"
            strokeWidth={isFullscreen ? "2.5" : "1.8"}
            strokeLinejoin="round"
          />
        )}

        {screenPoints.map((pt, i) => (
          <g key={i}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={isFullscreen ? 8 : 4.5}
              fill="#ffffff"
              stroke="#15803d"
              strokeWidth={isFullscreen ? 3 : 1.5}
              className={readOnly ? "" : "pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"}
              onMouseDown={(e: ReactMouseEvent) => {
                e.stopPropagation();
                handlePointerDown(e.clientX, e.clientY, i);
              }}
              onTouchStart={(e: ReactTouchEvent) => {
                e.stopPropagation();
                if (e.touches.length === 1) {
                  handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, i);
                }
              }}
            />
            {isFullscreen && (
              <text
                x={pt.x + 10}
                y={pt.y - 10}
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
                className="select-none pointer-events-none drop-shadow-md"
              >
                P{i + 1}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Brújula / Indicador de zoom y posición */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none">
        <span className="px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white text-[10px] font-mono flex items-center gap-1.5 shadow-md">
          <IconSatellite className="w-3 h-3 text-emerald-400" />
          <span>{mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}</span>
          <span className="opacity-60">· z{zoom}</span>
        </span>
      </div>

      {/* Controles de zoom rápidos en pantalla */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(12, z - 1))}
          className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur-xs text-white text-sm font-semibold cursor-pointer hover:bg-black/90 flex items-center justify-center shadow-md transition-colors"
          title="Alejar mapa"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(18, z + 1))}
          className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur-xs text-white text-sm font-semibold cursor-pointer hover:bg-black/90 flex items-center justify-center shadow-md transition-colors"
          title="Acercar mapa"
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Barra de herramientas superior en modo embebido */}
      {!readOnly && !compact && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {currentHectares > 0 ? `${currentHectares} ha` : "0 ha"}
            </span>
            {currentPolygon.length > 0 && (
              <span className="text-[11px] text-gray-500">
                ({currentPolygon.length} vértices)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs text-white shadow-xs cursor-pointer hover:opacity-95 transition-all"
              style={{ background: "var(--surco-green)" }}
            >
              <IconMaximize className="w-3.5 h-3.5" />
              <span>Trazar en pantalla completa</span>
            </button>
          </div>
        </div>
      )}

      {/* Mapa incrustado */}
      {mapCanvas}

      {/* MODAL / PANTALLA COMPLETA INMERSIVA Y 100% RESPONSIVE PARA MÓVIL Y DESKTOP */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-stone-950 text-white animate-fadeIn w-screen h-screen overflow-hidden">
          {/* Barra superior limpia y perfectamente ajustada a las dimensiones de cualquier pantalla */}
          <header className="w-full px-3 sm:px-5 py-2.5 border-b border-white/10 bg-black/85 backdrop-blur-md flex items-center justify-between gap-2 shrink-0 z-20">
            {/* Izquierda: Botón cerrar + Hectáreas */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => closeFullscreen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white cursor-pointer transition-colors shrink-0"
                title="Cancelar y salir"
                aria-label="Cerrar trazador"
              >
                <IconClose className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-xs font-mono shrink-0">
                  {currentHectares} ha
                </span>
                <span className="text-[11px] text-gray-400 hidden sm:inline truncate">
                  ({currentPolygon.length} vértices)
                </span>
              </div>
            </div>

            {/* Centro: Herramientas de trazado (visibles en desktop/tablet, sólo en modo edición) */}
            {!readOnly && (
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={currentPolygon.length === 0}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-white/15 bg-white/5 hover:bg-white/10 disabled:opacity-40 cursor-pointer transition-colors"
                  title="Deshacer último punto (Ctrl+Z)"
                >
                  <IconUndo className="w-3.5 h-3.5" />
                  <span>Deshacer</span>
                </button>

                <button
                  type="button"
                  onClick={handleAutoSquare}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border border-white/15 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                >
                  Lote centrado
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={currentPolygon.length === 0}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-white/15 bg-white/5 hover:bg-red-500/20 hover:border-red-400/40 text-red-300 disabled:opacity-40 cursor-pointer transition-colors"
                  title="Borrar todos los puntos"
                >
                  <IconTrash className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              </div>
            )}

            {/* Derecha: Botón Confirmar si se edita, o Cerrar si es de sólo lectura */}
            <div className="flex items-center gap-1.5 shrink-0">
              {readOnly ? (
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/20 bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors shrink-0"
                >
                  <IconClose className="w-3.5 h-3.5" />
                  <span>Cerrar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => closeFullscreen(true)}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md transition-all shrink-0"
                >
                  <IconCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Confirmar ({currentHectares} ha)</span>
                  <span className="sm:hidden">Confirmar</span>
                </button>
              )}
            </div>
          </header>

          {/* Lienzo del mapa a pantalla completa */}
          <div className="flex-1 relative overflow-hidden flex flex-col w-full h-full">
            {mapCanvas}

            {/* Barra flotante inferior de herramientas para Mobile (fácil acceso con el pulgar, sólo en modo edición) */}
            {!readOnly && (
              <div className="sm:hidden absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/15 shadow-2xl z-20">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={currentPolygon.length === 0}
                  className="p-2 rounded-xl bg-white/10 text-white disabled:opacity-40 cursor-pointer transition-colors flex items-center justify-center"
                  title="Deshacer último vértice"
                >
                  <IconUndo className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleAutoSquare}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 text-white text-xs font-medium cursor-pointer transition-colors"
                >
                  Centrado
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={currentPolygon.length === 0}
                  className="p-2 rounded-xl bg-white/10 text-red-300 disabled:opacity-40 cursor-pointer transition-colors flex items-center justify-center"
                  title="Limpiar"
                >
                  <IconTrash className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => closeFullscreen(true)}
                  className="ml-0.5 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-emerald-900 text-xs font-bold cursor-pointer transition-colors"
                  title="Confirmar y cerrar"
                >
                  <IconCheck className="w-3.5 h-3.5" />
                  <span>Listo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
