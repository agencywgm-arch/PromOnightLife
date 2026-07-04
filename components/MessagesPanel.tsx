import MessagesInbox, { type ConversationDTO } from "@/components/MessagesInbox";
import FaqManager, { type FaqDTO } from "@/components/FaqManager";
import DmAgentToggle from "@/components/DmAgentToggle";
import AgentTester from "@/components/AgentTester";
import AgentScenarios from "@/components/AgentScenarios";
import { prisma } from "@/lib/prisma";
import { colors } from "@/lib/ui";

/**
 * Volet Messages de l'app (serveur) : agent DM, boîte de réception, testeur,
 * exemples et FAQ. Rendu à l'intérieur de la coque 2 volets — pas de nav propre.
 */
export default async function MessagesPanel() {
  // Résilience : une panne DB ne doit pas produire d'écran noir.
  let conversations: ConversationDTO[] = [];
  let faq: FaqDTO[] = [];
  let agentActive = false;
  let agentContexte = "";
  try {
    const rows = await prisma.conversation.findMany({
      orderBy: { lastAt: "desc" },
      take: 100,
      include: {
        messages: { orderBy: { createdAt: "asc" }, take: 50 },
      },
    });
    conversations = rows.map((c) => ({
      id: c.id,
      channel: c.channel,
      username: c.username,
      name: c.name,
      status: c.status,
      autoReply: c.autoReply,
      unread: c.unread,
      lastAt: c.lastAt.toISOString(),
      messages: c.messages.map((m) => ({
        id: m.id,
        direction: m.direction as "IN" | "OUT",
        text: m.text,
        viaAgent: m.viaAgent,
        status: m.status,
        createdAt: m.createdAt.toISOString(),
      })),
    }));
  } catch (e) {
    console.error("[messages] lecture conversations impossible :", e);
  }
  try {
    const rows = await prisma.faqEntry.findMany({ orderBy: { ordre: "asc" } });
    faq = rows.map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      enabled: f.enabled,
    }));
  } catch (e) {
    console.error("[messages] lecture FAQ impossible :", e);
  }
  try {
    const cfg = await prisma.agentConfig.findUnique({ where: { agentId: "dm-agent" } });
    if (cfg) {
      agentActive = cfg.active;
      const v = JSON.parse(cfg.values || "{}") as Record<string, string>;
      agentContexte = v.contexte || "";
    }
  } catch {
    /* ignore */
  }

  const needsHuman = conversations.filter((c) => c.status === "NEEDS_HUMAN").length;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {needsHuman > 0 && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: colors.or,
            background: "#1c1710",
            border: `1px solid ${colors.or}44`,
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          ⚠️ {needsHuman} conversation{needsHuman > 1 ? "s" : ""} à traiter par toi
        </p>
      )}

      <DmAgentToggle active={agentActive} contexte={agentContexte} hasAnthropic={hasAnthropic} />

      <MessagesInbox initialConversations={conversations} />

      {/* Bac à sable de calibration façon DM Instagram */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
          🧪 Tester l&apos;agent
        </h2>
        <p style={{ fontSize: 13, color: colors.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
          Écris-lui comme le ferait une abonnée — rien n&apos;est envoyé pour de vrai.
        </p>
        <AgentTester />
      </div>

      {/* Historique de démo : conversations déjà gérées par l'agent (côté compte) */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
          📲 Exemples de conversations
        </h2>
        <p style={{ fontSize: 13, color: colors.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
          L&apos;historique de l&apos;agent tel qu&apos;il apparaît côté compte Instagram.
        </p>
        <AgentScenarios />
      </div>

      <FaqManager initialFaq={faq} />
    </div>
  );
}
