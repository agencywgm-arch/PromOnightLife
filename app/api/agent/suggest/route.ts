import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM = `Tu es un agent de création de contenu TikTok spécialisé dans les restaurants parisiens haut de gamme.

Tu sélectionnes uniquement des restaurants :
- Milieu/haut de gamme (jamais de fast-food ni de chaîne)
- Très instagrammables / photogéniques (décor fort, terrasse, rooftop, vue)
- Tendance et adaptés à une sortie chic parisienne

Pour chaque restaurant tu génères un carrousel TikTok 4 slides (format 9:16) :
- Slide 1 : Accroche (hook accrocheur)
- Slide 2 : Identité du lieu (nom, adresse, ambiance)
- Slide 3 : Infos pratiques (horaires, prix, cuisine)
- Slide 4 : Call-to-action vers @guest_for_dinner et @the_gentlemen_paris

Réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après.`;

const USER_PROMPT = (date: string, historique: string[]) => `Date du jour : ${date}

${historique.length > 0 ? `Restaurants déjà proposés (à ne pas reprendre) :\n${historique.join(", ")}\n` : ""}

Propose 3 restaurants parisiens différents. Pour chaque restaurant, fournis ce JSON exact :

{
  "restaurants": [
    {
      "nom": "Nom du restaurant",
      "adresse": "Adresse complète avec code postal",
      "arrondissement": "Xème arrondissement",
      "horaires": "Ex: Lun-Sam 19h-23h, fermé dimanche",
      "prix": "Ex: ~120€ et + par personne",
      "cuisine": "Type de cuisine",
      "verification": "Sources consultées et date",
      "slides": [
        {
          "titre": "Texte accrocheur slide 1 (hook)",
          "sousTitre": "",
          "searchQuery": "requête Pexels pour trouver la meilleure photo (en anglais)"
        },
        {
          "titre": "Nom du restaurant",
          "sousTitre": "📍 Adresse courte · Arrondissement",
          "searchQuery": "requête Pexels pour l'ambiance/façade (en anglais)"
        },
        {
          "titre": "🕐 Horaires  💶 Prix",
          "sousTitre": "🍽️ Type de cuisine · Réservation conseillée",
          "searchQuery": "requête Pexels pour un plat signature (en anglais)"
        },
        {
          "titre": "Dîner offert avec nos partenaires 🥂",
          "sousTitre": "Contacte-nous en DM 🌙 @guest_for_dinner & @the_gentlemen_paris",
          "searchQuery": "paris night luxury dinner table candlelight"
        }
      ],
      "caption": "Légende TikTok complète avec émojis (2-3 phrases)",
      "hashtags": "#paris #restaurant #gastronomie #sortieparis #parisrestaurant"
    }
  ]
}`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY non configurée" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));

  // Historique persistant : tous les restaurants déjà en bibliothèque (base)
  // + ceux proposés dans la session en cours (pas encore composés/sauvegardés)
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
  const date = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const client = new Anthropic({ apiKey });

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: "user", content: USER_PROMPT(date, historique) }],
    });

    const text = msg.content[0].type === "text" ? msg.content[0].text : "";

    let data: { restaurants: unknown[] };
    try {
      data = JSON.parse(text);
    } catch {
      // Extract JSON if surrounded by markdown
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json({ error: "Réponse invalide de l'agent" }, { status: 500 });
      }
      data = JSON.parse(match[0]);
    }

    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Erreur agent : ${message}` }, { status: 500 });
  }
}
