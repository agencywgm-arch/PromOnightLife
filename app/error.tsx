"use client";

import { useEffect } from "react";

/** Capture les erreurs de rendu d'une page (hors layout racine). */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(160deg,#1a1030,#0d0a18)",
        color: "#e5e7eb",
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🗼</div>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>
          Oups, un souci de chargement
        </h1>
        <p style={{ fontSize: 14, color: "#9ca3af", lineHeight: 1.5, margin: "0 0 20px" }}>
          Recharge la page pour reprendre. Si ça persiste, réessaie dans un instant.
        </p>
        <button
          onClick={() => reset()}
          style={{
            background: "linear-gradient(90deg,#6d28d9,#ec4899)",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Recharger
        </button>
      </div>
    </div>
  );
}
