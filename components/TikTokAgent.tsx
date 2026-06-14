"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createContenu } from "@/lib/actions";
import { card, btnPrimary, btnGhost, input, colors } from "@/lib/ui";

/* ─── Types ─────────────────────────────────────────────────── */

type AgentSlide = {
  titre: string;
  sousTitre: string;
  searchQuery: string;
  imageUrl?: string;   // URL image choisie
  imageSrc?: string;   // crédits source
  imageData?: string;  // base64 rendu canvas
};

type Restaurant = {
  nom: string;
  adresse: string;
  arrondissement: string;
  horaires: string;
  prix: string;
  cuisine: string;
  verification: string;
  slides: AgentSlide[];
  caption: string;
  hashtags: string;
};

type PexelsPhoto = {
  id: number;
  pageUrl: string;
  photographer: string;
  src: string;
  thumb: string;
};

/* ─── Constantes ─────────────────────────────────────────────── */

const W = 1080;
const H = 1920;

/* ─── Registre anti-répétition des photos ─────────────────────────
   Mémorise (localStorage) les photos déjà proposées pour que chaque
   slide et chaque génération affiche des choix DIFFÉRENTS. */

const SEEN_KEY = "tiktok_photos_vues";
let seenPhotos: Set<string> | null = null;

function getSeen(): Set<string> {
  if (!seenPhotos) {
    try {
      seenPhotos = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
    } catch {
      seenPhotos = new Set();
    }
  }
  return seenPhotos;
}

/** Prend jusqu'à `n` photos jamais montrées, les marque comme vues.
    Si le stock de nouvelles photos est épuisé, on réutilise tout. */
function pickFresh<T extends { src: string }>(list: T[], n: number): T[] {
  const seen = getSeen();
  let fresh = list.filter((p) => !seen.has(p.src));
  if (fresh.length < Math.min(3, list.length)) fresh = list; // épuisé → réutilise
  const picked = fresh.slice(0, n);
  picked.forEach((p) => seen.add(p.src));
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen).slice(-2000)));
  } catch {
    /* quota localStorage — tant pis, le Set en mémoire suffit */
  }
  return picked;
}

const PHOTOS_PAR_SLIDE = 8;

/* ─── Composant image picker pour 1 slide ─────────────────────── */

