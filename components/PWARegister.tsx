"use client";

import { useEffect } from "react";

/** Enregistre le service worker (nécessaire au Web Push). */
export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* enregistrement échoué — pas bloquant */
      });
    }
  }, []);
  return null;
}
