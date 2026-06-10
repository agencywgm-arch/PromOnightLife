import Nav from "@/components/Nav";
import CarouselViewer, { type Slide } from "@/components/CarouselViewer";
import CarouselGeneratorInline from "@/components/CarouselGeneratorInline";
import PublishButton from "@/components/PublishButton";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateContenuStatut, deleteContenu } from "@/lib/actions";
import { card, pageTitle, badge, btnGhost, colors } from "@/lib/ui";

export const dynamic = "force-dynamic";

const STATUTS = ["EN_ATTENTE", "VALIDE", "REFUSE", "PUBLIE"];

export default async function ContenuPage() {
  await requireAuth();

  const contenus = await prisma.contenu.findMany({ orderBy: { createdAt: "desc" } });
  const hasGoogleKey = !!process.env.GOOGLE_PLACES_API_KEY;
  const hasMetaConfig =
    !!process.env.META_ACCESS_TOKEN && !!process.env.META_IG_USER_ID;

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1 style={pageTitle}>Contenu Instagram</h1>
        <p style={{ color: colors.muted, marginTop: 0, marginBottom: 16 }}>
          Pipeline : EN_ATTENTE → VALIDE → PUBLIE
        </p>

        {!hasGoogleKey && (
          <div
            style={{
              background: "#1a1020",
              border: `1px solid ${colors.violet}55`,
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 20,
              fontSize: 13,
              color: colors.muted,
            }}
          >
            <strong style={{ color: colors.violet }}>Google Places API non configurée</strong>
            {" "}— Le générateur de carrousel est désactivé. Ajoute{" "}
            <code style={{ color: colors.texte }}>GOOGLE_PLACES_API_KEY</code>{" "}
            dans tes variables Vercel pour activer la recherche de lieux et la génération d'images.
          </div>
        )}

        {!hasMetaConfig && (
          <div
            style={{
              background: "#1a1015",
              border: `1px solid ${colors.rose}55`,
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 20,
              fontSize: 13,
              color: colors.muted,
            }}
          >
            <strong style={{ color: colors.rose }}>Publication Instagram non configurée</strong>
            {" "}— Ajoute{" "}
            <code style={{ color: colors.texte }}>META_ACCESS_TOKEN</code> et{" "}
            <code style={{ color: colors.texte }}>META_IG_USER_ID</code>{" "}
            dans tes variables Vercel pour publier directement depuis l'app.
          </div>
        )}

        {hasGoogleKey && <CarouselGeneratorInline />}

        {contenus.length === 0 && (
          <p style={{ color: colors.muted, textAlign: "center", padding: 40 }}>
            Aucun contenu. {hasGoogleKey ? "Génère ton premier carrousel ci-dessus." : "Configure Google Places API pour commencer."}
          </p>
        )}

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
            const hasImages = slides.some((s) => s.imageData);
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

                {!hasImages && slides.length > 0 && (
                  <p style={{ fontSize: 11, color: colors.muted, marginTop: 6 }}>
                    Images non stockées — ré-ouvre le générateur et re-génère pour les sauvegarder.
                  </p>
                )}

                {c.caption && (
                  <p style={{ fontSize: 13, color: colors.texte, whiteSpace: "pre-wrap", marginTop: 10 }}>
                    {c.caption}
                  </p>
                )}
                {c.hashtags && (
                  <p style={{ fontSize: 12, color: colors.violet, marginTop: 4 }}>{c.hashtags}</p>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {STATUTS.filter((s) => s !== c.statut && s !== "PUBLIE").map((s) => (
                    <form key={s} action={updateContenuStatut.bind(null, c.id, s)}>
                      <button type="submit" style={{ ...btnGhost, fontSize: 11, padding: "5px 10px" }}>
                        {s}
                      </button>
                    </form>
                  ))}

                  {c.statut === "VALIDE" && (
                    <PublishButton contenuId={c.id} hasImages={hasImages} hasMetaConfig={hasMetaConfig} />
                  )}

                  <form action={deleteContenu.bind(null, c.id)}>
                    <button
                      type="submit"
                      style={{ ...btnGhost, color: colors.rouge, borderColor: `${colors.rouge}55`, fontSize: 11, padding: "5px 10px" }}
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
