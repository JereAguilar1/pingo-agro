// Gestión de la Base de Conocimiento Local (🗄️ Fichas curadas · Documentos · Lotes 🔒)
// y del estado de sincronización cuando hay señal (☁️ CON CONEXIÓN).

import { ProducerLote } from "./types";
import { LIBRARY } from "./library";

const LOTES_STORAGE_KEY = "surco.local.lotes.v1";
const ACTIVE_LOTE_KEY = "surco.local.active_lote.v1";
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

export const DEFAULT_PRODUCER_LOTES: ProducerLote[] = [
  {
    id: "lote-la-loma",
    name: "Lote 4 — La Loma (Tandil)",
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
    sensitiveZoneDistanceM: 650,
  },
  {
    id: "lote-el-cerro",
    name: "Lote 7 — El Cerro Somero (Vela)",
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
    sensitiveZoneDistanceM: 180,
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

export function getLocalSyncState(): LocalSyncState {
  const defaultState: LocalSyncState = {
    lastSyncedAt: "2026-10-28 16:00",
    libraryVersion: "v2.4-maiz-tandil",
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
