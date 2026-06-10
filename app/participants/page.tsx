import Nav from "@/components/Nav";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createParticipant,
  updateParticipantStatut,
  deleteParticipant,
} from "@/lib/actions";
import { card, pageTitle, badge, input, btnPrimary, btnGhost, colors } from "@/lib/ui";

export const dynamic = "force-dynamic";

const STATUTS = ["EN_ATTENTE", "ACCEPTEE", "REFUSEE", "INVITEE", "PRESENTE"];

export default async function ParticipantsPage() {
  await requireAuth();

  const [participants, evenements] = await Promise.all([
    prisma.participant.findMany({
      orderBy: { createdAt: "desc" },
      include: { evenement: { select: { nom: true } } },
    }),
    prisma.evenement.findMany({
      where: { statut: { in: ["PLANIFIE", "CONFIRME"] } },
      orderBy: { date: "asc" },
      select: { id: true, nom: true },
    }),
  ]);

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1 style={pageTitle}>Participantes</h1>
        <p style={{ color: colors.muted, marginTop: 0, marginBottom: 28 }}>
          {participants.length} candidatures — via ManyChat ou ajout manuel.
        </p>

        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0 }}>
            Ajouter une participante
          </h2>
          <form
            action={createParticipant}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              alignItems: "end",
            }}
          >
            <input name="prenom" placeholder="Prénom *" required style={input} />
            <input name="age" type="number" min={18} max={99} placeholder="Âge *" required style={input} />
            <input name="instagram" placeholder="@instagram *" required style={input} />
            <input name="telephone" placeholder="Téléphone" style={input} />
            <input name="email" type="email" placeholder="Email" style={input} />
            <select name="evenementId" style={input} defaultValue="">
              <option value="">— Soirée (optionnel) —</option>
              {evenements.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom}
                </option>
              ))}
            </select>
            <button type="submit" style={btnPrimary}>
              Ajouter
            </button>
          </form>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {participants.map((p) => (
            <div
              key={p.id}
              style={{
                ...card,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                padding: 16,
              }}
            >
              <div style={{ minWidth: 220 }}>
                <strong>{p.prenom}</strong>
                <span style={{ color: colors.muted, fontSize: 13, marginLeft: 8 }}>
                  {p.age} ans · {p.instagram}
                  {p.evenement ? ` · ${p.evenement.nom}` : ""}
                </span>
                <div style={{ color: colors.muted, fontSize: 12 }}>
                  source : {p.source}
                  {p.telephone ? ` · ${p.telephone}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={badge(p.statut)}>{p.statut}</span>
                {STATUTS.filter((s) => s !== p.statut).map((s) => (
                  <form key={s} action={updateParticipantStatut.bind(null, p.id, s)}>
                    <button type="submit" style={{ ...btnGhost, fontSize: 11, padding: "5px 10px" }}>
                      {s}
                    </button>
                  </form>
                ))}
                <form action={deleteParticipant.bind(null, p.id)}>
                  <button
                    type="submit"
                    style={{ ...btnGhost, color: colors.rouge, borderColor: `${colors.rouge}55` }}
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
