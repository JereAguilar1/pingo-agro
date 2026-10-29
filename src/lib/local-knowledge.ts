// Gestión de Proyectos de Lotes (estilo Claude Projects), polígonos satelitales,
// historial de aplicaciones previas y conversaciones por Lote o Generales.

import { ChatThread, ProducerLote } from "./types";
import { LIBRARY } from "./library";

const LOTES_STORAGE_KEY = "surco.local.lotes.v2";
const ACTIVE_LOTE_KEY = "surco.local.active_lote.v2";
const THREADS_STORAGE_KEY = "surco.local.threads.v1";
const SYNC_STATE_KEY = "surco.local.sync_state.v1";

export interface LocalSyncState {
  lastSyncedAt: string;
  libraryVersion: string;
  totalCuratedCards: number;
  normativeAlerts: {
    code: string;
    title: string;
    status: "vigente" | "cautelar_activa" | "requiere_contraste";
    detail: string;
  }[];
  pendingQueriesCount: number;
}

/**
 * Calcula la superficie en hectáreas a partir de un polígono de coordenadas [lat, lng][]
 * usando proyección esférica geodésica.
 */
export function calculatePolygonHectares(polygon: [number, number][]): number {
  if (!polygon || polygon.length < 3) return 0;
  const EARTH_RADIUS = 6378137; // metros
  let areaSqMeters = 0;

  for (let i = 0; i < polygon.length; i++) {
    const [lat1, lng1] = polygon[i];
    const [lat2, lng2] = polygon[(i + 1) % polygon.length];
    const x1 = ((lng1 - polygon[0][1]) * Math.PI * EARTH_RADIUS * Math.cos((polygon[0][0] * Math.PI) / 180)) / 180;
    const y1 = ((lat1 - polygon[0][0]) * Math.PI * EARTH_RADIUS) / 180;
    const x2 = ((lng2 - polygon[0][1]) * Math.PI * EARTH_RADIUS * Math.cos((polygon[0][0] * Math.PI) / 180)) / 180;
    const y2 = ((lat2 - polygon[0][0]) * Math.PI * EARTH_RADIUS) / 180;
    areaSqMeters += x1 * y2 - x2 * y1;
  }

  const hectares = Math.abs(areaSqMeters) / 2 / 10000;
  return Math.round(hectares * 10) / 10;
}

export const DEFAULT_PRODUCER_LOTES: ProducerLote[] = [
  {
    id: "lote-la-loma",
    name: "Lote 4 — La Loma (Gardey, Tandil)",
    hectares: 85,
    crop: "Maíz",
    hybrid: "DK 72-10 Trecepta (Vip3A)",
    plantingDate: "2026-10-15 (Temprano)",
    phenology: "V6 (6 hojas desplegadas)",
    targetYieldTonHa: 10,
    soilNitrateKgHa: 66,
    soilPhosphorusPpm: 14,
    toscaDepthCm: 110,
    rowSpacingCm: 52,
    previousCrop: "Soja 1ra",
    municipality: "Tandil",
    locality: "Gardey",
    sensitiveZoneDistanceM: 650,
    sensitiveZoneType: "Escuela rural",
    relief: "Loma",
    coordinates: { lat: -37.2785, lng: -59.3612 },
    polygon: [
      [-37.275, -59.366],
      [-37.275, -59.356],
      [-37.283, -59.356],
      [-37.283, -59.366],
    ],
    organicMatterPercent: 4.8,
    ph: 6.1,
    sulfurPpm: 11,
    soilTexture: "Franco",
    targetDensityPlantsHa: 72000,
    previousApplications: [
      {
        id: "app-1",
        date: "2026-09-10",
        category: "Herbicida barbecho",
        productName: "Gesaprim 90 WG + Roundup Full II",
        activeIngredient: "Atrazina 90% + Glifosato potásico 66%",
        modeOfAction: "Fotosistema II (Grupo C1) + EPSPS (Grupo G)",
        dose: "1,2 kg/ha + 2,5 l/ha",
        notes: "Barbecho químico largo con buena incorporación por lluvia de 22 mm.",
      },
      {
        id: "app-2",
        date: "2026-10-15",
        category: "Fertilizante",
        productName: "MAP (Fosfato Monoamónico 11-52-0)",
        activeIngredient: "Fósforo 52% P2O5 + Nitrógeno 11%",
        dose: "90 kg/ha a la siembra",
        notes: "Incorporado en la línea al costado y debajo de la semilla.",
      },
    ],
    detectedPestsAndWeeds: [
      "Rama negra (Conyza bonariensis) resistente a glifosato",
      "Yuyo colorado (Amaranthus hybridus)",
    ],
    notes: "Lote profundo de alto potencial, sin limitante de tosca hasta 110 cm.",
  },
  {
    id: "lote-el-cerro",
    name: "Lote 7 — El Cerro Somero (Vela, Tandil)",
    hectares: 60,
    crop: "Maíz",
    hybrid: "Next 22.6 PWU",
    plantingDate: "2026-11-28 (Tardío)",
    phenology: "V3 (3 hojas desplegadas)",
    targetYieldTonHa: 7.5,
    soilNitrateKgHa: 55,
    soilPhosphorusPpm: 17,
    toscaDepthCm: 58,
    rowSpacingCm: 52,
    previousCrop: "Trigo / Soja 2da",
    municipality: "Tandil",
    locality: "María Ignacia (Vela)",
    sensitiveZoneDistanceM: 180,
    sensitiveZoneType: "Curso de agua / Arroyo",
    relief: "Media loma",
    coordinates: { lat: -37.4025, lng: -59.5034 },
    polygon: [
      [-37.399, -59.508],
      [-37.399, -59.499],
      [-37.406, -59.499],
      [-37.406, -59.508],
    ],
    organicMatterPercent: 3.9,
    ph: 6.3,
    sulfurPpm: 9,
    soilTexture: "Franco-arenoso",
    targetDensityPlantsHa: 50000,
    previousApplications: [
      {
        id: "app-3",
        date: "2026-10-05",
        category: "Herbicida barbecho",
        productName: "Metsulfurón 60 WG + 2,4-D Enlist Colex-D",
        activeIngredient: "Metsulfurón metil 60% + 2,4-D sal colina",
        modeOfAction: "Inhibidor ALS (Grupo B) + Auxínico (Grupo O)",
        dose: "6 g/ha + 1,5 l/ha",
        notes: "Atención al período de carencia / intervalo de rotación por sulfonilurea.",
      },
    ],
    detectedPestsAndWeeds: [
      "Raigrás anual (Lolium multiflorum)",
      "Oruga cogollera (Spodoptera frugiperda)",
    ],
    notes: "Suelo somero con plancha de tosca a 58 cm. Próximo a arroyo rural (180 m).",
  },
];

