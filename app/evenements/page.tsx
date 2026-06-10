import Nav from "@/components/Nav";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createEvenement, updateEvenementStatut, deleteEvenement } from "@/lib/actions";
import { card, pageTitle, badge, input, btnPrimary, btnGhost, colors } from "@/lib/ui";

export const dynamic = "force-dynamic";

const STATUTS = ["PLANIFIE", "CONFIRME", "TERMINE", "ANNULE"];

export default async function EvenementsPage() {
  await requireAuth();

  const evenements = await prisma.evenement.findMany({
    orderBy: { date: "desc" },
    include: {
      _count: { select: { participants: true } },
      staff: { include: { staff: { select: { prenom: true, nom: true, role: true } } } },
    },
  });

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1 style={pageTitle}>Événements</h1>
        <p style={{ color: colors.muted, marginTop: 0, marginBottom: 28 }}>
          {evenements.length} soirées planifiées ou passées.
        </p>

        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0 }}>Créer une soirée</h2>
          <form
            action={createEvenement}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              alignItems: "end",
            }}
          >
            <input name="nom" placeholder="Nom de la soirée *" required style={input} />
            <input name="date" type="date" required style={input} />
            <input name="lieu" placeholder="Lieu *" required style={input} />
            <input name="adresse" placeholder="Adresse *" required style={input} />
            <input name="heureDebut" type="time" defaultValue="23:00" style={input} />
            <input name="heureFin" type="time" defaultValue="05:00" style={input} />
            <input name="dressCode" placeholder="Dress code" style={input} />
            <input
              name="maxParticipants"
              type="number"
              min={1}
              defaultValue={50}
              placeholder="Capacité max"
              style={input}
            />
            <button type="submit" style={btnPrimary}>
              Créer
            </button>
          </form>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {evenements.map((e) => (
            <div key={e.id} style={{ ...card, padding: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong style={{ fontSize: 16 }}>{e.nom}</strong>{" "}
                  <span style={badge(e.statut)}>{e.statut}</span>
                  <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                    {e.lieu} — {e.adresse}
                    <br />
                    {new Date(e.date).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}{" "}
                    · {e.heureDebut}–{e.heureFin}
                    {e.dressCode ? ` · Dress code : ${e.dressCode}` : ""}
                  </div>
                  <div style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                    {e._count.participants}/{e.maxParticipants} participantes ·{" "}
                    {e.staff.filter((s) => s.statut === "OUI").length} staff confirmé
                    {e.staff.length > 0 && (
                      <span>
                        {" "}
                        (
                        {e.staff
                          .map((s) => `${s.staff.prenom} ${s.statut === "OUI" ? "✓" : s.statut === "NON" ? "✗" : "?"}`)
                          .join(", ")}
                        )
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {STATUTS.filter((s) => s !== e.statut).map((s) => (
                    <form key={s} action={updateEvenementStatut.bind(null, e.id, s)}>
                      <button type="submit" style={{ ...btnGhost, fontSize: 11, padding: "5px 10px" }}>
                        {s}
                      </button>
                    </form>
                  ))}
                  <form action={deleteEvenement.bind(null, e.id)}>
                    <button
                      type="submit"
                      style={{ ...btnGhost, color: colors.rouge, borderColor: `${colors.rouge}55` }}
                    >
                      Supprimer
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
