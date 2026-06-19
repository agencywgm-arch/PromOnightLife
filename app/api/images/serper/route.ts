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

// Seuils qualité — on refuse tout ce qui sortirait flou une fois monté en 9:16.
const MIN_SHORT_SIDE = 700;   // côté court minimum (rejette miniatures/icônes/logos)
const MIN_PIXELS = 800 * 800; // surface minimum
const MAX_ASPECT = 2.6;       // rejette bannières/logos très allongés
const HD_SHORT_SIDE = 1080;   // au-delà : net sans upscale notable

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

/** Garde uniquement les images assez grandes et au ratio raisonnable. */
function isQuality(img: SerperImage): boolean {
  const w = img.imageWidth || 0;
  const h = img.imageHeight || 0;
  if (!w || !h) return false; // dimensions inconnues → on écarte (trop risqué)
  const short = Math.min(w, h);
  const long = Math.max(w, h);
  if (short < MIN_SHORT_SIDE) return false;
  if (w * h < MIN_PIXELS) return false;
  if (long / short > MAX_ASPECT) return false;
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
  return data.images || [];
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
    // 2 requêtes en parallèle : web standard + UGC social.
    // On en demande beaucoup (40 chacune) pour avoir du choix après filtrage qualité.
    const [webImages, ugcImages] = await Promise.all([
      searchSerper(key, q, 40),
      searchSerper(key, `${q} instagram`, 40),
    ]);

    // Déduplique par imageUrl, UGC d'abord
    const seen = new Set<string>();
    const allImages: SerperImage[] = [];
    for (const img of [...ugcImages, ...webImages]) {
      if (img.imageUrl && !seen.has(img.imageUrl)) {
        seen.add(img.imageUrl);
        allImages.push(img);
      }
    }

    // Ne garde que les images de qualité pro, triées par résolution décroissante.
    const quality = allImages.filter(isQuality).sort((a, b) => {
      const pa = (a.imageWidth || 0) * (a.imageHeight || 0);
      const pb = (b.imageWidth || 0) * (b.imageHeight || 0);
      return pb - pa;
    });

    // Repli : si le filtre est trop strict et ne laisse presque rien, on
    // complète avec les meilleures images restantes (dimensions connues) triées.
    let pool = quality;
    if (pool.length < 6) {
      const rest = allImages
        .filter((img) => !quality.includes(img) && (img.imageWidth || 0) * (img.imageHeight || 0) > 0)
        .sort(
          (a, b) =>
            (b.imageWidth || 0) * (b.imageHeight || 0) - (a.imageWidth || 0) * (a.imageHeight || 0)
        );
      pool = [...quality, ...rest];
    }

    const photos: PhotoResult[] = pool.slice(0, 40).map((img, i) => {
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
