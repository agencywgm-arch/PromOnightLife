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

  async function shareAll() {
    try {
      // Convertir chaque data URL en File
      const files: File[] = await Promise.all(
        rendered.map(async (s, i) => {
          const res = await fetch(s.imageData!);
          const blob = await res.blob();
          return new File(
            [blob],
            `${restaurant.replace(/\s+/g, "_")}_slide_${i + 1}.jpg`,
            { type: "image/jpeg" }
          );
        })
      );

      // Web Share API — ouvre le menu natif iOS/Android
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          files,
          title: restaurant,
        });
      } else {
        // Fallback navigateur desktop : téléchargement séquentiel
        for (let i = 0; i < files.length; i++) {
          const url = URL.createObjectURL(files[i]);
          const a = document.createElement("a");
          a.href = url;
          a.download = files[i].name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    } catch (e) {
      // L'utilisateur a annulé le partage — pas d'erreur à afficher
      if (e instanceof Error && e.name !== "AbortError") {
        console.error("Erreur partage :", e);
      }
    }
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

