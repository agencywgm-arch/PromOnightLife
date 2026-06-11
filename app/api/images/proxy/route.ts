import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Hôtes autorisés pour le proxy d'images (canvas crossOrigin)
const ALLOWED_HOSTS = [
  "yelpcdn.com",
  "fl.yelpcdn.com",
  "images.pexels.com",
  "googleusercontent.com",
  "maps.googleapis.com",
];

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Paramètre url requis" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "URL invalide" }, { status: 400 });
  }

  if (
    parsed.protocol !== "https:" ||
    !ALLOWED_HOSTS.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`))
  ) {
    return NextResponse.json({ error: "Hôte non autorisé" }, { status: 403 });
  }

  try {
    const res = await fetch(parsed.toString());
    if (!res.ok) {
      return NextResponse.json({ error: `Image inaccessible (${res.status})` }, { status: 502 });
    }
    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur réseau : ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
