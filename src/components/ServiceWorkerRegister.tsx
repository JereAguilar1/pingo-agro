"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => {
          // Registro opcional en desarrollo
          console.debug("Service worker registration skipped:", err);
        });
    }
  }, []);

  return null;
}
