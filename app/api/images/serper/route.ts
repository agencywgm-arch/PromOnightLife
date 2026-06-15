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
};

const UGC_DOMAINS = ["instagram.com", "cdninstagram.com", "tiktok.com", "maps.google", "goo.gl", "tripadvisor"];

function isUGC(link?: string, source?: string): boolean {
  const str = `${link || ""} ${source || ""}`.toLowerCase();
  return UGC_DOMAINS.some((d) => str.includes(d));
}

async function searchSerper(key: string, q: string, num: number): Promise<any[]> {
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
    // 2 requêtes en parallèle : web standard + UGC social
    const [webImages, ugcImages] = await Promise.all([
      searchSerper(key, q, 20),
      searchSerper(key, `${q} instagram`, 20),
    ]);

    // Déduplique par imageUrl
    const seen = new Set<string>();
    const allImages: Array<{ imageUrl: string; thumbnailUrl?: string; source?: string; link?: string }> = [];

    // UGC en premier (Instagram/TikTok/Maps)
    for (const img of ugcImages) {
      if (img.imageUrl && !seen.has(img.imageUrl)) {
        seen.add(img.imageUrl);
        allImages.push(img);
      }
    }
    // Photos web ensuite
    for (const img of webImages) {
      if (img.imageUrl && !seen.has(img.imageUrl)) {
        seen.add(img.imageUrl);
        allImages.push(img);
      }
    }

    const photos: PhotoResult[] = allImages
      .filter((img) => !!img.imageUrl)
      .slice(0, 40)
      .map((img, i) => ({
        id: `serper-${i}`,
        src: `/api/images/proxy?url=${encodeURIComponent(img.imageUrl)}`,
        thumb: img.thumbnailUrl || `/api/images/proxy?url=${encodeURIComponent(img.imageUrl)}`,
        source: img.source || "Google Images",
        pageUrl: img.link,
        isUGC: isUGC(img.link, img.source),
      }));

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
