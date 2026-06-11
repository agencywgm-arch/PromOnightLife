import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: unknown; expires: number }>();
const TTL = 6 * 60 * 60 * 1000; // 6h

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });

  const key = process.env.PEXELS_API_KEY;
  if (!key) {
    // Fallback : retourne des liens de recherche Pexels sans API
    return NextResponse.json({
      fallback: true,
      searchUrl: `https://www.pexels.com/search/${encodeURIComponent(q)}/`,
      photos: [],
    });
  }

  const cached = cache.get(q);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=3&orientation=portrait`,
      { headers: { Authorization: key } }
    );
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: `Pexels ${res.status}` }, { status: 502 });
    }

    const payload = {
      fallback: false,
      photos: (data.photos || []).map((p: {
        id: number;
        url: string;
        photographer: string;
        src: { large2x: string; large: string; medium: string };
      }) => ({
        id: p.id,
        pageUrl: p.url,
        photographer: p.photographer,
        src: p.src.large2x || p.src.large || p.src.medium,
        thumb: p.src.medium,
      })),
    };

    cache.set(q, { data: payload, expires: Date.now() + TTL });
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur réseau : ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
