"use client";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function NetworkBadge() {
  const { isOffline } = useNetworkStatus();

  if (isOffline) {
    return (
      <span
        title="Operando en el dispositivo con conocimiento local y SLM"
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-amber-50 text-amber-800 border-amber-200"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Offline
      </span>
    );
  }

  return (
    <span
      title="Conectado al orquestador en línea"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border"
      style={{
        background: "var(--surco-green-tint)",
        color: "var(--surco-green)",
        borderColor: "var(--surco-border-light)",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
      En línea
    </span>
  );
}