function SlidePicker({
  slide,
  slideIndex,
  restaurantIndex,
  restaurantNom,
  restaurantAdresse,
  onSelect,
}: {
  slide: AgentSlide;
  slideIndex: number;
  restaurantIndex: number;
  restaurantNom: string;
  restaurantAdresse: string;
  onSelect: (rIdx: number, sIdx: number, url: string, src: string) => void;
}) {
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [error, setError] = useState<ReactNode | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState<PexelsPhoto | null>(null);

  const googleImagesUrl = `https://www.google.com/search?q=${encodeURIComponent(`"${restaurantNom}" restaurant Paris`)}&tbm=isch&hl=fr`;

  // Auto-search: déclenche les recherches à montage du composant
  useEffect(() => {
    if (!searched && slide.searchQuery) {
      const autoSearch = async () => {
        setLoading(true);
        setError(null);
        try {
          // Source UNIQUE : Google Images via Serper.dev — pas de fallback
          // Pexels/ambiance, on veut exclusivement les vraies photos Google.
          const serperRes = await fetch(
            `/api/images/serper?q=${encodeURIComponent(`${restaurantNom} restaurant ${restaurantAdresse}`)}`
          );
          const serperData = await serperRes.json();
          const serperPicked = serperRes.ok
            ? pickFresh<{ src: string; thumb: string; source: string; pageUrl?: string }>(
                serperData.photos || [], PHOTOS_PAR_SLIDE)
            : [];
          if (serperPicked.length > 0) {
            setPhotos(
              serperPicked.map((p, i) => ({
                id: i,
                pageUrl: p.pageUrl || "",
                photographer: p.source,
                src: p.src,
                thumb: p.thumb,
              }))
            );
            setProvider("serper");
            setSearched(true);
            return;
          }

          // Aucun résultat Google → on explique pourquoi, sans photos de remplacement
          if (serperData.noProvider) {
            setError("Clé Serper absente : ajoute SERPER_API_KEY dans Vercel → Settings → Environment Variables, puis Redeploy. Vérifie sur /api/images/test.");
          } else if (serperData.error) {
            setError(`Recherche Google indisponible : ${serperData.error}`);
          } else {
            setError("Aucun résultat Google Images pour ce restaurant.");
          }
        } finally {
          setSearched(true);
          setLoading(false);
        }
      };
      autoSearch();
    }
  }, [slide.searchQuery, restaurantNom, restaurantAdresse]);

  const isSelected = !!slide.imageUrl;

  return (
    <div
      style={{
        border: `1px solid ${isSelected ? colors.violet : colors.border}`,
        borderRadius: 10,
        padding: "10px 10px",
        background: isSelected ? "#12091a" : colors.bg,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: colors.violet }}>
            Slide {slideIndex + 1}
          </div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: colors.texte, wordBreak: "break-word" }}>{slide.titre}</div>
          {slide.sousTitre && (
            <div style={{ fontSize: "10px", color: colors.muted, wordBreak: "break-word" }}>{slide.sousTitre}</div>
          )}
        </div>
        {isSelected && (
          <span style={{ fontSize: 11, color: "#4ade80", padding: "2px 8px", background: "#0d2a1a", borderRadius: 6 }}>
            ✓ Image choisie
          </span>
        )}
      </div>

      {!searched && (
        <div style={{ marginTop: 8, fontSize: 12, color: colors.muted }}>
          🔍 Recherche d'images en cours…
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: colors.rouge, margin: "8px 0 0" }}>{error}</p>
      )}

      {/* Photos trouvées via API */}
      {photos.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
            {provider && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                background:
                  ["foursquare", "google", "place", "serper"].includes(provider) ? "#1a2a12" : "#0d2233",
                color:
                  ["foursquare", "google", "place", "serper"].includes(provider) ? "#8ade4a" : "#4ab3ff",
                border: `1px solid ${
                  ["foursquare", "google", "place", "serper"].includes(provider) ? "#8ade4a44" : "#4ab3ff44"
                }` }}>
                {provider === "foursquare" && "📷 Foursquare"}
                {provider === "google" && "📷 Google Maps"}
                {provider === "place" && "📷 Photos du lieu"}
                {provider === "serper" && "📷 Google Images"}
                {provider === "pexels" && "🎨 Pexels"}
                {provider === "unsplash" && "🎨 Unsplash"}
                {provider === "pixabay" && "🎨 Pixabay"}
                {provider === "auto" && "🔄 Auto (Pexels/Unsplash/Pixabay)"}
              </span>
            )}
          </div>
          {/* Bande défilante horizontale — flick rapide, compact, responsive */}
          <div
            style={{
              display: "flex",
              gap: 5,
              marginTop: 6,
              overflowX: "auto",
              paddingBottom: 4,
              scrollSnapType: "x proximity",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {photos.map((p) => (
              <img key={p.id} src={p.thumb} alt="" title={p.photographer}
                onClick={() => setPreviewPhoto(p)}
                style={{
                  width: "50px",
                  height: "75px",
                  objectFit: "cover",
                  borderRadius: 5,
                  cursor: "pointer",
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  border: slide.imageUrl === p.src ? `2px solid ${colors.violet}` : "2px solid transparent",
                  boxShadow: previewPhoto?.id === p.id ? `0 0 8px ${colors.violet}` : "none",
                }} />
            ))}
          </div>
        </>
      )}


      {/* Fallback: si aucune image trouvée après recherche auto, propose un lien de secours */}
      {searched && photos.length === 0 && (
        <div style={{ marginTop: 8, padding: 10, background: "#0d0d1a", borderRadius: 6, border: "1px solid #2a1a4a" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: colors.texte, marginBottom: 6 }}>
            ⚠️ Pas d'images
          </div>
          <div style={{ fontSize: "10px", color: colors.muted, marginBottom: 8, lineHeight: 1.4 }}>
            Essaie une recherche personnalisée ci-dessus ou Google Images.
          </div>
          <a href={googleImagesUrl} target="_blank" rel="noopener noreferrer"
            style={{ ...btnGhost, fontSize: "10px", textAlign: "center", textDecoration: "none", display: "block", padding: "4px 8px" }}>
            🔍 Google Images
          </a>
        </div>
      )}

      {/* URL manuelle — toujours disponible */}
      <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
        <input
          value={customUrl}
          onChange={(e) => setCustomUrl(e.target.value)}
          placeholder="URL de l'image"
          style={{ ...input, fontSize: "10px", padding: "6px 8px", flex: 1, minWidth: "80px" }}
        />
        <button
          onClick={() => {
            const u = customUrl.trim();
            if (u) {
              onSelect(restaurantIndex, slideIndex,
                `/api/images/proxy?url=${encodeURIComponent(u)}`, "URL manuelle");
              setCustomUrl("");
            }
          }}
          disabled={!customUrl.trim()}
          style={{ ...btnGhost, fontSize: "10px", padding: "6px 8px", whiteSpace: "nowrap" }}
        >
          Utiliser
        </button>
      </div>

      {isSelected && slide.imageSrc && (
        <p style={{ fontSize: 10, color: colors.muted, margin: "4px 0 0" }}>{slide.imageSrc}</p>
      )}

      {/* Modal Preview — affichage plein écran de l'image sélectionnée */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <img
              src={previewPhoto.src}
              alt="Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: 8,
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  onSelect(restaurantIndex, slideIndex, previewPhoto.src, `© ${previewPhoto.photographer}`);
                  setPreviewPhoto(null);
                }}
                style={{
                  ...btnPrimary,
                  fontSize: 12,
                }}
              >
                ✓ Sélectionner cette image
              </button>
              <button
                onClick={() => setPreviewPhoto(null)}
                style={{
                  ...btnGhost,
                  fontSize: 12,
                }}
              >
                ✕ Fermer
              </button>
            </div>
            <div style={{ fontSize: 11, color: colors.muted, textAlign: "center" }}>
              {previewPhoto.photographer}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Composer 9:16 canvas ────────────────────────────────────── */

