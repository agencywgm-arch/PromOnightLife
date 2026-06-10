import Nav from "@/components/Nav";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStaff, deleteStaff, setStaffEvenementStatut } from "@/lib/actions";
import { card, pageTitle, badge, input, btnPrimary, btnGhost, colors } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await requireAuth();

  const [staffs, evenements] = await Promise.all([
    prisma.staff.findMany({
      orderBy: { fiabilite: "desc" },
      include: { evenements: { include: { evenement: { select: { id: true, nom: true } } } } },
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
        <h1 style={pageTitle}>Staff</h1>
        <p style={{ color: colors.muted, marginTop: 0, marginBottom: 28 }}>
          {staffs.length} membres — hôtesses, photographes, videurs.
        </p>

        <div style={{ ...card, marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0 }}>Ajouter un membre</h2>
          <form
            action={createStaff}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              alignItems: "end",
            }}
          >
            <input name="prenom" placeholder="Prénom *" required style={input} />
            <input name="nom" placeholder="Nom *" required style={input} />
            <input name="whatsapp" placeholder="WhatsApp" style={input} />
            <input name="email" type="email" placeholder="Email" style={input} />
            <select name="role" style={input} defaultValue="Hôtesse">
              <option>Hôtesse</option>
              <option>Photographe</option>
              <option>Videur</option>
              <option>Community Manager</option>
              <option>DJ</option>
            </select>
            <select name="fiabilite" style={input} defaultValue="3">
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  Fiabilité {n}/5
                </option>
              ))}
            </select>
            <button type="submit" style={btnPrimary}>
              Ajouter
            </button>
          </form>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {staffs.map((s) => (
            <div key={s.id} style={{ ...card, padding: 18 }}>
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
                  <strong>
                    {s.prenom} {s.nom}
                  </strong>
                  <span style={{ color: colors.muted, fontSize: 13, marginLeft: 8 }}>
                    {s.role} · {"★".repeat(s.fiabilite)}{"☆".repeat(5 - s.fiabilite)}
                  </span>
                  <div style={{ color: colors.muted, fontSize: 12 }}>
                    {s.whatsapp || ""}
                    {s.email ? ` · ${s.email}` : ""}
                  </div>
                  {s.evenements.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {s.evenements.map((se) => (
                        <span key={se.id} style={badge(se.statut)}>
                          {se.evenement.nom} : {se.statut}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {evenements.map((e) => {
                    const lien = s.evenements.find((se) => se.evenement.id === e.id);
                    const next = lien?.statut === "OUI" ? "NON" : "OUI";
                    return (
                      <form key={e.id} action={setStaffEvenementStatut.bind(null, s.id, e.id, next)}>
                        <button
                          type="submit"
                          style={{
                            ...btnGhost,
                            fontSize: 11,
                            padding: "5px 10px",
                            color: lien?.statut === "OUI" ? colors.vert : colors.muted,
                            borderColor: lien?.statut === "OUI" ? `${colors.vert}55` : colors.border,
                          }}
                        >
                          {e.nom} {lien?.statut === "OUI" ? "✓" : lien?.statut === "NON" ? "✗" : "+"}
                        </button>
                      </form>
                    );
                  })}
                  <form action={deleteStaff.bind(null, s.id)}>
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
