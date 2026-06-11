import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: unknown; expires: number }>();
const TTL = 24 * 60 * 60 * 1000; // 24h

type PhotoResult = {
  id: string;
  src: string;
  thumb: string;
  source: string;
};

/**
 * Scrape TripAdvisor for restaurant photos
 * Searches for restaurant, finds TripAdvisor page, extracts photo URLs
 */
async function scrapeTripAdvisor(restaurantName: string): Promise<PhotoResult[]> {
  try {
    // Search for restaurant on TripAdvisor
    const searchUrl = `https://www.tripadvisor.com/Search?q=${encodeURIComponent(
      restaurantName + " Paris"
    )}&ssrc=f`;

    const searchRes = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!searchRes.ok) return [];

    const searchHtml = await searchRes.text();

    // Extract TripAdvisor restaurant URL from search results
    // Look for pattern: /Restaurant_Review-g187147-d[ID]-...
    const restaurantUrlMatch = searchHtml.match(
      /href="([^"]*\/Restaurant_Review[^"]*?)"/i
    );

    if (!restaurantUrlMatch) return [];

    const restaurantPath = restaurantUrlMatch[1];
    const restaurantUrl = `https://www.tripadvisor.com${restaurantPath}`;

    // Fetch the restaurant page
    const resRes = await fetch(restaurantUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!resRes.ok) return [];

    const resHtml = await resRes.text();

    // Extract photo URLs from the HTML
    // TripAdvisor uses data attributes with image URLs
    // Pattern: "image":{"url":"https://media.tacdn.com/media/photo-...
    const photoMatches = resHtml.match(
      /"image":\{"url":"(https:\/\/media\.tacdn\.com\/media\/photo-[^"]+)"/g
    );

    if (!photoMatches || photoMatches.length === 0) {
      // Try alternative pattern
      const altMatches = resHtml.match(
        /https:\/\/media\.tacdn\.com\/media\/photo-[a-zA-Z0-9-]+\/[a-zA-Z0-9]+\.jpg/g
      );
      if (!altMatches) return [];

      return altMatches.slice(0, 8).map((url, i) => ({
        id: `ta-${i}`,
        src: url,
        thumb: url.replace(/\.jpg$/, "-t.jpg"),
        source: "TripAdvisor",
      }));
    }

    // Extract URLs from matched strings
    return photoMatches
      .slice(0, 8)
      .map((match, i) => {
        const urlMatch = match.match(
          /"url":"(https:\/\/media\.tacdn\.com\/media\/photo-[^"]+)"/
        );
        return urlMatch
          ? {
              id: `ta-${i}`,
              src: urlMatch[1],
              thumb: urlMatch[1].replace(/\.jpg$/, "-t.jpg"),
              source: "TripAdvisor",
            }
          : null;
      })
      .filter((p) => p !== null) as PhotoResult[];
  } catch (e) {
    console.error("[tripadvisor] scrape error:", e);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) {
    return NextResponse.json({ error: "Paramètre name requis" }, { status: 400 });
  }

  const cached = cache.get(name);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const photos = await scrapeTripAdvisor(name);

  if (photos.length > 0) {
    const payload = { provider: "tripadvisor", photos };
    cache.set(name, { data: payload, expires: Date.now() + TTL });
    return NextResponse.json(payload);
  }

  // No photos found
  const payload = {
    provider: "tripadvisor",
    photos: [],
    fallback: true,
    searchUrl: `https://www.tripadvisor.com/Search?q=${encodeURIComponent(name + " Paris")}`,
  };
  cache.set(name, { data: payload, expires: Date.now() + (1 * 60 * 60 * 1000) });
  return NextResponse.json(payload);
}
