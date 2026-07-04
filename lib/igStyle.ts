/**
 * Thème « Instagram dark » partagé par tout le volet Messages :
 * noir/blanc, typo système, bulles bleues (envoyé) / gris anthracite (reçu),
 * anneau d'avatar dégradé story.
 */
export const ig = {
  bg: "#000000",
  surface: "#0a0a0a",
  elevated: "#121212",
  border: "#262626",
  text: "#f5f5f5",
  muted: "#a8a8a8",
  blue: "#3797f0",
  bubbleIn: "#262626",
  danger: "#ed4956",
  ring: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
} as const;

/** Cadre de carte façon IG (noir, bord fin, coins arrondis). */
export const igCard = {
  background: ig.bg,
  border: `1px solid ${ig.border}`,
  borderRadius: 16,
  overflow: "hidden",
  fontFamily: ig.font,
  color: ig.text,
} as const;

/** Champ de saisie pilule façon IG. */
export const igInput = {
  background: "transparent",
  border: `1px solid ${ig.border}`,
  borderRadius: 22,
  padding: "10px 16px",
  color: ig.text,
  fontSize: 14,
  outline: "none",
  fontFamily: ig.font,
} as const;

/** Avatar rond avec anneau dégradé story. */
export function igAvatar(size: number, emoji: string) {
  return {
    ring: {
      width: size,
      height: size,
      borderRadius: "50%",
      padding: 2,
      background: ig.ring,
      flexShrink: 0,
    } as const,
    inner: {
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      background: ig.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: Math.round(size * 0.44),
    } as const,
    emoji,
  };
}
