import MessagesInbox, { type ConversationDTO } from "@/components/MessagesInbox";
import FaqManager, { type FaqDTO } from "@/components/FaqManager";
import DmAgentToggle from "@/components/DmAgentToggle";
import AgentTester from "@/components/AgentTester";
import AgentScenarios from "@/components/AgentScenarios";
import PlanningWeek from "@/components/PlanningWeek";
import { prisma } from "@/lib/prisma";
import { ensureDmDefaults } from "@/lib/dmSeed";
import { loadPlanning, loadWeekOverrides, parisToday, parisWeekKey, weekLabel } from "@/lib/planning";
import { ig } from "@/lib/igStyle";

/**
 * Volet Messages de l'app (serveur) : agent DM, boîte de réception, testeur,
 * exemples et FAQ. Rendu à l'intérieur de la coque 2 volets — pas de nav propre.
 */
export default async function MessagesPanel() {
  // Première ouverture : FAQ + contexte pré-remplis depuis les vraies
  // conversations du compte (no-op si déjà remplis).
  await ensureDmDefaults();

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
  const planning = await loadPlanning();
  const overrides = await loadWeekOverrides();
  const today = parisToday();
  // Semaine en cours + les 3 suivantes, personnalisables une par une.
  const weeks = [0, 1, 2, 3].map((i) => {
    const key = parisWeekKey(i);
    return { key, label: weekLabel(key), isCurrent: i === 0 };
  });

  const sectionTitle = {
    fontSize: 14,
    fontWeight: 700 as const,
    margin: "0 0 3px",
    color: ig.text,
    maxWidth: 460,
    marginLeft: "auto",
    marginRight: "auto",
  };
  const sectionSub = {
    fontSize: 12.5,
    color: ig.muted,
    margin: "0 auto 10px",
    lineHeight: 1.45,
    maxWidth: 460,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, fontFamily: ig.font }}>
      {needsHuman > 0 && (
        <p
          style={{
            margin: "0 auto",
            maxWidth: 460,
            width: "100%",
            boxSizing: "border-box",
            fontSize: 13,
            fontWeight: 700,
            color: ig.text,
            background: ig.elevated,
            border: `1px solid ${ig.border}`,
            borderRadius: 14,
            padding: "11px 14px",
          }}
        >
          🚩 {needsHuman} conversation{needsHuman > 1 ? "s" : ""} à traiter par toi
        </p>
      )}

      <DmAgentToggle active={agentActive} contexte={agentContexte} hasAnthropic={hasAnthropic} />

      <PlanningWeek initialDays={planning} initialOverrides={overrides} weeks={weeks} today={today} />

      <MessagesInbox initialConversations={conversations} />

      {/* Bac à sable de calibration façon DM Instagram */}
      <div>
        <h2 style={sectionTitle}>🧪 Tester l&apos;agent</h2>
        <p style={sectionSub}>
          Écris-lui comme le ferait une abonnée — rien n&apos;est envoyé pour de vrai.
        </p>
        <AgentTester />
      </div>

      {/* Historique de démo : conversations déjà gérées par l'agent (côté compte) */}
      <div>
        <h2 style={sectionTitle}>📲 Exemples de conversations</h2>
        <p style={sectionSub}>
          L&apos;historique de l&apos;agent tel qu&apos;il apparaît côté compte Instagram.
        </p>
        <AgentScenarios />
      </div>

      <FaqManager initialFaq={faq} />
    </div>
  );
}
