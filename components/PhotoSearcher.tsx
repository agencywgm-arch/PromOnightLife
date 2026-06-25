"use client";

import { useState, useRef, useEffect } from "react";
import { card, btnPrimary, btnGhost, input, colors } from "@/lib/ui";
import Loader3D from "@/components/Loader3D";
import { snapshotImage } from "@/lib/imageSnapshot";
import { useRouter } from "next/navigation";

type Photo = {
  id: number;
  src: string;
  thumb: string;
  source: string;
  pageUrl?: string;
  isUGC?: boolean;
  hd?: boolean;
  width?: number;
  height?: number;
};

type Slide = {
  titre: string;
  sousTitre: string;
  imageUrl: string;
  imageThumb?: string; // miniature (fallback fiable si l'originale expire)
  imageSrc: string;
  imageData?: string;
};

const W = 1080;
const H = 1920;

/* ── Même rendu canvas que TikTokAgent ────────────────────────── */

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

async function composeSlide(slide: Slide, canvas: HTMLCanvasElement): Promise<string> {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Fond dégradé de marque (net, sans flou)
  const baseBg = ctx.createLinearGradient(0, 0, 0, H);
  baseBg.addColorStop(0, "#160d2b");
  baseBg.addColorStop(1, "#0b0815");
  ctx.fillStyle = baseBg;
  ctx.fillRect(0, 0, W, H);

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
        img = await loadImg(slide.imageUrl);
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

      // Photo NETTE en PLEIN CADRE 9:16 (occupe tout l'écran), sans flou.
      // Les bulles de texte se posent par-dessus en bas (elles sont opaques).
      const PHOTO_H = H;
      const cover = Math.max(W / iw, PHOTO_H / ih);
      const dw = Math.round(iw * cover);
      const dh = Math.round(ih * cover);

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
      // Image non chargeable — on garde le fond de marque déjà dessiné
    }
  }

  // Très léger fondu en bas pour la lisibilité, sans masquer la photo.
  const grad = ctx.createLinearGradient(0, H * 0.82, 0, H);
  grad.addColorStop(0, "rgba(11,8,21,0)");
  grad.addColorStop(1, "rgba(11,8,21,0.35)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H * 0.82, W, H * 0.18);

  // Zone sûre TikTok/Reels (hors UI : back/search en haut, like/share à
  // droite, légende/musique en bas) : 720x1000px, ancrée à gauche=160, bas=1350.
  const SAFE_X = 160;
  const SAFE_W = 720;
  const SAFE_TOP = 350;
  const SAFE_BOTTOM = 1350;
  const SAFE_H = SAFE_BOTTOM - SAFE_TOP;

  const bubbleX = SAFE_X;
  const bubbleW = SAFE_W;
  const GAP = 14;
  let titleSize = slide.titre
    ? slide.titre.length > 50 ? 48 : slide.titre.length > 30 ? 56 : 64
    : 0;
  let stSize = 40;
  const PAD = 28;

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

  const totalH = titleBH + (stBH > 0 ? GAP + stBH : 0);
  if (totalH > SAFE_H) {
    const scale = SAFE_H / totalH;
    titleSize = Math.max(34, Math.round(titleSize * scale));
    stSize = Math.max(26, Math.round(stSize * scale));
    ({ tLines: titleLines, sLines: stLines, tBH: titleBH, sBH: stBH, lHT: lineHT, lHST: lineHST } =
      measure(titleSize, stSize));
  }

  const stTop = SAFE_BOTTOM - stBH;
  const titleTop = Math.max(SAFE_TOP, stBH > 0 ? stTop - GAP - titleBH : SAFE_BOTTOM - titleBH);

  if (slide.sousTitre && stBH > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(ctx, bubbleX, stTop, bubbleW, stBH, 16);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.font = `500 ${stSize}px -apple-system, Arial, sans-serif`;
    stLines.forEach((line, i) => {
      ctx.fillText(line, bubbleX + 28, stTop + PAD / 2 + (i + 1) * lineHST - lineHST * 0.25, bubbleW - 56);
    });
    ctx.restore();
  }

  if (slide.titre && titleBH > 0) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.97)";
    roundRect(ctx, bubbleX, titleTop, bubbleW, titleBH, 20);
    ctx.fill();
    ctx.fillStyle = "#0d0d0d";
    ctx.font = `bold ${titleSize}px -apple-system, Arial, sans-serif`;
    titleLines.forEach((line, i) => {
      ctx.fillText(line, bubbleX + 28, titleTop + PAD / 2 + (i + 1) * lineHT - lineHT * 0.25, bubbleW - 56);
    });
    ctx.restore();
  }

  return canvas.toDataURL("image/jpeg", 0.95);
}

