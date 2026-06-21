"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createContenu } from "@/lib/actions";
import { snapshotImage } from "@/lib/imageSnapshot";
import { card, btnPrimary, btnGhost, input, colors } from "@/lib/ui";
import Loader3D from "@/components/Loader3D";

/* ─── Types ─────────────────────────────────────────────────── */

type AgentSlide = {
  titre: string;
  sousTitre: string;
  searchQuery: string;
  imageUrl?: string;   // URL image choisie
  imageThumb?: string; // miniature (fallback fiable si l'originale expire)
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
  hd?: boolean;
  isUGC?: boolean;
  width?: number;
  height?: number;
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

const PHOTOS_PAR_SLIDE = 12;

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
  onSelect: (rIdx: number, sIdx: number, url: string, src: string, thumb?: string) => void;
}) {
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [error, setError] = useState<ReactNode | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [customQuery, setCustomQuery] = useState("");
  const [genAI, setGenAI] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<PexelsPhoto | null>(null);
  const [previewStage, setPreviewStage] = useState<0 | 1 | 2>(0);

  // Génère une image IA HD et la sélectionne (filet qualité si pas de vraie photo).
  async function genAIImage() {
    setGenAI(true);
    try {
      const kind = slideIndex === 2 ? "plat" : slideIndex === 1 ? "facade" : "ambiance";
      const res = await fetch(
        `/api/images/generate?q=${encodeURIComponent(restaurantNom)}&kind=${kind}`
      );
      const data = await res.json();
      if (data.photo) {
        onSelect(restaurantIndex, slideIndex, data.photo.src, "Image IA", data.photo.thumb);
      }
    } catch {
      /* silencieux */
    } finally {
      setGenAI(false);
    }
  }

  useEffect(() => {
    setPreviewStage(0);
  }, [previewPhoto]);

  const googleImagesUrl = `https://www.google.com/search?q=${encodeURIComponent(`"${restaurantNom}" restaurant Paris`)}&tbm=isch&hl=fr`;

  // Recherche Google Images (Serper.dev) — réutilisée par l'auto-recherche
  // au montage ET par la recherche manuelle (bouton "Chercher" / relancer).
  async function runSearch(q: string) {
    setLoading(true);
    setError(null);
    try {
      const serperRes = await fetch(`/api/images/serper?q=${encodeURIComponent(q)}`);
      const serperData = await serperRes.json();
      const serperPicked = serperRes.ok
        ? pickFresh<{ src: string; thumb: string; source: string; pageUrl?: string; hd?: boolean; isUGC?: boolean; width?: number; height?: number }>(
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
            hd: p.hd,
            isUGC: p.isUGC,
            width: p.width,
            height: p.height,
          }))
        );
        setProvider("serper");
        return;
      }

      // Aucun résultat Google → on explique pourquoi, sans photos de remplacement
      if (serperData.noProvider) {
        setError("Clé Serper absente : ajoute SERPER_API_KEY dans Vercel → Settings → Environment Variables, puis Redeploy. Vérifie sur /api/images/test.");
      } else if (serperData.error) {
        setError(`Recherche Google indisponible : ${serperData.error}`);
      } else {
        setError("Aucun résultat Google Images pour cette recherche.");
      }
    } finally {
      setSearched(true);
      setLoading(false);
    }
  }

  // Auto-search: déclenche la recherche au nom exact du restaurant, au montage.
  useEffect(() => {
    if (!searched && slide.searchQuery) {
      runSearch(restaurantNom);
    }
  }, [slide.searchQuery, restaurantNom, restaurantAdresse]);

  // Relance la recherche avec un mot-clé personnalisé (ex: "vue tour eiffel",
  // "façade le soir"…) si le nom exact ne donne pas une photo satisfaisante.
  function searchCustom() {
    const q = customQuery.trim();
    if (!q || loading) return;
    runSearch(`${restaurantNom} ${q}`);
  }

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

      {(!searched || loading) && (
        <Loader3D compact label="Recherche des photos HD" />
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
          <p style={{ fontSize: 10, color: colors.muted, margin: "0 0 4px" }}>
            {photos.length} résultats — clique sur une photo pour la prévisualiser et la choisir
          </p>
          {/* Bande défilante horizontale — flick rapide, compact, responsive */}
          <div
            style={{
              display: "flex",
              gap: 6,
              marginTop: 6,
              overflowX: "auto",
              paddingBottom: 4,
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {photos.map((p) => {
              const isSelectedPhoto = slide.imageUrl === p.src;
              const short = p.width ? Math.min(p.width, p.height || 0) : 0;
              return (
                <div key={p.id} style={{ position: "relative", flexShrink: 0, scrollSnapAlign: "start" }}>
                  <img src={p.thumb} alt="" title={p.width ? `${p.width}×${p.height}` : p.photographer}
                    onClick={() => setPreviewPhoto(p)}
                    onError={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}
                    style={{
                      width: "70px",
                      height: "105px",
                      objectFit: "cover",
                      borderRadius: 6,
                      cursor: "pointer",
                      display: "block",
                      border: isSelectedPhoto ? `3px solid ${colors.violet}` : `1px solid ${colors.border}`,
                      boxShadow: previewPhoto?.id === p.id ? `0 0 8px ${colors.violet}` : "none",
                      opacity: isSelectedPhoto ? 1 : 0.85,
                    }} />
                  {p.isUGC && !isSelectedPhoto && (
                    <span style={{
                      position: "absolute", top: 4, left: 4,
                      background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
                      borderRadius: 4, fontSize: 8, fontWeight: 700, color: "#fff", padding: "2px 4px",
                    }}>IG</span>
                  )}
                  {p.hd && !isSelectedPhoto && (
                    <span style={{
                      position: "absolute", bottom: 4, left: 4,
                      background: "rgba(74,222,128,0.92)", color: "#04210f",
                      fontSize: 8, fontWeight: 800, borderRadius: 3, padding: "1px 4px",
                      letterSpacing: 0.3,
                    }}>HD{short ? ` · ${short}px` : ""}</span>
                  )}
                  {isSelectedPhoto && (
                    <span style={{
                      position: "absolute", top: 4, right: 4,
                      background: colors.violet, width: 18, height: 18, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#000", fontWeight: 700, fontSize: 11,
                    }}>✓</span>
                  )}
                </div>
              );
            })}
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

      {/* Recherche personnalisée — relance Google Images avec un mot-clé en plus
          du nom du restaurant (ex: "vue", "façade", "terrasse") si le nom seul
          ne donne pas une photo satisfaisante. */}
      <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
        <input
          value={customQuery}
          onChange={(e) => setCustomQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchCustom()}
          placeholder="Affiner la recherche (ex: terrasse, façade, vue)"
          style={{ ...input, fontSize: "10px", padding: "6px 8px", flex: 1, minWidth: "80px" }}
        />
        <button
          onClick={searchCustom}
          disabled={!customQuery.trim() || loading}
          style={{ ...btnGhost, fontSize: "10px", padding: "6px 8px", whiteSpace: "nowrap" }}
        >
          🔍 Chercher
        </button>
      </div>

      {/* URL manuelle — toujours disponible */}
      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
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
                `/api/images/proxy?url=${encodeURIComponent(u)}`, "URL manuelle",
                `/api/images/proxy?url=${encodeURIComponent(u)}`);
              setCustomUrl("");
            }
          }}
          disabled={!customUrl.trim()}
          style={{ ...btnGhost, fontSize: "10px", padding: "6px 8px", whiteSpace: "nowrap" }}
        >
          Utiliser
        </button>
        <button
          onClick={genAIImage}
          disabled={genAI}
          title="Génère une image d'ambiance HD par IA pour cette slide"
          style={{
            ...btnGhost,
            fontSize: "10px",
            padding: "6px 8px",
            whiteSpace: "nowrap",
            borderColor: `${colors.violet}88`,
            color: colors.violet,
          }}
        >
          {genAI ? "✨ Génère…" : "✨ Image IA"}
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
            {previewStage < 2 ? (
              <img
                src={previewStage === 0 ? previewPhoto.src : previewPhoto.thumb}
                alt="Preview"
                onError={() => setPreviewStage((s) => (s === 0 ? 1 : 2) as 0 | 1 | 2)}
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "85vh",
                  objectFit: "contain",
                  borderRadius: 12,
                }}
              />
            ) : (
              <div
                style={{
                  width: "min(70vw, 320px)",
                  padding: "32px 16px",
                  textAlign: "center",
                  background: "#1a1a24",
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>🚫</div>
                <div style={{ fontSize: 13, color: colors.texte, fontWeight: 600, marginBottom: 4 }}>
                  Image indisponible
                </div>
                <div style={{ fontSize: 11, color: colors.muted, lineHeight: 1.4 }}>
                  Cette photo ne peut plus être chargée (lien expiré ou bloqué). Choisis une autre photo dans la liste.
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {previewStage < 2 && (
                <button
                  onClick={() => {
                    onSelect(restaurantIndex, slideIndex, previewPhoto.src, `© ${previewPhoto.photographer}`, previewPhoto.thumb);
                    setPreviewPhoto(null);
                  }}
                  style={{
                    ...btnPrimary,
                    fontSize: 12,
                  }}
                >
                  ✓ Sélectionner cette image
                </button>
              )}
              {previewStage < 2 && (
                <a
                  href={previewPhoto.src}
                  download={`photo_${previewPhoto.id}.jpg`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ ...btnGhost, fontSize: 12, textDecoration: "none" }}
                >
                  ⬇️ Télécharger
                </a>
              )}
              {previewPhoto.pageUrl && (
                <a
                  href={previewPhoto.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...btnGhost, fontSize: 12, textDecoration: "none" }}
                >
                  🔗 Voir la source
                </a>
              )}
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

  // Fond dégradé de marque (net, sans flou)
  const baseBg = ctx.createLinearGradient(0, 0, 0, H);
  baseBg.addColorStop(0, "#160d2b");
  baseBg.addColorStop(1, "#0b0815");
  ctx.fillStyle = baseBg;
  ctx.fillRect(0, 0, W, H);

  // Image de fond
  if (slide.imageUrl) {
    try {
      // Charge l'originale ; si elle échoue (lien expiré/bloqué), bascule
      // sur la miniature qui reste valide (cache Google) plutôt qu'un fond vide.
      const loadImg = (url: string) =>
        new Promise<HTMLImageElement>((res, rej) => {
          const im = new Image();
          im.crossOrigin = "anonymous";
          im.onload = () => res(im);
          im.onerror = () => rej(new Error("load failed"));
          im.src = url;
        });

      // Passe par le proxy (CORS OK) sauf data URI / déjà proxifié
      const proxied = (u: string) =>
        u.startsWith("data:") || u.startsWith("/api/images/proxy")
          ? u
          : `/api/images/proxy?url=${encodeURIComponent(u)}`;

      let img: HTMLImageElement;
      try {
        img = await loadImg(slide.imageUrl!);
      } catch {
        if (slide.imageThumb && slide.imageThumb !== slide.imageUrl) {
          img = await loadImg(proxied(slide.imageThumb));
        } else {
          throw new Error("no image");
        }
      }

      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Photo NETTE, plein largeur, en haut. Cadre proche du carré (recadrage
      // doux, PAS de sur-zoom 9:16) et AUCUN flou. La photo descend juste
      // assez pour laisser la zone de texte en bas.
      const PHOTO_H = Math.round(H * 0.62); // ~1190px
      const cover = Math.max(W / iw, PHOTO_H / ih);
      const dw = Math.round(iw * cover);
      const dh = Math.round(ih * cover);

      // Agrandissement progressif par paliers de 2x uniquement si l'on dépasse
      // la résolution native (bien plus net qu'un seul saut).
      let source: HTMLImageElement | HTMLCanvasElement = img;
      if (cover > 1.3) {
        let curW = iw;
        let curH = ih;
        let cur: HTMLImageElement | HTMLCanvasElement = img;
        while (curW * 2 < dw || curH * 2 < dh) {
          const nextW = Math.min(curW * 2, dw);
          const nextH = Math.min(curH * 2, dh);
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

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, PHOTO_H);
      ctx.clip();
      ctx.drawImage(
        source,
        Math.round((W - dw) / 2),
        Math.round((PHOTO_H - dh) / 2),
        dw,
        dh
      );
      ctx.restore();
    } catch {
      // Image non chargeable — fond gradient
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#1a0a2e");
      g.addColorStop(1, "#0d0d1a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // Léger renfort de lisibilité tout en bas (la photo est en haut)
  const grad = ctx.createLinearGradient(0, H * 0.78, 0, H);
  grad.addColorStop(0, "rgba(11,8,21,0)");
  grad.addColorStop(1, "rgba(11,8,21,0.85)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H * 0.78, W, H * 0.22);

  // ── Bulles texte cantonnées à la zone sûre TikTok/Reels ───────
  // Zone sûre (hors UI : back/search en haut, like/share à droite,
  // légende/musique en bas) : 720x1000px, ancrée à gauche=160, bas=1350.
  const SAFE_X = 160;
  const SAFE_W = 720;
  const SAFE_TOP = 350;
  const SAFE_BOTTOM = 1350;
  const SAFE_H = SAFE_BOTTOM - SAFE_TOP;

  const bubbleX = SAFE_X;
  const bubbleW = SAFE_W;
  const GAP = 14; // espace entre les deux bulles

  let titleSize = slide.titre
    ? slide.titre.length > 50 ? 48 : slide.titre.length > 30 ? 56 : 64
    : 0;
  let stSize = 40;
  const PAD = 28; // padding vertical dans les bulles

  // 1. Calcul des hauteurs (nécessite de set la font avant wrapText)
  function measure(tSize: number, sSize: number) {
    const lHT = tSize * 1.35;
    const lHST = sSize * 1.35;
    let tLines: string[] = [];
    let sLines: string[] = [];
    if (slide.sousTitre) {
      ctx.font = `500 ${sSize}px -apple-system, Arial, sans-serif`;
      sLines = wrapText(ctx, slide.sousTitre, bubbleW - 56);
    }
    if (slide.titre) {
      ctx.font = `bold ${tSize}px -apple-system, Arial, sans-serif`;
      tLines = wrapText(ctx, slide.titre, bubbleW - 56);
    }
    const sBH = sLines.length ? sLines.length * lHST + PAD : 0;
    const tBH = tLines.length ? tLines.length * lHT + PAD : 0;
    return { tLines, sLines, tBH, sBH, lHT, lHST };
  }

  let { tLines: titleLines, sLines: stLines, tBH: titleBH, sBH: stBH, lHT: lineHT, lHST: lineHST } =
    measure(titleSize, stSize);

  // Si le total dépasse la zone sûre, on réduit les polices proportionnellement
  const totalH = titleBH + (stBH > 0 ? GAP + stBH : 0);
  if (totalH > SAFE_H) {
    const scale = SAFE_H / totalH;
    titleSize = Math.max(34, Math.round(titleSize * scale));
    stSize = Math.max(26, Math.round(stSize * scale));
    ({ tLines: titleLines, sLines: stLines, tBH: titleBH, sBH: stBH, lHT: lineHT, lHST: lineHST } =
      measure(titleSize, stSize));
  }

  // 2. Y de départ : ancré au bas de la zone sûre, on remonte
  // Ordre rendu (bas → haut) : sous-titre, titre
  const stTop = SAFE_BOTTOM - stBH;
  const titleTop = Math.max(SAFE_TOP, stBH > 0 ? stTop - GAP - titleBH : SAFE_BOTTOM - titleBH);

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

  return canvas.toDataURL("image/jpeg", 0.95);
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
  const [ouvert, setOuvert] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  async function suggest() {
    setOuvert(true);
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

  function selectImage(rIdx: number, sIdx: number, url: string, src: string, thumb?: string) {
    // Sélection immédiate (UI réactive)
    setRestaurants((prev) =>
      prev.map((r, i) =>
        i !== rIdx
          ? r
          : {
              ...r,
              slides: r.slides.map((s, j) =>
                j !== sIdx ? s : { ...s, imageUrl: url, imageSrc: src, imageThumb: thumb }
              ),
            }
      )
    );
    // Capture pleine résolution en arrière-plan, tant que le lien est frais —
    // la photo est figée et ne pourra plus jamais expirer ni sortir vide.
    snapshotImage(url, thumb).then((snap) => {
      if (!snap) return;
      setRestaurants((prev) =>
        prev.map((r, i) =>
          i !== rIdx
            ? r
            : {
                ...r,
                slides: r.slides.map((s, j) =>
                  j !== sIdx ? s : { ...s, imageUrl: snap.dataUrl }
                ),
              }
        )
      );
    });
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
      const result = await createContenu(fd);
      if (!result.ok) throw new Error(result.message || "Sauvegarde impossible");
      setSaved((prev) => ({ ...prev, [rIdx]: true }));
      router.refresh();
      // Ferme le panneau si tous les restaurants sont sauvegardés
      setSaved((prev) => {
        const next = { ...prev, [rIdx]: true };
        if (restaurants.length > 0 && Object.keys(next).length >= restaurants.length) {
          setOuvert(false);
        }
        return next;
      });
    } catch (e) {
      alert(`Erreur : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setComposing(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Overlays 3D immersifs pendant les temps de chargement */}
      {loading && <Loader3D fullscreen label="L'agent sélectionne 3 restaurants" />}
      {composing !== null && <Loader3D fullscreen label="Composition du carrousel en cours" />}

      {/* Header — cliquable pour ouvrir/fermer */}
      <div
        style={{
          ...card,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setOuvert((v) => !v)}
      >
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
            🪄 Agent IA — Restaurants parisiens
            <span style={{ marginLeft: 10, fontSize: 12, color: colors.muted, fontWeight: 400 }}>
              {ouvert ? "▲" : "▼"}
            </span>
          </h2>
          <p style={{ fontSize: 13, color: colors.muted, margin: "4px 0 0" }}>
            {ouvert ? "L'IA choisit 3 restaurants et trouve les photos pour toi. Carrousels 9:16 prêts à publier." : "Clique pour ouvrir l'agent IA"}
          </p>
        </div>
        <div
          style={{ display: "flex", gap: 10, alignItems: "center" }}
          onClick={(e) => e.stopPropagation()}
        >
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
              Reset
            </button>
          )}
        </div>
      </div>

      {ouvert && error && (
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
      {ouvert && restaurants.map((r, rIdx) => {
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
