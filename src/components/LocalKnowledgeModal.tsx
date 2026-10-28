"use client";

import { useState } from "react";
import { ProducerLote } from "@/lib/types";
import { LIBRARY } from "@/lib/library";
import {
  getLocalSyncState,
  LocalSyncState,
  saveLotes,
  triggerOnlineBaseSync,
} from "@/lib/local-knowledge";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lotes: ProducerLote[];
  activeLoteId: string | null;
  onSelectLote: (id: string | null) => void;
  onUpdateLotes: (updated: ProducerLote[]) => void;
  isOnline: boolean;
}

export function LocalKnowledgeModal({
  isOpen,
  onClose,
  lotes,
  activeLoteId,
  onSelectLote,
  onUpdateLotes,
  isOnline,
}: Props) {
  const [tab, setTab] = useState<"lotes" | "fichas" | "sync">("lotes");
  const [syncState, setSyncState] = useState<LocalSyncState>(() => getLocalSyncState());
  const [syncing, setSyncing] = useState(false);

  // Estado para agregar nuevo lote rápido
  const [newLoteName, setNewLoteName] = useState("");
  const [newHybrid, setNewHybrid] = useState("DK 72-20 VT3P");
  const [newPhenology, setNewPhenology] = useState("V6 (6 hojas)");
  const [newTargetYield, setNewTargetYield] = useState("9.5");
  const [newSoilN, setNewSoilN] = useState("60");
  const [newSoilP, setNewSoilP] = useState("13");
  const [newTosca, setNewTosca] = useState("90");

  if (!isOpen) return null;

  function handleAddLote(e: React.FormEvent) {
    e.preventDefault();
    if (!newLoteName.trim()) return;
    const created: ProducerLote = {
      id: `lote-${Date.now()}`,
      name: newLoteName.trim(),
      hectares: 75,
      crop: "Maíz",
      hybrid: newHybrid.trim() || "Híbrido Maíz",
      plantingDate: "2026-10-20",
      phenology: newPhenology,
      targetYieldTonHa: parseFloat(newTargetYield) || 9,
      soilNitrateKgHa: parseFloat(newSoilN) || 55,
      soilPhosphorusPpm: parseFloat(newSoilP) || 14,
      toscaDepthCm: parseFloat(newTosca) || 85,
      rowSpacingCm: 52,
      previousCrop: "Soja",
      municipality: "Tandil",
    };
    const next = [...lotes, created];
    saveLotes(next);
    onUpdateLotes(next);
    onSelectLote(created.id);
    setNewLoteName("");
  }

  function handleSyncNow() {
    setSyncing(true);
    setTimeout(() => {
      const next = triggerOnlineBaseSync();
      setSyncState(next);
      setSyncing(false);
    }, 500);
  }

  const maizeCards = LIBRARY.filter((f) => f.sourceCode.startsWith("M") || f.crop === "Maíz");
  const generalCards = LIBRARY.filter((f) => !f.sourceCode.startsWith("M"));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl border shadow-xl flex flex-col overflow-hidden"
        style={{ background: "var(--surco-card)", borderColor: "var(--surco-border)" }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ background: "#eef3fb", borderColor: "#c8d7ee" }}
        >
          <div>
            <h2 className="font-bold text-base sm:text-lg flex items-center gap-2" style={{ color: "#1d3b6c" }}>
              <span>🗄️ Base de Conocimiento Local</span>
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-white border border-blue-200">
                100% On-Device
              </span>
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#3d5a8a" }}>
              Fichas curadas · Documentos con página y fecha · Mis Lotes 🔒
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 cursor-pointer"
            style={{ borderColor: "var(--surco-border)", color: "var(--surco-ink)" }}
          >
            Cerrar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-4 pt-2 gap-2" style={{ borderColor: "var(--surco-border)", background: "var(--surco-bg)" }}>
          <button
            type="button"
            onClick={() => setTab("lotes")}
            className="px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer"
            style={{
              borderColor: tab === "lotes" ? "var(--surco-green)" : "transparent",
              color: tab === "lotes" ? "var(--surco-green)" : "var(--surco-ink-soft)",
            }}
          >
            🔒 Mis Lotes ({lotes.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("fichas")}
            className="px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer"
            style={{
              borderColor: tab === "fichas" ? "var(--surco-green)" : "transparent",
              color: tab === "fichas" ? "var(--surco-green)" : "var(--surco-ink-soft)",
            }}
          >
            📄 Fichas Maíz y Guías ({LIBRARY.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("sync")}
            className="px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer"
            style={{
              borderColor: tab === "sync" ? "var(--surco-green)" : "transparent",
              color: tab === "sync" ? "var(--surco-green)" : "var(--surco-ink-soft)",
            }}
          >
            ☁️ Sincronización y Vigencia
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {tab === "lotes" && (
            <>
              <div className="rounded-xl p-3 text-xs border" style={{ background: "#f3f5ec", borderColor: "#cbd4b0", color: "#3d4822" }}>
                <strong>¿Cómo usa el flujo tus Lotes 🔒?</strong> Cuando seleccionás un lote activo, la etapa{" "}
                <strong>1 · ENTIENDE</strong> lee automáticamente el híbrido, estadio fenológico, N inicial, P Bray y profundidad de tosca del lote para resolver cálculos en{" "}
                <strong>2 · RESUELVE</strong> sin repreguntarte lo que ya cargaste.
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => onSelectLote(null)}
                  className="text-left rounded-xl p-3 border transition-all cursor-pointer flex items-center justify-between"
                  style={{
                    borderColor: activeLoteId === null ? "#c23b30" : "var(--surco-border)",
                    background: activeLoteId === null ? "#fdf2f2" : "var(--surco-bg)",
                  }}
                >
                  <div>
                    <div className="font-semibold text-xs sm:text-sm" style={{ color: "var(--surco-ink)" }}>
                      Sin lote seleccionado (Modo consulta abierta / Repregunta activa)
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--surco-ink-soft)" }}>
                      Ideal para probar el circuito rojo punteado: si falta un dato, el asistente repregunta.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: activeLoteId === null ? "#c23b30" : "var(--surco-bg-alt)", color: activeLoteId === null ? "#fff" : "var(--surco-ink-soft)" }}>
                    {activeLoteId === null ? "Activo" : "Elegir"}
                  </span>
                </button>

                {lotes.map((l) => {
                  const isSelected = activeLoteId === l.id;
                  return (
                    <div
                      key={l.id}
                      onClick={() => onSelectLote(l.id)}
                      className="rounded-xl p-3.5 border transition-all cursor-pointer flex flex-col gap-2"
                      style={{
                        borderColor: isSelected ? "var(--surco-green)" : "var(--surco-border)",
                        background: isSelected ? "#edf6f0" : "var(--surco-card)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-sm flex items-center gap-1.5" style={{ color: "var(--surco-ink)" }}>
                          <span>🔒 {l.name}</span>
                          <span className="text-xs font-normal px-2 py-0.5 rounded bg-white border" style={{ borderColor: "var(--surco-border)" }}>
                            {l.hectares} ha · {l.crop}
                          </span>
                        </div>
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            background: isSelected ? "var(--surco-green)" : "var(--surco-bg-alt)",
                            color: isSelected ? "#fff" : "var(--surco-ink-soft)",
                          }}
                        >
                          {isSelected ? "✓ Lote Activo" : "Usar este lote"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs" style={{ color: "var(--surco-ink-soft)" }}>
                        <div>
                          <strong>Híbrido:</strong> {l.hybrid}
                        </div>
                        <div>
                          <strong>Fenología:</strong> {l.phenology}
                        </div>
                        <div>
                          <strong>Rinde Obj.:</strong> {l.targetYieldTonHa} t/ha
                        </div>
                        <div>
                          <strong>N-NO3 (0-60cm):</strong> {l.soilNitrateKgHa} kg N/ha
                        </div>
                        <div>
                          <strong>P Bray (0-20cm):</strong> {l.soilPhosphorusPpm} ppm
                        </div>
                        <div>
                          <strong>Prof. Tosca:</strong> {l.toscaDepthCm} cm
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Formulario rápido para agregar otro lote */}
              <form onSubmit={handleAddLote} className="rounded-xl border p-3.5 flex flex-col gap-2.5 mt-1" style={{ background: "var(--surco-bg)", borderColor: "var(--surco-border)" }}>
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--surco-ink)" }}>
                  + Cargar nuevo lote en el dispositivo (Offline 🔒)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <input
                    type="text"
                    placeholder="Nombre (ej. Lote 9 El Molino)"
                    value={newLoteName}
                    onChange={(e) => setNewLoteName(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border bg-white"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                  <input
                    type="text"
                    placeholder="Híbrido (ej. DK 72-20)"
                    value={newHybrid}
                    onChange={(e) => setNewHybrid(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border bg-white"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                  <input
                    type="text"
                    placeholder="Estadio (ej. V6)"
                    value={newPhenology}
                    onChange={(e) => setNewPhenology(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border bg-white"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="Rinde obj. (t/ha)"
                    value={newTargetYield}
                    onChange={(e) => setNewTargetYield(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border bg-white"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                  <input
                    type="number"
                    placeholder="N suelo 0-60 (kg/ha)"
                    value={newSoilN}
                    onChange={(e) => setNewSoilN(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border bg-white"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                  <input
                    type="number"
                    placeholder="Prof. tosca (cm)"
                    value={newTosca}
                    onChange={(e) => setNewTosca(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border bg-white"
                    style={{ borderColor: "var(--surco-border)" }}
                  />
                </div>
                <button
                  type="submit"
                  className="self-start text-xs font-semibold px-3 py-1.5 rounded-lg text-white cursor-pointer"
                  style={{ background: "var(--surco-green)" }}
                >
                  Guardar lote en Base Local
                </button>
              </form>
            </>
          )}

          {tab === "fichas" && (
            <div className="flex flex-col gap-3">
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--surco-green)" }}>
                🌽 Fichas Curadas de Maíz ({maizeCards.length})
              </div>
              {maizeCards.map((f) => (
                <div key={f.id} className="rounded-xl border p-3 text-xs flex flex-col gap-1" style={{ borderColor: "var(--surco-border)", background: "var(--surco-bg)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold font-mono px-2 py-0.5 rounded bg-green-100 text-green-900">
                      {f.sourceCode} · {f.institution}
                    </span>
                    <span style={{ color: "var(--surco-ink-muted)" }}>
                      {f.page || f.section} · Fecha: {f.date || f.accessedOn}
                    </span>
                  </div>
                  <div className="font-semibold" style={{ color: "var(--surco-ink)" }}>
                    {f.title}
                  </div>
                  <p style={{ color: "var(--surco-ink-soft)" }}>{f.text}</p>
                </div>
              ))}

              <div className="text-xs font-bold uppercase tracking-wide mt-2" style={{ color: "var(--surco-ink-soft)" }}>
                📚 Normativa y Documentos Generales ({generalCards.length})
              </div>
              {generalCards.slice(0, 10).map((f) => (
                <div key={f.id} className="rounded-xl border p-2.5 text-xs flex items-center justify-between gap-2" style={{ borderColor: "var(--surco-border)" }}>
                  <div>
                    <span className="font-mono font-bold mr-1.5">{f.sourceCode}</span>
                    <span className="font-medium">{f.institution}:</span> {f.title}
                  </div>
                  <span className="text-[11px] shrink-0" style={{ color: "var(--surco-ink-muted)" }}>
                    {f.date || f.accessedOn}
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === "sync" && (
            <div className="flex flex-col gap-3">
              <div
                className="rounded-xl p-4 border flex items-center justify-between flex-wrap gap-3"
                style={{ background: "#eef5fb", borderColor: "#bfd6ed" }}
              >
                <div>
                  <div className="font-bold text-sm" style={{ color: "#1d446b" }}>
                    ☁️ CON CONEXIÓN (cuando hay señal)
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "#355d84" }}>
                    Última actualización de Base Local: <strong>{syncState.lastSyncedAt}</strong> · Versión:{" "}
                    <span className="font-mono">{syncState.libraryVersion}</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!isOnline || syncing}
                  onClick={handleSyncNow}
                  className="text-xs font-semibold px-3.5 py-2 rounded-xl text-white transition-opacity disabled:opacity-50 cursor-pointer"
                  style={{ background: "#23588c" }}
                >
                  {syncing
                    ? "Verificando novedades..."
                    : isOnline
                    ? "🔄 Actualizar base y vigilar normativa"
                    : "📴 Sin señal (Modo Offline activo)"}
                </button>
              </div>

              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--surco-ink)" }}>
                Estado de Vigencia Normativa y Documental (Usado por Etapa 4 · VERIFICA)
              </div>
              {syncState.normativeAlerts.map((alert) => (
                <div
                  key={alert.code}
                  className="rounded-xl border p-3 text-xs flex flex-col gap-1"
                  style={{ borderColor: "var(--surco-border)", background: "var(--surco-bg)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      [{alert.code}] {alert.title}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{
                        background:
                          alert.status === "vigente"
                            ? "#e4efe4"
                            : alert.status === "cautelar_activa"
                            ? "#fdecec"
                            : "#f3e9d2",
                        color:
                          alert.status === "vigente"
                            ? "#205430"
                            : alert.status === "cautelar_activa"
                            ? "#991b1b"
                            : "#8a5a10",
                      }}
                    >
                      {alert.status === "vigente"
                        ? "✓ Vigente"
                        : alert.status === "cautelar_activa"
                        ? "⚠ Cautelar judicial activa"
                        : "⚠ Contrastar con registro"}
                    </span>
                  </div>
                  <p style={{ color: "var(--surco-ink-soft)" }}>{alert.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
