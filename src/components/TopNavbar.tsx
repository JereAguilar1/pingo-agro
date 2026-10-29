"use client";

import Link from "next/link";
import { IconMenu, IconPlus } from "./Icons";
import { NetworkBadge } from "./NetworkBadge";

interface Props {
  onToggleSidebar: () => void;
  onOpenNewLote?: () => void;
  activeTitle?: string;
  showNewLoteButton?: boolean;
}

export function TopNavbar({
  onToggleSidebar,
  onOpenNewLote,
  activeTitle,
  showNewLoteButton = true,
}: Props) {
  return (
    <header
      className="sticky top-0 z-30 border-b px-3 sm:px-6 py-2.5 flex items-center justify-between transition-colors"
      style={{
        background: "var(--surco-bg)",
        borderColor: "var(--surco-border-light)",
      }}
    >
      {/* Izquierda: Menú de hamburguesa + Logo Surco */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors hover:bg-black/5"
          style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-ink)" }}
          aria-label="Abrir menú de lotes e historial de chats"
          title="Ver lotes e historial"
        >
          <IconMenu className="w-4 h-4" />
        </button>

        <Link
          href="/"
          className="font-semibold text-base sm:text-lg tracking-tight transition-opacity hover:opacity-85 flex items-center gap-1.5"
          style={{ color: "var(--surco-green)" }}
        >
          <span>Surco</span>
        </Link>

        {activeTitle && (
          <>
            <span className="text-gray-300 hidden sm:inline select-none">/</span>
            <span
              className="text-xs font-medium truncate max-w-[150px] sm:max-w-xs"
              style={{ color: "var(--surco-ink-soft)" }}
            >
              {activeTitle}
            </span>
          </>
        )}

        <NetworkBadge />
      </div>

      {/* Derecha: Botón + Nuevo Lote (IA Offline removido de la vista) */}
      <div className="flex items-center gap-2">
        {showNewLoteButton && onOpenNewLote && (
          <button
            type="button"
            onClick={onOpenNewLote}
            className="inline-flex items-center gap-1 text-xs font-medium rounded-lg px-2.5 py-1.5 cursor-pointer border transition-colors hover:bg-black/5"
            style={{
              borderColor: "var(--surco-border-light)",
              color: "var(--surco-ink)",
              background: "var(--surco-card)",
            }}
            title="Crear un nuevo lote satelital"
          >
            <IconPlus className="w-3.5 h-3.5 text-emerald-800" />
            <span className="hidden sm:inline">Nuevo lote</span>
          </button>
        )}
      </div>
    </header>
  );
}
