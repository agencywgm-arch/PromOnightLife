"use client";

import { colors, btnGhost } from "@/lib/ui";
import type { Slide } from "@/components/CarouselViewer";

/**
 * Bande de slides défilante horizontalement (flick rapide, scroll-snap).
 * Remplace la grille 4 colonnes de la bibliothèque. Clic = téléchargement.
 */
export default function SlideStrip({
  slides,
  restaurant,
}: {
  slides: Slide[];
  restaurant: string;
}) {
  const rendered = slides.filter((s) => s.imageData);
  if (rendered.length === 0) return null;

  async function downloadAll() {
    for (let i = 0; i < rendered.length; i++) {
      const s = rendered[i];
      // Convertir data URL → Blob → Object URL (plus fiable que data URL directe)
      const res = await fetch(s.imageData!);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${restaurant.replace(/\s+/g, "_")}_slide_${i + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Libère la mémoire après le téléchargement
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      // Délai entre chaque téléchargement
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return (
    <div>
      <button
        onClick={downloadAll}
        style={{ ...btnGhost, fontSize: 11, padding: "4px 10px", marginBottom: 8 }}
      >
        ⬇️ Tout télécharger ({rendered.length} slides)
      </button>
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 6,
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
      {rendered.map((s, i) => (
        <a
          key={i}
          href={s.imageData!}
          download={`${restaurant.replace(/\s+/g, "_")}_slide_${i + 1}.jpg`}
          title={`Télécharger slide ${i + 1}`}
          style={{ flexShrink: 0, scrollSnapAlign: "start", position: "relative" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.imageData!}
            alt={`Slide ${i + 1}`}
            style={{
              height: 220,
              aspectRatio: "9 / 16",
              objectFit: "cover",
              borderRadius: 8,
              border: `1px solid ${colors.border}`,
              display: "block",
            }}
          />
          <span
            style={{
              position: "absolute",
              bottom: 6,
              right: 6,
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
              background: "rgba(0,0,0,0.65)",
              borderRadius: 6,
              padding: "2px 7px",
            }}
          >
            {i + 1}/{rendered.length}
          </span>
        </a>
      ))}
      </div>
    </div>
  );
}
