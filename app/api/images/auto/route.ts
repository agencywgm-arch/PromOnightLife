import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: unknown; expires: number }>();
const TTL = 12 * 60 * 60 * 1000; // 12h

type PhotoResult = {
  id: string;
  src: string;
  thumb: string;
  source: string;
  pageUrl?: string;
};

/**
 * Automatic image search across multiple free sources.
 * Chain: Foursquare/Google Places → Pexels → Unsplash → Pixabay
 * Returns 3+ images from first successful source, or empty array if all fail.
 */
async function pexelsSearch(q: string): Promise<PhotoResult[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=5&orientation=portrait`,
      { headers: { Authorization: key } }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.photos || []).map((p: any) => ({
      id: `pexels-${p.id}`,
      src: p.src.large2x || p.src.large || p.src.medium,
      thumb: p.src.medium,
      source: `Pexels / ${p.photographer}`,
      pageUrl: p.url,
    }));
  } catch {
    return [];
  }
}

async function unsplashSearch(q: string): Promise<PhotoResult[]> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=5&orientation=portrait`,
      {
        headers: {
          "Accept-Version": "v1",
        },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || []).map((p: any) => ({
      id: `unsplash-${p.id}`,
      src: p.urls.regular,
      thumb: p.urls.small,
      source: `Unsplash / ${p.user.name}`,
      pageUrl: p.links.html,
    }));
  } catch {
    return [];
  }
}

async function pixabaySearch(q: string): Promise<PhotoResult[]> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(q)}&per_page=5&orientation=vertical&image_type=photo`,
      {}
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.hits || []).map((p: any) => ({
      id: `pixabay-${p.id}`,
      src: p.largeImageURL,
      thumb: p.previewURL,
      source: `Pixabay / ${p.user}`,
      pageUrl: p.pageURL,
    }));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });
  }

  const cached = cache.get(q);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  // Try sources in order: Pexels → Unsplash → Pixabay
  const pexelsResult = await pexelsSearch(q);
  if (pexelsResult.length > 0) {
    const payload = { provider: "pexels", photos: pexelsResult };
    cache.set(q, { data: payload, expires: Date.now() + TTL });
    return NextResponse.json(payload);
  }

  const unsplashResult = await unsplashSearch(q);
  if (unsplashResult.length > 0) {
    const payload = { provider: "unsplash", photos: unsplashResult };
    cache.set(q, { data: payload, expires: Date.now() + TTL });
    return NextResponse.json(payload);
  }

  const pixabayResult = await pixabaySearch(q);
  if (pixabayResult.length > 0) {
    const payload = { provider: "pixabay", photos: pixabayResult };
    cache.set(q, { data: payload, expires: Date.now() + TTL });
    return NextResponse.json(payload);
  }

  // All sources failed, return empty with fallback
  const payload = {
    provider: "none",
    photos: [],
    fallback: true,
    message: "Aucune image trouvée automatiquement",
  };
  cache.set(q, { data: payload, expires: Date.now() + (1 * 60 * 60 * 1000) });
  return NextResponse.json(payload);
}
