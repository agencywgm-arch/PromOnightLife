import { prisma } from "./prisma";
import { sendDM, type Channel } from "./instagram";
import { decideDmReply, type DmHistoryItem, type FaqItem } from "./dmAgent";
import { loadEffectivePlanning, planningToText } from "./planning";

/**
 * Cœur de la boîte de réception DM. Reçoit un message entrant normalisé (quel
 * que soit le canal), l'enregistre, puis laisse l'agent décider s'il répond
 * automatiquement (questions récurrentes) ou s'il escalade en humain.
 */

export type InboundMessage = {
  channel: Channel;
  externalId: string;
  username?: string;
  name?: string;
  text: string;
};

/** L'agent global est-il activé ? (AgentConfig "dm-agent") */
export async function agentConfig(): Promise<{ active: boolean; contexte: string; offre: string }> {
  try {
    const cfg = await prisma.agentConfig.findUnique({ where: { agentId: "dm-agent" } });
    if (!cfg) return { active: false, contexte: "", offre: "" };
    const values = JSON.parse(cfg.values || "{}") as Record<string, string>;
    return { active: cfg.active, contexte: values.contexte || "", offre: values.offre || "" };
  } catch {
    return { active: false, contexte: "", offre: "" };
  }
}

export async function loadFaq(): Promise<FaqItem[]> {
  try {
    const rows = await prisma.faqEntry.findMany({
      where: { enabled: true },
      orderBy: { ordre: "asc" },
    });
    return rows.map((r) => ({ question: r.question, answer: r.answer }));
  } catch {
    return [];
  }
}

export type IngestResult = {
  conversationId: string;
  replied: boolean;
  reason: string;
};

export async function ingestInboundMessage(input: InboundMessage): Promise<IngestResult> {
  const text = input.text.trim();
  if (!input.externalId || !text) {
    return { conversationId: "", replied: false, reason: "message vide" };
  }

  // 1. Upsert conversation + enregistrement du message entrant
  const convo = await prisma.conversation.upsert({
    where: { channel_externalId: { channel: input.channel, externalId: input.externalId } },
    create: {
      channel: input.channel,
      externalId: input.externalId,
      username: input.username || null,
      name: input.name || null,
      lastMessage: text,
      lastDirection: "IN",
      lastAt: new Date(),
      unread: 1,
    },
    update: {
      username: input.username || undefined,
      name: input.name || undefined,
      lastMessage: text,
      lastDirection: "IN",
      lastAt: new Date(),
      unread: { increment: 1 },
      // un nouveau message rouvre une conversation fermée
      status: "OPEN",
    },
  });

  await prisma.message.create({
    data: { conversationId: convo.id, direction: "IN", text, status: "RECEIVED" },
  });

  // 2. L'agent peut-il répondre ? (global activé + auto sur cette conv)
  const { active, contexte, offre } = await agentConfig();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!active || !convo.autoReply || !apiKey) {
    return { conversationId: convo.id, replied: false, reason: "agent inactif sur cette conversation" };
  }

  const history = await prisma.message.findMany({
    where: { conversationId: convo.id },
    orderBy: { createdAt: "asc" },
    take: 12,
  });
  const faq = await loadFaq();
  const planning = planningToText(await loadEffectivePlanning());

  const decision = await decideDmReply(
    apiKey,
    faq,
    history.map((m): DmHistoryItem => ({ direction: m.direction as "IN" | "OUT", text: m.text })),
    contexte,
    planning,
    offre
  );

  // 3. L'agent ne sait pas → on escalade en humain, sans rien envoyer.
  if (!decision.shouldReply) {
    await prisma.conversation.update({
      where: { id: convo.id },
      data: { status: "NEEDS_HUMAN" },
    });
    return { conversationId: convo.id, replied: false, reason: decision.reason };
  }

  // 4. L'agent répond → envoi via le canal, puis trace de la réponse.
  const sent = await sendDM(input.channel, input.externalId, decision.reply);
  await prisma.message.create({
    data: {
      conversationId: convo.id,
      direction: "OUT",
      text: decision.reply,
      viaAgent: true,
      status: sent.ok ? "SENT" : "FAILED",
    },
  });
  await prisma.conversation.update({
    where: { id: convo.id },
    data: {
      lastMessage: decision.reply,
      lastDirection: "OUT",
      lastAt: new Date(),
      unread: 0,
      // si l'envoi a échoué, on bascule en humain pour ne rien perdre
      status: sent.ok ? "OPEN" : "NEEDS_HUMAN",
    },
  });

  return {
    conversationId: convo.id,
    replied: sent.ok,
    reason: sent.ok ? decision.reason : sent.message,
  };
}
