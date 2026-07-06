import { prisma } from "./prisma";

/**
 * Planning hebdomadaire des soirées (club + before dîner par jour).
 * Donné par le promoteur comme jeu de test à calibrer ; stocké dans
 * AgentConfig("planning") dès qu'il est édité dans l'interface, sinon
 * on sert ce défaut. Alimente à la fois l'affichage (volet Messages)
 * et l'agent DM (questions « il y a quoi ce soir ? »).
 */

export type DayPlan = {
  day: string; // "Lundi" … "Dimanche"
  club: string; // ligne soirée/club ("" = pas de soirée)
  dinner: string; // ligne before dîner ("" = aucun)
};

export const DEFAULT_PLANNING: DayPlan[] = [
  {
    day: "Lundi",
    club: "Matignon (Hip-hop)",
    dinner: "Before dîner au @peaky.paris ou Matignon restaurant",
  },
  {
    day: "Mardi",
    club: "Matignon (House music) @akirafunction",
    dinner: "Before dîner au @peaky.paris, @lespeakeasy ou Matignon restaurant",
  },
  {
    day: "Mercredi",
    club: "Boum Boum club (Hip-hop) @tamtamparis",
    dinner: "Before dîner au @peaky.paris ou @lespeakeasy",
  },
  {
    day: "Jeudi",
    club: "Boum Boum club (Hip-hop) @_envoyez_",
    dinner: "Before dîner au @peaky.paris ou @lespeakeasy (@chichi.paris)",
  },
  { day: "Vendredi", club: "", dinner: "" },
  { day: "Samedi", club: "@jangalparis et @boumboum_saturday", dinner: "" },
  {
    day: "Dimanche",
    club: "Boum Boum club (Hip-hop) @thefabulousparis",
    dinner: "Before dîner au @peaky.paris ou @chichi.paris",
  },
];

/** Planning courant : version éditée si présente, sinon le défaut. */
export async function loadPlanning(): Promise<DayPlan[]> {
  try {
    const cfg = await prisma.agentConfig.findUnique({ where: { agentId: "planning" } });
    if (cfg) {
      const values = JSON.parse(cfg.values || "{}") as { data?: string };
      if (values.data) {
        const days = JSON.parse(values.data) as DayPlan[];
        if (Array.isArray(days) && days.length === 7) return days;
      }
    }
  } catch (e) {
    console.error("[planning] lecture impossible :", e);
  }
  return DEFAULT_PLANNING;
}

/** Clé de semaine : date ISO (YYYY-MM-DD) du lundi, heure de Paris. */
export function parisWeekKey(offsetWeeks = 0): string {
  const paris = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const dow = (paris.getDay() + 6) % 7; // lundi = 0
  paris.setDate(paris.getDate() - dow + offsetWeeks * 7);
  const y = paris.getFullYear();
  const m = String(paris.getMonth() + 1).padStart(2, "0");
  const d = String(paris.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Libellé humain d'une clé de semaine ("du 6 juil."). */
export function weekLabel(key: string): string {
  return `du ${new Date(`${key}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`;
}

/**
 * Semaines personnalisées (saisies par l'utilisateur, semaine par semaine) :
 * map { lundi ISO → 7 jours }. Stockées dans AgentConfig("planning-weeks").
 */
export async function loadWeekOverrides(): Promise<Record<string, DayPlan[]>> {
  try {
    const cfg = await prisma.agentConfig.findUnique({ where: { agentId: "planning-weeks" } });
    if (cfg) {
      const values = JSON.parse(cfg.values || "{}") as { data?: string };
      if (values.data) {
        const map = JSON.parse(values.data) as Record<string, DayPlan[]>;
        if (map && typeof map === "object") return map;
      }
    }
  } catch (e) {
    console.error("[planning] lecture semaines impossible :", e);
  }
  return {};
}

/**
 * Planning effectif pour l'agent : la semaine en cours si elle a été
 * personnalisée, sinon la semaine type récurrente.
 */
export async function loadEffectivePlanning(): Promise<DayPlan[]> {
  const overrides = await loadWeekOverrides();
  const key = parisWeekKey(0);
  const week = overrides[key];
  if (Array.isArray(week) && week.length === 7) return week;
  return loadPlanning();
}

/** Jour de la semaine actuel à Paris ("Lundi" … "Dimanche"). */
export function parisToday(): string {
  const day = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
  }).format(new Date());
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/** Rendu texte du planning pour le prompt de l'agent DM. */
export function planningToText(days: DayPlan[]): string {
  const today = parisToday();
  const lines = days.map((d) => {
    const isToday = d.day === today ? " ← AUJOURD'HUI" : "";
    if (!d.club && !d.dinner) return `${d.day} : pas de soirée${isToday}`;
    const parts = [d.club && `soirée : ${d.club}`, d.dinner && `dîner : ${d.dinner}`].filter(Boolean);
    return `${d.day} : ${parts.join(" · ")}${isToday}`;
  });
  return `Nous sommes ${today}.\n${lines.join("\n")}`;
}
