import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRestaurants } from "@/lib/restaurantAgent";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY non configurée" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));

  // Historique persistant : restaurants déjà en bibliothèque + ceux de la session
  let enBase: string[] = [];
  try {
    const rows = await prisma.contenu.findMany({
      select: { restaurant: true },
      distinct: ["restaurant"],
    });
    enBase = rows.map((r) => r.restaurant);
  } catch (e) {
    console.error("[agent] lecture historique impossible :", e);
  }
  const session: string[] = body.historique || [];
  const historique = Array.from(new Set([...enBase, ...session]));

  try {
    const restaurants = await generateRestaurants(apiKey, 3, historique);
    return NextResponse.json({ restaurants });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Erreur agent : ${message}` }, { status: 500 });
  }
}
