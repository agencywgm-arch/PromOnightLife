import Nav from "@/components/Nav";
import MessagesInbox, { type ConversationDTO } from "@/components/MessagesInbox";
import FaqManager, { type FaqDTO } from "@/components/FaqManager";
import DmAgentToggle from "@/components/DmAgentToggle";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pageTitle, colors } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  await requireAuth();

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
    <>
      <Nav />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1 style={pageTitle}>Messages</h1>
        <p style={{ color: colors.muted, marginTop: 0, marginBottom: 20 }}>
          DM Instagram des participantes. L&apos;agent répond automatiquement aux
          questions récurrentes et te laisse{" "}
          <strong style={{ color: needsHuman ? colors.or : colors.muted }}>
            {needsHuman} à traiter
          </strong>
          .
        </p>

        <DmAgentToggle
          active={agentActive}
          contexte={agentContexte}
          hasAnthropic={hasAnthropic}
        />

        <MessagesInbox initialConversations={conversations} />

        <FaqManager initialFaq={faq} />
      </main>
    </>
  );
}
