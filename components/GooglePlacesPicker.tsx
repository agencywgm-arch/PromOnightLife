"use client";

import { useState } from "react";
import { input, btnPrimary, colors } from "@/lib/ui";

export type PlacePick = {
  placeId: string;
  nom: string;
  adresse: string;
  photos: string[]; // photo references Google Places
};

/**
 * Recherche d'un lieu via l'API Places (proxy serveur /api/places/search),
 * puis sélection multi-photos parmi les photos du lieu.
 */
export default function GooglePlacesPicker({
  onPick,
}: {
  onPick: (pick: PlacePick) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ placeId: string; nom: string; adresse: string }[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [place, setPlace] = useState<{ placeId: string; nom: string; adresse: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Recherche impossible");
      setResults(data.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadPhotos(p: { placeId: string; nom: string; adresse: string }) {
    setLoading(true);
    setError(null);
    setPlace(p);
    setSelected([]);
    try {
      const res = await fetch(`/api/places/photos?placeId=${encodeURIComponent(p.placeId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Photos indisponibles");
      setPhotos(data.photos || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Rechercher un lieu (ex : Gigi Paris)"
          style={input}
        />
        <button onClick={search} disabled={loading || !query.trim()} style={btnPrimary}>
          {loading ? "…" : "Rechercher"}
        </button>
      </div>

      {error && <p style={{ color: colors.rouge, fontSize: 13, margin: 0 }}>{error}</p>}

      {results.length > 0 && !place && (
        <div style={{ display: "grid", gap: 6 }}>
          {results.map((r) => (
            <button
              key={r.placeId}
              onClick={() => loadPhotos(r)}
              style={{
                textAlign: "left",
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 10,
                padding: "10px 14px",
                color: colors.texte,
                cursor: "pointer",
              }}
            >
              <strong>{r.nom}</strong>
              <span style={{ color: colors.muted, fontSize: 12, marginLeft: 8 }}>{r.adresse}</span>
            </button>
          ))}
        </div>
      )}

      {place && photos.length > 0 && (
        <>
          <p style={{ margin: 0, fontSize: 13, color: colors.muted }}>
            {place.nom} — sélectionne les photos ({selected.length} choisie·s) :
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {photos.map((ref) => {
              const isSel = selected.includes(ref);
              return (
                <img
                  key={ref}
                  src={`/api/places/photo?ref=${encodeURIComponent(ref)}&maxwidth=200`}
                  alt=""
                  onClick={() =>
                    setSelected((prev) =>
                      isSel ? prev.filter((r) => r !== ref) : [...prev, ref]
                    )
                  }
                  style={{
                    width: 90,
                    height: 90,
                    objectFit: "cover",
                    borderRadius: 8,
                    cursor: "pointer",
                    border: isSel ? `3px solid ${colors.violet}` : `3px solid transparent`,
                    opacity: isSel ? 1 : 0.7,
                  }}
                />
              );
            })}
          </div>
          <button
            onClick={() => onPick({ ...place, photos: selected })}
            disabled={selected.length === 0}
            style={{ ...btnPrimary, opacity: selected.length === 0 ? 0.5 : 1 }}
          >
            Utiliser {selected.length} photo{selected.length > 1 ? "s" : ""}
          </button>
        </>
      )}
    </div>
  );
}
