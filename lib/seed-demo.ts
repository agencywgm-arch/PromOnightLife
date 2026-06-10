import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

/**
 * Seed conditionnel : appelé par instrumentation.ts au démarrage.
 * Ne fait rien si la base contient déjà des événements.
 */
export async function seedDemoIfEmpty() {
  const count = await prisma.evenement.count();
  if (count > 0) return;

  console.log("[seed] Base vide — insertion des données de démo…");

  await prisma.promoteur.upsert({
    where: { email: "promoteur@nightlife-paris.fr" },
    create: {
      email: "promoteur@nightlife-paris.fr",
      password: await bcrypt.hash("nightlife2026", 10),
      nom: "Promoteur",
    },
    update: {},
  });

  const lieux = [
    { nom: "Soirée Velvet", lieu: "Le Carmen", adresse: "34 Rue Duperré, 75009 Paris", dressCode: "Chic & noir" },
    { nom: "Golden Night", lieu: "Bonnie Rooftop", adresse: "61 Quai de Grenelle, 75015 Paris", dressCode: "Élégant" },
    { nom: "Néon Privé", lieu: "Silencio", adresse: "142 Rue Montmartre, 75002 Paris", dressCode: "Créatif" },
    { nom: "Minuit Blanc", lieu: "Maxim's", adresse: "3 Rue Royale, 75008 Paris", dressCode: "Tout en blanc" },
    { nom: "After Lights", lieu: "Le Piaf", adresse: "38 Rue Jean Mermoz, 75008 Paris", dressCode: null },
  ];

  const statutsEvent = ["TERMINE", "CONFIRME", "CONFIRME", "PLANIFIE", "PLANIFIE"];
  const evenements = [];
  for (let i = 0; i < lieux.length; i++) {
    const date = new Date();
    date.setDate(date.getDate() + (i - 1) * 7);
    evenements.push(
      await prisma.evenement.create({
        data: {
          ...lieux[i],
          date,
          heureDebut: "23:00",
          heureFin: "05:00",
          maxParticipants: 40 + i * 10,
          statut: statutsEvent[i],
        },
      })
    );
  }

  const prenoms = [
    "Léa", "Emma", "Chloé", "Inès", "Jade", "Louise", "Sarah", "Camille",
    "Manon", "Zoé", "Lina", "Eva", "Nina", "Maya", "Romane", "Anna",
    "Clara", "Julia", "Alice", "Lou", "Mila", "Rose", "Iris", "Noa", "Yasmine",
  ];
  const statutsPart = ["EN_ATTENTE", "ACCEPTEE", "REFUSEE", "INVITEE", "PRESENTE"];
  for (let i = 0; i < prenoms.length; i++) {
    await prisma.participant.create({
      data: {
        prenom: prenoms[i],
        age: 19 + (i % 9),
        instagram: `@${prenoms[i].toLowerCase()}.paris`,
        telephone: i % 3 === 0 ? `+3361234${String(1000 + i)}` : null,
        statut: statutsPart[i % statutsPart.length],
        source: i % 2 === 0 ? "manychat" : "manuel",
        manychatId: i % 2 === 0 ? `mc_${10000 + i}` : null,
        evenementId: evenements[i % evenements.length].id,
      },
    });
  }

  const staffData = [
    { prenom: "Sophie", nom: "Martin", role: "Hôtesse", fiabilite: 5 },
    { prenom: "Lucas", nom: "Bernard", role: "Photographe", fiabilite: 4 },
    { prenom: "Marc", nom: "Dubois", role: "Videur", fiabilite: 5 },
    { prenom: "Julie", nom: "Petit", role: "Hôtesse", fiabilite: 3 },
    { prenom: "Karim", nom: "Benali", role: "Videur", fiabilite: 4 },
    { prenom: "Emma", nom: "Leroy", role: "Community Manager", fiabilite: 4 },
    { prenom: "Tom", nom: "Moreau", role: "Photographe", fiabilite: 2 },
    { prenom: "Nadia", nom: "Cherif", role: "Hôtesse", fiabilite: 5 },
  ];
  const staffs = [];
  for (const s of staffData) {
    staffs.push(
      await prisma.staff.create({
        data: { ...s, whatsapp: `+336700${String(10000 + staffs.length)}` },
      })
    );
  }

  const statutsStaff = ["OUI", "EN_ATTENTE", "NON"];
  for (let i = 0; i < staffs.length; i++) {
    await prisma.staffEvenement.create({
      data: {
        staffId: staffs[i].id,
        evenementId: evenements[i % evenements.length].id,
        statut: statutsStaff[i % statutsStaff.length],
      },
    });
  }

  const restaurants = [
    "Gigi Paris", "CoCo Paris", "Girafe", "Loulou", "Mun Paris",
    "Manko", "Matignon", "L'Avenue",
  ];
  const statutsContenu = ["EN_ATTENTE", "VALIDE", "REFUSE", "PUBLIE"];
  for (let i = 0; i < restaurants.length; i++) {
    await prisma.contenu.create({
      data: {
        restaurant: restaurants[i],
        scoreGlobal: 60 + i * 4,
        scoreViral: 50 + i * 5,
        scoreLuxe: 70 + i * 3,
        slides: JSON.stringify([
          { titre: restaurants[i], sousTitre: "Le spot du moment", photoRef: null },
          { titre: "Ambiance", sousTitre: "Vibes garanties", photoRef: null },
          { titre: "Réserve vite", sousTitre: "Lien en bio", photoRef: null },
        ]),
        caption: `✨ ${restaurants[i]} — le spot incontournable de Paris ✨`,
        hashtags: "#paris #nightlife #restaurant #parisfood",
        statut: statutsContenu[i % statutsContenu.length],
        publishedAt: statutsContenu[i % statutsContenu.length] === "PUBLIE" ? new Date() : null,
      },
    });
  }

  console.log("[seed] Démo insérée : 5 événements, 25 participantes, 8 staff, 8 contenus.");
}
