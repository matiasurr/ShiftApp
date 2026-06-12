"use client";

import { useEffect } from "react";

// Registers the service worker on the client for PWA installability.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
      } catch {
        // Registration failures are non-fatal for app functionality.
      }
    };

    register();
  }, []);

  return null;
}
