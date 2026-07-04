"use client";

import { useState } from "react";
import { colors } from "@/lib/ui";

type Line =
  | { from: "girl"; text: string }
  | { from: "agent"; text: string }
  | { from: "human"; text: string }; // note système : l'agent a passé la main

type Scenario = {
  name: string;
  avatar: string;
  time: string;
  lines: Line[];
};

/**
 * Historique de démonstration : conversations déjà gérées par l'agent, affichées
 * comme la boîte de réception DM du compte Instagram. Vue « côté compte » :
 * messages des abonnées à gauche, réponses de l'agent à droite.
 * Ce sont des exemples calibrés (statiques) pour montrer le comportement.
 */
const SCENARIOS: Scenario[] = [
  {
    name: "lea.prsn",
    avatar: "🥂",
    time: "2 min",
    lines: [
      { from: "girl", text: "coucou j'ai vu votre post, c'est vraiment gratuit le dîner ?" },
      { from: "agent", text: "Hello 🌟 Oui totalement ! On invite les filles à un dîner offert dans un beau resto parisien, puis entrée VIP offerte à la soirée juste après. Zéro frais pour toi 💫" },
      { from: "girl", text: "ah trop bien !! je m'inscris comment ?" },
      { from: "agent", text: "Remplis le petit formulaire dans notre bio (prénom, âge, ton Insta) et on te confirme ta place très vite 😊" },
    ],
  },
  {
    name: "chloe.mrl",
    avatar: "✨",
    time: "20 min",
    lines: [
      { from: "girl", text: "c'est quoi le concept exactement ?" },
      { from: "agent", text: "On réunit une jolie table de filles pour un dîner offert dans un resto branché de Paris, ambiance chill et fun, puis on continue en soirée privée (entrée + première conso offertes). Toi tu profites, c'est cadeau 🥂✨" },
    ],
  },
  {
    name: "manon.___",
    avatar: "💃",
    time: "1 h",
    lines: [
      { from: "girl", text: "faut consommer un minimum ou payer quelque chose sur place ?" },
      { from: "agent", text: "Non 🙌 Le dîner et ta première conso sont offerts. Tu n'as rien à régler pour être sur la guestlist." },
      { from: "girl", text: "et faut avoir quel âge ?" },
      { from: "agent", text: "C'est réservé aux 21 ans et + 🎉" },
    ],
  },
  {
    name: "ines.pht",
    avatar: "📍",
    time: "4 h",
    lines: [
      { from: "girl", text: "c'est dans quel resto et c'est où ?" },
      { from: "agent", text: "On tourne sur les meilleures adresses de Paris ✨ Le resto exact et l'adresse sont envoyés en DM la veille aux filles confirmées, pour garder le côté privé 📍" },
    ],
  },
  {
    name: "sarah.dnc",
    avatar: "🖤",
    time: "6 h",
    lines: [
      { from: "girl", text: "je peux ramener mon copain au dîner ?" },
      { from: "human", text: "L'agent a laissé la main : le dîner offert est réservé aux filles, demande d'exception (accompagnant homme) — à gérer par toi." },
    ],
  },
  {
    name: "jade.vlt",
    avatar: "🌙",
    time: "hier",
    lines: [
      { from: "girl", text: "attendez vous payez combien les filles pour venir ?" },
      { from: "human", text: "L'agent a laissé la main : question sensible / ambiguë (rémunération) — malentendu à clarifier toi-même avec tact." },
    ],
  },
];

const IG_GRADIENT = "linear-gradient(135deg, #405DE6, #833AB4, #C13584, #E1306C)";

function lastPreview(s: Scenario): string {
  const l = s.lines[s.lines.length - 1];
  if (l.from === "human") return "⚠️ À traiter par toi";
  return (l.from === "agent" ? "Toi : " : "") + l.text;
}

export default function AgentScenarios() {
  const [open, setOpen] = useState<number | null>(null);

  const frame = {
    maxWidth: 460,
    margin: "0 auto",
    borderRadius: 20,
    overflow: "hidden" as const,
    border: `1px solid ${colors.border}`,
    background: "#0d0d12",
    boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
  };

  if (open !== null) {
    const s = SCENARIOS[open];
    return (
      <div style={frame}>
        {/* Header conversation */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${colors.border}`, background: "#15151c" }}>
          <button onClick={() => setOpen(null)} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 }}>
            ‹
          </button>
          <div style={{ width: 34, height: 34, borderRadius: "50%", padding: 2, background: IG_GRADIENT }}>
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#0d0d12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
              {s.avatar}
            </div>
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{s.name}</div>
        </div>

        {/* Fil */}
        <div style={{ height: 380, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {s.lines.map((l, i) => {
            if (l.from === "human") {
              return (
                <div key={i} style={{ alignSelf: "center", maxWidth: "92%", textAlign: "center" }}>
                  <span style={{ fontSize: 11.5, color: colors.or, background: "#1c1710", padding: "7px 13px", borderRadius: 12, display: "inline-block", lineHeight: 1.4 }}>
                    🙈 {l.text}
                  </span>
                </div>
              );
            }
            const isAgent = l.from === "agent";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isAgent ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "76%",
                    padding: "9px 13px",
                    borderRadius: 18,
                    fontSize: 14,
                    lineHeight: 1.4,
                    color: "#fff",
                    background: isAgent ? IG_GRADIENT : "#2a2a32",
                    borderBottomRightRadius: isAgent ? 4 : 18,
                    borderBottomLeftRadius: isAgent ? 18 : 4,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {l.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={frame}>
      {/* Header inbox */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: `1px solid ${colors.border}`, background: "#15151c" }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>nightlife.paris</span>
        <span style={{ fontSize: 12, color: colors.muted }}>· Messages</span>
      </div>

      {/* Liste des conversations */}
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        {SCENARIOS.map((s, i) => {
          const needsHuman = s.lines[s.lines.length - 1].from === "human";
          return (
            <button
              key={i}
              onClick={() => setOpen(i)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "11px 14px",
                background: "transparent",
                border: "none",
                borderBottom: `1px solid ${colors.border}`,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ width: 46, height: 46, borderRadius: "50%", padding: 2, background: IG_GRADIENT, flexShrink: 0 }}>
                <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#0d0d12", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  {s.avatar}
                </div>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: colors.muted, flexShrink: 0 }}>{s.time}</span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: needsHuman ? colors.or : colors.muted,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {lastPreview(s)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
