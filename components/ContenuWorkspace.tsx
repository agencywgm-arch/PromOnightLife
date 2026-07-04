"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { colors } from "@/lib/ui";

type Volet = "carrousel" | "messages";
type SubKey = "generer" | "photos" | "biblio" | "alertes";

const SUBS: { key: SubKey; label: string; icon: string }[] = [
  { key: "generer", label: "Agent IA", icon: "🪄" },
  { key: "photos", label: "Manuel", icon: "🎨" },
  { key: "biblio", label: "Biblio", icon: "🗂️" },
  { key: "alertes", label: "Alertes", icon: "🔔" },
];

/**
 * Coque d'app à 2 volets (style app mobile) : Carrousel et Messages.
 * Le volet Carrousel garde ses sous-sections en pilules claires sous l'en-tête ;
 * tout le reste de l'app vit dans ces deux volets, sans navigation séparée.
 */
export default function ContenuWorkspace({
  generer,
  photos,
  biblio,
  alertes,
  messages,
  libCount,
  needsHuman,
  initialVolet,
}: {
  generer: ReactNode;
  photos: ReactNode;
  biblio: ReactNode;
  alertes: ReactNode;
  messages: ReactNode;
  libCount: number;
  needsHuman: number;
  initialVolet?: Volet;
}) {
  const [volet, setVolet] = useState<Volet>(initialVolet ?? "carrousel");
  const [sub, setSub] = useState<SubKey>("generer");

  // Restaure le dernier état (sauf si l'URL impose un volet, ex: /messages)
  useEffect(() => {
    if (!initialVolet) {
      const savedVolet = localStorage.getItem("app_volet") as Volet | null;
      if (savedVolet === "carrousel" || savedVolet === "messages") setVolet(savedVolet);
    }
    const savedSub = localStorage.getItem("contenu_tab") as SubKey | null;
    if (savedSub && SUBS.some((t) => t.key === savedSub)) setSub(savedSub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    localStorage.setItem("app_volet", volet);
    window.scrollTo({ top: 0 });
  }, [volet]);
  useEffect(() => {
    localStorage.setItem("contenu_tab", sub);
    window.scrollTo({ top: 0 });
  }, [sub]);

  const headerLabel =
    volet === "messages" ? "Messages" : SUBS.find((t) => t.key === sub)?.label ?? "";

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      {/* En-tête compact, collé en haut */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(10,10,15,0.85)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "max(env(safe-area-inset-top), 10px) 16px 10px",
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
          <span style={{ fontSize: 13, fontWeight: 700, color: colors.muted }}>{headerLabel}</span>
          <Link
            href="/dashboard"
            style={{ fontSize: 18, textDecoration: "none", color: colors.muted, lineHeight: 1 }}
            title="Plus d'outils"
          >
            ⋯
          </Link>
        </div>

        {/* Sous-sections du volet Carrousel : pilules visibles, un seul tap */}
        {volet === "carrousel" && (
          <div
            style={{
              display: "flex",
              gap: 6,
              padding: "0 12px 10px",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {SUBS.map((t) => {
              const active = sub === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setSub(t.key)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 13px",
                    borderRadius: 999,
                    border: active ? "1px solid transparent" : `1px solid ${colors.border}`,
                    background: active
                      ? `linear-gradient(90deg, ${colors.violet}, ${colors.rose})`
                      : "transparent",
                    color: active ? "#fff" : colors.muted,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 14, lineHeight: 1 }}>{t.icon}</span>
                  {t.label}
                  {t.key === "biblio" && libCount > 0 && (
                    <span
                      style={{
                        minWidth: 16,
                        height: 16,
                        padding: "0 4px",
                        borderRadius: 999,
                        background: active ? "rgba(255,255,255,0.25)" : colors.rose,
                        color: "#fff",
                        fontSize: 10,
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {libCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Zone de contenu — les volets restent montés (display:none) pour
          préserver le travail en cours (recherche, composition, brouillons). */}
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
        <div style={{ display: volet === "carrousel" ? "block" : "none" }}>
          <section style={{ display: sub === "generer" ? "block" : "none" }}>{generer}</section>
          <section style={{ display: sub === "photos" ? "block" : "none" }}>{photos}</section>
          <section style={{ display: sub === "biblio" ? "block" : "none" }}>{biblio}</section>
          <section style={{ display: sub === "alertes" ? "block" : "none" }}>{alertes}</section>
        </div>
        <div style={{ display: volet === "messages" ? "block" : "none" }}>{messages}</div>
      </main>

      {/* Barre 2 volets, fixée en bas (style app) */}
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
        {(
          [
            { key: "carrousel" as Volet, label: "Carrousel", icon: "🖼️", badge: 0 },
            { key: "messages" as Volet, label: "Messages", icon: "💬", badge: needsHuman },
          ]
        ).map((t) => {
          const active = volet === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setVolet(t.key)}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "10px 4px 9px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                position: "relative",
              }}
            >
              <span
                style={{
                  fontSize: 22,
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
                  fontSize: 11,
                  fontWeight: active ? 800 : 600,
                  color: active ? colors.texte : colors.muted,
                }}
              >
                {t.label}
              </span>
              {t.badge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 5,
                    right: "calc(50% - 26px)",
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    borderRadius: 999,
                    background: colors.or,
                    color: "#000",
                    fontSize: 10,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {t.badge}
                </span>
              )}
              {active && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    width: 30,
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
