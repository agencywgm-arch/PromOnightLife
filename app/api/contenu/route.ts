import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sauvegarde d'un carrousel.
 *
 * On passe par une VRAIE route API (et non un Server Action) volontairement :
 * les Server Actions reposent sur un identifiant haché qui doit correspondre
 * entre le bundle client et le serveur ; un cache de build Vercel périmé peut
 * désynchroniser les deux, et l'appel renvoie alors `undefined` au client
 * (d'où l'ancien crash « Cannot read properties of undefined (reading 'ok') »).
 * Une route API/fetch classique est immunisée contre ce décalage.
 */
export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const get = (k: string) => String(fd.get(k) || "").trim();

    await prisma.contenu.create({
      data: {
        restaurant: get("restaurant"),
        adresse: get("adresse") || null,
        arrondissement: get("arrondissement") || null,
        horaires: get("horaires") || null,
        prix: get("prix") || null,
        cuisine: get("cuisine") || null,
        scoreGlobal: parseInt(get("scoreGlobal") || "0", 10),
        scoreViral: parseInt(get("scoreViral") || "0", 10),
        scoreLuxe: parseInt(get("scoreLuxe") || "0", 10),
        slides: String(fd.get("slides") || "[]"),
        caption: get("caption") || null,
        hashtags: get("hashtags") || null,
        platform: get("platform") || "TIKTOK",
      },
    });

    revalidatePath("/contenu");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/contenu] écriture impossible :", e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
