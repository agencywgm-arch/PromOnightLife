import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: unknown; expires: number }>();
const TTL = 24 * 60 * 60 * 1000; // 24h — économise le quota Serper

type PhotoResult = {
  id: string;
  src: string;
  thumb: string;
  source: string;
  pageUrl?: string;
};

/**
 * Vraies photos via Google Images (Serper.dev).
 * Serper interroge Google pour nous — aucun blocage Cloudflare/IP,
 * réponse JSON propre. 2500 requêtes offertes, clé dans SERPER_API_KEY.
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
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q, gl: "fr", hl: "fr", num: 10 }),
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `Serper ${res.status} : ${body.slice(0, 200)}`, photos: [] },
        { status: 502 }
      );
    }

    const data = await res.json();
    const photos: PhotoResult[] = (data.images || [])
      .filter((img: { imageUrl?: string }) => !!img.imageUrl)
      .slice(0, 8)
      .map((img: { imageUrl: string; thumbnailUrl?: string; source?: string; link?: string }, i: number) => ({
        id: `serper-${i}`,
        // proxifié pour le rendu canvas (CORS)
        src: `/api/images/proxy?url=${encodeURIComponent(img.imageUrl)}`,
        thumb: img.thumbnailUrl || `/api/images/proxy?url=${encodeURIComponent(img.imageUrl)}`,
        source: img.source || "Google Images",
        pageUrl: img.link,
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