async function composeSlide(slide: AgentSlide, canvas: HTMLCanvasElement): Promise<string> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Fond noir
  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, W, H);

  // Image de fond
  if (slide.imageUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej();
        img.src = slide.imageUrl!;
      });

      const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const targetW = Math.round(img.naturalWidth * scale);
      const targetH = Math.round(img.naturalHeight * scale);

      // Upscaling progressif par étapes de 2x — bien meilleure qualité que 1 seul saut
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      let source: HTMLImageElement | HTMLCanvasElement = img;
      if (scale > 1.5) {
        let curW = img.naturalWidth;
        let curH = img.naturalHeight;
        let cur: HTMLImageElement | HTMLCanvasElement = img;
        while (curW * 2 < targetW || curH * 2 < targetH) {
          const nextW = Math.min(curW * 2, targetW);
          const nextH = Math.min(curH * 2, targetH);
          const off = document.createElement("canvas");
          off.width = nextW;
          off.height = nextH;
          const offCtx = off.getContext("2d")!;
          offCtx.imageSmoothingEnabled = true;
          offCtx.imageSmoothingQuality = "high";
          offCtx.drawImage(cur, 0, 0, nextW, nextH);
          cur = off;
          curW = nextW;
          curH = nextH;
        }
        source = cur;
      }

      ctx.drawImage(source, (W - targetW) / 2, (H - targetH) / 2, targetW, targetH);
    } catch {
      // Image non chargeable — fond gradient
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#1a0a2e");
      g.addColorStop(1, "#0d0d1a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Dégradé bas pour lisibilité
  const grad = ctx.createLinearGradient(0, H * 0.5, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H * 0.5, W, H * 0.5);

  // ── Bulles texte ancrées par le bas ──────────────────────────
  const bubbleX = 60;
  const bubbleW = W - 120;
  const MARGIN_BOT = 72;   // marge basse du canvas
  const GAP = 14;          // espace entre les deux bulles

  const titleSize = slide.titre
    ? slide.titre.length > 50 ? 48 : slide.titre.length > 30 ? 56 : 64
    : 0;
  const lineHT = titleSize * 1.35;
  const stSize = 40;
  const lineHST = stSize * 1.35;
  const PAD = 28; // padding vertical dans les bulles

  // 1. Calcul des hauteurs (nécessite de set la font avant wrapText)
  let titleLines: string[] = [];
  let stLines: string[] = [];
  let titleBH = 0;
  let stBH = 0;

  if (slide.sousTitre) {
    ctx.font = `500 ${stSize}px -apple-system, Arial, sans-serif`;
    stLines = wrapText(ctx, slide.sousTitre, bubbleW - 56);
    stBH = stLines.length * lineHST + PAD;
  }
  if (slide.titre) {
    ctx.font = `bold ${titleSize}px -apple-system, Arial, sans-serif`;
    titleLines = wrapText(ctx, slide.titre, bubbleW - 56);
    titleBH = titleLines.length * lineHT + PAD;
  }

  // 2. Y de départ : on part du bas et on remonte
  // Ordre rendu (bas → haut) : sous-titre, titre
  const stTop = H - MARGIN_BOT - stBH;
  const titleTop = stBH > 0 ? stTop - GAP - titleBH : H - MARGIN_BOT - titleBH;

  // 3. Rendu sous-titre
  if (slide.sousTitre && stBH > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(ctx, bubbleX, stTop, bubbleW, stBH, 16);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.font = `500 ${stSize}px -apple-system, Arial, sans-serif`;
    stLines.forEach((line, i) => {
      ctx.fillText(
        line,
        bubbleX + 28,
        stTop + PAD / 2 + (i + 1) * lineHST - lineHST * 0.25,
        bubbleW - 56
      );
    });
    ctx.restore();
  }

  // 4. Rendu titre
  if (slide.titre && titleBH > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.97)";
    roundRect(ctx, bubbleX, titleTop, bubbleW, titleBH, 20);
    ctx.fill();
    ctx.fillStyle = "#0d0d0d";
    ctx.font = `bold ${titleSize}px -apple-system, Arial, sans-serif`;
    titleLines.forEach((line, i) => {
      ctx.fillText(
        line,
        bubbleX + 28,
        titleTop + PAD / 2 + (i + 1) * lineHT - lineHT * 0.25,
        bubbleW - 56
      );
    });
    ctx.restore();
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxW) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/* ─── Composant principal ─────────────────────────────────────── */

export default function TikTokAgent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [historique, setHistorique] = useState<string[]>([]);
  const [composing, setComposing] = useState<number | null>(null);
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  const hasApiKey = true; // vérifié côté serveur — l'erreur revient dans la réponse

  async function suggest() {
    setLoading(true);
    setError(null);
    setRestaurants([]);
    setSaved({});
    try {
      const res = await fetch("/api/agent/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historique }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erreur inconnue");
      }
      setRestaurants(data.restaurants || []);
      setHistorique((prev) => [
        ...prev,
        ...(data.restaurants || []).map((r: Restaurant) => r.nom),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function selectImage(rIdx: number, sIdx: number, url: string, src: string) {
    setRestaurants((prev) =>
      prev.map((r, i) =>
        i !== rIdx
          ? r
          : {
              ...r,
              slides: r.slides.map((s, j) =>
                j !== sIdx ? s : { ...s, imageUrl: url, imageSrc: src }
              ),
            }
      )
    );
  }

  async function compose(rIdx: number) {
    const r = restaurants[rIdx];
    setComposing(rIdx);
    try {
      const canvas = canvasRef.current!;
      const rendered: AgentSlide[] = [];
      for (const slide of r.slides) {
        const imageData = await composeSlide(slide, canvas);
        rendered.push({ ...slide, imageData });
      }
      // Sauvegarder en base
      const fd = new FormData();
      fd.set("restaurant", r.nom);
      fd.set("adresse", r.adresse);
      fd.set("arrondissement", r.arrondissement);
      fd.set("horaires", r.horaires);
      fd.set("prix", r.prix);
      fd.set("cuisine", r.cuisine);
      fd.set("slides", JSON.stringify(rendered));
      fd.set("caption", r.caption);
      fd.set("hashtags", r.hashtags);
      fd.set("platform", "TIKTOK");
      fd.set("scoreGlobal", "80");
      fd.set("scoreViral", "85");
      fd.set("scoreLuxe", "75");
      await createContenu(fd);
      setSaved((prev) => ({ ...prev, [rIdx]: true }));
      router.refresh();
    } catch (e) {
      alert(`Erreur : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setComposing(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Header */}
      <div
        style={{
          ...card,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            🎬 Agent TikTok — Restaurants parisiens
          </h2>
          <p style={{ fontSize: 13, color: colors.muted, margin: "4px 0 0" }}>
            Génère 3 propositions de carrousels 9:16 par jour. Style FANOPA / guest_for_dinner.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {historique.length > 0 && (
            <span style={{ fontSize: 11, color: colors.muted }}>
              {historique.length} restau{historique.length > 1 ? "s" : ""} vus
            </span>
          )}
          <button onClick={suggest} disabled={loading} style={btnPrimary}>
            {loading ? "L'agent cherche…" : "✨ Générer 3 propositions"}
          </button>
          {historique.length > 0 && (
            <button
              onClick={() => { setHistorique([]); setRestaurants([]); setSaved({}); }}
              style={{ ...btnGhost, fontSize: 11 }}
            >
              Reset historique
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#2a0d0d",
            border: `1px solid ${colors.rouge}55`,
            borderRadius: 10,
            padding: 14,
            color: colors.rouge,
            fontSize: 13,
          }}
        >
          {error.includes("ANTHROPIC_API_KEY") ? (
            <>
              <strong>ANTHROPIC_API_KEY manquante</strong> — Ajoute cette variable dans{" "}
              <strong>Vercel → Settings → Environment Variables</strong>. Crée une clé gratuite sur{" "}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: colors.violet }}
              >
                console.anthropic.com
              </a>
              .
            </>
          ) : (
            error
          )}
        </div>
      )}

      {/* Propositions */}
      {restaurants.map((r, rIdx) => {
        const allImagesSelected = r.slides.every((s) => s.imageUrl);
        const isSaved = saved[rIdx];

        return (
          <div key={rIdx} style={card}>
            {/* En-tête restaurant */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 14,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 18, color: colors.texte }}>{r.nom}</h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.muted }}>
                  📍 {r.adresse} · {r.arrondissement}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: colors.muted }}>
                  🕐 {r.horaires} · 💶 {r.prix} · 🍽️ {r.cuisine}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!isSaved ? (
                  <button
                    onClick={() => compose(rIdx)}
                    disabled={!allImagesSelected || composing !== null}
                    style={{
                      ...btnPrimary,
                      opacity: !allImagesSelected || composing !== null ? 0.5 : 1,
                    }}
                    title={!allImagesSelected ? "Choisis une image par slide" : ""}
                  >
                    {composing === rIdx ? "Composition…" : "⬇️ Composer & Télécharger"}
                  </button>
                ) : (
                  <span
                    style={{
                      fontSize: 12,
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: "#0d2a1a",
                      color: "#4ade80",
                    }}
                  >
                    ✓ Enregistré en Contenu
                  </span>
                )}
              </div>
            </div>

            {/* Caption */}
            <div
              style={{
                background: colors.bg,
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                color: colors.texte,
                marginBottom: 14,
                whiteSpace: "pre-wrap",
              }}
            >
              <strong style={{ fontSize: 11, color: colors.muted, display: "block", marginBottom: 4 }}>
                LÉGENDE
              </strong>
              {r.caption}
              <br />
              <span style={{ color: colors.violet }}>{r.hashtags}</span>
            </div>

            {/* Slides */}
            <div style={{ display: "grid", gap: 10 }}>
              {r.slides.map((slide, sIdx) => (
                <SlidePicker
                  key={sIdx}
                  slide={slide}
                  slideIndex={sIdx}
                  restaurantIndex={rIdx}
                  restaurantNom={r.nom}
                  restaurantAdresse={r.adresse}
                  onSelect={selectImage}
                />
              ))}
            </div>

            {!allImagesSelected && (
              <p style={{ fontSize: 12, color: colors.muted, marginTop: 10, textAlign: "center" }}>
                Choisis une image pour chaque slide avant de composer.
              </p>
            )}

            <p style={{ fontSize: 10, color: colors.muted, marginTop: 8 }}>
              Vérification : {r.verification}
            </p>
          </div>
        );
      })}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
