"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { colors } from "@/lib/ui";

type TabKey = "generer" | "photos" | "biblio" | "alertes";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "generer", label: "Agent IA", icon: "🪄" },
  { key: "photos", label: "Manuel", icon: "🎨" },
  { key: "biblio", label: "Biblio", icon: "🗂️" },
  { key: "alertes", label: "Alertes", icon: "🔔" },
];

export default function ContenuWorkspace({
  generer,
  photos,
  biblio,
  alertes,
  libCount,
}: {
  generer: ReactNode;
  photos: ReactNode;
  biblio: ReactNode;
  alertes: ReactNode;
  libCount: number;
}) {
  const [tab, setTab] = useState<TabKey>("generer");

  // Restaure le dernier onglet ouvert
  useEffect(() => {
    const saved = localStorage.getItem("contenu_tab") as TabKey | null;
    if (saved && TABS.some((t) => t.key === saved)) setTab(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem("contenu_tab", tab);
    window.scrollTo({ top: 0 });
  }, [tab]);

  const activeLabel = TABS.find((t) => t.key === tab)?.label ?? "";

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* En-tête compact, collé en haut */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "max(env(safe-area-inset-top), 10px) 16px 10px",
          background: "rgba(10,10,15,0.85)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <span
          style={{
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: -0.4,
            background: `linear-gradient(90deg, ${colors.violet}, ${colors.rose})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          NIGHTLIFE PARIS
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.muted }}>{activeLabel}</span>
        <Link
          href="/dashboard"
          style={{ fontSize: 18, textDecoration: "none", color: colors.muted, lineHeight: 1 }}
          title="Plus d'outils"
        >
          ⋯
        </Link>
      </header>

      {/* Zone de contenu — un seul onglet visible, les autres restent montés
          (display:none) pour préserver le travail en cours. */}
      <main
        style={{
          flex: 1,
          padding: "14px 14px calc(76px + env(safe-area-inset-bottom))",
          maxWidth: 720,
          width: "100%",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <section style={{ display: tab === "generer" ? "block" : "none" }}>{generer}</section>
        <section style={{ display: tab === "photos" ? "block" : "none" }}>{photos}</section>
        <section style={{ display: tab === "biblio" ? "block" : "none" }}>{biblio}</section>
        <section style={{ display: tab === "alertes" ? "block" : "none" }}>{alertes}</section>
      </main>

      {/* Barre d'onglets iOS, fixée en bas */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: "flex",
          justifyContent: "space-around",
          alignItems: "stretch",
          background: "rgba(15,15,22,0.92)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderTop: `1px solid ${colors.border}`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "9px 4px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                position: "relative",
              }}
            >
              <span
                style={{
                  fontSize: 21,
                  lineHeight: 1,
                  filter: active ? "none" : "grayscale(0.4) opacity(0.6)",
                  transform: active ? "translateY(-1px)" : "none",
                  transition: "transform 0.15s",
                }}
              >
                {t.icon}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: active ? 800 : 600,
                  color: active ? colors.texte : colors.muted,
                }}
              >
                {t.label}
              </span>
              {t.key === "biblio" && libCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: "calc(50% - 22px)",
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    borderRadius: 999,
                    background: colors.rose,
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {libCount}
                </span>
              )}
              {active && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    width: 26,
                    height: 3,
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${colors.violet}, ${colors.rose})`,
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