/* ── Composant principal ─────────────────────────────────────── */

export default function PhotoSearcher() {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [previewStage, setPreviewStage] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    setPreviewStage(0);
  }, [previewPhoto]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [composing, setComposing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genAI, setGenAI] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  // Génère une image IA HD (filet de sécurité quand aucune vraie photo nette).
  async function generateAIImage() {
    if (!query.trim()) return;
    setGenAI(true);
    setError(null);
    try {
      const res = await fetch(`/api/images/generate?q=${encodeURIComponent(query)}&kind=ambiance`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const p = data.photo;
      setPhotos((prev) => [
        {
          id: Date.now(),
          src: p.src,
          thumb: p.thumb,
          source: "Image IA",
          isUGC: false,
          hd: true,
          width: p.width,
          height: p.height,
        },
        ...prev,
      ]);
    } catch (e) {
      setError(`IA indisponible : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setGenAI(false);
    }
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setPhotos([]);
    try {
      const res = await fetch(`/api/images/serper?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.noProvider) {
        setError("Clé Serper absente — configure SERPER_API_KEY dans Vercel");
        return;
      }
      if (data.error) {
        setError(`Erreur : ${data.error}`);
        return;
      }
      const results: Photo[] = (data.photos || []).map((p: any, i: number) => ({
        id: i,
        src: p.src,
        thumb: p.thumb,
        source: p.source,
        pageUrl: p.pageUrl,
        isUGC: p.isUGC || false,
        hd: p.hd || false,
        width: p.width,
        height: p.height,
      }));
      if (results.length === 0) setError("Aucun résultat trouvé.");
      else setPhotos(results);
    } catch (e) {
      setError(`Erreur réseau : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function generateDescriptions() {
    if (slides.length === 0) {
      setError("Ajoute d'abord des photos au carrousel");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() || "restaurant gastronomique", nbSlides: slides.length }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Erreur IA");
      setSlides((prev) =>
        prev.map((s, i) => ({
          ...s,
          titre: data.slides[i]?.titre || s.titre,
          sousTitre: data.slides[i]?.sousTitre || s.sousTitre,
        }))
      );
      if (data.caption) setCaption(data.caption);
      if (data.hashtags) setHashtags(data.hashtags);
    } catch (e) {
      setError(`Erreur IA : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setGenerating(false);
    }
  }

  function addToCarousel(photo: Photo) {
    if (slides.length >= 4) return;
    if (slides.some((s) => s.imageUrl === photo.src)) return;
    setSlides((prev) => [
      ...prev,
      { titre: "", sousTitre: "", imageUrl: photo.src, imageThumb: photo.thumb, imageSrc: photo.source },
    ]);
    setPreviewPhoto(null);
    // Capture pleine résolution en arrière-plan, tant que le lien est frais —
    // la photo est figée et ne pourra plus jamais expirer ni sortir vide.
    snapshotImage(photo.src, photo.thumb).then((snap) => {
      if (!snap) return;
      setSlides((prev) =>
        prev.map((s) => (s.imageUrl === photo.src ? { ...s, imageUrl: snap.dataUrl } : s))
      );
    });
  }

  function removeSlide(idx: number) {
    setSlides((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSlide(idx: number, field: "titre" | "sousTitre", value: string) {
    setSlides((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  async function composeCarousel() {
    if (slides.length === 0) return;
    setComposing(true);
    try {
      const canvas = canvasRef.current!;
      const rendered: Slide[] = [];
      for (const slide of slides) {
        const imageData = await composeSlide(slide, canvas);
        rendered.push({ ...slide, imageData });
      }
      const fd = new FormData();
      fd.set("restaurant", query.trim() || "Recherche manuelle");
      fd.set("adresse", "—");
      fd.set("arrondissement", "—");
      fd.set("horaires", "—");
      fd.set("prix", "—");
      fd.set("cuisine", "—");
      fd.set("slides", JSON.stringify(rendered));
      fd.set("caption", caption || "Carrousel créé via le chercheur de photos");
      fd.set("hashtags", hashtags || "#photos #carrousel");
      fd.set("platform", "TIKTOK");
      fd.set("scoreGlobal", "75");
      fd.set("scoreViral", "70");
      fd.set("scoreLuxe", "75");
      const res = await fetch("/api/contenu", { method: "POST", body: fd });
      const result = await res
        .json()
        .catch(() => ({ ok: false, message: "Réponse invalide du serveur" }));
      if (!res.ok || !result?.ok) {
        throw new Error(result?.message || `Sauvegarde impossible (${res.status})`);
      }
      router.refresh();
      setSlides([]);
      setCaption("");
      setHashtags("");
      setPhotos([]);
      setQuery("");
      setError(null);
      alert(`✓ Carrousel sauvegardé dans la bibliothèque (${rendered.length} slides)`);
    } catch (e) {
      setError(`Erreur : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setComposing(false);
    }
  }

  const isInCarousel = (photo: Photo) => slides.some((s) => s.imageUrl === photo.src);

  return (
    <div style={card}>
      {composing && <Loader3D fullscreen label="Composition du carrousel en cours" />}

      <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px", color: colors.texte }}>
        🎨 Générateur manuel
      </h3>
      <p style={{ fontSize: 12, color: colors.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
        Toi qui cherches : tape un mot-clé, choisis jusqu&apos;à 4 photos, ajoute les
        titres et compose ton carrousel à la main.
      </p>

      {/* Barre de recherche */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Ex: sushi tokyo, french bistro paris, luxury dining"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          style={{ ...input, flex: 1, minWidth: "200px", fontSize: 12 }}
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || loading}
          style={{ ...btnPrimary, fontSize: 12, padding: "8px 16px", whiteSpace: "nowrap" }}
        >
          {loading ? "🔄 Cherche..." : "Chercher"}
        </button>
        <button
          onClick={generateAIImage}
          disabled={!query.trim() || genAI}
          title="Génère une image d'ambiance HD par IA (si aucune vraie photo nette)"
          style={{
            ...btnGhost,
            fontSize: 12,
            padding: "8px 14px",
            whiteSpace: "nowrap",
            borderColor: `${colors.violet}88`,
            color: colors.violet,
          }}
        >
          {genAI ? "✨ Génère..." : "✨ Image IA"}
        </button>
      </div>

      {/* Vérification d'identité du restaurant : liens vers les VRAIES fiches
          (pas de faux badge — le client clique et constate lui-même). */}
      {query.trim() && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            margin: "0 0 12px",
            fontSize: 11,
          }}
        >
          <span style={{ color: colors.muted }}>Vérifier que c&apos;est le bon resto :</span>
          <a
            href={`https://www.tripadvisor.fr/Search?q=${encodeURIComponent(query.trim())}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 10px",
              borderRadius: 999,
              textDecoration: "none",
              fontWeight: 700,
              color: "#00aa6c",
              background: "rgba(0,170,108,0.12)",
              border: "1px solid rgba(0,170,108,0.4)",
            }}
          >
            🦉 TripAdvisor ↗
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 10px",
              borderRadius: 999,
              textDecoration: "none",
              fontWeight: 700,
              color: "#4285F4",
              background: "rgba(66,133,244,0.12)",
              border: "1px solid rgba(66,133,244,0.4)",
            }}
          >
            📍 Google Maps ↗
          </a>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: colors.rouge, margin: "8px 0" }}>⚠️ {error}</p>
      )}

      {(loading || genAI) && (
        <Loader3D compact label={genAI ? "L'IA peint ton image HD" : "Recherche des photos HD"} />
      )}

      {/* Grille de résultats */}
      {photos.length > 0 && (
        <>
          <p style={{ fontSize: 11, color: colors.muted, margin: "0 0 8px" }}>
            {photos.length} résultats — clique sur une photo pour la prévisualiser et l&apos;ajouter
          </p>
          <div
            style={{
              display: "flex",
              gap: 6,
              overflowX: "auto",
              paddingBottom: 6,
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {photos.map((p) => {
              const added = isInCarousel(p);
              return (
                <div
                  key={p.id}
                  onClick={() => setPreviewPhoto(p)}
                  style={{ position: "relative", flexShrink: 0, scrollSnapAlign: "start", cursor: "pointer" }}
                >
                  <img
                    src={p.thumb}
                    alt={`Photo ${p.id}`}
                    onError={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}
                    style={{
                      width: 90,
                      height: 135,
                      objectFit: "cover",
                      borderRadius: 6,
                      border: added
                        ? `3px solid ${colors.violet}`
                        : `1px solid ${colors.border}`,
                      display: "block",
                      opacity: added ? 1 : 0.8,
                    }}
                  />
                  {p.isUGC && !added && (
                    <span style={{
                      position: "absolute",
                      top: 4,
                      left: 4,
                      background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#fff",
                      padding: "2px 5px",
                    }}>
                      IG
                    </span>
                  )}
                  {p.hd && !added && (
                    <span style={{
                      position: "absolute",
                      bottom: 4,
                      left: 4,
                      background: "rgba(74,222,128,0.92)",
                      color: "#04210f",
                      borderRadius: 4,
                      fontSize: 9,
                      fontWeight: 800,
                      padding: "1px 5px",
                      letterSpacing: 0.3,
                    }}>
                      HD{p.width ? ` · ${Math.min(p.width, p.height || 0)}px` : ""}
                    </span>
                  )}
                  {added && (
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: colors.violet,
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#000",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Carrousel en cours de composition */}
      {slides.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, background: "#0f0f1a", borderRadius: 8, border: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: colors.texte, margin: 0 }}>
              🎬 Carrousel ({slides.length}/4 slides)
            </p>
            <button
              onClick={generateDescriptions}
              disabled={generating}
              style={{
                ...btnPrimary,
                fontSize: 11,
                padding: "6px 12px",
                background: generating ? "#2a1a4a" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                whiteSpace: "nowrap",
              }}
            >
              {generating ? "✨ Génère..." : "✨ Générer les descriptions à l'IA"}
            </button>
          </div>

          {slides.map((slide, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                gap: 10,
                marginBottom: 12,
                padding: 10,
                background: "#1a1a2e",
                borderRadius: 8,
                alignItems: "flex-start",
              }}
            >
              <img
                src={slide.imageSrc.startsWith("http") ? slide.imageSrc : slide.imageUrl}
                alt={`Slide ${idx + 1}`}
                style={{
                  width: 50,
                  height: 75,
                  objectFit: "cover",
                  borderRadius: 4,
                  border: `1px solid ${colors.border}`,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10, color: colors.violet, fontWeight: 700 }}>Slide {idx + 1}</div>
                <input
                  type="text"
                  placeholder="Titre (ex: Le Cinq — Palace gastronomique)"
                  value={slide.titre}
                  onChange={(e) => updateSlide(idx, "titre", e.target.value)}
                  style={{ ...input, fontSize: 11, padding: "6px 8px" }}
                />
                <input
                  type="text"
                  placeholder="Sous-titre (ex: 8e arrondissement · Étoilé Michelin)"
                  value={slide.sousTitre}
                  onChange={(e) => updateSlide(idx, "sousTitre", e.target.value)}
                  style={{ ...input, fontSize: 11, padding: "6px 8px" }}
                />
              </div>
              <button
                onClick={() => removeSlide(idx)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: colors.muted,
                  fontSize: 16,
                  padding: "4px",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>
          ))}

          {/* Caption & hashtags */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            <textarea
              placeholder="Description / caption TikTok..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              style={{
                ...input,
                fontSize: 11,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <input
              type="text"
              placeholder="#restaurant #paris #foodie #luxe"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              style={{ ...input, fontSize: 11 }}
            />
          </div>

          <button
            onClick={composeCarousel}
            disabled={composing}
            style={{ ...btnPrimary, fontSize: 12, width: "100%", marginTop: 12, padding: "10px 12px" }}
          >
            {composing
              ? "🎬 Composition en cours..."
              : `🎬 Composer et sauvegarder (${slides.length} slide${slides.length > 1 ? "s" : ""})`}
          </button>
        </div>
      )}

      {/* Modal preview — clic = ouvre, PAS de téléchargement automatique */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
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
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              alignItems: "center",
            }}
          >
            {previewStage < 2 ? (
              <img
                src={previewStage === 0 ? previewPhoto.src : previewPhoto.thumb}
                alt="Preview"
                onError={() => setPreviewStage((s) => (s === 0 ? 1 : 2) as 0 | 1 | 2)}
                style={{ width: "100%", height: "auto", maxHeight: "85vh", objectFit: "contain", borderRadius: 12 }}
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
                  onClick={() => addToCarousel(previewPhoto)}
                  disabled={slides.length >= 4 || isInCarousel(previewPhoto)}
                  style={{ ...btnPrimary, fontSize: 12 }}
                >
                  {isInCarousel(previewPhoto)
                    ? "✓ Déjà dans le carrousel"
                    : slides.length >= 4
                      ? "Maximum 4 slides"
                      : "➕ Ajouter au carrousel"}
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
                  onClick={(e) => e.stopPropagation()}
                  style={{ ...btnGhost, fontSize: 12, textDecoration: "none" }}
                >
                  🔗 Voir la source
                </a>
              )}
              <button onClick={() => setPreviewPhoto(null)} style={{ ...btnGhost, fontSize: 12 }}>
                ✕ Fermer
              </button>
            </div>
            <div style={{ fontSize: 11, color: colors.muted }}>{previewPhoto.source}</div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
