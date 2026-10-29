"use client";

import { ChatThread, ProducerLote } from "@/lib/types";
import {
  IconClose,
  IconFolder,
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
  isCollapsedDesktop?: boolean;
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
  isCollapsedDesktop = false,
}: Props) {
  const generalThreads = threads.filter((t) => t.loteId === null);

  const sidebarContent = (
    <div
      className="w-64 h-full border-r flex flex-col justify-between select-none"
      style={{
        background: "var(--surco-bg-alt)",
        borderColor: "var(--surco-border-light)",
      }}
    >
      <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-5">
        {/* Sección: Proyectos (Lotes) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 text-gray-500"
            >
              <IconFolder className="w-3 h-3" />
              Proyectos (Lotes)
            </span>
            <button
              type="button"
              onClick={() => {
                onOpenNewLoteWizard();
                onCloseMobile();
              }}
              className="p-1 rounded text-gray-500 hover:text-emerald-900 cursor-pointer"
              title="Crear nuevo lote"
            >
              <IconPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-0.5">
            {lotes.map((lote) => {
              const isLoteActive = activeLoteId === lote.id;
              const loteThreads = threads.filter((t) => t.loteId === lote.id);

              return (
                <div key={lote.id} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectLoteProject(lote.id);
                      onCloseMobile();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg transition-colors flex items-center justify-between gap-2 cursor-pointer"
                    style={{
                      background: isLoteActive ? "var(--surco-card)" : "transparent",
                      border: isLoteActive
                        ? "1px solid var(--surco-border-light)"
                        : "1px solid transparent",
                    }}
                  >
                    <div className="min-w-0">
                      <div
                        className="text-xs font-medium truncate"
                        style={{ color: isLoteActive ? "var(--surco-green)" : "var(--surco-ink)" }}
                      >
                        {lote.name}
                      </div>
                      <div className="text-[10px] truncate text-gray-400">
                        {lote.hectares} ha · {lote.crop}
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
                    <div className="pl-3 py-0.5 flex flex-col gap-0.5 border-l ml-3 my-0.5 border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectLoteProject(lote.id, "new");
                          onCloseMobile();
                        }}
                        className="text-left text-[11px] px-2 py-1 rounded text-emerald-800 font-medium cursor-pointer hover:bg-black/5"
                      >
                        + Nueva consulta
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
                            className="text-left text-[11px] px-2 py-1 rounded truncate transition-colors cursor-pointer"
                            style={{
                              background: isThreadActive ? "var(--surco-card)" : "transparent",
                              color: isThreadActive ? "var(--surco-green)" : "var(--surco-ink-soft)",
                              fontWeight: isThreadActive ? 600 : 400,
                            }}
                          >
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

        {/* Sección: Historial de Chats Generales */}
        <div
          className="flex flex-col gap-1.5 border-t pt-3"
          style={{ borderColor: "var(--surco-border-light)" }}
        >
          <div className="flex items-center justify-between px-1">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 text-gray-500"
            >
              <IconMessage className="w-3 h-3" />
              Historial de Chats
            </span>
            <button
              type="button"
              onClick={() => {
                onSelectGeneralChat("new");
                onCloseMobile();
              }}
              className="p-1 rounded text-gray-500 hover:text-emerald-900 cursor-pointer"
              title="Nueva consulta general"
            >
              <IconPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => {
                onSelectGeneralChat();
                onCloseMobile();
              }}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
              style={{
                background:
                  activeLoteId === null && !activeThreadId
                    ? "var(--surco-card)"
                    : "transparent",
                border:
                  activeLoteId === null && !activeThreadId
                    ? "1px solid var(--surco-border-light)"
                    : "1px solid transparent",
                color:
                  activeLoteId === null && !activeThreadId
                    ? "var(--surco-green)"
                    : "var(--surco-ink-soft)",
                fontWeight: activeLoteId === null && !activeThreadId ? 600 : 400,
              }}
            >
              Chat sin lote
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
                  className="w-full text-left px-2 py-1 rounded-lg text-[11px] truncate transition-colors cursor-pointer"
                  style={{
                    background: isThreadActive ? "var(--surco-card)" : "transparent",
                    color: isThreadActive ? "var(--surco-green)" : "var(--surco-ink-soft)",
                    fontWeight: isThreadActive ? 600 : 400,
                  }}
                >
                  <span className="truncate">{t.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (ocultable si isCollapsedDesktop es true) */}
      {!isCollapsedDesktop && (
        <aside className="hidden md:block shrink-0">{sidebarContent}</aside>
      )}

      {/* Drawer desplegable (para mobile o cuando se activa desde el nav) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 flex animate-fadeIn">
          <div className="relative z-50 h-full shadow-2xl flex">
            {sidebarContent}
            <button
              type="button"
              onClick={onCloseMobile}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/5 hover:bg-black/10 text-gray-500 cursor-pointer"
              aria-label="Cerrar menú"
            >
              <IconClose className="w-4 h-4" />
            </button>
          </div>
          <div
            className="flex-1 bg-black/25 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
        </div>
      )}
    </>
  );
}
