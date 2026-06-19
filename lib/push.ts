import webpush from "web-push";

/**
 * Configuration Web Push (VAPID).
 *
 * La clé PUBLIQUE peut être exposée au navigateur (elle sert à chiffrer
 * l'abonnement). La clé PRIVÉE reste côté serveur uniquement.
 *
 * Sur Vercel → Settings → Environment Variables, définis :
 *   - VAPID_PUBLIC_KEY   (ou NEXT_PUBLIC_VAPID_PUBLIC_KEY pour le client)
 *   - VAPID_PRIVATE_KEY
 *   - VAPID_SUBJECT      (ex: mailto:agencywgm@gmail.com)
 */

// Clé publique par défaut (sans danger à committer) — surchargée par l'env.
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  process.env.VAPID_PUBLIC_KEY ||
  "BMRXHptE8HbQsgy0wS6Ha8OR_GCIk3Dv1_0MeZAEXP2xXqSRUTcTrYgOlEVRHF9AflMyGIaiWG5OjlxgWwy3N4c";

const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:agencywgm@gmail.com";

let configured = false;
export function ensureWebPush(): boolean {
  if (!PRIVATE_KEY) return false; // pas de clé privée → push désactivé
  if (!configured) {
    webpush.setVapidDetails(SUBJECT, VAPID_PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
  }
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export { webpush };
