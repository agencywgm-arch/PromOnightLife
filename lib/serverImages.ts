/**
 * Recherche d'images côté serveur (pour le cron quotidien).
 * Version légère : une requête Serper, on garde les meilleures images HD,
 * triées résolution décroissante. Renvoie des URLs proxifiées prêtes à l'emploi.
 */

const HD_SHORT_SIDE = 1080;
const MAX_ASPECT = 2.6;

type SerperImage = {
  imageUrl: string;
  thumbnailUrl?: string;
  source?: string;
  link?: string;
  imageWidth?: number;
  imageHeight?: number;
};

export type ServerPhoto = { imageUrl: string; thumb: string; width?: number; height?: number };

export async function searchRestaurantImages(query: string): Promise<ServerPhoto[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: `"${query}" restaurant paris`, gl: "fr", hl: "fr", num: 30 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const images: SerperImage[] = data.images || [];

    const pixels = (i: SerperImage) => (i.imageWidth || 0) * (i.imageHeight || 0);
    const isHD = (i: SerperImage) => {
      const w = i.imageWidth || 0;
      const h = i.imageHeight || 0;
      if (!w || !h) return false;
      if (Math.min(w, h) < HD_SHORT_SIDE) return false;
      if (Math.max(w, h) / Math.min(w, h) > MAX_ASPECT) return false;
      return true;
    };

    const hd = images.filter(isHD).sort((a, b) => pixels(b) - pixels(a));
    const pool = hd.length >= 4 ? hd : [...hd, ...images.filter((i) => !hd.includes(i))];

    return pool.slice(0, 8).map((img) => ({
      imageUrl: `/api/images/proxy?url=${encodeURIComponent(img.imageUrl)}`,
      thumb: img.thumbnailUrl || `/api/images/proxy?url=${encodeURIComponent(img.imageUrl)}`,
      width: img.imageWidth,
      height: img.imageHeight,
    }));
  } catch {
    return [];
  }
}
