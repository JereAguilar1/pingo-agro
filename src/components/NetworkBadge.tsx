"use client";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function NetworkBadge() {
  const { isOffline } = useNetworkStatus();

  if (isOffline) {
    return (
      <span
        title="Operando 100% en el dispositivo con la biblioteca local"
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/60"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Modo Campo (Offline)
      </span>
    );
  }

  return (
    <span
      title="Conexión activa con el servidor"
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      En línea
    </span>
  );
}
