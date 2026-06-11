"use client";

import { useState, useRef } from "react";
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

/* ─── Composant image picker pour 1 slide ─────────────────────── */

function SlidePicker({
  slide,
  slideIndex,
  restaurantIndex,
  onSelect,
}: {
  slide: AgentSlide;
  slideIndex: number;
  restaurantIndex: number;
  onSelect: (rIdx: number, sIdx: number, url: string, src: string) => void;
}) {
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [customUrl, setCustomUrl] = useState("");

  async function search() {
    setLoading(true);
    try {
      const res = await fetch(`/api/images/pexels?q=${encodeURIComponent(slide.searchQuery)}`);
      const data = await res.json();
      if (data.fallback) {
        setFallbackUrl(data.searchUrl);
      } else {
        setPhotos(data.photos || []);
      }
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  const isSelected = !!slide.imageUrl;

  return (
    <div
      style={{
        border: `1px solid ${isSelected ? colors.violet : colors.border}`,
        borderRadius: 10,
        padding: 12,
        background: isSelected ? "#12091a" : colors.bg,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.violet }}>
            Slide {slideIndex + 1}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: colors.texte }}>{slide.titre}</div>
          {slide.sousTitre && (
            <div style={{ fontSize: 11, color: colors.muted }}>{slide.sousTitre}</div>
          )}
        </div>
        {isSelected && (
          <span style={{ fontSize: 11, color: "#4ade80", padding: "2px 8px", background: "#0d2a1a", borderRadius: 6 }}>
            ✓ Image choisie
          </span>
        )}
      </div>

      {!searched && (
        <button
          onClick={search}
          disabled={loading}
          style={{ ...btnGhost, fontSize: 11, marginTop: 8 }}
        >
          {loading ? "Recherche…" : `🔍 Chercher "${slide.searchQuery}"`}
        </button>
      )}

      {fallbackUrl && (
        <div style={{ marginTop: 8, fontSize: 12, color: colors.muted }}>
          <a href={fallbackUrl} target="_blank" rel="noreferrer" style={{ color: colors.violet }}>
            Ouvre Pexels →
          </a>
          {" "}copie l'URL directe de l'image puis colle-la ci-dessous.
          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://images.pexels.com/..."
              style={{ ...input, fontSize: 11 }}
            />
            <button
              onClick={() => {
                if (customUrl.trim()) {
                  onSelect(restaurantIndex, slideIndex, customUrl.trim(), "Pexels (manuel)");
                  setCustomUrl("");
                }
              }}
              disabled={!customUrl.trim()}
              style={{ ...btnPrimary, fontSize: 11, whiteSpace: "nowrap" }}
            >
              Utiliser
            </button>
          </div>
        </div>
      )}

      {photos.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {photos.map((p) => (
            <div key={p.id} style={{ position: "relative" }}>
              <img
                src={p.thumb}
                alt=""
                onClick={() => onSelect(restaurantIndex, slideIndex, p.src, `© ${p.photographer} / Pexels`)}
                style={{
                  width: 80,
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 6,
                  cursor: "pointer",
                  border:
                    slide.imageUrl === p.src
                      ? `3px solid ${colors.violet}`
                      : "3px solid transparent",
                }}
              />
            </div>
          ))}
        </div>
      )}

      {isSelected && slide.imageSrc && (
        <p style={{ fontSize: 10, color: colors.muted, margin: "4px 0 0" }}>{slide.imageSrc}</p>
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
      const scale = Math.max(W / img.width, H / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
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

  // Bulle blanche avec texte
  const bubbleX = 60;
  const bubbleY = H * 0.72;
  const bubbleW = W - 120;

  // Titre
  if (slide.titre) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    const titleSize = slide.titre.length > 40 ? 52 : 64;
    ctx.font = `bold ${titleSize}px -apple-system, Arial, sans-serif`;
    // Bulle titre
    const titleLines = wrapText(ctx, slide.titre, bubbleW - 48);
    const lineH = titleSize * 1.3;
    const bH = titleLines.length * lineH + 36;
    roundRect(ctx, bubbleX, bubbleY - bH - 20, bubbleW, bH + 20, 20);
    ctx.fill();
    ctx.fillStyle = "#111";
    titleLines.forEach((line, i) => {
      ctx.fillText(line, bubbleX + 24, bubbleY - bH + 8 + (i + 1) * lineH - 10, bubbleW - 48);
    });
    ctx.restore();
  }

  // Sous-titre
  if (slide.sousTitre) {
    ctx.save();
    ctx.font = `500 40px -apple-system, Arial, sans-serif`;
    const stLines = wrapText(ctx, slide.sousTitre, bubbleW - 48);
    const lineH2 = 52;
    const bH2 = stLines.length * lineH2 + 28;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(ctx, bubbleX, bubbleY + 12, bubbleW, bH2, 16);
    ctx.fill();
    ctx.fillStyle = "#222";
    stLines.forEach((line, i) => {
      ctx.fillText(line, bubbleX + 24, bubbleY + 12 + 28 + i * lineH2, bubbleW - 48);
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

      // Télécharger les slides en ZIP-like (téléchargements séquentiels)
      rendered.forEach((slide, i) => {
        if (slide.imageData) {
          const a = document.createElement("a");
          a.href = slide.imageData;
          a.download = `${r.nom.replace(/\s+/g, "_")}_slide_${i + 1}.jpg`;
          a.click();
        }
      });
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
