import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Vérifie x-webhook-secret ou ?secret= si WEBHOOK_SECRET est défini. */
function checkSecret(req: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true; // protection optionnelle
  return (
    req.headers.get("x-webhook-secret") === secret ||
    req.nextUrl.searchParams.get("secret") === secret
  );
}

/**
 * Webhook ManyChat / n8n : réception d'une candidature.
 * Body JSON attendu : { prenom, age, instagram, telephone?, email?, manychatId?, evenementId? }
 */
export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Secret invalide" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const prenom = String(body.prenom || "").trim();
  const instagram = String(body.instagram || "").trim();
  const age = parseInt(String(body.age || ""), 10);

  if (!prenom || !instagram || isNaN(age)) {
    return NextResponse.json(
      { error: "Champs requis : prenom, age, instagram" },
      { status: 400 }
    );
  }

  const participant = await prisma.participant.create({
    data: {
      prenom,
      age,
      instagram,
      telephone: body.telephone ? String(body.telephone) : null,
      email: body.email ? String(body.email) : null,
      manychatId: body.manychatId ? String(body.manychatId) : null,
      source: "manychat",
      evenementId: body.evenementId ? String(body.evenementId) : null,
    },
  });

  return NextResponse.json({ ok: true, id: participant.id }, { status: 201 });
}
