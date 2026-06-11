import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: unknown; expires: number }>();
const TTL = 12 * 60 * 60 * 1000; // 12h

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/**
 * Recherche d'images web via DuckDuckGo (aucune clé API requise).
 * Retourne les vraies photos du restaurant publiées sur le web
 * (site officiel, blogs, presse, plateformes de réservation).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });

  const cached = cache.get(q);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    // 1. Récupérer le token vqd de DuckDuckGo
    const tokenRes = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`,
      {
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "fr-FR,fr;q=0.9",
        }
      }
    );
    const html = await tokenRes.text();

    // Try multiple patterns to extract vqd token
    let vqdMatch = html.match(/vqd=["']?([\da-f-]+)["']?/i)
      || html.match(/vqd["\']?\s*[=:]\s*["\']?([\da-f-]+)/i)
      || html.match(/["']vqd["']?\s*:\s*["']?([\da-f-]+)/);

    if (!vqdMatch) {
      console.error("[web-images] Token extraction failed. HTML length:", html.length, "First 500 chars:", html.substring(0, 500));
      return NextResponse.json(
        { error: "Recherche web indisponible (token extraction failed)" },
        { status: 502 }
      );
    }
    const vqd = vqdMatch[1];

    // 2. Appeler l'API images
    const imgRes = await fetch(
      `https://duckduckgo.com/i.js?l=fr-fr&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&p=1`,
      {
        headers: {
          "User-Agent": UA,
          Referer: "https://duckduckgo.com/",
        },
      }
    );
    if (!imgRes.ok) {
      return NextResponse.json(
        { error: `Recherche web indisponible (${imgRes.status})` },
        { status: 502 }
      );
    }
    const data = await imgRes.json();
    const results: {
      image: string;
      thumbnail: string;
      title: string;
      url: string;
      width: number;
      height: number;
    }[] = data.results || [];

    const photos = results
      .filter((r) => r.image?.startsWith("https://") && r.width >= 500)
      .slice(0, 9)
      .map((r) => {
        let host = "";
        try {
          host = new URL(r.url || r.image).hostname.replace(/^www\./, "");
        } catch {
          host = "web";
        }
        return {
          src: `/api/images/proxy?url=${encodeURIComponent(r.image)}`,
          thumb: `/api/images/proxy?url=${encodeURIComponent(r.thumbnail || r.image)}`,
          source: host,
        };
      });

    const payload = { provider: "web", photos };
    cache.set(q, { data: payload, expires: Date.now() + TTL });
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur réseau : ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
