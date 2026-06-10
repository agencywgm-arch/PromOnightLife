import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Proxy d'image Google Places : évite d'exposer la clé API au client. */
export async function GET(req: NextRequest) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GOOGLE_PLACES_API_KEY non configurée" },
      { status: 503 }
    );
  }

  const ref = req.nextUrl.searchParams.get("ref");
  const maxwidth = req.nextUrl.searchParams.get("maxwidth") || "800";
  if (!ref) return NextResponse.json({ error: "Paramètre ref requis" }, { status: 400 });

  const url = `https://maps.googleapis.com/maps/api/place/photo?photo_reference=${encodeURIComponent(
    ref
  )}&maxwidth=${encodeURIComponent(maxwidth)}&key=${key}`;
  const res = await fetch(url);

  if (!res.ok) {
    return NextResponse.json({ error: "Photo indisponible" }, { status: 502 });
  }

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": "public, max-age=86400", // cache 24h
    },
  });
}
