import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { generateDailyBatch, todaysAutoBatch } from "@/lib/dailyBatch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Lot du jour déjà en base (lecture rapide pour l'affichage). */
export async function GET() {
  try {
    await requireAuth();
    const items = await todaysAutoBatch();
    return NextResponse.json({ ok: true, count: items.length });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

/** Génère (ou régénère avec ?force=1) le contenu du jour à la demande. */
export async function POST(req: Request) {
  try {
    await requireAuth();
    const force = new URL(req.url).searchParams.get("force") === "1";
    const { generated, items } = await generateDailyBatch(3, { force });
    revalidatePath("/contenu");
    return NextResponse.json({ ok: true, generated, count: items.length });
  } catch (e) {
    console.error("[POST /api/contenu/daily] génération impossible :", e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
