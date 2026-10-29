"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { TopNavbar } from "@/components/TopNavbar";
import { ProjectsSidebar } from "@/components/ProjectsSidebar";
import { LoteWizardModal } from "@/components/LoteWizardModal";
import { SatelliteLoteMap } from "@/components/SatelliteLoteMap";
import { DEFAULT_PRODUCER_LOTES, getSavedLotes, getSavedThreads, saveLotes } from "@/lib/local-knowledge";
import { ChatThread, ProducerLote } from "@/lib/types";
import {
  IconChevronRight,
  IconLayers,
  IconMapPin,
  IconMessage,
  IconPlus,
  IconSearch,
  IconSparkles,
} from "@/components/Icons";
import { daysSincePlanting } from "@/lib/lote-utils";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 13) return "Buen día";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default function Home() {
  const router = useRouter();
  const [lotes, setLotes] = useState<ProducerLote[]>(DEFAULT_PRODUCER_LOTES);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showLoteWizard, setShowLoteWizard] = useState(false);
  const [search, setSearch] = useState("");
  const [cropFilter, setCropFilter] = useState<string>("Todos");

  useEffect(() => {
    setLotes(getSavedLotes());
    setThreads(getSavedThreads());
  }, []);

  const totalHectares = lotes.reduce((acc, l) => acc + (l.hectares || 0), 0);
  const crops = useMemo(
    () => Array.from(new Set(lotes.map((l) => l.crop).filter(Boolean))),
    [lotes]
  );

  const filteredLotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lotes.filter((l) => {
      if (cropFilter !== "Todos" && l.crop !== cropFilter) return false;
      if (!q) return true;
      return [l.name, l.municipality, l.locality, l.crop, l.hybrid]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [lotes, search, cropFilter]);

  function threadsCountFor(loteId: string) {
    return threads.filter((t) => t.loteId === loteId).length;
  }

  function handleSaveLoteFromWizard(saved: ProducerLote) {
    const next = [saved, ...lotes.filter((l) => l.id !== saved.id)];
    setLotes(next);
    saveLotes(next);
    setShowLoteWizard(false);
    router.push(`/chat?lote=${encodeURIComponent(saved.id)}`);
  }

  const stats = [
    { label: lotes.length === 1 ? "Lote" : "Lotes", value: String(lotes.length) },
    { label: "Hectáreas", value: totalHectares.toLocaleString("es-AR") },
    { label: crops.length === 1 ? "Cultivo" : "Cultivos", value: String(crops.length) },
    { label: "Consultas", value: String(threads.length) },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen" style={{ background: "var(--surco-bg)" }}>
      <TopNavbar onToggleSidebar={() => setShowSidebar((prev) => !prev)} />

      <ProjectsSidebar
        lotes={lotes}
        threads={threads}
        activeLoteId={null}
        activeThreadId={null}
        onSelectGeneralChat={(threadId) => {
          setShowSidebar(false);
          if (threadId && threadId !== "new") {
            router.push(`/chat?lote=general&thread=${encodeURIComponent(threadId)}`);
          } else {
            router.push("/chat?lote=general");
          }
        }}
        onSelectLoteProject={(loteId, threadId) => {
          setShowSidebar(false);
          if (threadId && threadId !== "new") {
            router.push(`/chat?lote=${encodeURIComponent(loteId)}&thread=${encodeURIComponent(threadId)}`);
          } else {
            router.push(`/chat?lote=${encodeURIComponent(loteId)}`);
          }
        }}
        onOpenNewLoteWizard={() => {
          setShowSidebar(false);
          setShowLoteWizard(true);
        }}
        isOpenMobile={showSidebar}
        onCloseMobile={() => setShowSidebar(false)}
        isCollapsedDesktop={true}
      />

      <LoteWizardModal
        isOpen={showLoteWizard}
        onClose={() => setShowLoteWizard(false)}
        onSaveLote={handleSaveLoteFromWizard}
      />

      {/* Dashboard administrativo de lotes */}
      <main className="flex-1 w-full px-4 sm:px-6 py-6 sm:py-9 pb-28">
        <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
          {/* Encabezado */}
          <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                {greeting()} 👋
              </span>
              <h1
                className="text-[26px] sm:text-[32px] font-extrabold tracking-tight leading-tight"
                style={{ color: "var(--surco-ink)" }}
              >
                Tu campo
              </h1>
              <p className="text-[13.5px]" style={{ color: "var(--surco-ink-soft)" }}>
                Administrá tus lotes y consultá sobre cada uno con su contexto cargado.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowLoteWizard(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm cursor-pointer transition-all hover:opacity-95 hover:shadow-md active:scale-[0.98]"
              style={{ background: "var(--surco-green)" }}
            >
              <IconPlus className="w-4 h-4" />
              <span>Nuevo lote</span>
            </button>
          </header>

          {/* Indicadores generales */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl px-4 py-3.5 border bg-white"
                style={{ borderColor: "var(--surco-border-light)" }}
              >
                <div
                  className="text-2xl sm:text-[28px] font-extrabold leading-none tabular-nums"
                  style={{ color: "var(--surco-green)" }}
                >
                  {s.value}
                </div>
                <div className="text-xs mt-1.5 font-medium" style={{ color: "var(--surco-ink-muted)" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </section>

          {/* Barra de búsqueda y filtros */}
          <section className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div
              className="flex items-center gap-2 px-3 rounded-xl border bg-white sm:w-72"
              style={{ borderColor: "var(--surco-border)" }}
            >
              <IconSearch className="w-4 h-4 shrink-0" style={{ color: "var(--surco-ink-muted)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar lote, localidad…"
                className="w-full bg-transparent py-2.5 outline-none text-sm"
                style={{ color: "var(--surco-ink)" }}
              />
            </div>

            {crops.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {["Todos", ...crops].map((c) => {
                  const active = cropFilter === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCropFilter(c)}
                      className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-colors"
                      style={{
                        background: active ? "var(--surco-green)" : "white",
                        color: active ? "white" : "var(--surco-ink-soft)",
                        borderColor: active ? "var(--surco-green)" : "var(--surco-border)",
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Grilla de lotes */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLotes.map((lote) => {
              const days = daysSincePlanting(lote.plantingDate);
              const nThreads = threadsCountFor(lote.id);
              return (
                <article
                  key={lote.id}
                  onClick={() => router.push(`/chat?lote=${encodeURIComponent(lote.id)}`)}
                  className="group rounded-[20px] border bg-white overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 flex flex-col"
                  style={{ borderColor: "var(--surco-border-light)" }}
                >
                  {/* Miniatura satelital */}
                  <div className="relative">
                    <SatelliteLoteMap
                      center={lote.coordinates || { lat: -37.2785, lng: -59.3612 }}
                      polygon={lote.polygon || []}
                      readOnly
                      preview
                      heightClassName="h-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0 pointer-events-none" />
                    <span
                      className="absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm"
                      style={{ background: "rgba(255,255,255,0.92)", color: "var(--surco-green)" }}
                    >
                      {lote.crop}
                    </span>
                    <span className="absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/60 text-white backdrop-blur-sm">
                      {lote.hectares} ha
                    </span>
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-1 text-white text-[11.5px] font-medium">
                      <IconMapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {lote.locality ? `${lote.locality}, ` : ""}
                        {lote.municipality}
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo */}
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h2
                        className="text-[15px] font-bold leading-snug line-clamp-2 group-hover:text-emerald-900 transition-colors"
                        style={{ color: "var(--surco-ink)" }}
                      >
                        {lote.name}
                      </h2>
                      <IconChevronRight
                        className="w-4 h-4 mt-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform"
                        style={{ color: "var(--surco-ink-muted)" }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="rounded-xl py-2" style={{ background: "var(--surco-bg-alt)" }}>
                        <div className="text-[13px] font-bold" style={{ color: "var(--surco-ink)" }}>
                          {lote.phenology.split(" ")[0]}
                        </div>
                        <div className="text-[10.5px]" style={{ color: "var(--surco-ink-muted)" }}>
                          Estadio
                        </div>
                      </div>
                      <div className="rounded-xl py-2" style={{ background: "var(--surco-bg-alt)" }}>
                        <div className="text-[13px] font-bold" style={{ color: "var(--surco-ink)" }}>
                          {lote.targetYieldTonHa} t
                        </div>
                        <div className="text-[10.5px]" style={{ color: "var(--surco-ink-muted)" }}>
                          Objetivo
                        </div>
                      </div>
                      <div className="rounded-xl py-2" style={{ background: "var(--surco-bg-alt)" }}>
                        <div className="text-[13px] font-bold" style={{ color: "var(--surco-ink)" }}>
                          {days !== null ? `${days} d` : "—"}
                        </div>
                        <div className="text-[10.5px]" style={{ color: "var(--surco-ink-muted)" }}>
                          Desde siembra
                        </div>
                      </div>
                    </div>

                    <div
                      className="mt-auto pt-3 flex items-center justify-between text-xs border-t"
                      style={{ borderColor: "var(--surco-border-light)" }}
                    >
                      <span className="inline-flex items-center gap-1.5" style={{ color: "var(--surco-ink-muted)" }}>
                        <IconMessage className="w-3.5 h-3.5" />
                        {nThreads === 0 ? "Sin consultas" : `${nThreads} consulta${nThreads > 1 ? "s" : ""}`}
                      </span>
                      <span className="font-semibold" style={{ color: "var(--surco-green)" }}>
                        Ver lote
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Tarjeta para agregar lote */}
            <button
              type="button"
              onClick={() => setShowLoteWizard(true)}
              className="min-h-[280px] rounded-[20px] flex flex-col items-center justify-center gap-3 p-6 cursor-pointer transition-all hover:bg-white hover:shadow-sm group"
              style={{ border: "2px dashed var(--surco-border)" }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105"
                style={{ background: "var(--surco-green-tint)" }}
              >
                <IconPlus className="w-6 h-6" style={{ color: "var(--surco-green)" }} />
              </div>
              <div className="text-center">
                <div className="text-[15px] font-bold" style={{ color: "var(--surco-ink)" }}>
                  Agregar un lote
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--surco-ink-muted)" }}>
                  Trazalo en el mapa satelital
                </div>
              </div>
            </button>
          </section>

          {filteredLotes.length === 0 && lotes.length > 0 && (
            <div className="text-center text-sm py-4" style={{ color: "var(--surco-ink-muted)" }}>
              <IconLayers className="w-5 h-5 mx-auto mb-1.5 opacity-60" />
              Ningún lote coincide con la búsqueda.
            </div>
          )}
        </div>
      </main>

      {/* Asistente: funcionalidad secundaria, accesible como botón flotante */}
      <button
        type="button"
        onClick={() => router.push("/chat?lote=general")}
        className="fixed bottom-5 right-5 z-20 inline-flex items-center gap-2 pl-3.5 pr-4 py-3 rounded-full text-sm font-bold text-white shadow-lg cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
        style={{ background: "var(--surco-green)" }}
        aria-label="Consultar al asistente"
      >
        <IconSparkles className="w-4 h-4" />
        <span>Consultar</span>
      </button>
    </div>
  );
}
