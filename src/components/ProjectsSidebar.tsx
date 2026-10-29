"use client";

import { ChatThread, ProducerLote } from "@/lib/types";

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
      style={{ background: "var(--surco-bg-alt)", borderColor: "var(--surco-border)" }}
    >
      <div className="p-3.5 overflow-y-auto flex-1 flex flex-col gap-5">
        {/* Sección 1: Mis Lotes (Proyectos) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1.5">
            <span
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "var(--surco-ink-soft)" }}
            >
              🌾 Mis Lotes (Proyectos)
            </span>
            <button
              type="button"
              onClick={() => {
                onOpenNewLoteWizard();
                onCloseMobile();
              }}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md text-white cursor-pointer"
              style={{ background: "var(--surco-green)" }}
            >
              + Nuevo Lote
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
                    className="w-full text-left px-2.5 py-2 rounded-xl transition-colors flex items-center justify-between gap-2 cursor-pointer"
                    style={{
                      background: isLoteActive ? "var(--surco-card)" : "transparent",
                      border: isLoteActive ? "1px solid var(--surco-border)" : "1px solid transparent",
                      color: "var(--surco-ink)",
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{lote.name}</div>
                      <div className="text-[11px] truncate" style={{ color: "var(--surco-ink-soft)" }}>
                        {lote.hectares} ha · {lote.crop} ({lote.phenology})
                      </div>
                    </div>
                    {isLoteActive && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: "var(--surco-green)" }}
                      />
                    )}
                  </button>

                  {/* Hilos de chat de este proyecto de lote */}
                  {isLoteActive && (
                    <div className="pl-4 pr-1 py-1 flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectLoteProject(lote.id, "new");
                          onCloseMobile();
                        }}
                        className="text-left text-[11px] font-medium px-2 py-1 rounded-lg cursor-pointer"
                        style={{ color: "var(--surco-green)" }}
                      >
                        + Nuevo chat en este lote
                      </button>
                      {loteThreads.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onSelectLoteProject(lote.id, t.id);
                            onCloseMobile();
                          }}
                          className="text-left text-xs px-2.5 py-1.5 rounded-lg truncate cursor-pointer"
                          style={{
                            background: activeThreadId === t.id ? "#e4efe4" : "transparent",
                            color: activeThreadId === t.id ? "var(--surco-green)" : "var(--surco-ink-soft)",
                          }}
                        >
                          💬 {t.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sección 2: Chats Generales */}
        <div className="flex flex-col gap-1.5 border-t pt-4" style={{ borderColor: "var(--surco-border)" }}>
          <div className="flex items-center justify-between px-1.5">
            <span
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "var(--surco-ink-soft)" }}
            >
              💬 Chats Generales
            </span>
            <button
              type="button"
              onClick={() => {
                onSelectGeneralChat("new");
                onCloseMobile();
              }}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-md border cursor-pointer"
              style={{
                background: "var(--surco-card)",
                borderColor: "var(--surco-border)",
                color: "var(--surco-ink)",
              }}
            >
              + Chat General
            </button>
          </div>

          <div className="flex flex-col gap-1 mt-1">
            <button
              type="button"
              onClick={() => {
                onSelectGeneralChat();
                onCloseMobile();
              }}
              className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer"
              style={{
                background: activeLoteId === null && !activeThreadId ? "var(--surco-card)" : "transparent",
                border:
                  activeLoteId === null && !activeThreadId
                    ? "1px solid var(--surco-border)"
                    : "1px solid transparent",
                color: "var(--surco-ink)",
              }}
            >
              Consulta general sin lote asignado
            </button>

            {generalThreads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onSelectGeneralChat(t.id);
                  onCloseMobile();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate cursor-pointer"
                style={{
                  background: activeThreadId === t.id ? "#e4efe4" : "transparent",
                  color: activeThreadId === t.id ? "var(--surco-green)" : "var(--surco-ink-soft)",
                }}
              >
                💬 {t.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block shrink-0">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="relative z-50 h-full">{sidebarContent}</div>
          <div
            className="flex-1 bg-black/40"
            onClick={onCloseMobile}
          />
        </div>
      )}
    </>
  );
}
