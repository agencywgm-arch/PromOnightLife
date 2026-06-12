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
 * 1. Foursquare (FOURSQUARE_API_KEY) — Service Key (nouvelle API) ou clé v3 legacy
 * 2. Google Places (GOOGLE_PLACES_API_KEY) — photos Google Maps
 */

type FsqPhoto = { prefix: string; suffix: string };

// Nouvelle API Foursquare (Service Keys, comptes créés depuis 2025)
async function foursquareNew(key: string, query: string): Promise<{ name: string; photos: FsqPhoto[] } | null> {
  const headers = {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "X-Places-Api-Version": "2025-06-17",
  };
  const searchRes = await fetch(
    `https://places-api.foursquare.com/places/search?query=${encodeURIComponent(query)}&near=Paris%2C+France&limit=1`,
    { headers }
  );
  if (!searchRes.ok) return null;
  const search = await searchRes.json();
  const place = search.results?.[0];
  const id = place?.fsq_place_id || place?.fsq_id;
  if (!id) return null;

  const photoRes = await fetch(
    `https://places-api.foursquare.com/places/${id}/photos?limit=24`,
    { headers }
  );
  if (!photoRes.ok) return null;
  const photoData = await photoRes.json();
  return {
    name: place.name || query,
    photos: Array.isArray(photoData) ? photoData : [],
  };
}

// Ancienne API Foursquare v3 (clés legacy commençant par fsq3...)
async function foursquareLegacy(key: string, query: string): Promise<{ name: string; photos: FsqPhoto[] } | null> {
  const headers = { Authorization: key, Accept: "application/json" };
  const searchRes = await fetch(
    `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(query)}&near=Paris%2C+France&limit=1`,
    { headers }
  );
  if (!searchRes.ok) return null;
  const search = await searchRes.json();
  const place = search.results?.[0];
  if (!place?.fsq_id) return null;

  const photoRes = await fetch(
    `https://api.foursquare.com/v3/places/${place.fsq_id}/photos?limit=24`,
    { headers }
  );
  if (!photoRes.ok) return null;
  const photoData = await photoRes.json();
  return {
    name: place.name || query,
    photos: Array.isArray(photoData) ? photoData : [],
  };
}

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

  // --- 1. Foursquare (nouvelle API puis legacy) ---------------------------
  if (fsqKey) {
    try {
      const query = `${name}${address ? ` ${address}` : ""}`;
      // Les clés legacy commencent par fsq3 ; les Service Keys non.
      const result = fsqKey.startsWith("fsq3")
        ? (await foursquareLegacy(fsqKey, query)) || (await foursquareNew(fsqKey, query))
        : (await foursquareNew(fsqKey, query)) || (await foursquareLegacy(fsqKey, query));

      if (result && result.photos.length > 0) {
        const photos: PlacePhoto[] = result.photos.map((p) => ({
          // proxifié pour CORS canvas
          src: `/api/images/proxy?url=${encodeURIComponent(`${p.prefix}original${p.suffix}`)}`,
          thumb: `/api/images/proxy?url=${encodeURIComponent(`${p.prefix}200x200${p.suffix}`)}`,
          source: `${result.name} / Foursquare`,
        }));
        const payload = { provider: "foursquare", photos };
        cache.set(cacheKey, { data: payload, expires: Date.now() + TTL });
        return NextResponse.json(payload);
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
          .slice(0, 10)
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
