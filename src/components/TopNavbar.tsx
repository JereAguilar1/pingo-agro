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
          className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-black/5"
          style={{ color: "var(--surco-ink)" }}
          aria-label="Abrir menú de lotes e historial de chats"
          title="Ver proyectos e historial"
        >
          <IconMenu className="w-[22px] h-[22px]" />
        </button>

        {activeTitle && (
          <span
            className="text-sm font-semibold truncate max-w-[180px] sm:max-w-xs"
            style={{ color: "var(--surco-ink)" }}
          >
            {activeTitle}
          </span>
        )}
      </div>

      {/* Derecha: Ícono de editar lote (cuando hay un lote abierto) + Logo de la app */}
      <div className="flex items-center gap-2">
        {onEditLote && (
          <button
            type="button"
            onClick={onEditLote}
            className="w-9 h-9 rounded-lg cursor-pointer transition-colors hover:bg-black/5 flex items-center justify-center"
            style={{
              color: "var(--surco-ink-soft)",
              background: "var(--surco-bg-alt)",
            }}
            aria-label="Editar lote"
            title="Editar datos del lote"
          >
            <IconEdit className="w-4 h-4" />
          </button>
        )}

        <Link
          href="/"
          className="inline-flex items-center gap-2 transition-opacity hover:opacity-85"
          aria-label="Pingo — Asistente Agronómico"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Pingo — Asistente Agronómico"
            className="h-8 sm:h-9 w-auto object-contain"
          />
        </Link>
      </div>
    </header>
  );
}
