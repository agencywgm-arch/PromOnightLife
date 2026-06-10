import Nav from "@/components/Nav";
import CarouselViewer, { type Slide } from "@/components/CarouselViewer";
import CarouselGeneratorInline from "@/components/CarouselGeneratorInline";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateContenuStatut, deleteContenu } from "@/lib/actions";
import { card, pageTitle, badge, btnGhost, colors } from "@/lib/ui";

export const dynamic = "force-dynamic";

const STATUTS = ["EN_ATTENTE", "VALIDE", "REFUSE", "PUBLIE"];

export default async function ContenuPage() {
  await requireAuth();

  const contenus = await prisma.contenu.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1 style={pageTitle}>Contenu Instagram</h1>
        <p style={{ color: colors.muted, marginTop: 0, marginBottom: 28 }}>
          Pipeline de validation : en attente → validé → publié.
        </p>

        <CarouselGeneratorInline />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 16,
          }}
        >
          {contenus.map((c) => {
            let slides: Slide[] = [];
            try {
              slides = JSON.parse(c.slides || "[]");
            } catch {
              slides = [];
            }
            return (
              <div key={c.id} style={card}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <strong>{c.restaurant}</strong>
                  <span style={badge(c.statut)}>{c.statut}</span>
                </div>
                <div style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>
                  Global {c.scoreGlobal} · Viral {c.scoreViral} · Luxe {c.scoreLuxe}
                  {c.publishedAt &&
                    ` · publié le ${new Date(c.publishedAt).toLocaleDateString("fr-FR")}`}
                </div>
                <CarouselViewer slides={slides} />
                {c.caption && (
                  <p style={{ fontSize: 13, color: colors.texte, whiteSpace: "pre-wrap" }}>
                    {c.caption}
                  </p>
                )}
                {c.hashtags && (
                  <p style={{ fontSize: 12, color: colors.violet, marginTop: 4 }}>{c.hashtags}</p>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {STATUTS.filter((s) => s !== c.statut).map((s) => (
                    <form key={s} action={updateContenuStatut.bind(null, c.id, s)}>
                      <button type="submit" style={{ ...btnGhost, fontSize: 11, padding: "5px 10px" }}>
                        {s}
                      </button>
                    </form>
                  ))}
                  <form action={deleteContenu.bind(null, c.id)}>
                    <button
                      type="submit"
                      style={{ ...btnGhost, color: colors.rouge, borderColor: `${colors.rouge}55` }}
                    >
                      Supprimer
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
