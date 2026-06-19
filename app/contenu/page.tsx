import CarouselViewer, { type Slide } from "@/components/CarouselViewer";
import SlideStrip from "@/components/SlideStrip";
import PhotoSearcher from "@/components/PhotoSearcher";
import TikTokAgent from "@/components/TikTokAgent";
import ContenuWorkspace from "@/components/ContenuWorkspace";
import NotificationSettings from "@/components/NotificationSettings";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateContenuStatut, deleteContenu } from "@/lib/actions";
import { card, badge, btnGhost, colors } from "@/lib/ui";

export const dynamic = "force-dynamic";

const STATUTS_PIPELINE = ["EN_ATTENTE", "VALIDE", "EXPORTE", "REFUSE"];

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  process.env.VAPID_PUBLIC_KEY ||
  "BMRXHptE8HbQsgy0wS6Ha8OR_GCIk3Dv1_0MeZAEXP2xXqSRUTcTrYgOlEVRHF9AflMyGIaiWG5OjlxgWwy3N4c";

export default async function ContenuPage() {
  await requireAuth();

  const contenus = await prisma.contenu.findMany({ orderBy: { createdAt: "desc" } });
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const pushConfigured = !!process.env.VAPID_PRIVATE_KEY;

  /* ── Onglet Générer ──────────────────────────────────────── */
  const genererTab = !hasAnthropicKey ? (
    <div
      style={{
        background: "#1a1020",
        border: `1px solid ${colors.violet}55`,
        borderRadius: 12,
        padding: "18px 20px",
      }}
    >
      <p style={{ margin: 0, fontWeight: 700, color: colors.violet, fontSize: 14 }}>
        Agent IA non configuré
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: colors.muted, lineHeight: 1.5 }}>
        Pour activer l&apos;agent qui propose 3 restaurants parisiens par jour, ajoute{" "}
        <code style={{ color: colors.texte }}>ANTHROPIC_API_KEY</code> dans{" "}
        <strong>Vercel → Settings → Environment Variables</strong>.
      </p>
    </div>
  ) : (
    <TikTokAgent />
  );

  /* ── Onglet Bibliothèque ─────────────────────────────────── */
  const biblioTab =
    contenus.length === 0 ? (
      <p style={{ color: colors.muted, textAlign: "center", padding: "40px 20px", lineHeight: 1.6 }}>
        Aucun carrousel pour l&apos;instant.
        <br />
        Génère tes premières propositions dans l&apos;onglet <strong>Générer</strong>.
      </p>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
                <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {c.auto && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: `${colors.violet}22`,
                        color: colors.violet,
                        fontWeight: 700,
                      }}
                    >
                      AUTO
                    </span>
                  )}
                  <span style={badge(c.statut)}>{c.statut}</span>
                </div>
              </div>

              {c.adresse && (
                <p style={{ fontSize: 12, color: colors.muted, margin: "0 0 8px" }}>📍 {c.adresse}</p>
              )}
              {c.prix && (
                <p style={{ fontSize: 12, color: colors.muted, margin: "0 0 8px" }}>
                  💶 {c.prix} · 🍽️ {c.cuisine}
                </p>
              )}

              {slides.some((s) => s.imageData) ? (
                <div>
                  <p style={{ fontSize: 11, color: colors.muted, margin: "0 0 6px" }}>
                    Slides composées — fais défiler, appuie pour enregistrer :
                  </p>
                  <SlideStrip slides={slides} restaurant={c.restaurant} />
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

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {STATUTS_PIPELINE.filter((s) => s !== c.statut).map((s) => (
                  <form key={s} action={updateContenuStatut.bind(null, c.id, s)}>
                    <button type="submit" style={{ ...btnGhost, fontSize: 10, padding: "4px 9px" }}>
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
    );

  return (
    <ContenuWorkspace
      libCount={contenus.length}
      generer={genererTab}
      photos={<PhotoSearcher />}
      biblio={biblioTab}
      alertes={<NotificationSettings vapidPublicKey={VAPID_PUBLIC_KEY} pushConfigured={pushConfigured} />}
    />
  );
}
