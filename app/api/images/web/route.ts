import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: unknown; expires: number }>();
const TTL = 12 * 60 * 60 * 1000; // 12h

type WebPhoto = { src: string; thumb: string; source: string };

function proxify(url: string): string {
  return `/api/images/proxy?url=${encodeURIComponent(url)}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

/**
 * Brave Search Images API — gratuit, 2 000 req/mois, sans carte bancaire.
 * Inscription : https://brave.com/search/api/ → "Get Started for Free"
 * Fonctionne depuis Vercel (vraie API officielle, jamais bloquée).
 */
async function braveImages(q: string): Promise<WebPhoto[] | null> {
  const key = process.env.BRAVE_API_KEY;
  if (!key) return null;

  const res = await fetch(
    `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(q)}&count=9&search_lang=fr&country=fr&safesearch=off`,
    {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": key,
      },
    }
  );

  if (!res.ok) {
    console.warn("[web-images] Brave Search a répondu", res.status);
    return null;
  }

  const data = await res.json();
  const results: {
    thumbnail?: { src?: string; original?: string };
    properties?: { url?: string };
    url?: string;
    source?: string;
  }[] = data.results || [];

  const photos = results
    .filter((r) => {
      const imgUrl = r.properties?.url || r.thumbnail?.original || "";
      return imgUrl.startsWith("https://");
    })
    .map((r) => {
      const imgUrl = r.properties?.url || r.thumbnail?.original || "";
      const thumbUrl = r.thumbnail?.src || imgUrl;
      return {
        src: proxify(imgUrl),
        thumb: proxify(thumbUrl),
        source: r.source || hostOf(r.url || imgUrl),
      };
    });

  return photos.length > 0 ? photos : null;
}

/**
 * Google Custom Search — gratuit, 100 req/jour, sans carte bancaire.
 * Nécessite GOOGLE_CSE_KEY + GOOGLE_CSE_CX (voir .env.example).
 */
async function googleCse(q: string): Promise<WebPhoto[] | null> {
  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!key || !cx) return null;

  const res = await fetch(
    `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}` +
      `&searchType=image&num=9&imgSize=large&safe=active&gl=fr&hl=fr` +
      `&q=${encodeURIComponent(q)}`
  );

  if (!res.ok) {
    console.warn("[web-images] Google CSE a répondu", res.status);
    return null;
  }

  const data = await res.json();
  const items: {
    link: string;
    image?: { thumbnailLink?: string; contextLink?: string };
  }[] = data.items || [];

  const photos = items
    .filter((i) => i.link?.startsWith("https://"))
    .map((i) => ({
      src: proxify(i.link),
      thumb: proxify(i.image?.thumbnailLink || i.link),
      source: hostOf(i.image?.contextLink || i.link),
    }));

  return photos.length > 0 ? photos : null;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });

  const cached = cache.get(q);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  // Ordre : Brave (recommandé, gratuit) → Google CSE (si configuré) → recherche manuelle
  const sources = [
    { fn: () => braveImages(q), name: "brave" },
    { fn: () => googleCse(q), name: "google" },
  ];

  for (const source of sources) {
    try {
      const photos = await source.fn();
      if (photos && photos.length > 0) {
        const payload = { provider: source.name, photos };
        cache.set(q, { data: payload, expires: Date.now() + TTL });
        return NextResponse.json(payload);
      }
    } catch (e) {
      console.warn(`[web-images] ${source.name} échec :`, e);
    }
  }

  // Aucune source automatique disponible → lien de recherche manuelle
  const hasBrave = !!process.env.BRAVE_API_KEY;
  const hasGoogle = !!(process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_CX);
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}&tbm=isch`;

  const payload = {
    provider: "web",
    photos: [],
    fallback: true,
    searchUrl: googleUrl,
    noProvider: !hasBrave && !hasGoogle,
  };

  cache.set(q, { data: payload, expires: Date.now() + 10 * 60 * 1000 });
  return NextResponse.json(payload);
}
