import { prisma } from "./prisma";
import { generateRestaurants } from "./restaurantAgent";
import { searchRestaurantImages } from "./serverImages";

const PARIS_TZ = "Europe/Paris";

/** Clé jour (YYYY-MM-DD) à l'heure de Paris. */
export function parisDayKey(d: Date = new Date()): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: PARIS_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(d)
      .filter((x) => x.type !== "literal")
      .map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day}`;
}

/** Carrousels auto déjà générés aujourd'hui (Paris). */
export async function todaysAutoBatch() {
  const startOfDay = new Date(`${parisDayKey()}T00:00:00`);
  return prisma.contenu.findMany({
    where: { auto: true, createdAt: { gte: startOfDay } },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Génère le lot de carrousels du jour : `count` restaurants parisiens (texte IA)
 * avec leurs photos HD déjà rattachées, enregistrés en base avec `auto: true`.
 *
 * Idempotent par jour : si un lot existe déjà aujourd'hui, on le renvoie sans
 * régénérer (sauf `force`). Découplé du push : le contenu se crée même sans
 * abonné aux notifications.
 */
export async function generateDailyBatch(
  count = 3,
  opts: { force?: boolean } = {}
): Promise<{ generated: number; items: Awaited<ReturnType<typeof todaysAutoBatch>> }> {
  const existing = await todaysAutoBatch();
  if (existing.length > 0 && !opts.force) {
    return { generated: 0, items: existing };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY absente");

  // Historique : ne pas reproposer un restaurant déjà traité.
  const rows = await prisma.contenu.findMany({
    select: { restaurant: true },
    distinct: ["restaurant"],
  });
  const historique = rows.map((r) => r.restaurant);

  const restaurants = await generateRestaurants(apiKey, count, historique);

  let generated = 0;
  for (const r of restaurants) {
    // Photos HD réparties sur les slides (la dernière reste souvent un CTA).
    let photos: Awaited<ReturnType<typeof searchRestaurantImages>> = [];
    try {
      photos = await searchRestaurantImages(r.nom);
    } catch {
      photos = [];
    }
    const slides = r.slides.map((s, i) => {
      const photo = photos[i];
      return {
        titre: s.titre,
        sousTitre: s.sousTitre,
        searchQuery: s.searchQuery,
        imageUrl: photo?.imageUrl,
        imageThumb: photo?.thumb,
        imageSrc: photo ? "Google Images" : undefined,
      };
    });

    await prisma.contenu.create({
      data: {
        restaurant: r.nom,
        adresse: r.adresse || null,
        arrondissement: r.arrondissement || null,
        horaires: r.horaires || null,
        prix: r.prix || null,
        cuisine: r.cuisine || null,
        slides: JSON.stringify(slides),
        caption: r.caption || null,
        hashtags: r.hashtags || null,
        platform: "TIKTOK",
        statut: "EN_ATTENTE",
        auto: true,
      },
    });
    generated++;
  }

  const items = await todaysAutoBatch();
  return { generated, items };
}
