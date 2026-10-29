"use client";

import { ChatThread, ProducerLote } from "@/lib/types";
import {
  IconClose,
  IconFolder,
  IconLayers,
  IconMessage,
  IconPlus,
} from "./Icons";

interface Props {
  lotes: ProducerLote[];
  threads: ChatThread[];
  activeLoteId: string | null;
  activeThreadId: string | null;
  onSelectGeneralChat: (threadId?: string) => void;
  onSelectLoteProject: (loteId: string, threadId?: string) => void;
  onOpenNewLoteWizard: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function ProjectsSidebar({
  lotes,
  threads,
  activeLoteId,
  activeThreadId,
  onSelectGeneralChat,
  onSelectLoteProject,
  onOpenNewLoteWizard,
  isOpenMobile,
  onCloseMobile,
}: Props) {
  const generalThreads = threads.filter((t) => t.loteId === null);

  const sidebarContent = (
    <div
      className="w-72 h-full border-r flex flex-col justify-between select-none"
      style={{
        background: "var(--surco-bg-alt)",
        borderColor: "var(--surco-border-light)",
      }}
    >
      <div className="p-3.5 overflow-y-auto flex-1 flex flex-col gap-6">
        {/* Cabecera / Sección 1: Proyectos de Lotes */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1.5">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: "var(--surco-ink-muted)" }}
            >
              <IconFolder className="w-3.5 h-3.5" />
              Proyectos de Lote
            </span>
            <button
              type="button"
              onClick={() => {
                onOpenNewLoteWizard();
                onCloseMobile();
              }}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg text-white transition-all cursor-pointer hover:opacity-90 shadow-2xs"
              style={{ background: "var(--surco-green)" }}
            >
              <IconPlus className="w-3 h-3" />
              <span>Nuevo Lote</span>
            </button>
          </div>

          <div className="flex flex-col gap-1 mt-1">
            {lotes.map((lote) => {
              const isLoteActive = activeLoteId === lote.id;
              const loteThreads = threads.filter((t) => t.loteId === lote.id);

              return (
                <div key={lote.id} className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectLoteProject(lote.id);
                      onCloseMobile();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl transition-all flex items-center justify-between gap-2 cursor-pointer group"
                    style={{
                      background: isLoteActive ? "var(--surco-card)" : "transparent",
                      border: isLoteActive
                        ? "1px solid var(--surco-border)"
                        : "1px solid transparent",
                      boxShadow: isLoteActive ? "0 1px 3px rgba(0,0,0,0.03)" : "none",
                    }}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          background: isLoteActive ? "var(--surco-green-tint)" : "rgba(0,0,0,0.04)",
                          color: isLoteActive ? "var(--surco-green)" : "var(--surco-ink-soft)",
                        }}
                      >
                        <IconLayers className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-xs font-semibold truncate"
                          style={{ color: isLoteActive ? "var(--surco-ink)" : "var(--surco-ink-soft)" }}
                        >
                          {lote.name}
                        </div>
                        <div className="text-[11px] truncate opacity-70" style={{ color: "var(--surco-ink-soft)" }}>
                          {lote.hectares} ha · {lote.crop}
                        </div>
                      </div>
                    </div>

                    {isLoteActive && (
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: "var(--surco-green)" }}
                      />
                    )}
                  </button>

                  {/* Hilos de conversación del lote seleccionado */}
                  {isLoteActive && (
                    <div className="pl-6 pr-1 py-1 flex flex-col gap-1 border-l-2 ml-4 my-0.5 border-emerald-900/15">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectLoteProject(lote.id, "new");
                          onCloseMobile();
                        }}
                        className="inline-flex items-center gap-1.5 text-left text-[11px] font-medium px-2 py-1 rounded-lg transition-colors cursor-pointer hover:bg-black/5"
                        style={{ color: "var(--surco-green)" }}
                      >
                        <IconPlus className="w-3 h-3" />
                        <span>Nueva consulta en este lote</span>
                      </button>

                      {loteThreads.map((t) => {
                        const isThreadActive = activeThreadId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              onSelectLoteProject(lote.id, t.id);
                              onCloseMobile();
                            }}
                            className="inline-flex items-center gap-2 text-left text-[12px] px-2.5 py-1.5 rounded-lg truncate transition-colors cursor-pointer"
                            style={{
                              background: isThreadActive ? "var(--surco-green-tint)" : "transparent",
                              color: isThreadActive ? "var(--surco-green)" : "var(--surco-ink-soft)",
                              fontWeight: isThreadActive ? 600 : 400,
                            }}
                          >
                            <IconMessage className="w-3 h-3 shrink-0 opacity-60" />
                            <span className="truncate">{t.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección 2: Chats Generales */}
        <div
          className="flex flex-col gap-2 border-t pt-4"
          style={{ borderColor: "var(--surco-border-light)" }}
        >
          <div className="flex items-center justify-between px-1.5">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: "var(--surco-ink-muted)" }}
            >
              <IconMessage className="w-3.5 h-3.5" />
              Consultas Generales
            </span>
            <button
              type="button"
              onClick={() => {
                onSelectGeneralChat("new");
                onCloseMobile();
              }}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border transition-colors cursor-pointer hover:bg-black/5"
              style={{
                background: "var(--surco-card)",
                borderColor: "var(--surco-border)",
                color: "var(--surco-ink)",
              }}
            >
              <IconPlus className="w-3 h-3" />
              <span>Nuevo</span>
            </button>
          </div>

          <div className="flex flex-col gap-1 mt-1">
            <button
              type="button"
              onClick={() => {
                onSelectGeneralChat();
                onCloseMobile();
              }}
              className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-2"
              style={{
                background:
                  activeLoteId === null && !activeThreadId
                    ? "var(--surco-card)"
                    : "transparent",
                border:
                  activeLoteId === null && !activeThreadId
                    ? "1px solid var(--surco-border)"
                    : "1px solid transparent",
                color: "var(--surco-ink)",
              }}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                style={{
                  background:
                    activeLoteId === null && !activeThreadId
                      ? "var(--surco-green-tint)"
                      : "rgba(0,0,0,0.04)",
                  color:
                    activeLoteId === null && !activeThreadId
                      ? "var(--surco-green)"
                      : "var(--surco-ink-soft)",
                }}
              >
                <IconMessage className="w-3 h-3" />
              </div>
              <span className="truncate">Consulta libre sin lote</span>
            </button>

            {generalThreads.map((t) => {
              const isThreadActive = activeThreadId === t.id && activeLoteId === null;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    onSelectGeneralChat(t.id);
                    onCloseMobile();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate transition-colors cursor-pointer flex items-center gap-2"
                  style={{
                    background: isThreadActive ? "var(--surco-green-tint)" : "transparent",
                    color: isThreadActive ? "var(--surco-green)" : "var(--surco-ink-soft)",
                    fontWeight: isThreadActive ? 600 : 400,
                  }}
                >
                  <IconMessage className="w-3 h-3 shrink-0 opacity-50" />
                  <span className="truncate">{t.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pie del sidebar */}
      <div
        className="p-3 border-t text-[11px] flex items-center justify-between"
        style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-ink-muted)" }}
      >
        <span>Surco Agronómico</span>
        <span>v0.2</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block shrink-0">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-fadeIn">
          <div className="relative z-50 h-full shadow-2xl flex">
            {sidebarContent}
            <button
              type="button"
              onClick={onCloseMobile}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/10 text-gray-700 cursor-pointer"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>
          <div
            className="flex-1 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
        </div>
      )}
    </>
  );
}
