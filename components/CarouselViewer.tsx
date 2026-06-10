"use client";

import { useState } from "react";
import { colors, btnGhost } from "@/lib/ui";

export type Slide = {
  titre?: string;
  sousTitre?: string;
  photoRef?: string | null; // Google Places (proxy /api/places/photo)
  photoId?: string | null; // Unsplash legacy
};

function slideImageUrl(slide: Slide): string | null {
  if (slide.photoRef) {
    return `/api/places/photo?ref=${encodeURIComponent(slide.photoRef)}&maxwidth=800`;
  }
  if (slide.photoId) {
    return `https://images.unsplash.com/${slide.photoId}?w=800&q=80&fit=crop`;
  }
  return null;
}

/** Viewer Instagram interactif : navigation par slide, points indicateurs. */
export default function CarouselViewer({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  if (!slides.length) {
    return <p style={{ color: colors.muted, fontSize: 13 }}>Aucun slide.</p>;
  }
  const slide = slides[index];
  const img = slideImageUrl(slide);

  return (
    <div style={{ width: "100%", maxWidth: 320 }}>
      <div
        style={{
          position: "relative",
          aspectRatio: "1 / 1",
          borderRadius: 12,
          overflow: "hidden",
          background: img
            ? `#000 url(${img}) center/cover no-repeat`
            : `linear-gradient(135deg, ${colors.violetDark}, ${colors.rose})`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 16,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.55)",
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          {slide.titre && (
            <div style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>{slide.titre}</div>
          )}
          {slide.sousTitre && (
            <div style={{ fontSize: 12, color: "#d1d5db" }}>{slide.sousTitre}</div>
          )}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 8,
        }}
      >
        <button
          style={{ ...btnGhost, padding: "4px 12px" }}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          ←
        </button>
        <div style={{ display: "flex", gap: 5 }}>
          {slides.map((_, i) => (
            <span
              key={i}
              onClick={() => setIndex(i)}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                cursor: "pointer",
                background: i === index ? colors.violet : colors.border,
              }}
            />
          ))}
        </div>
        <button
          style={{ ...btnGhost, padding: "4px 12px" }}
          onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
          disabled={index === slides.length - 1}
        >
          →
        </button>
      </div>
    </div>
  );
}
