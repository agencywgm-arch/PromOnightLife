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

  const placeId = req.nextUrl.searchParams.get("placeId");
  if (!placeId) {
    return NextResponse.json({ error: "Paramètre placeId requis" }, { status: 400 });
  }

  const cached = cache.get(placeId);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
    placeId
  )}&fields=photos&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK") {
    return NextResponse.json({ error: `Google Places : ${data.status}` }, { status: 502 });
  }

  const payload = {
    photos: (data.result?.photos || [])
      .slice(0, 10)
      .map((p: any) => p.photo_reference),
  };
  cache.set(placeId, { data: payload, expires: Date.now() + TTL });
  return NextResponse.json(payload);
}
