import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWebPush, webpush } from "@/lib/push";
import { generateDailyBatch, parisDayKey } from "@/lib/dailyBatch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PARIS_TZ = "Europe/Paris";

function parisHour(): number {
  const fmt = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    hour: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return parseInt(parts.hour, 10);
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
 * Cron quotidien (Vercel).
 * 1. Génère le lot de carrousels du jour — TOUJOURS, même sans abonné push
 *    (idempotent : une seule génération par jour).
 * 2. Pousse une notification aux abonnés « dus » à cette heure (bonus).
 *
 * Auth : header `Authorization: Bearer $CRON_SECRET` ou `?secret=`.
 * `?force=1` régénère le lot et notifie tous les abonnés actifs (test manuel).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const qSecret = req.nextUrl.searchParams.get("secret");
  if (secret && auth !== `Bearer ${secret}` && qSecret !== secret) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  const dayKey = parisDayKey();
  const hour = parisHour();

  // 1. Génération du contenu du jour — découplée du push.
  let generated = 0;
  let todays: Awaited<ReturnType<typeof generateDailyBatch>>["items"] = [];
  try {
    const batch = await generateDailyBatch(3, { force });
    generated = batch.generated;
    todays = batch.items;
  } catch (e) {
    console.error("[cron] génération du lot impossible :", e);
  }

  // 2. Notification aux abonnés dus (best-effort, optionnel).
  const enabled = await prisma.pushSubscription.findMany({ where: { enabled: true } });
  const subs = force
    ? enabled
    : enabled.filter((s) => s.hour <= hour && !sentToday(s.lastSentAt, dayKey));

  let pushed = 0;
  if (subs.length > 0 && ensureWebPush()) {
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
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json({ ok: true, generated, total: todays.length, pushed, subscribers: subs.length });
}
