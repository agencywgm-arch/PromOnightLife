import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Enregistre (ou met à jour) un abonnement push pour ce navigateur/téléphone.
 * Appelé après que l'utilisateur a accordé la permission de notifications.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sub = body.subscription;
    const hour = typeof body.hour === "number" ? Math.max(0, Math.min(23, body.hour)) : 9;

    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ error: "Abonnement invalide" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: {
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        hour,
        enabled: true,
        userAgent: req.headers.get("user-agent") || null,
      },
      update: {
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        hour,
        enabled: true,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

/** Désinscription (l'utilisateur coupe les notifications). */
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
