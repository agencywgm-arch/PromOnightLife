import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { decideDmReply, type DmHistoryItem } from "@/lib/dmAgent";
import { loadFaq, agentConfig } from "@/lib/dmInbox";
import { loadPlanning, planningToText } from "@/lib/planning";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Bac à sable de calibration : le promoteur écrit comme le ferait une abonnée,
 * et voit exactement comment l'agent réagirait (répondre / laisser en humain),
 * avec la FAQ + le contexte actuels. Aucune conversation réelle n'est touchée.
 */
export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json().catch(() => ({}));
    const message = String(body?.message || "").trim();
    if (!message) {
      return NextResponse.json({ ok: false, message: "Message vide" }, { status: 400 });
    }

    const rawHistory = Array.isArray(body?.history) ? body.history : [];
    const history: DmHistoryItem[] = rawHistory
      .filter((h: unknown): h is DmHistoryItem => {
        const item = h as DmHistoryItem;
        return item && (item.direction === "IN" || item.direction === "OUT") && typeof item.text === "string";
      })
      .slice(-12)
      .map((h: DmHistoryItem) => ({ direction: h.direction, text: h.text }));

    // On ajoute le message courant comme dernière entrée « ELLE ».
    history.push({ direction: "IN", text: message });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, message: "ANTHROPIC_API_KEY absente — l'agent ne peut pas répondre." },
        { status: 503 }
      );
    }

    const [faq, cfg, planningDays] = await Promise.all([loadFaq(), agentConfig(), loadPlanning()]);
    const decision = await decideDmReply(apiKey, faq, history, cfg.contexte, planningToText(planningDays));

    return NextResponse.json({
      ok: true,
      decision,
      meta: { faqCount: faq.length, active: cfg.active, hasContexte: !!cfg.contexte },
    });
  } catch (e) {
    console.error("[POST /api/dm/test] échec :", e);
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
