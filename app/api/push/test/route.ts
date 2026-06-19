import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureWebPush, webpush } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Envoie une notification de test à un abonnement précis (le téléphone de
 * l'utilisateur qui vient d'activer). Sert à valider que tout fonctionne.
 */
export async function POST(req: NextRequest) {
  if (!ensureWebPush()) {
    return NextResponse.json(
      { error: "VAPID_PRIVATE_KEY absente — ajoute les clés VAPID dans Vercel" },
      { status: 503 }
    );
  }

  try {
    const { endpoint } = await req.json();
    const sub = await prisma.pushSubscription.findUnique({ where: { endpoint } });
    if (!sub) return NextResponse.json({ error: "Abonnement introuvable" }, { status: 404 });

    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify({
        title: "🗼 NIGHTLIFE PARIS",
        body: "Parfait ! Tu recevras chaque jour 3 carrousels prêts à publier.",
        url: "/contenu",
        tag: "test",
      })
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
