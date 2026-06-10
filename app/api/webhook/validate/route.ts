import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STATUTS = ["EN_ATTENTE", "ACCEPTEE", "REFUSEE", "INVITEE", "PRESENTE"];

function checkSecret(req: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true;
  return (
    req.headers.get("x-webhook-secret") === secret ||
    req.nextUrl.searchParams.get("secret") === secret
  );
}

/**
 * Webhook n8n : validation automatique d'une participante.
 * Body JSON : { id? , manychatId?, statut } — l'un des deux identifiants requis.
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

  const statut = String(body.statut || "").toUpperCase();
  if (!STATUTS.includes(statut)) {
    return NextResponse.json(
      { error: `Statut invalide. Valeurs : ${STATUTS.join(", ")}` },
      { status: 400 }
    );
  }

  let participant = null;
  if (body.id) {
    participant = await prisma.participant.findUnique({ where: { id: String(body.id) } });
  } else if (body.manychatId) {
    participant = await prisma.participant.findFirst({
      where: { manychatId: String(body.manychatId) },
    });
  }

  if (!participant) {
    return NextResponse.json({ error: "Participante introuvable" }, { status: 404 });
  }

  await prisma.participant.update({
    where: { id: participant.id },
    data: { statut },
  });

  return NextResponse.json({ ok: true, id: participant.id, statut });
}
