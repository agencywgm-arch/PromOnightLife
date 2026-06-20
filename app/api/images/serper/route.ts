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
    const collect = (imgs: SerperImage[]) => {
      for (const img of imgs) {
        if (img.imageUrl && !seen.has(img.imageUrl)) {
          seen.add(img.imageUrl);
          allImages.push(img);
        }
      }
    };
    collect([...instaPhotos, ...exactMatch, ...dishPhotos]);

    // Filet de sécurité : si le nom exact ne donne rien (resto peu connu, nom
    // mal orthographié…), on relâche progressivement la recherche pour ne
    // JAMAIS renvoyer zéro photo tant que Google a quelque chose.
    if (allImages.length === 0) {
      const [loose1, loose2, loose3] = await Promise.all([
        searchSerper(key, `${q} restaurant paris`, 40),
        searchSerper(key, `${q} paris`, 40),
        searchSerper(key, q, 40),
      ]);
      collect([...loose1, ...loose2, ...loose3]);
    }

    const pixels = (img: SerperImage) => (img.imageWidth || 0) * (img.imageHeight || 0);

    // Tri QUALITÉ D'ABORD : on veut les photos les plus nettes en tête.
    // Résolution décroissante, puis authenticité (UGC) comme départage.
    const byResThenAuth = (a: SerperImage, b: SerperImage) => {
      const pa = pixels(a);
      const pb = pixels(b);
      if (pb !== pa) return pb - pa; // la plus haute résolution d'abord
      const ua = isUGC(a.link, a.source) ? 1 : 0;
      const ub = isUGC(b.link, b.source) ? 1 : 0;
      return ub - ua;
    };

    // TRI ANTI-MOCHE : on ne garde QUE la vraie HD (≥1080px côté court).
    // Les images sans dimensions connues ou en deçà sont écartées (les
    // « conneries 480p »). On ne descend en « correct » (≥800) QUE s'il n'y a
    // pas assez de HD, pour ne jamais renvoyer zéro — et jamais en dessous.
    const hd = allImages.filter(isHD).sort(byResThenAuth);
    let pool = hd;
    if (hd.length < 4) {
      const soft = allImages
        .filter((img) => !hd.includes(img) && isAcceptable(img))
        .sort(byResThenAuth);
      pool = [...hd, ...soft];
    }

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
