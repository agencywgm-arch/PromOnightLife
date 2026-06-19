import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NIGHTLIFE PARIS — Carrousels",
    short_name: "Nightlife",
    description: "Générateur de carrousels TikTok pour restaurants parisiens haut de gamme",
    start_url: "/contenu",
    display: "standalone",
    background_color: "#1a1030",
    theme_color: "#1a1030",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
