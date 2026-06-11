import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: unknown; expires: number }>();
const TTL = 24 * 60 * 60 * 1000; // 24h

type PlacePhoto = {
  src: string;    // URL à utiliser pour la composition (proxifiée si besoin)
  thumb: string;  // miniature
  source: string; // crédit
};

/**
 * Photos réelles d'un restaurant. Sources par ordre de priorité :
 * 1. Google Places (GOOGLE_PLACES_API_KEY) — photos Google Maps du lieu
 * 2. Yelp Fusion (YELP_API_KEY) — photos officielles Yelp, clé gratuite
 */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  const address = req.nextUrl.searchParams.get("address")?.trim() || "";
  if (!name) return NextResponse.json({ error: "Paramètre name requis" }, { status: 400 });

  const cacheKey = `${name}|${address}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  const yelpKey = process.env.YELP_API_KEY;

  // --- 1. Google Places --------------------------------------------------
  if (googleKey) {
    try {
      const searchRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          `${name} ${address} Paris`
        )}&key=${googleKey}&language=fr`
      );
      const search = await searchRes.json();
      const place = search.results?.[0];
      if (place?.place_id) {
        const detailsRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=photos&key=${googleKey}`
        );
        const details = await detailsRes.json();
        const refs: string[] = (details.result?.photos || [])
          .slice(0, 8)
          .map((p: { photo_reference: string }) => p.photo_reference);
        if (refs.length > 0) {
          const photos: PlacePhoto[] = refs.map((ref) => ({
            src: `/api/places/photo?ref=${encodeURIComponent(ref)}&maxwidth=1080`,
            thumb: `/api/places/photo?ref=${encodeURIComponent(ref)}&maxwidth=200`,
            source: "Google Maps",
          }));
          const payload = { provider: "google", photos };
          cache.set(cacheKey, { data: payload, expires: Date.now() + TTL });
          return NextResponse.json(payload);
        }
      }
    } catch (e) {
      console.error("[place] Google Places échec :", e);
    }
  }

  // --- 2. Yelp Fusion ----------------------------------------------------
  if (yelpKey) {
    try {
      const searchRes = await fetch(
        `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(name)}&location=${encodeURIComponent(
          address ? `${address}, Paris, France` : "Paris, France"
        )}&limit=1`,
        { headers: { Authorization: `Bearer ${yelpKey}` } }
      );
      const search = await searchRes.json();
      const biz = search.businesses?.[0];
      if (biz?.id) {
        const detailsRes = await fetch(`https://api.yelp.com/v3/businesses/${biz.id}`, {
          headers: { Authorization: `Bearer ${yelpKey}` },
        });
        const details = await detailsRes.json();
        const urls: string[] = details.photos || [];
        if (urls.length > 0) {
          const photos: PlacePhoto[] = urls.map((u) => ({
            // proxifié : le CDN Yelp ne permet pas le CORS pour le canvas
            src: `/api/images/proxy?url=${encodeURIComponent(u)}`,
            thumb: `/api/images/proxy?url=${encodeURIComponent(u)}`,
            source: `${details.name} / Yelp`,
          }));
          const payload = { provider: "yelp", photos };
          cache.set(cacheKey, { data: payload, expires: Date.now() + TTL });
          return NextResponse.json(payload);
        }
      }
    } catch (e) {
      console.error("[place] Yelp échec :", e);
    }
  }

  if (!googleKey && !yelpKey) {
    return NextResponse.json(
      {
        error:
          "Aucune source de photos réelles configurée. Ajoute YELP_API_KEY (gratuit, sans carte) ou GOOGLE_PLACES_API_KEY dans Vercel.",
        noProvider: true,
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { error: `Aucune photo trouvée pour « ${name} »`, photos: [] },
    { status: 404 }
  );
}
