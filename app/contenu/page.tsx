import Nav from "@/components/Nav";
import CarouselViewer, { type Slide } from "@/components/CarouselViewer";
import TikTokAgent from "@/components/TikTokAgent";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateContenuStatut, deleteContenu } from "@/lib/actions";
import { card, pageTitle, badge, btnGhost, colors } from "@/lib/ui";

export const dynamic = "force-dynamic";

const STATUTS_PIPELINE = ["EN_ATTENTE", "VALIDE", "EXPORTE", "REFUSE"];

export default async function ContenuPage() {
  await requireAuth();

  const contenus = await prisma.contenu.findMany({ orderBy: { createdAt: "desc" } });
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  return (
    <>
      <Nav />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <h1 style={pageTitle}>Contenu TikTok</h1>
        <p style={{ color: colors.muted, marginTop: 0, marginBottom: 24 }}>
          Carrousels 9:16 · Restaurants parisiens haut de gamme · Pipeline EN_ATTENTE → VALIDE → EXPORTE
        </p>

        {!hasAnthropicKey ? (
          <div
            style={{
              background: "#1a1020",
              border: `1px solid ${colors.violet}55`,
              borderRadius: 12,
              padding: "18px 20px",
              marginBottom: 28,
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, color: colors.violet, fontSize: 14 }}>
              Agent IA non configuré
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: colors.muted }}>
              Pour activer l'agent qui propose 3 restaurants parisiens par jour, ajoute{" "}
              <code style={{ color: colors.texte }}>ANTHROPIC_API_KEY</code> dans{" "}
              <strong>Vercel → Settings → Environment Variables</strong>.<br />
              Clé gratuite sur{" "}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: colors.violet }}
              >
                console.anthropic.com
              </a>{" "}
              (plan gratuit disponible).
            </p>
          </div>
        ) : (
          <TikTokAgent />
        )}

        {/* Bibliothèque */}
        {contenus.length > 0 && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "32px 0 12px", color: colors.texte }}>
              Bibliothèque de contenu ({contenus.length})
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
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
                        alignItems: "flex-start",
                        marginBottom: 8,
                        gap: 8,
                      }}
                    >
                      <div>
                        <strong style={{ display: "block" }}>{c.restaurant}</strong>
                        {c.arrondissement && (
                          <span style={{ fontSize: 12, color: colors.muted }}>{c.arrondissement}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "#1a2040",
                            color: "#6b8cff",
                          }}
                        >
                          {c.platform || "TIKTOK"}
                        </span>
                        <span style={badge(c.statut)}>{c.statut}</span>
                      </div>
                    </div>

                    {c.adresse && (
                      <p style={{ fontSize: 12, color: colors.muted, margin: "0 0 8px" }}>
                        📍 {c.adresse}
                      </p>
                    )}
                    {c.prix && (
                      <p style={{ fontSize: 12, color: colors.muted, margin: "0 0 8px" }}>
                        💶 {c.prix} · 🍽️ {c.cuisine}
                      </p>
                    )}

                    {slides.some((s) => s.imageData) ? (
                      <div>
                        <p style={{ fontSize: 11, color: colors.muted, margin: "0 0 6px" }}>
                          Slides composées (clique pour télécharger) :
                        </p>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: 6,
                          }}
                        >
                          {slides.map((s, i) =>
                            s.imageData ? (
                              <a
                                key={i}
                                href={s.imageData}
                                download={`${c.restaurant.replace(/\s+/g, "_")}_slide_${i + 1}.jpg`}
                                title={`Télécharger slide ${i + 1}`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={s.imageData}
                                  alt={`Slide ${i + 1}`}
                                  style={{
                                    width: "100%",
                                    aspectRatio: "9 / 16",
                                    objectFit: "cover",
                                    borderRadius: 8,
                                    border: `1px solid ${colors.border}`,
                                  }}
                                />
                              </a>
                            ) : null
                          )}
                        </div>
                      </div>
                    ) : (
                      <CarouselViewer slides={slides} />
                    )}

                    {c.caption && (
                      <p style={{ fontSize: 12, color: colors.texte, whiteSpace: "pre-wrap", marginTop: 10 }}>
                        {c.caption}
                      </p>
                    )}
                    {c.hashtags && (
                      <p style={{ fontSize: 11, color: colors.violet, marginTop: 4 }}>{c.hashtags}</p>
                    )}

                    {c.exportedAt && (
                      <p style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>
                        Exporté le {new Date(c.exportedAt).toLocaleDateString("fr-FR")}
                      </p>
                    )}

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                      {STATUTS_PIPELINE.filter((s) => s !== c.statut).map((s) => (
                        <form key={s} action={updateContenuStatut.bind(null, c.id, s)}>
                          <button
                            type="submit"
                            style={{ ...btnGhost, fontSize: 10, padding: "4px 9px" }}
                          >
                            {s}
                          </button>
                        </form>
                      ))}
                      <form action={deleteContenu.bind(null, c.id)}>
                        <button
                          type="submit"
                          style={{
                            ...btnGhost,
                            fontSize: 10,
                            padding: "4px 9px",
                            color: colors.rouge,
                            borderColor: `${colors.rouge}55`,
                          }}
                        >
                          Supprimer
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {contenus.length === 0 && hasAnthropicKey && (
          <p style={{ color: colors.muted, textAlign: "center", padding: 40 }}>
            Aucun contenu. Génère tes premières propositions ci-dessus.
          </p>
        )}
      </main>
    </>
  );
}
