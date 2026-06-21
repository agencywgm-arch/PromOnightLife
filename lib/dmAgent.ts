import Anthropic from "@anthropic-ai/sdk";

/**
 * Agent de réponse automatique aux DM Instagram.
 *
 * Principe : répond AUTOMATIQUEMENT aux questions récurrentes qu'il sait
 * traiter avec certitude (horaires, dress code, comment s'inscrire, lieu…),
 * grâce à une base de connaissances (FAQ) fournie par le promoteur. Pour tout
 * le reste — message ambigu, sensible, négociation, plainte, demande hors
 * sujet — il NE répond PAS et laisse la main à un humain.
 *
 * C'est volontairement conservateur : mieux vaut un silence (escalade humaine)
 * qu'une mauvaise réponse automatique envoyée à une vraie personne.
 */

export type DmHistoryItem = { direction: "IN" | "OUT"; text: string };

export type DmAgentDecision = {
  shouldReply: boolean;
  reply: string;
  reason: string;
  confidence: number; // 0-1
};

export type FaqItem = { question: string; answer: string };

const SYSTEM = `Tu es l'assistant DM Instagram d'un collectif événementiel nightlife parisien haut de gamme.
Des personnes (souvent des filles intéressées pour participer aux soirées) écrivent en message privé Instagram.

Ton rôle : répondre AUTOMATIQUEMENT, en français, UNIQUEMENT aux questions récurrentes dont la réponse figure clairement dans la BASE DE CONNAISSANCES fournie, ou qui relèvent d'un accueil simple et factuel.

RÈGLES STRICTES :
- Tu réponds seulement si tu es SÛR de la réponse à partir de la base de connaissances. Sinon shouldReply=false.
- Tu NE réponds JAMAIS automatiquement si le message : est ambigu, négocie/conteste, exprime une plainte ou un malaise, demande une décision (acceptation, exception, argent), contient des données sensibles, ou sort du cadre des questions récurrentes. Dans ces cas shouldReply=false avec une raison claire pour l'humain.
- Tu n'inventes JAMAIS d'information (horaire, adresse, prix, date) absente de la base de connaissances.
- Style : chaleureux, bref (1-3 phrases), tutoiement, 1 emoji max, jamais robotique.
- Tu ne demandes pas de données personnelles sensibles et ne fais aucune promesse d'acceptation.

Réponds UNIQUEMENT en JSON valide, sans texte autour :
{"shouldReply": true|false, "reply": "le message à envoyer (vide si shouldReply=false)", "reason": "courte explication pour l'humain", "confidence": 0.0-1.0}`;

function buildUserPrompt(
  faq: FaqItem[],
  history: DmHistoryItem[],
  contexte: string
): string {
  const kb = faq.length
    ? faq.map((f, i) => `${i + 1}. Q: ${f.question}\n   R: ${f.answer}`).join("\n")
    : "(aucune entrée — sois d'autant plus prudent : réponds seulement aux accueils triviaux)";

  const conv = history
    .slice(-8)
    .map((m) => `${m.direction === "IN" ? "ELLE" : "NOUS"}: ${m.text}`)
    .join("\n");

  return `CONTEXTE DU COLLECTIF :
${contexte || "(non précisé)"}

BASE DE CONNAISSANCES (FAQ validée) :
${kb}

CONVERSATION RÉCENTE (le dernier message ELLE est à traiter) :
${conv}

Décide si tu peux répondre automatiquement à ce dernier message.`;
}

/**
 * Appelle Claude et renvoie la décision. Ne lève pas : en cas d'erreur,
 * renvoie une décision "ne pas répondre" pour basculer en humain.
 */
export async function decideDmReply(
  apiKey: string,
  faq: FaqItem[],
  history: DmHistoryItem[],
  contexte: string
): Promise<DmAgentDecision> {
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: SYSTEM,
      messages: [{ role: "user", content: buildUserPrompt(faq, history, contexte) }],
    });
    const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    let data: Partial<DmAgentDecision>;
    try {
      data = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Réponse agent illisible");
      data = JSON.parse(match[0]);
    }
    const reply = String(data.reply || "").trim();
    const shouldReply = Boolean(data.shouldReply) && reply.length > 0;
    return {
      shouldReply,
      reply,
      reason: String(data.reason || (shouldReply ? "Réponse FAQ" : "À traiter en humain")),
      confidence: typeof data.confidence === "number" ? data.confidence : shouldReply ? 0.7 : 0,
    };
  } catch (e) {
    return {
      shouldReply: false,
      reply: "",
      reason: `Agent indisponible (${e instanceof Error ? e.message : String(e)}) — à traiter en humain`,
      confidence: 0,
    };
  }
}
