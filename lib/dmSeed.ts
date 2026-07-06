import { prisma } from "./prisma";

/**
 * FAQ de départ construite à partir des VRAIES conversations Instagram du
 * compte (questions récurrentes des filles + réponses réellement envoyées).
 * Insérée une seule fois, uniquement si la base FAQ est vide — tout reste
 * éditable ensuite dans l'interface.
 */
export const DEFAULT_FAQ: { question: string; answer: string }[] = [
  {
    question: "C'est quoi le concept ? / Comment ça marche ?",
    answer:
      "Je collabore avec plusieurs restaurants festifs et clubs parisiens. Le principe : tu es invitée avec une copine à un dîner offert au restaurant, puis on enchaîne sur la soirée au club à notre table VIP (entrée et champagne offerts). Le rendez-vous au restaurant est à 21h précises.",
  },
  {
    question: "C'est vraiment gratuit ? Il y a un piège ?",
    answer:
      "Oui, c'est offert : le dîner et la table VIP font partie de ma collaboration avec les lieux, en échange de ta participation à la soirée. Le restaurant demande parfois juste un avis Google et une story Insta. Au resto comme au club, vous êtes placées à des tables VIP réservées aux filles — on ne te demandera jamais d'interagir avec qui que ce soit.",
  },
  {
    question: "À quelle heure ? / What time?",
    answer:
      "Le rendez-vous au restaurant est à 21h précises (dîner vers 22h), puis départ au club vers minuit.",
  },
  {
    question: "C'est quoi le dress code ?",
    answer: "Dress code élégant obligatoire : tenue de soirée et talons.",
  },
  {
    question: "Je peux venir avec une copine ?",
    answer:
      "Oui bien sûr ! Envoie-moi simplement l'Instagram de ta copine pour que je la valide sur la guestlist.",
  },
  {
    question: "Je peux venir avec mon copain / un ami ?",
    answer:
      "La soirée est réservée aux filles — les tables au resto et au club sont 100% filles. Tu peux venir avec une copine : envoie-moi son Instagram.",
  },
  {
    question: "C'est où ? / Quelle adresse ?",
    answer:
      "Je t'envoie le restaurant exact et l'adresse en DM une fois ta place confirmée (ton Insta + celui de ta copine).",
  },
  {
    question: "Tu es qui ? C'est quoi ton rôle ?",
    answer:
      "Je m'occupe des guestlists de plusieurs restaurants festifs et clubs à Paris. C'est moi qui t'invite et qui gère ta place sur la liste.",
  },
];

/** Contexte de départ de l'agent, calqué sur le vrai ton du compte. */
export const DEFAULT_CONTEXTE =
  "Compte de promotion « dîner + soirée offerts » pour filles à Paris. Je collabore avec des restaurants festifs et des clubs parisiens : j'invite les filles (avec une copine) à un dîner offert puis à la soirée au club sur notre table VIP. Ton posé, chaleureux et rassurant, tutoiement élégant, réponds dans la langue du message (français ou anglais). Ne promets jamais une place sans confirmation, ne donne pas l'adresse exacte avant confirmation, ne parle jamais d'argent ni de rémunération.";

/**
 * Pré-remplit la FAQ et le contexte si (et seulement si) ils sont vides,
 * pour que l'agent soit calibré dès la première ouverture. Best-effort :
 * ne casse jamais le rendu.
 */
export async function ensureDmDefaults(): Promise<void> {
  try {
    const count = await prisma.faqEntry.count();
    if (count === 0) {
      await prisma.faqEntry.createMany({
        data: DEFAULT_FAQ.map((f, i) => ({ ...f, ordre: i })),
      });
    }
  } catch (e) {
    console.error("[dmSeed] seed FAQ impossible :", e);
  }
  try {
    const cfg = await prisma.agentConfig.findUnique({ where: { agentId: "dm-agent" } });
    if (!cfg) {
      await prisma.agentConfig.create({
        data: {
          agentId: "dm-agent",
          active: false,
          values: JSON.stringify({ contexte: DEFAULT_CONTEXTE }),
        },
      });
    }
  } catch (e) {
    console.error("[dmSeed] seed contexte impossible :", e);
  }
}
