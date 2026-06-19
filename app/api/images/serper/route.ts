import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: unknown; expires: number }>();
const TTL = 6 * 60 * 60 * 1000; // 6h — contenu social change plus souvent

type PhotoResult = {
  id: string;
  src: string;
  thumb: string;
  source: string;
  pageUrl?: string;
  isUGC?: boolean; // photo de réseau social (Instagram, TikTok, Google Maps)
  width?: number;
  height?: number;
  hd?: boolean;    // résolution suffisante pour un export net 1080x1920
};

const UGC_DOMAINS = ["instagram.com", "cdninstagram.com", "tiktok.com", "maps.google", "goo.gl", "tripadvisor"];

// Seuils qualité — on ne veut QUE de la vraie haute définition.
const HD_SHORT_SIDE = 1080;   // côté court mini (taille native Instagram) → net en 9:16
const SOFT_SHORT_SIDE = 800;  // repli si trop peu de résultats HD
const MAX_ASPECT = 2.6;       // rejette bannières/logos très allongés

function isUGC(link?: string, source?: string): boolean {
  const str = `${link || ""} ${source || ""}`.toLowerCase();
  return UGC_DOMAINS.some((d) => str.includes(d));
}

type SerperImage = {
  imageUrl: string;
  thumbnailUrl?: string;
  source?: string;
  link?: string;
  imageWidth?: number;
  imageHeight?: number;
};

/** Vraie haute définition + ratio photo (pas un logo/bannière). */
function isHD(img: SerperImage): boolean {
  const w = img.imageWidth || 0;
  const h = img.imageHeight || 0;
  if (!w || !h) return false; // dimensions inconnues → on écarte (trop risqué)
  if (Math.min(w, h) < HD_SHORT_SIDE) return false;
  if (Math.max(w, h) / Math.min(w, h) > MAX_ASPECT) return false;
  return true;
}

/** Repli plus souple : correct mais pas forcément full HD. */
function isAcceptable(img: SerperImage): boolean {
  const w = img.imageWidth || 0;
  const h = img.imageHeight || 0;
  if (!w || !h) return false;
  if (Math.min(w, h) < SOFT_SHORT_SIDE) return false;
  if (Math.max(w, h) / Math.min(w, h) > MAX_ASPECT) return false;
  return true;
}

async function searchSerper(key: string, q: string, num: number): Promise<SerperImage[]> {
  const res = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: { "X-API-KEY": key, "Content-Type": "application/json" },
    body: JSON.stringify({ q, gl: "fr", hl: "fr", num }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  // On ne filtre PAS ici : on garde tout et on trie/filtre en aval. Beaucoup
  // d'images Instagram (1080px natif) ne déclarent pas leurs dimensions ;
  // les écarter au ras de la source vide les résultats des petits restos.
  return data.images || [];
}

/**
 * Recherche photos via Google Images (Serper.dev).
 * Lance 2 requêtes en parallèle :
 *   1. Requête standard → photos press/web
 *   2. Requête sociale → photos UGC Instagram/TikTok de vrais visiteurs
 * Les photos UGC remontent en premier (authentiques, non recyclées, certifiées du lieu).
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Paramètre q requis" }, { status: 400 });

  const key = process.env.SERPER_API_KEY;
  if (!key) {
    return NextResponse.json({
      provider: "serper",
      photos: [],
      noProvider: true,
      detail: "SERPER_API_KEY absente — ajoute-la dans Vercel puis redéploie",
    });
  }

  const cached = cache.get(q);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    // 3 requêtes en parallèle, SANS opérateur site: (qui vide les résultats
    // Google Images). Mots-clés « instagram » / « restaurant » suffisent à
    // remonter les photos UGC hébergées sur ces réseaux et indexées par Google.
    //   1. Nom exact du restaurant
    //   2. Variante sociale (vraies photos de visiteurs)
    //   3. Variante plats/intérieur (cadrage cohérent pour un carrousel)
    const [exactMatch, instaPhotos, dishPhotos] = await Promise.all([
      searchSerper(key, `"${q}" restaurant paris`, 40),
      searchSerper(key, `${q} restaurant instagram`, 40),
      searchSerper(key, `${q} restaurant plat intérieur`, 40),
    ]);

    // Déduplique par imageUrl : social d'abord (authentique), puis recherche exacte
    const seen = new Set<string>();
    const allImages: SerperImage[] = [];
    for (const img of [...instaPhotos, ...exactMatch, ...dishPhotos]) {
      if (img.imageUrl && !seen.has(img.imageUrl)) {
        seen.add(img.imageUrl);
        allImages.push(img);
      }
    }

    const pixels = (img: SerperImage) => (img.imageWidth || 0) * (img.imageHeight || 0);

    // Authentiques (Instagram/Maps/TripAdvisor = vraies photos du lieu) d'abord,
    // puis à résolution décroissante.
    const byAuthThenRes = (a: SerperImage, b: SerperImage) => {
      const ua = isUGC(a.link, a.source) ? 2 : 0; // poids fort sur l'authentique
      const ub = isUGC(b.link, b.source) ? 2 : 0;
      if (ua !== ub) return ub - ua;
      return pixels(b) - pixels(a); // sinon, la plus haute résolution d'abord
    };

    // Tiers de qualité : HD d'abord, puis correct, puis le reste. On affiche
    // toujours quelque chose (jamais zéro), mais le HD remonte systématiquement
    // en tête et porte le badge HD côté UI.
    const hd = allImages.filter(isHD).sort(byAuthThenRes);
    const soft = allImages
      .filter((img) => !hd.includes(img) && isAcceptable(img))
      .sort(byAuthThenRes);
    const rest = allImages
      .filter((img) => !hd.includes(img) && !soft.includes(img))
      .sort(byAuthThenRes);

    // Mode qualité : si on a déjà assez de HD, on ne dilue pas avec le reste.
    const pool = hd.length >= 8 ? hd : [...hd, ...soft, ...rest];

    const photos: PhotoResult[] = pool.slice(0, 40).map((img, i) => {
      const short = Math.min(img.imageWidth || 0, img.imageHeight || 0);
      return {
        id: `serper-${i}`,
        src: `/api/images/proxy?url=${encodeURIComponent(img.imageUrl)}`,
        thumb: img.thumbnailUrl || `/api/images/proxy?url=${encodeURIComponent(img.imageUrl)}`,
        source: img.source || "Google Images",
        pageUrl: img.link,
        isUGC: isUGC(img.link, img.source),
        width: img.imageWidth,
        height: img.imageHeight,
        hd: short >= HD_SHORT_SIDE,
      };
    });

    const payload = { provider: "serper", photos };
    cache.set(q, { data: payload, expires: Date.now() + TTL });
    return NextResponse.json(payload);
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur réseau : ${e instanceof Error ? e.message : String(e)}`, photos: [] },
      { status: 500 }
    );
  }
}
