import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: unknown; expires: number }>();
const TTL = 6 * 60 * 60 * 1000; // 6h — contenu social change plus souvent

type PhotoResult = {
  id: string;
  src: string;
  thumb: string;
  source: string;
  pageUrl?: string;
  isUGC?: boolean; // photo de réseau social (Instagram, TikTok, Google Maps)
  width?: number;
  height?: number;
  hd?: boolean;    // résolution suffisante pour un export net 1080x1920
};

const UGC_DOMAINS = ["instagram.com", "cdninstagram.com", "tiktok.com", "maps.google", "goo.gl", "tripadvisor"];

// Seuils qualité — on ne veut QUE de la vraie haute définition.
const HD_SHORT_SIDE = 1080;   // côté court mini (taille native Instagram) → net en 9:16
const SOFT_SHORT_SIDE = 800;  // repli si trop peu de résultats HD
const MAX_ASPECT = 2.6;       // rejette bannières/logos très allongés

function isUGC(link?: string, source?: string): boolean {
  const str = `${link || ""} ${source || ""}`.toLowerCase();
  return UGC_DOMAINS.some((d) => str.includes(d));
}

type SerperImage = {
  imageUrl: string;
  thumbnailUrl?: string;
  source?: string;
  link?: string;
  imageWidth?: number;
  imageHeight?: number;
};

/** Vraie haute définition + ratio photo (pas un logo/bannière). */
function isHD(img: SerperImage): boolean {
  const w = img.imageWidth || 0;
  const h = img.imageHeight || 0;
  if (!w || !h) return false; // dimensions inconnues → on écarte (trop risqué)
  if (Math.min(w, h) < HD_SHORT_SIDE) return false;
  if (Math.max(w, h) / Math.min(w, h) > MAX_ASPECT) return false;
  return true;
}

/** Repli plus souple : correct mais pas forcément full HD. */
function isAcceptable(img: SerperImage): boolean {
  const w = img.imageWidth || 0;
  const h = img.imageHeight || 0;
  if (!w || !h) return false;
  if (Math.min(w, h) < SOFT_SHORT_SIDE) return false;
  if (Math.max(w, h) / Math.min(w, h) > MAX_ASPECT) return false;
  return true;
}

async function searchSerper(key: string, q: string, num: number): Promise<SerperImage[]> {
  const res = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q, gl: "fr", hl: "fr", num }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.images || []).filter((img: SerperImage) => {
    // Filtre côté serveur : écarter les images sans dimensions ou trop petites
    const w = img.imageWidth || 0;
    const h = img.imageHeight || 0;
    if (!w || !h) return false;
    // Garde seulement si une dimension atteint 1080 minimum
    return Math.min(w, h) >= HD_SHORT_SIDE;
  });
}

/**
 * Recherche photos via Google Images (Serper.dev).
 * Lance 2 requêtes en parallèle :
 *   1. Requête standard → photos press/web
 *   2. Requête sociale → photos UGC Instagram/TikTok de vrais visiteurs
 * Les photos UGC remontent en premier (authentiques, non recyclées, certifiées du lieu).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });

  const key = process.env.SERPER_API_KEY;
  if (!key) {
    return NextResponse.json({
      provider: "serper",
      photos: [],
      noProvider: true,
      detail: "SERPER_API_KEY absente — ajoute-la dans Vercel puis redéploie",
    });
  }

  const cached = cache.get(q);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    // 3 requêtes en parallèle :
    // 1. Recherche exacte du restaurant
    // 2. Restaurant sur Instagram (authentiques, non-recyclées)
    // 3. Restaurant sur TripAdvisor/avis (photos vérifiées de clients)
    // On en demande beaucoup (50 chacune) pour avoir du choix après filtrage HD strict.
    const [exactMatch, instaPhotos, reviewPhotos] = await Promise.all([
      searchSerper(key, `"${q}" restaurant`, 50),
      searchSerper(key, `${q} site:instagram.com`, 50),
      searchSerper(key, `${q} site:tripadvisor.com`, 50),
    ]);

    // Déduplique par imageUrl : Instagram/TripAdvisor (authentiques) d'abord, puis recherche exacte
    const seen = new Set<string>();
    const allImages: SerperImage[] = [];
    for (const img of [...instaPhotos, ...reviewPhotos, ...exactMatch]) {
      if (img.imageUrl && !seen.has(img.imageUrl)) {
        seen.add(img.imageUrl);
        allImages.push(img);
      }
    }

    const pixels = (img: SerperImage) => (img.imageWidth || 0) * (img.imageHeight || 0);

    // Authentiques (Instagram/Maps/TripAdvisor = vraies photos du lieu) d'abord,
    // puis à résolution décroissante.
    const byAuthThenRes = (a: SerperImage, b: SerperImage) => {
      const ua = isUGC(a.link, a.source) ? 2 : 0; // Heavy weight on UGC
      const ub = isUGC(b.link, b.source) ? 2 : 0;
      if (ua !== ub) return ub - ua;
      // Tiebreaker: by pixel count (more megapixels = better)
      return pixels(b) - pixels(a);
    };

    // On ne garde que la vraie haute définition — ZÉRO compromis.
    const hd = allImages.filter(isHD).sort(byAuthThenRes);

    // Pas de fallback tier : on retourne seulement ce qui est certifié HD.
    // Si trop peu de résultats, c'est mieux que de diluer avec de la mauvaise qualité.
    const photos: PhotoResult[] = hd.slice(0, 40).map((img, i) => {
      const short = Math.min(img.imageWidth || 0, img.imageHeight || 0);
      return {
        id: `serper-${i}`,
        src: `/api/images/proxy?url=${encodeURIComponent(img.imageUrl)}`,
        thumb: img.thumbnailUrl || `/api/images/proxy?url=${encodeURIComponent(img.imageUrl)}`,
        source: img.source || "Google Images",
        pageUrl: img.link,
        isUGC: isUGC(img.link, img.source),
        width: img.imageWidth,
        height: img.imageHeight,
        hd: short >= HD_SHORT_SIDE,
      };
    });

    const payload = { provider: "serper", photos };
    cache.set(q, { data: payload, expires: Date.now() + TTL });
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur réseau : ${e instanceof Error ? e.message : String(e)}`, photos: [] },
      { status: 500 }
    );
  }
}
