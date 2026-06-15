"use client";

import { useState, useRef } from "react";
import { card, btnPrimary, btnGhost, input, colors } from "@/lib/ui";
import { createContenu } from "@/lib/actions";
import { useRouter } from "next/navigation";

type Photo = {
  id: number;
  src: string;
  thumb: string;
  source: string;
  pageUrl?: string;
  isUGC?: boolean;
};

type Slide = {
  titre: string;
  sousTitre: string;
  imageUrl: string;
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

  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, W, H);

  if (slide.imageUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej();
        img.src = slide.imageUrl;
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
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#1a0a2e");
      g.addColorStop(1, "#0d0d1a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
  }

  const grad = ctx.createLinearGradient(0, H * 0.5, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, H * 0.5, W, H * 0.5);

  const bubbleX = 60;
  const bubbleW = W - 120;
  const MARGIN_BOT = 72;
  const GAP = 14;
  const titleSize = slide.titre
    ? slide.titre.length > 50 ? 48 : slide.titre.length > 30 ? 56 : 64
    : 0;
  const lineHT = titleSize * 1.35;
  const stSize = 40;
  const lineHST = stSize * 1.35;
  const PAD = 28;

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

  const stTop = H - MARGIN_BOT - stBH;
  const titleTop = stBH > 0 ? stTop - GAP - titleBH : H - MARGIN_BOT - titleBH;

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

  return canvas.toDataURL("image/jpeg", 0.92);
}

/* ── Composant principal ─────────────────────────────────────── */

export default function PhotoSearcher() {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [composing, setComposing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

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
      { titre: "", sousTitre: "", imageUrl: photo.src, imageSrc: photo.source },
    ]);
    setPreviewPhoto(null);
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
      await createContenu(fd);
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
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px", color: colors.texte }}>
        🔍 Chercheur de photos
      </h3>
      <p style={{ fontSize: 12, color: colors.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
        Cherche des photos, sélectionne jusqu&apos;à 4, ajoute les titres, et compose le carrousel.
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
      </div>

      {error && (
        <p style={{ fontSize: 12, color: colors.rouge, margin: "8px 0" }}>⚠️ {error}</p>
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
            <img
              src={previewPhoto.src}
              alt="Preview"
              style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 8 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
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
              <a
                href={previewPhoto.src}
                download={`photo_${previewPhoto.id}.jpg`}
                onClick={(e) => e.stopPropagation()}
                style={{ ...btnGhost, fontSize: 12, textDecoration: "none" }}
              >
                ⬇️ Télécharger
              </a>
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
