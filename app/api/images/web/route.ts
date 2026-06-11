import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: unknown; expires: number }>();
const TTL = 12 * 60 * 60 * 1000; // 12h

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

type WebPhoto = { src: string; thumb: string; source: string };

function proxify(url: string): string {
  return `/api/images/proxy?url=${encodeURIComponent(url)}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

/**
 * Source 1 — Google Custom Search (image search).
 * GRATUIT : 100 recherches/jour, sans carte bancaire.
 * Nécessite GOOGLE_CSE_KEY (clé API) + GOOGLE_CSE_CX (id du moteur).
 * Fiable depuis Vercel (vraie API, pas de scraping).
 */
async function googleCse(q: string): Promise<WebPhoto[] | null> {
  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!key || !cx) return null;

  const url =
    `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}` +
    `&searchType=image&num=9&imgSize=large&safe=active&gl=fr&hl=fr` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn("[web-images] Google CSE a répondu", res.status, await res.text().then(t => t.slice(0, 200)));
    return null;
  }
  const data = await res.json();
  const items: { link: string; image?: { thumbnailLink?: string; contextLink?: string; width?: number } }[] =
    data.items || [];
  const photos = items
    .filter((i) => i.link?.startsWith("https://"))
    .map((i) => ({
      src: proxify(i.link),
      thumb: proxify(i.image?.thumbnailLink || i.link),
      source: hostOf(i.image?.contextLink || i.link),
    }));
  return photos.length > 0 ? photos : null;
}

/**
 * Source 2 — DuckDuckGo (scraping, sans clé).
 * ⚠️ Souvent bloqué depuis les serveurs cloud (Vercel) : utilisé en
 * meilleure-chance seulement.
 */
async function duckduckgo(q: string): Promise<WebPhoto[] | null> {
  const tokenRes = await fetch(
    `https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`,
    {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    }
  );
  if (!tokenRes.ok) {
    console.warn("[web-images] DuckDuckGo page bloquée :", tokenRes.status);
    return null;
  }
  const html = await tokenRes.text();
  const vqdMatch =
    html.match(/vqd["']?\s*[=:]\s*["']?([\da-f-]+)/) ||
    html.match(/"vqd"\s*:\s*"([\da-f-]+)"/);
  if (!vqdMatch) {
    console.warn("[web-images] Token vqd introuvable (anti-bot probable)");
    return null;
  }

  const imgRes = await fetch(
    `https://duckduckgo.com/i.js?l=fr-fr&o=json&q=${encodeURIComponent(q)}&vqd=${vqdMatch[1]}&p=1`,
    { headers: { "User-Agent": UA, Referer: "https://duckduckgo.com/" } }
  );
  if (!imgRes.ok) {
    console.warn("[web-images] DuckDuckGo i.js bloqué :", imgRes.status);
    return null;
  }
  const data = await imgRes.json();
  const results: { image: string; thumbnail: string; url: string; width: number }[] =
    data.results || [];
  const photos = results
    .filter((r) => r.image?.startsWith("https://") && r.width >= 500)
    .slice(0, 9)
    .map((r) => ({
      src: proxify(r.image),
      thumb: proxify(r.thumbnail || r.image),
      source: hostOf(r.url || r.image),
    }));
  return photos.length > 0 ? photos : null;
}

/**
 * Recherche d'images web (vraies photos du restaurant publiées en ligne).
 * Ordre : Google Custom Search (fiable, clé gratuite) → DuckDuckGo (sans clé,
 * souvent bloqué sur Vercel) → lien de recherche manuelle.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });

  const cached = cache.get(q);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const fallbackUrl = `https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}&tbm=isch`;

  try {
    // 1. Google Custom Search (si clés configurées)
    try {
      const cse = await googleCse(q);
      if (cse) {
        const payload = { provider: "web", photos: cse };
        cache.set(q, { data: payload, expires: Date.now() + TTL });
        return NextResponse.json(payload);
      }
    } catch (e) {
      console.warn("[web-images] Google CSE échec :", e);
    }

    // 2. DuckDuckGo (meilleure chance, souvent bloqué depuis Vercel)
    try {
      const ddg = await duckduckgo(q);
      if (ddg) {
        const payload = { provider: "web", photos: ddg };
        cache.set(q, { data: payload, expires: Date.now() + TTL });
        return NextResponse.json(payload);
      }
    } catch (e) {
      console.warn("[web-images] DuckDuckGo échec :", e);
    }

    // 3. Aucune source automatique : lien de recherche manuelle
    const noCse = !process.env.GOOGLE_CSE_KEY || !process.env.GOOGLE_CSE_CX;
    const payload = {
      provider: "web",
      photos: [],
      fallback: true,
      searchUrl: googleUrl,
      searchUrlAlt: fallbackUrl,
      message: noCse
        ? "Astuce : configure GOOGLE_CSE_KEY et GOOGLE_CSE_CX (gratuit, 100 recherches/jour) pour la recherche automatique."
        : "Recherche automatique indisponible pour cette requête.",
    };
    // pas de cache long pour les échecs (10 min)
    cache.set(q, { data: payload, expires: Date.now() + 10 * 60 * 1000 });
    return NextResponse.json(payload);
  } catch (e) {
    console.error("[web-images] Erreur :", e);
    return NextResponse.json({
      provider: "web",
      photos: [],
      fallback: true,
      searchUrl: googleUrl,
      searchUrlAlt: fallbackUrl,
    });
  }
}
