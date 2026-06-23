import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SYSTEM = `Tu es un expert en création de contenu TikTok viral pour restaurants et lieux gastronomiques.
Tu génères des titres et sous-titres percutants pour des carrousels 9:16, style FANOPA / guest_for_dinner.
Réponds UNIQUEMENT en JSON valide, sans texte avant ou après.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY non configurée" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const { query, nbSlides = 4 } = body as { query: string; nbSlides: number };

  if (!query?.trim()) {
    return NextResponse.json({ error: "Paramètre query requis" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const prompt = `Sujet du carrousel TikTok : "${query}"
Nombre de slides : ${nbSlides}

Génère des titres et sous-titres ultra-optimisés pour chaque slide.

Structure du carrousel :
- Slide 1 : Hook accrocheur (phrase qui arrête le scroll)
- Slide 2 à ${nbSlides - 1} : Contenu premium (ambiance, détails, infos clés)
- Slide ${nbSlides} : Call-to-action (incite à sauvegarder, partager, commenter)

Réponds avec ce JSON exact :
{
  "slides": [
    { "titre": "...", "sousTitre": "..." }
  ],
  "caption": "Légende TikTok complète avec émojis (2-3 phrases)",
  "hashtags": "#paris #food #restaurant #gastronomie #tiktokfood"
}

Règles :
- Titres : max 8 mots, percutants, avec émojis si pertinent
- Sous-titres : max 12 mots, précis et informatifs
- Style : luxe accessible, aspirationnel, jeune adulte parisien
- Langue : français exclusivement`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    let data: { slides: { titre: string; sousTitre: string }[]; caption: string; hashtags: string };
    try {
      data = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return NextResponse.json({ error: "Réponse invalide de l'agent" }, { status: 500 });
      data = JSON.parse(match[0]);
    }

    // Assure qu'on a exactement le bon nombre de slides
    while (data.slides.length < nbSlides) {
      data.slides.push({ titre: "", sousTitre: "" });
    }
    data.slides = data.slides.slice(0, nbSlides);

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: `Erreur IA : ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }
}
