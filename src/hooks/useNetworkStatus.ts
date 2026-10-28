"use client";

import { useEffect, useState } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
}

export function getNetworkStatus(nav?: { onLine?: boolean }): NetworkStatus {
  const online = nav && typeof nav.onLine === "boolean" ? nav.onLine : true;
  return {
    isOnline: online,
    isOffline: !online,
  };
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    if (typeof navigator !== "undefined") {
      return getNetworkStatus(navigator);
    }
    return { isOnline: true, isOffline: false };
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setStatus(getNetworkStatus(navigator));
    const handleOffline = () => setStatus(getNetworkStatus(navigator));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial sync
    setStatus(getNetworkStatus(navigator));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return status;
}
