"use client";

import Link from "next/link";
import { IconEdit, IconMenu } from "./Icons";

interface Props {
  onToggleSidebar: () => void;
  activeTitle?: string;
  onEditLote?: () => void;
}

export function TopNavbar({
  onToggleSidebar,
  activeTitle,
  onEditLote,
}: Props) {
  return (
    <header
      className="sticky top-0 z-30 border-b px-3.5 sm:px-6 py-2.5 flex items-center justify-between transition-colors"
      style={{
        background: "var(--surco-bg)",
        borderColor: "var(--surco-border-light)",
      }}
    >
      {/* Izquierda: Menú de hamburguesa y título activo si existe */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors hover:bg-black/5"
          style={{ borderColor: "var(--surco-border-light)", color: "var(--surco-ink)" }}
          aria-label="Abrir menú de lotes e historial de chats"
          title="Ver proyectos e historial"
        >
          <IconMenu className="w-4 h-4" />
        </button>

        {activeTitle && (
          <span
            className="text-xs font-medium truncate max-w-[180px] sm:max-w-xs"
            style={{ color: "var(--surco-ink-soft)" }}
          >
            {activeTitle}
          </span>
        )}
      </div>

      {/* Derecha: Ícono de editar lote (cuando hay un lote abierto) + Logo de la app */}
      <div className="flex items-center gap-3">
        {onEditLote && (
          <button
            type="button"
            onClick={onEditLote}
            className="p-1.5 rounded-lg border text-xs cursor-pointer transition-colors hover:bg-black/5 flex items-center justify-center"
            style={{
              borderColor: "var(--surco-border-light)",
              color: "var(--surco-ink-soft)",
              background: "var(--surco-card)",
            }}
            aria-label="Editar lote"
            title="Editar datos del lote"
          >
            <IconEdit className="w-4 h-4" />
          </button>
        )}

        <Link
          href="/"
          className="font-semibold text-base sm:text-lg tracking-tight transition-opacity hover:opacity-85"
          style={{ color: "var(--surco-green)" }}
        >
          Surco
        </Link>
      </div>
    </header>
  );
}
