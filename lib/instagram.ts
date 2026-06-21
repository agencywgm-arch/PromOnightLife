import { prisma } from "./prisma";

/**
 * Couche d'envoi de DM, agnostique du canal.
 *
 * Aujourd'hui : ManyChat (réutilise la connexion Instagram déjà en place, pas
 * de revue Meta supplémentaire). Demain : Meta natif — il suffira d'ajouter un
 * cas dans `sendDM` sans toucher au reste de l'app.
 *
 * Les jetons sont lus depuis AgentConfig (configurés dans l'UID Dashboard) avec
 * repli sur les variables d'environnement.
 */

export type Channel = "manychat" | "meta" | "instagram";

export type SendResult = { ok: boolean; message: string };

async function configValue(agentId: string, key: string): Promise<string | undefined> {
  try {
    const cfg = await prisma.agentConfig.findUnique({ where: { agentId } });
    if (!cfg) return undefined;
    const values = JSON.parse(cfg.values || "{}") as Record<string, string>;
    return values[key]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Token ManyChat : AgentConfig("manychat").apiKey puis env MANYCHAT_API_TOKEN. */
async function manychatToken(): Promise<string | undefined> {
  return (
    (await configValue("manychat", "apiKey")) ||
    (await configValue("manychat", "token")) ||
    process.env.MANYCHAT_API_TOKEN?.trim()
  );
}

/**
 * Envoi via l'API ManyChat. `externalId` = subscriber_id ManyChat.
 * https://api.manychat.com/swagger → /fb/sending/sendContent
 */
async function sendViaManychat(externalId: string, text: string): Promise<SendResult> {
  const token = await manychatToken();
  if (!token) {
    return { ok: false, message: "Token ManyChat manquant (Dashboard → Agent ManyChat, ou MANYCHAT_API_TOKEN)." };
  }
  try {
    const res = await fetch("https://api.manychat.com/fb/sending/sendContent", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriber_id: externalId,
        data: {
          version: "v2",
          content: { messages: [{ type: "text", text }] },
        },
        message_tag: "ACCOUNT_UPDATE",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.status === "error") {
      return { ok: false, message: `ManyChat (${res.status}) : ${data?.message || "envoi refusé"}` };
    }
    return { ok: true, message: "Envoyé via ManyChat" };
  } catch (e) {
    return { ok: false, message: `Réseau ManyChat : ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Envoi via l'API Meta Graph (Instagram Messaging). `externalId` = IG-scoped recipient id. */
async function sendViaMeta(externalId: string, text: string): Promise<SendResult> {
  const token =
    (await configValue("meta", "accessToken")) || process.env.META_ACCESS_TOKEN?.trim();
  const igUserId = (await configValue("meta", "igUserId")) || process.env.META_IG_USER_ID?.trim();
  if (!token || !igUserId) {
    return { ok: false, message: "Configuration Meta manquante (accessToken + igUserId)." };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${igUserId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: externalId },
        message: { text },
        access_token: token,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) {
      return { ok: false, message: `Meta : ${data?.error?.message || res.status}` };
    }
    return { ok: true, message: "Envoyé via Meta" };
  } catch (e) {
    return { ok: false, message: `Réseau Meta : ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function sendDM(
  channel: Channel,
  externalId: string,
  text: string
): Promise<SendResult> {
  if (channel === "meta" || channel === "instagram") return sendViaMeta(externalId, text);
  return sendViaManychat(externalId, text);
}
