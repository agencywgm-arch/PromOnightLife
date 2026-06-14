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
};

type Slide = {
  titre: string;
  imageUrl: string;
  imageSrc: string;
  imageData?: string;
};

const W = 1080;
const H = 1920;

/** Outil indépendant : chercher des photos + composer des carrousels manuels */
export default function PhotoSearcher() {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

  // Composition manuelle
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  const [composing, setComposing] = useState(false);
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
      }));

      if (results.length === 0) {
        setError("Aucun résultat trouvé.");
      } else {
        setPhotos(results);
      }
    } catch (e) {
      setError(`Erreur réseau : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function togglePhotoSelect(photo: Photo) {
    const found = selectedPhotos.find((p) => p.id === photo.id);
    if (found) {
      setSelectedPhotos(selectedPhotos.filter((p) => p.id !== photo.id));
    } else if (selectedPhotos.length < 4) {
      setSelectedPhotos([...selectedPhotos, photo]);
    }
  }

  async function composeCarousel() {
    if (selectedPhotos.length === 0) {
      setError("Sélectionne au moins 1 photo");
      return;
    }

    setComposing(true);
    try {
      const canvas = canvasRef.current!;
      const rendered: Slide[] = [];

      for (const photo of selectedPhotos) {
        const slide: Slide = {
          titre: "Photo sélectionnée",
          imageUrl: photo.src,
          imageSrc: photo.source,
        };

        // Rendu canvas
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d")!;

        // Fond noir
        ctx.fillStyle = "#0a0a0f";
        ctx.fillRect(0, 0, W, H);

        // Image
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((res, rej) => {
            img.onload = () => res();
            img.onerror = () => rej();
            img.src = photo.src;
          });
          const scale = Math.max(W / img.width, H / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
        } catch {
          // Dégradé en fallback
          const g = ctx.createLinearGradient(0, 0, W, H);
          g.addColorStop(0, "#1a0a2e");
          g.addColorStop(1, "#0d0d1a");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);
        }

        // Dégradé bas
        const grad = ctx.createLinearGradient(0, H * 0.5, 0, H);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.88)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, H * 0.5, W, H * 0.5);

        const imageData = canvas.toDataURL("image/jpeg", 0.92);
        rendered.push({ ...slide, imageData });
      }

      // Sauvegarder en base
      const fd = new FormData();
      fd.set("restaurant", query.trim() || "Recherche manuelle");
      fd.set("adresse", "—");
      fd.set("arrondissement", "—");
      fd.set("horaires", "—");
      fd.set("prix", "—");
      fd.set("cuisine", "—");
      fd.set("slides", JSON.stringify(rendered));
      fd.set("caption", "Carrousel créé manuellement via le chercheur de photos");
      fd.set("hashtags", "#photos #composition");
      fd.set("platform", "TIKTOK");
      fd.set("scoreGlobal", "75");
      fd.set("scoreViral", "70");
      fd.set("scoreLuxe", "75");

      await createContenu(fd);
      router.refresh();

      // Réinitialiser
      setSelectedPhotos([]);
      setPhotos([]);
      setQuery("");
      setError(null);
      alert(`✓ Carrousel composé et sauvegardé (${rendered.length} slides)`);
    } catch (e) {
      setError(`Erreur composition : ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setComposing(false);
    }
  }

  return (
    <div style={card}>
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: colors.texte }}>
        🔍 Chercheur de photos
      </h3>
      <p style={{ fontSize: 12, color: colors.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
        Cherche des photos de restaurants, cuisines, ou lieux independamment du générateur.
        Télécharge les photos que tu aimes.
      </p>

      {/* Barre de recherche */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Ex: 'sushi tokyo', 'french bistro paris', 'luxury dining'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          style={{ ...input, flex: 1, minWidth: "200px", fontSize: 12 }}
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || loading}
          style={{
            ...btnPrimary,
            fontSize: 12,
            padding: "8px 16px",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "🔄 Cherche..." : "Chercher"}
        </button>
      </div>

      {/* Erreur */}
      {error && (
        <p style={{ fontSize: 12, color: colors.rouge, margin: "8px 0" }}>
          ⚠️ {error}
        </p>
      )}

      {/* Résultats */}
      {photos.length > 0 && (
        <>
          <p style={{ fontSize: 11, color: colors.muted, margin: "8px 0 8px" }}>
            {photos.length} résultats — clique pour sélectionner (max 4 pour le carrousel)
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
              const isSelected = selectedPhotos.some((sp) => sp.id === p.id);
              return (
                <div
                  key={p.id}
                  onClick={() => togglePhotoSelect(p)}
                  style={{
                    position: "relative",
                    flexShrink: 0,
                    scrollSnapAlign: "start",
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={p.thumb}
                    alt={`Photo ${p.id}`}
                    style={{
                      width: 100,
                      height: 150,
                      objectFit: "cover",
                      borderRadius: 6,
                      border: isSelected ? `3px solid ${colors.violet}` : `1px solid ${colors.border}`,
                      display: "block",
                      opacity: isSelected ? 1 : 0.8,
                    }}
                  />
                  {isSelected && (
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        fontSize: "16px",
                        background: colors.violet,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#000",
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Photos sélectionnées */}
          {selectedPhotos.length > 0 && (
            <div style={{ marginTop: 12, padding: 10, background: "#1a1a2e", borderRadius: 6 }}>
              <p style={{ fontSize: 11, color: colors.texte, margin: "0 0 8px", fontWeight: 600 }}>
                📸 Sélectionnées : {selectedPhotos.length}/4
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {selectedPhotos.map((p) => (
                  <div key={p.id} style={{ position: "relative" }}>
                    <img
                      src={p.thumb}
                      alt="Selected"
                      style={{
                        width: 60,
                        height: 90,
                        objectFit: "cover",
                        borderRadius: 4,
                        border: `2px solid ${colors.violet}`,
                      }}
                    />
                    <button
                      onClick={() => togglePhotoSelect(p)}
                      style={{
                        position: "absolute",
                        top: -4,
                        right: -4,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: colors.rouge,
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={composeCarousel}
                disabled={composing}
                style={{
                  ...btnPrimary,
                  fontSize: 12,
                  width: "100%",
                  padding: "8px 12px",
                }}
              >
                {composing ? "🎬 Composition..." : `🎬 Composer carrousel (${selectedPhotos.length} slides)`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Preview modal */}
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
            zIndex: 9998,
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
                onClick={() => togglePhotoSelect(previewPhoto)}
                style={{
                  ...btnPrimary,
                  fontSize: 12,
                  textDecoration: "none",
                }}
              >
                {selectedPhotos.some((p) => p.id === previewPhoto.id) ? "✓ Sélectionnée" : "➕ Sélectionner"}
              </button>
              <a
                href={previewPhoto.src}
                download={`photo_${previewPhoto.id}.jpg`}
                style={{ ...btnGhost, fontSize: 12, textDecoration: "none" }}
              >
                ⬇️ Télécharger
              </a>
              <button
                onClick={() => setPreviewPhoto(null)}
                style={{ ...btnGhost, fontSize: 12 }}
              >
                ✕ Fermer
              </button>
            </div>
            <div style={{ fontSize: 11, color: colors.muted, textAlign: "center" }}>
              {previewPhoto.source}
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
