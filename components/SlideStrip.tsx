"use client";

import { colors } from "@/lib/ui";
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

  return (
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
  );
}