export function getSavedLotes(): ProducerLote[] {
  if (typeof window === "undefined") return DEFAULT_PRODUCER_LOTES;
  try {
    const raw = window.localStorage.getItem(LOTES_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(LOTES_STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCER_LOTES));
      return DEFAULT_PRODUCER_LOTES;
    }
    const parsed = JSON.parse(raw) as ProducerLote[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PRODUCER_LOTES;
  } catch {
    return DEFAULT_PRODUCER_LOTES;
  }
}

export function saveLotes(lotes: ProducerLote[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOTES_STORAGE_KEY, JSON.stringify(lotes));
  } catch {
    // ignore storage quota errors
  }
}

export function getActiveLoteId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_LOTE_KEY);
  } catch {
    return null;
  }
}

export function setActiveLoteId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!id) {
      window.localStorage.removeItem(ACTIVE_LOTE_KEY);
    } else {
      window.localStorage.setItem(ACTIVE_LOTE_KEY, id);
    }
  } catch {
    // ignore
  }
}

export function getActiveLote(): ProducerLote | null {
  const id = getActiveLoteId();
  if (!id) return null;
  const lotes = getSavedLotes();
  return lotes.find((l) => l.id === id) ?? null;
}

export function getSavedThreads(): ChatThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(THREADS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatThread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: ChatThread[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(threads));
  } catch {
    // ignore
  }
}

export function getLocalSyncState(): LocalSyncState {
  const defaultState: LocalSyncState = {
    lastSyncedAt: "2026-10-28 22:00",
    libraryVersion: "v2.5-proyectos-lotes",
    totalCuratedCards: LIBRARY.length,
    normativeAlerts: [
      {
        code: "R14 / R16",
        title: "Ordenanza Tandil 17.404/21 y Decreto 423/2026",
        status: "cautelar_activa",
        detail: "Suspensión judicial precautoria vigente sobre el Art. 8 (zonas de amortiguamiento).",
      },
      {
        code: "R09",
        title: "Guía Modos de Acción Herbicida (REM 2013)",
        status: "requiere_contraste",
        detail: "Publicación conceptual de 2013: contrastar autorizaciones en vademécum SENASA [R02].",
      },
      {
        code: "M01–M05",
        title: "Fichas Técnicas Maíz INTA Balcarce / PRECOP",
        status: "vigente",
        detail: "Tablas de N/P, fenología V/R, densidad por tosca y pérdidas de cosecha actualizadas.",
      },
    ],
    pendingQueriesCount: 0,
  };

  if (typeof window === "undefined") return defaultState;
  try {
    const raw = window.localStorage.getItem(SYNC_STATE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<LocalSyncState>;
    return {
      ...defaultState,
      ...parsed,
      totalCuratedCards: LIBRARY.length,
    };
  } catch {
    return defaultState;
  }
}

export function triggerOnlineBaseSync(): LocalSyncState {
  const now = new Date();
  const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;

  const updated: LocalSyncState = {
    ...getLocalSyncState(),
    lastSyncedAt: formatted,
    totalCuratedCards: LIBRARY.length,
    pendingQueriesCount: 0,
  };

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
  return updated;
}
