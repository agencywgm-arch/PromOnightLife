import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: unknown; expires: number }>();
const TTL = 24 * 60 * 60 * 1000; // 24h

export async function GET(req: NextRequest) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY non configurée" },
      { status: 503 }
    );
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });

  const cached = cache.get(q);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    `${q} Paris`
  )}&key=${key}&language=fr`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return NextResponse.json(
      { error: `Google Places : ${data.status}` },
      { status: 502 }
    );
  }

  const payload = {
    results: (data.results || []).slice(0, 6).map((r: any) => ({
      placeId: r.place_id,
      nom: r.name,
      adresse: r.formatted_address,
    })),
  };
  cache.set(q, { data: payload, expires: Date.now() + TTL });
  return NextResponse.json(payload);
}
