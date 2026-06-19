"use client";

import { colors, btnGhost } from "@/lib/ui";
import type { Slide } from "@/components/CarouselViewer";

export default function SlideStrip({
  slides,
  restaurant,
}: {
  slides: Slide[];
  restaurant: string;
}) {
  const rendered = slides.filter((s) => s.imageData);
  if (rendered.length === 0) return null;

  // Convertit une data URL en File SANS fetch (synchrone) — indispensable sur
  // iOS : navigator.share() doit être appelé dans le même geste tactile, sinon
  // Safari invalide le partage (NotAllowedError). Un await fetch casse ce geste.
  function dataUrlToFile(dataUrl: string, filename: string): File {
    const comma = dataUrl.indexOf(",");
    const header = dataUrl.slice(0, comma);
    const base64 = dataUrl.slice(comma + 1);
    const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  }

  function shareAll() {
    const name = (i: number) =>
      `${restaurant.replace(/\s+/g, "_")}_slide_${i + 1}.jpg`;

    // Conversion 100% synchrone : le geste tactile reste valide pour iOS.
    const files = rendered.map((s, i) => dataUrlToFile(s.imageData!, name(i)));

    // Web Share API — ouvre le menu natif iOS (« Enregistrer dans Photos »).
    if (
      typeof navigator !== "undefined" &&
      navigator.canShare &&
      navigator.canShare({ files })
    ) {
      // On appelle share() immédiatement, dans le geste. Pas d'await avant.
      navigator.share({ files, title: restaurant }).catch((e) => {
        if (e instanceof Error && e.name !== "AbortError") {
          console.error("Erreur partage :", e);
        }
      });
      return;
    }

    // Fallback desktop : téléchargement séquentiel via Blob URLs.
    files.forEach((file, i) => {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000 + i * 400);
    });
  }

  return (
    <div>
      <button
        onClick={shareAll}
        style={{ ...btnGhost, fontSize: 11, padding: "4px 10px", marginBottom: 8 }}
      >
        📤 Sauvegarder les {rendered.length} slides
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

