import Nav from "@/components/Nav";
import AgentConfigPanel from "@/components/AgentConfigPanel";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { card, pageTitle, badge, colors } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuth();

  const [
    totalParticipants,
    enAttente,
    acceptees,
    evenementsAVenir,
    agentConfigs,
  ] = await Promise.all([
    prisma.participant.count(),
    prisma.participant.count({ where: { statut: "EN_ATTENTE" } }),
    prisma.participant.count({ where: { statut: { in: ["ACCEPTEE", "INVITEE", "PRESENTE"] } } }),
    prisma.evenement.findMany({
      where: { statut: { in: ["PLANIFIE", "CONFIRME"] }, date: { gte: new Date(Date.now() - 86400000) } },
      orderBy: { date: "asc" },
      take: 5,
      include: { _count: { select: { participants: true } } },
    }),
    prisma.agentConfig.findMany(),
  ]);

  const tauxAcceptation =
    totalParticipants > 0 ? Math.round((acceptees / totalParticipants) * 100) : 0;

  const stats = [
    { label: "Participantes", value: totalParticipants },
    { label: "En attente", value: enAttente },
    { label: "Acceptées / invitées", value: acceptees },
    { label: "Taux d'acceptation", value: `${tauxAcceptation}%` },
  ];

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1 style={pageTitle}>Dashboard</h1>
        <p style={{ color: colors.muted, marginTop: 0, marginBottom: 28 }}>
          Bonsoir {session.nom} — vue d&apos;ensemble de vos soirées.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 28,
          }}
        >
          {stats.map((s) => (
            <div key={s.label} style={card}>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  background: `linear-gradient(90deg, ${colors.violet}, ${colors.rose})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                {s.value}
              </div>
              <div style={{ color: colors.muted, fontSize: 13 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 0 }}>
            Prochaines soirées
          </h2>
          {evenementsAVenir.length === 0 && (
            <p style={{ color: colors.muted, fontSize: 14 }}>Aucune soirée à venir.</p>
          )}
          <div style={{ display: "grid", gap: 12 }}>
            {evenementsAVenir.map((e) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  borderBottom: `1px solid ${colors.border}`,
                  paddingBottom: 10,
                }}
              >
                <div>
                  <strong>{e.nom}</strong>
                  <span style={{ color: colors.muted, fontSize: 13, marginLeft: 10 }}>
                    {e.lieu} · {new Date(e.date).toLocaleDateString("fr-FR")} ·{" "}
                    {e.heureDebut}–{e.heureFin}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ color: colors.muted, fontSize: 13 }}>
                    {e._count.participants}/{e.maxParticipants}
                  </span>
                  <span style={badge(e.statut)}>{e.statut}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <AgentConfigPanel
          initialConfigs={agentConfigs.map((c) => ({
            agentId: c.agentId,
            active: c.active,
            values: JSON.parse(c.values || "{}"),
          }))}
        />
      </main>
    </>
  );
}
