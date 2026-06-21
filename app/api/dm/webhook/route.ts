import { NextRequest, NextResponse } from "next/server";
import { ingestInboundMessage, type InboundMessage } from "@/lib/dmInbox";
import type { Channel } from "@/lib/instagram";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // l'agent IA peut prendre quelques secondes

/**
 * Webhook DM entrant, agnostique du canal.
 *
 * GET  : vérification façon Meta (hub.challenge) — utile si tu branches l'API
 *        Meta native plus tard. Renvoie le challenge si IG_VERIFY_TOKEN matche.
 *
 * POST : réception d'un message. Deux formats acceptés :
 *   • ManyChat (External Request, format qu'on définit dans le flow) :
 *       { "subscriber_id": "...", "username": "...", "name": "...", "text": "..." }
 *   • Meta Instagram Messaging (webhook natif) :
 *       { "object":"instagram", "entry":[{ "messaging":[{ "sender":{"id":...},
 *         "message":{"text":...} }] }] }
 */

function checkSecret(req: NextRequest): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true; // protection optionnelle
  return (
    req.headers.get("x-webhook-secret") === secret ||
    req.nextUrl.searchParams.get("secret") === secret
  );
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const verifyToken = process.env.IG_VERIFY_TOKEN;

  if (mode === "subscribe" && verifyToken && token === verifyToken) {
    return new NextResponse(challenge || "", { status: 200 });
  }
  return NextResponse.json({ error: "Verification échouée" }, { status: 403 });
}

/** Extrait 0..n messages entrants normalisés depuis n'importe quel format. */
function parseInbound(body: any): InboundMessage[] {
  const out: InboundMessage[] = [];

  // Format Meta Instagram Messaging
  if (body?.object && Array.isArray(body?.entry)) {
    for (const entry of body.entry) {
      const events = entry.messaging || entry.changes || [];
      for (const ev of events) {
        const text: string | undefined = ev?.message?.text || ev?.value?.message?.text;
        const senderId: string | undefined = ev?.sender?.id || ev?.value?.sender?.id;
        // on ignore les échos de nos propres messages
        if (ev?.message?.is_echo) continue;
        if (text && senderId) {
          out.push({ channel: "meta", externalId: String(senderId), text: String(text) });
        }
      }
    }
    return out;
  }

  // Format ManyChat / générique (un seul message par requête)
  const externalId = body?.subscriber_id || body?.externalId || body?.psid || body?.id;
  const text = body?.text || body?.message || body?.last_input_text;
  if (externalId && text) {
    const channel = (body?.channel as Channel) || "manychat";
    out.push({
      channel,
      externalId: String(externalId),
      username: body?.username ? String(body.username) : undefined,
      name: body?.name || body?.first_name
        ? String(body.name || body.first_name)
        : undefined,
      text: String(text),
    });
  }
  return out;
}

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

  const inbound = parseInbound(body);
  if (inbound.length === 0) {
    // Toujours répondre 200 aux webhooks (Meta désabonne sinon), même si rien à traiter.
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const results = [];
  for (const msg of inbound) {
    try {
      results.push(await ingestInboundMessage(msg));
    } catch (e) {
      results.push({
        conversationId: "",
        replied: false,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Si ManyChat attend une réponse synchrone à renvoyer dans le DM, on la fournit
  // aussi dans le corps (champ `reply`) : ManyChat peut l'utiliser directement.
  const first = results[0];
  return NextResponse.json({
    ok: true,
    processed: results.length,
    replied: first?.replied || false,
    results,
  });
}
