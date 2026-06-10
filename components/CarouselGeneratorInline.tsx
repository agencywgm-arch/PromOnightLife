"use client";

import { useRef, useState } from "react";
import GooglePlacesPicker, { type PlacePick } from "./GooglePlacesPicker";
import { createContenu } from "@/lib/actions";
import type { Slide } from "./CarouselViewer";
import { card, input, btnPrimary, btnGhost, colors } from "@/lib/ui";

const SIZE = 1080;

/**
 * Générateur de carrousel Instagram 1080×1080.
 * Photos issues exclusivement de Google Maps (Places API via proxy serveur) ;
 * chaque slide possède son propre photoRef.
 */
export default function CarouselGeneratorInline() {
  const [place, setPlace] = useState<PlacePick | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("#paris #nightlife #restaurant");
  const [previews, setPreviews] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function handlePick(pick: PlacePick) {
    setPlace(pick);
    setSlides(
      pick.photos.map((photoRef, i) => ({
        titre: i === 0 ? pick.nom : "",
        sousTitre: i === 0 ? "Le spot du moment ✨" : "",
        photoRef,
      }))
    );
    setCaption(`✨ ${pick.nom} — le spot incontournable de Paris ✨\n📍 ${pick.adresse}`);
    setPreviews([]);
    setSaved(false);
  }

  function updateSlide(i: number, patch: Partial<Slide>) {
    setSlides((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  async function renderSlide(slide: Slide): Promise<string> {
    const canvas = canvasRef.current!;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, SIZE, SIZE);

    if (slide.photoRef) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = `/api/places/photo?ref=${encodeURIComponent(slide.photoRef)}&maxwidth=1080`;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Photo introuvable"));
      });
      // cover : remplit le carré en recadrant
      const scale = Math.max(SIZE / img.width, SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
    }

    // dégradé bas pour lisibilité du texte
    const grad = ctx.createLinearGradient(0, SIZE * 0.55, 0, SIZE);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.85)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, SIZE * 0.55, SIZE, SIZE * 0.45);

    if (slide.titre) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 72px -apple-system, Arial, sans-serif";
      ctx.fillText(slide.titre, 60, SIZE - 140, SIZE - 120);
    }
    if (slide.sousTitre) {
      ctx.fillStyle = "#d1d5db";
      ctx.font = "40px -apple-system, Arial, sans-serif";
      ctx.fillText(slide.sousTitre, 60, SIZE - 70, SIZE - 120);
    }

    return canvas.toDataURL("image/jpeg", 0.9);
  }

  async function generate() {
    setGenerating(true);
    try {
      const urls: string[] = [];
      for (const slide of slides) {
        urls.push(await renderSlide(slide));
      }
      setPreviews(urls);
    } catch (e) {
      alert(`Erreur de génération : ${e instanceof Error ? e.message : e}`);
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!place) return;
    const fd = new FormData();
    fd.set("restaurant", place.nom);
    fd.set("slides", JSON.stringify(slides));
    fd.set("caption", caption);
    fd.set("hashtags", hashtags);
    fd.set("scoreGlobal", "70");
    fd.set("scoreViral", "65");
    fd.set("scoreLuxe", "75");
    await createContenu(fd);
    setSaved(true);
  }

  return (
    <div style={{ ...card, marginBottom: 28 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginTop: 0 }}>
        Générateur de carrousel (Google Maps)
      </h2>

      {!place && <GooglePlacesPicker onPick={handlePick} />}

      {place && (
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>{place.nom}</strong>
            <button style={btnGhost} onClick={() => { setPlace(null); setSlides([]); setPreviews([]); }}>
              Changer de lieu
            </button>
          </div>

          {slides.map((s, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "90px 1fr 1fr",
                gap: 10,
                alignItems: "center",
              }}
            >
              <img
                src={`/api/places/photo?ref=${encodeURIComponent(s.photoRef || "")}&maxwidth=200`}
                alt=""
                style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8 }}
              />
              <input
                value={s.titre || ""}
                onChange={(e) => updateSlide(i, { titre: e.target.value })}
                placeholder={`Titre slide ${i + 1}`}
                style={input}
              />
              <input
                value={s.sousTitre || ""}
                onChange={(e) => updateSlide(i, { sousTitre: e.target.value })}
                placeholder="Sous-titre"
                style={input}
              />
            </div>
          ))}

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            placeholder="Caption Instagram"
            style={{ ...input, resize: "vertical", fontFamily: "inherit" }}
          />
          <input
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#hashtags"
            style={input}
          />

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={generate} disabled={generating} style={btnPrimary}>
              {generating ? "Génération…" : "Générer les slides 1080×1080"}
            </button>
            <button onClick={save} disabled={saved} style={{ ...btnGhost, opacity: saved ? 0.5 : 1 }}>
              {saved ? "Enregistré ✓" : "Enregistrer dans Contenu"}
            </button>
          </div>

          {previews.length > 0 && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {previews.map((url, i) => (
                <a key={i} href={url} download={`slide-${i + 1}.jpg`} title="Télécharger">
                  <img
                    src={url}
                    alt={`Slide ${i + 1}`}
                    style={{ width: 160, height: 160, borderRadius: 10, objectFit: "cover" }}
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
