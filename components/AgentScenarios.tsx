"use client";

import { useState } from "react";
import { ig, igCard, igAvatar } from "@/lib/igStyle";

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
 * Scénarios tirés des vraies conversations du compte (anonymisés).
 */
const SCENARIOS: Scenario[] = [
  {
    name: "lea.prsn",
    avatar: "🥂",
    time: "2 min",
    lines: [
      { from: "agent", text: "Hello ! Mardi, dîner au restaurant festif puis soirée au club 🪩 Ça te dit d'être mon invitée avec une copine ? Dîner et table privée avec champagne offerts ✨" },
      { from: "girl", text: "hello ! oui pourquoi pas 😍 c'est vraiment gratuit ??" },
      { from: "agent", text: "Oui, c'est offert : le dîner et la table VIP font partie de ma collaboration avec les lieux, en échange de ta participation à la soirée. Le resto demande parfois juste un avis Google et une story Insta 😊" },
      { from: "girl", text: "ok top ! je viens avec ma copine alors" },
      { from: "agent", text: "Parfait ! Envoie-moi son Instagram pour que je la valide sur la guestlist 💫" },
    ],
  },
  {
    name: "chloe.mrl",
    avatar: "⏰",
    time: "25 min",
    lines: [
      { from: "girl", text: "Hello, yes ! At what time ?" },
      { from: "agent", text: "Meeting at the restaurant at 9pm sharp — dinner around 10pm, then the club around midnight 🪩" },
      { from: "girl", text: "perfect, and the dress code?" },
      { from: "agent", text: "Elegant dress code is mandatory: evening wear and heels ✨" },
    ],
  },
  {
    name: "manon.___",
    avatar: "💃",
    time: "1 h",
    lines: [
      { from: "girl", text: "c'est quoi le concept exactement ? on doit faire quoi en échange ?" },
      { from: "agent", text: "Je collabore avec plusieurs restos festifs et clubs parisiens : tu es invitée avec une copine à un dîner offert, puis soirée au club à notre table VIP. Au resto comme au club, vous êtes placées à des tables réservées aux filles — on ne te demandera jamais d'interagir avec qui que ce soit 🥂" },
    ],
  },
  {
    name: "ines.pht",
    avatar: "📍",
    time: "4 h",
    lines: [
      { from: "girl", text: "What's the address?" },
      { from: "agent", text: "I'll send you the exact restaurant and address in DM once your spot is confirmed (your Insta + your friend's) 📍" },
    ],
  },
  {
    name: "sarah.dnc",
    avatar: "🖤",
    time: "6 h",
    lines: [
      { from: "girl", text: "je peux venir avec mon copain ?" },
      { from: "agent", text: "La soirée est réservée aux filles — les tables au resto et au club sont 100% filles. Tu peux venir avec une copine : envoie-moi son Instagram 😊" },
      { from: "girl", text: "et si il reste juste au bar sans venir à la table ?" },
      { from: "human", text: "L'agent a laissé la main : négociation d'une exception — à trancher par toi." },
    ],
  },
  {
    name: "jade.vlt",
    avatar: "🚕",
    time: "hier",
    lines: [
      { from: "girl", text: "Je suis arrivée à l'adresse là mais il n'y a pas de restaurant ??" },
      { from: "human", text: "L'agent a laissé la main : urgence logistique le soir même (invitée perdue sur place) — à gérer par toi immédiatement." },
    ],
  },
];

function lastPreview(s: Scenario): string {
  const l = s.lines[s.lines.length - 1];
  if (l.from === "human") return "⚠️ À traiter par toi";
  return (l.from === "agent" ? "Toi : " : "") + l.text;
}

export default function AgentScenarios() {
  const [open, setOpen] = useState<number | null>(null);

  const frame = { ...igCard, maxWidth: 460, margin: "0 auto", boxShadow: "0 12px 40px rgba(0,0,0,0.45)" };

  if (open !== null) {
    const s = SCENARIOS[open];
    const av = igAvatar(34, s.avatar);
    return (
      <div style={frame}>
        {/* En-tête conversation */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: `1px solid ${ig.border}` }}>
          <button
            onClick={() => setOpen(null)}
            style={{ background: "transparent", border: "none", color: ig.text, fontSize: 22, cursor: "pointer", padding: "0 4px 0 0", lineHeight: 1 }}
            aria-label="Retour"
          >
            ‹
          </button>
          <div style={av.ring}><div style={av.inner}>{av.emoji}</div></div>
          <div style={{ fontWeight: 700, fontSize: 14, color: ig.text }}>{s.name}</div>
        </div>

        {/* Fil */}
        <div style={{ height: 380, overflowY: "auto", padding: "16px 12px", display: "flex", flexDirection: "column", gap: 3, background: ig.bg }}>
          {s.lines.map((l, i) => {
            if (l.from === "human") {
              return (
                <div key={i} style={{ alignSelf: "center", maxWidth: "92%", textAlign: "center", marginTop: 8 }}>
                  <span style={{ fontSize: 11.5, color: ig.muted, background: ig.elevated, padding: "7px 13px", borderRadius: 12, display: "inline-block", lineHeight: 1.4 }}>
                    🙈 {l.text}
                  </span>
                </div>
              );
            }
            const isAgent = l.from === "agent";
            const prev = s.lines[i - 1];
            const grouped = prev && prev.from === l.from;
            return (
              <div key={i} style={{ display: "flex", justifyContent: isAgent ? "flex-end" : "flex-start", marginTop: grouped ? 0 : 8 }}>
                <div
                  style={{
                    maxWidth: "72%",
                    padding: "9px 13px",
                    borderRadius: 22,
                    fontSize: 14,
                    lineHeight: 1.4,
                    color: "#fff",
                    background: isAgent ? ig.blue : ig.bubbleIn,
                    borderBottomRightRadius: isAgent ? 6 : 22,
                    borderBottomLeftRadius: isAgent ? 22 : 6,
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
      {/* En-tête inbox */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderBottom: `1px solid ${ig.border}` }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: ig.text }}>guest_for_dinner</span>
        <span style={{ fontSize: 12, color: ig.muted }}>· exemples gérés par l&apos;agent</span>
      </div>

      {/* Liste des conversations */}
      <div style={{ maxHeight: 420, overflowY: "auto" }}>
        {SCENARIOS.map((s, i) => {
          const needsHuman = s.lines[s.lines.length - 1].from === "human";
          const av = igAvatar(52, s.avatar);
          return (
            <button
              key={i}
              onClick={() => setOpen(i)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: ig.font,
              }}
            >
              <div style={av.ring}><div style={av.inner}>{av.emoji}</div></div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: ig.text }}>{s.name}</span>
                  {needsHuman && <span style={{ fontSize: 11 }}>🚩</span>}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: needsHuman ? ig.text : ig.muted,
                    fontWeight: needsHuman ? 700 : 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 2,
                  }}
                >
                  {lastPreview(s)}
                  <span style={{ color: ig.muted, fontWeight: 400 }}> · {s.time}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
