"use client";

import { useState } from "react";
import { card, btnPrimary, btnGhost, input, colors } from "@/lib/ui";

type Photo = {
  id: number;
  src: string;
  thumb: string;
  source: string;
  pageUrl?: string;
};

/** Outil de recherche de photos indépendant — pour chercher des photos
    en dehors de la génération, sans lien avec le carrousel. */
export default function PhotoSearcher() {
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

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
            {photos.length} résultats — clique pour agrandir, clic droit pour télécharger
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
            {photos.map((p) => (
              <a
                key={p.id}
                href={p.src}
                download={`photo_${p.id}.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                title={p.source}
                style={{
                  position: "relative",
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                }}
                onContextMenu={() => setPreviewPhoto(p)}
              >
                <img
                  src={p.thumb}
                  alt={`Photo ${p.id}`}
                  onClick={() => setPreviewPhoto(p)}
                  style={{
                    width: 100,
                    height: 150,
                    objectFit: "cover",
                    borderRadius: 6,
                    border: `1px solid ${colors.border}`,
                    cursor: "pointer",
                    display: "block",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: 4,
                    left: 4,
                    fontSize: "9px",
                    color: "#fff",
                    background: "rgba(0,0,0,0.6)",
                    padding: "2px 4px",
                    borderRadius: 3,
                  }}
                >
                  {p.source.split(" ")[0]}
                </span>
              </a>
            ))}
          </div>
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
              <a
                href={previewPhoto.src}
                download={`photo_${previewPhoto.id}.jpg`}
                style={{ ...btnPrimary, fontSize: 12, textDecoration: "none" }}
              >
                ⬇️ Télécharger
              </a>
              {previewPhoto.pageUrl && (
                <a
                  href={previewPhoto.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...btnGhost, fontSize: 12, textDecoration: "none" }}
                >
                  🔗 Source
                </a>
              )}
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
    </div>
  );
}
