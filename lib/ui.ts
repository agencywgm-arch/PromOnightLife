import type { CSSProperties } from "react";

// Palette et styles partagés (projet sans Tailwind : inline styles uniquement)
export const colors = {
  bg: "#0a0a0f",
  card: "#14141f",
  cardHover: "#1a1a2a",
  border: "#2a2a3a",
  violet: "#8b5cf6",
  violetDark: "#6d28d9",
  rose: "#ec4899",
  or: "#f59e0b",
  vert: "#22c55e",
  rouge: "#ef4444",
  texte: "#e5e7eb",
  muted: "#9ca3af",
};

export const card: CSSProperties = {
  background: colors.card,
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  padding: 20,
};

export const pageTitle: CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: -0.5,
  marginBottom: 4,
};

export const input: CSSProperties = {
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: "10px 14px",
  color: colors.texte,
  fontSize: 14,
  outline: "none",
  width: "100%",
};

export const btnPrimary: CSSProperties = {
  background: `linear-gradient(90deg, ${colors.violetDark}, ${colors.rose})`,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 20px",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

export const btnGhost: CSSProperties = {
  background: "transparent",
  color: colors.muted,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: "8px 14px",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

export const statutColors: Record<string, string> = {
  // Participants
  EN_ATTENTE: colors.or,
  ACCEPTEE: colors.vert,
  REFUSEE: colors.rouge,
  INVITEE: colors.violet,
  PRESENTE: "#06b6d4",
  // Événements
  PLANIFIE: colors.or,
  CONFIRME: colors.vert,
  TERMINE: colors.muted,
  ANNULE: colors.rouge,
  // Contenu
  VALIDE: colors.vert,
  REFUSE: colors.rouge,
  PUBLIE: "#06b6d4",
  // Staff
  OUI: colors.vert,
  NON: colors.rouge,
};

export function badge(statut: string): CSSProperties {
  const c = statutColors[statut] || colors.muted;
  return {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 700,
    color: c,
    background: `${c}1f`,
    border: `1px solid ${c}55`,
    borderRadius: 999,
    padding: "3px 10px",
    whiteSpace: "nowrap",
  };
}
