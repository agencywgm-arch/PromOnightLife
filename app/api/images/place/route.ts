import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: unknown; expires: number }>();
const TTL = 24 * 60 * 60 * 1000; // 24h

type PlacePhoto = {
  src: string;
  thumb: string;
  source: string;
};

/**
 * Photos réelles d'un restaurant. Sources par ordre de priorité :
 * 1. Foursquare Places API v3 (FOURSQUARE_API_KEY) — excellente couverture Paris, gratuit sans carte
 * 2. Google Places (GOOGLE_PLACES_API_KEY) — photos Google Maps
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

  const fsqKey = process.env.FOURSQUARE_API_KEY;
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;

  // --- 1. Foursquare Places v3 -------------------------------------------
  if (fsqKey) {
    try {
      const query = `${name}${address ? ` ${address}` : ""}`;
      const searchRes = await fetch(
        `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(query)}&near=Paris%2C+France&limit=1&categories=13000`,
        {
          headers: {
            Authorization: fsqKey,
            Accept: "application/json",
          },
        }
      );
      const search = await searchRes.json();
      const place = search.results?.[0];

      if (place?.fsq_id) {
        const photoRes = await fetch(
          `https://api.foursquare.com/v3/places/${place.fsq_id}/photos?limit=8`,
          {
            headers: {
              Authorization: fsqKey,
              Accept: "application/json",
            },
          }
        );
        const photoData = await photoRes.json();
        const photoList: { prefix: string; suffix: string }[] = Array.isArray(photoData)
          ? photoData
          : [];

        if (photoList.length > 0) {
          const photos: PlacePhoto[] = photoList.map((p) => ({
            // proxifié pour CORS canvas
            src: `/api/images/proxy?url=${encodeURIComponent(`${p.prefix}original${p.suffix}`)}`,
            thumb: `/api/images/proxy?url=${encodeURIComponent(`${p.prefix}200x200${p.suffix}`)}`,
            source: `${place.name} / Foursquare`,
          }));
          const payload = { provider: "foursquare", photos };
          cache.set(cacheKey, { data: payload, expires: Date.now() + TTL });
          return NextResponse.json(payload);
        }
      }
    } catch (e) {
      console.error("[place] Foursquare échec :", e);
    }
  }

  // --- 2. Google Places ---------------------------------------------------
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

  if (!fsqKey && !googleKey) {
    return NextResponse.json(
      {
        error:
          "Configure FOURSQUARE_API_KEY dans Vercel (gratuit, sans carte : foursquare.com/developers).",
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
