import Anthropic from "@anthropic-ai/sdk";

/**
 * Agent de sélection de restaurants parisiens haut de gamme.
 * Logique partagée entre la route /api/agent/suggest (interactive) et
 * le cron quotidien (notifications). Critères du projet centralisés ici.
 */

export const AGENT_SYSTEM = `Tu es un agent de création de contenu TikTok spécialisé dans les restaurants parisiens haut de gamme.

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

export const agentUserPrompt = (date: string, historique: string[], count: number) => `Date du jour : ${date}

${historique.length > 0 ? `Restaurants déjà proposés (à ne pas reprendre) :\n${historique.join(", ")}\n` : ""}

Propose ${count} restaurants parisiens différents. Pour chaque restaurant, fournis ce JSON exact :

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
          "searchQuery": "requête image pour la meilleure photo (en anglais)"
        },
        {
          "titre": "Nom du restaurant",
          "sousTitre": "📍 Adresse courte · Arrondissement",
          "searchQuery": "requête image pour l'ambiance/façade (en anglais)"
        },
        {
          "titre": "🕐 Horaires  💶 Prix",
          "sousTitre": "🍽️ Type de cuisine · Réservation conseillée",
          "searchQuery": "requête image pour un plat signature (en anglais)"
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

export type AgentSlide = {
  titre: string;
  sousTitre: string;
  searchQuery: string;
};

export type AgentRestaurant = {
  nom: string;
  adresse: string;
  arrondissement: string;
  horaires: string;
  prix: string;
  cuisine: string;
  verification?: string;
  slides: AgentSlide[];
  caption: string;
  hashtags: string;
};

export function frenchDate(): string {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Appelle Claude et renvoie les restaurants parsés. Lève en cas d'échec. */
export async function generateRestaurants(
  apiKey: string,
  count: number,
  historique: string[]
): Promise<AgentRestaurant[]> {
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: AGENT_SYSTEM,
    messages: [{ role: "user", content: agentUserPrompt(frenchDate(), historique, count) }],
  });

  const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  let data: { restaurants: AgentRestaurant[] };
  try {
    data = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Réponse invalide de l'agent");
    data = JSON.parse(match[0]);
  }
  return data.restaurants || [];
}
