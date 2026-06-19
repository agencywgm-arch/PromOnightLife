import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRestaurants } from "@/lib/restaurantAgent";
import { searchRestaurantImages } from "@/lib/serverImages";
import { ensureWebPush, webpush } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PARIS_TZ = "Europe/Paris";

function parisNow() {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    hour: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    hour: parseInt(parts.hour, 10),
    dayKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

/** A déjà reçu une notif aujourd'hui (Paris) ? */
function sentToday(lastSentAt: Date | null, dayKey: string): boolean {
  if (!lastSentAt) return false;
  const k = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(lastSentAt)
    .reduce((acc, p) => (p.type !== "literal" ? { ...acc, [p.type]: p.value } : acc), {} as Record<string, string>);
  return `${k.year}-${k.month}-${k.day}` === dayKey;
}

/**
 * Cron quotidien (déclenché chaque heure par Vercel).
 * 1. Détermine les abonnés « dus » à cette heure (selon leur heure choisie).
 * 2. Si des abonnés sont dus et que le lot du jour n'existe pas encore,
 *    génère 3 carrousels (texte IA + photos HD préchargées) et les enregistre.
 * 3. Pousse une notification aux abonnés dus.
 *
 * Auth : header `Authorization: Bearer $CRON_SECRET` (Vercel Cron) ou `?secret=`.
 * `?force=1` ignore l'heure et notifie tous les abonnés actifs (test manuel).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const qSecret = req.nextUrl.searchParams.get("secret");
  if (secret && auth !== `Bearer ${secret}` && qSecret !== secret) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  const { hour, dayKey } = parisNow();

  // Abonnés « dus » : actifs, pas encore notifiés aujourd'hui, et dont l'heure
  // choisie est déjà passée. Cette logique garantit UNE notif/jour, que le cron
  // tourne toutes les heures (Pro) ou une seule fois par jour (Hobby).
  const enabled = await prisma.pushSubscription.findMany({ where: { enabled: true } });
  const subs = force
    ? enabled
    : enabled.filter((s) => s.hour <= hour && !sentToday(s.lastSentAt, dayKey));

  // Pas d'abonnés dus → rien à faire (on évite de générer pour rien).
  if (subs.length === 0) {
    return NextResponse.json({ ok: true, generated: 0, pushed: 0, reason: "no due subscribers" });
  }

  // Lot du jour déjà créé ? (carrousels auto créés depuis minuit Paris)
  const startOfDay = new Date(`${dayKey}T00:00:00`);
  let todays = await prisma.contenu.findMany({
    where: { auto: true, createdAt: { gte: startOfDay } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  let generated = 0;
  if (todays.length === 0) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY absente" }, { status: 503 });
    }

    const rows = await prisma.contenu.findMany({
      select: { restaurant: true },
      distinct: ["restaurant"],
    });
    const historique = rows.map((r) => r.restaurant);

    const restaurants = await generateRestaurants(apiKey, 3, historique);

    for (const r of restaurants) {
      // Photos HD du restaurant, distribuées sur les slides (sauf la dernière = CTA).
      const photos = await searchRestaurantImages(r.nom);
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

    todays = await prisma.contenu.findMany({
      where: { auto: true, createdAt: { gte: startOfDay } },
      orderBy: { createdAt: "desc" },
      take: 3,
    });
  }

  // Notification.
  let pushed = 0;
  if (ensureWebPush()) {
    const names = todays.map((c) => c.restaurant).slice(0, 3).join(" · ");
    const payload = JSON.stringify({
      title: "🗼 3 carrousels prêts pour aujourd'hui",
      body: names || "Tes carrousels du jour t'attendent dans la bibliothèque.",
      url: "/contenu",
      tag: "daily",
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastSentAt: new Date() },
        });
        pushed++;
      } catch (e: unknown) {
        // 404/410 = abonnement expiré → on le supprime.
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json({ ok: true, generated, pushed, subscribers: subs.length });
}
