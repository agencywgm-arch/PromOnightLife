import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Endpoint de diagnostic — teste toutes les sources d'images configurées.
 * Ouvre /api/images/test dans ton navigateur pour voir ce qui marche.
 */

const TEST_RESTAURANT = "Le Train Bleu";
const TEST_ADDRESS = "Place Louis-Armand, 75012 Paris";

type SourceResult = {
  source: string;
  configured: boolean;
  works: boolean;
  photosFound: number;
  detail: string;
};

async function testFoursquare(): Promise<SourceResult> {
  const key = process.env.FOURSQUARE_API_KEY;
  if (!key) {
    return {
      source: "Foursquare",
      configured: false,
      works: false,
      photosFound: 0,
      detail: "FOURSQUARE_API_KEY absente dans Vercel → Settings → Environment Variables",
    };
  }
  try {
    const isLegacy = key.startsWith("fsq3");
    const headers: Record<string, string> = isLegacy
      ? { Authorization: key, Accept: "application/json" }
      : {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
          "X-Places-Api-Version": "2025-06-17",
        };
    const url = isLegacy
      ? `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(TEST_RESTAURANT)}&near=Paris%2C+France&limit=1`
      : `https://places-api.foursquare.com/places/search?query=${encodeURIComponent(TEST_RESTAURANT)}&near=Paris%2C+France&limit=1`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.text();
      return {
        source: "Foursquare",
        configured: true,
        works: false,
        photosFound: 0,
        detail: `Erreur HTTP ${res.status} — clé invalide ou expirée. Réponse : ${body.slice(0, 200)}`,
      };
    }
    const data = await res.json();
    const place = data.results?.[0];
    if (!place) {
      return {
        source: "Foursquare",
        configured: true,
        works: true,
        photosFound: 0,
        detail: "Clé OK mais restaurant test introuvable",
      };
    }
    const id = place.fsq_place_id || place.fsq_id;
    const photoUrl = isLegacy
      ? `https://api.foursquare.com/v3/places/${id}/photos?limit=8`
      : `https://places-api.foursquare.com/places/${id}/photos?limit=8`;
    const photoRes = await fetch(photoUrl, { headers });
    const photos = photoRes.ok ? await photoRes.json() : [];
    return {
      source: "Foursquare",
      configured: true,
      works: true,
      photosFound: Array.isArray(photos) ? photos.length : 0,
      detail: `✅ Clé valide (format ${isLegacy ? "legacy fsq3" : "Service Key"}) — ${Array.isArray(photos) ? photos.length : 0} photos pour « ${TEST_RESTAURANT} »`,
    };
  } catch (e) {
    return {
      source: "Foursquare",
      configured: true,
      works: false,
      photosFound: 0,
      detail: `Erreur réseau : ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

async function testGooglePlaces(): Promise<SourceResult> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    return {
      source: "Google Places",
      configured: false,
      works: false,
      photosFound: 0,
      detail: "GOOGLE_PLACES_API_KEY absente dans Vercel → Settings → Environment Variables",
    };
  }
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(`${TEST_RESTAURANT} ${TEST_ADDRESS}`)}&key=${key}&language=fr`
    );
    const data = await res.json();
    if (data.status === "REQUEST_DENIED") {
      return {
        source: "Google Places",
        configured: true,
        works: false,
        photosFound: 0,
        detail: `❌ REQUEST_DENIED — ${data.error_message || "Vérifie que Places API est activée et que la facturation est configurée dans Google Cloud Console"}`,
      };
    }
    if (data.status !== "OK" || !data.results?.[0]) {
      return {
        source: "Google Places",
        configured: true,
        works: false,
        photosFound: 0,
        detail: `Statut Google : ${data.status} — ${data.error_message || "restaurant test introuvable"}`,
      };
    }
    const place = data.results[0];
    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=photos&key=${key}`
    );
    const details = await detailsRes.json();
    const count = details.result?.photos?.length || 0;
    return {
      source: "Google Places",
      configured: true,
      works: true,
      photosFound: count,
      detail: `✅ Clé valide — ${count} photos pour « ${TEST_RESTAURANT} »`,
    };
  } catch (e) {
    return {
      source: "Google Places",
      configured: true,
      works: false,
      photosFound: 0,
      detail: `Erreur réseau : ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

async function testSerper(): Promise<SourceResult> {
  const key = process.env.SERPER_API_KEY;
  if (!key) {
    return {
      source: "Serper (Google Images)",
      configured: false,
      works: false,
      photosFound: 0,
      detail: "SERPER_API_KEY absente — inscris-toi sur serper.dev (gratuit, sans carte) puis ajoute la clé dans Vercel",
    };
  }
  try {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: `"${TEST_RESTAURANT}" restaurant Paris`, gl: "fr", hl: "fr", num: 8 }),
    });
    if (!res.ok) {
      const body = await res.text();
      return {
        source: "Serper (Google Images)",
        configured: true,
        works: false,
        photosFound: 0,
        detail: `Erreur HTTP ${res.status} — clé invalide ou quota épuisé. Réponse : ${body.slice(0, 200)}`,
      };
    }
    const data = await res.json();
    const count = (data.images || []).length;
    return {
      source: "Serper (Google Images)",
      configured: true,
      works: true,
      photosFound: count,
      detail: `✅ Clé valide — ${count} photos Google Images pour « ${TEST_RESTAURANT} »`,
    };
  } catch (e) {
    return {
      source: "Serper (Google Images)",
      configured: true,
      works: false,
      photosFound: 0,
      detail: `Erreur réseau : ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

async function testPexels(): Promise<SourceResult> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) {
    return {
      source: "Pexels (ambiance)",
      configured: false,
      works: false,
      photosFound: 0,
      detail: "PEXELS_API_KEY absente — pas de photos d'ambiance de secours",
    };
  }
  try {
    const res = await fetch(
      "https://api.pexels.com/v1/search?query=paris%20restaurant&per_page=3",
      { headers: { Authorization: key } }
    );
    if (!res.ok) {
      return {
        source: "Pexels (ambiance)",
        configured: true,
        works: false,
        photosFound: 0,
        detail: `Erreur HTTP ${res.status} — clé invalide`,
      };
    }
    const data = await res.json();
    return {
      source: "Pexels (ambiance)",
      configured: true,
      works: true,
      photosFound: data.photos?.length || 0,
      detail: "✅ Clé valide",
    };
  } catch (e) {
    return {
      source: "Pexels (ambiance)",
      configured: true,
      works: false,
      photosFound: 0,
      detail: `Erreur réseau : ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function GET() {
  const [foursquare, google, serper, pexels] = await Promise.all([
    testFoursquare(),
    testGooglePlaces(),
    testSerper(),
    testPexels(),
  ]);

  const sources = [foursquare, google, serper, pexels];
  const realPhotoSourceOk = foursquare.works && foursquare.photosFound > 0
    ? "Foursquare"
    : google.works && google.photosFound > 0
      ? "Google Places"
      : serper.works && serper.photosFound > 0
        ? "Serper (Google Images)"
        : null;

  return NextResponse.json(
    {
      restaurantTest: TEST_RESTAURANT,
      verdict: realPhotoSourceOk
        ? `✅ TOUT EST BON — les vraies photos viendront de ${realPhotoSourceOk}`
        : "❌ AUCUNE source de vraies photos ne fonctionne — configure SERPER_API_KEY (recommandé, gratuit sans carte : serper.dev) puis redéploie",
      sources,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
