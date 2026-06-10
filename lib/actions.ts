"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { verifyCredentials, setSessionCookie, clearSessionCookie } from "./auth";

// ---------- AUTH ----------

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const session = await verifyCredentials(email, password);
  if (!session) {
    redirect("/login?error=1");
  }
  await setSessionCookie(session);
  redirect("/dashboard");
}

export async function logoutAction() {
  clearSessionCookie();
  redirect("/login");
}

// ---------- PARTICIPANTS ----------

export async function createParticipant(formData: FormData) {
  await prisma.participant.create({
    data: {
      prenom: String(formData.get("prenom") || "").trim(),
      age: parseInt(String(formData.get("age") || "18"), 10),
      instagram: String(formData.get("instagram") || "").trim(),
      telephone: String(formData.get("telephone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      source: "manuel",
      evenementId: String(formData.get("evenementId") || "") || null,
    },
  });
  revalidatePath("/participants");
  revalidatePath("/dashboard");
}

export async function updateParticipantStatut(id: string, statut: string) {
  await prisma.participant.update({ where: { id }, data: { statut } });
  revalidatePath("/participants");
  revalidatePath("/dashboard");
}

export async function deleteParticipant(id: string) {
  await prisma.participant.delete({ where: { id } });
  revalidatePath("/participants");
  revalidatePath("/dashboard");
}

// ---------- ÉVÉNEMENTS ----------

export async function createEvenement(formData: FormData) {
  await prisma.evenement.create({
    data: {
      nom: String(formData.get("nom") || "").trim(),
      date: new Date(String(formData.get("date") || new Date().toISOString())),
      lieu: String(formData.get("lieu") || "").trim(),
      adresse: String(formData.get("adresse") || "").trim(),
      heureDebut: String(formData.get("heureDebut") || "23:00"),
      heureFin: String(formData.get("heureFin") || "05:00"),
      dressCode: String(formData.get("dressCode") || "").trim() || null,
      maxParticipants: parseInt(String(formData.get("maxParticipants") || "50"), 10),
    },
  });
  revalidatePath("/evenements");
  revalidatePath("/dashboard");
}

export async function updateEvenementStatut(id: string, statut: string) {
  await prisma.evenement.update({ where: { id }, data: { statut } });
  revalidatePath("/evenements");
  revalidatePath("/dashboard");
}

export async function deleteEvenement(id: string) {
  await prisma.evenement.delete({ where: { id } });
  revalidatePath("/evenements");
  revalidatePath("/dashboard");
}

// ---------- STAFF ----------

export async function createStaff(formData: FormData) {
  await prisma.staff.create({
    data: {
      prenom: String(formData.get("prenom") || "").trim(),
      nom: String(formData.get("nom") || "").trim(),
      whatsapp: String(formData.get("whatsapp") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      role: String(formData.get("role") || "Hôtesse"),
      fiabilite: Math.min(5, Math.max(1, parseInt(String(formData.get("fiabilite") || "3"), 10))),
    },
  });
  revalidatePath("/staff");
}

export async function deleteStaff(id: string) {
  await prisma.staff.delete({ where: { id } });
  revalidatePath("/staff");
}

export async function setStaffEvenementStatut(
  staffId: string,
  evenementId: string,
  statut: string
) {
  await prisma.staffEvenement.upsert({
    where: { staffId_evenementId: { staffId, evenementId } },
    create: { staffId, evenementId, statut },
    update: { statut },
  });
  revalidatePath("/staff");
  revalidatePath("/evenements");
}

// ---------- CONTENU ----------

export async function createContenu(formData: FormData) {
  await prisma.contenu.create({
    data: {
      restaurant: String(formData.get("restaurant") || "").trim(),
      scoreGlobal: parseInt(String(formData.get("scoreGlobal") || "0"), 10),
      scoreViral: parseInt(String(formData.get("scoreViral") || "0"), 10),
      scoreLuxe: parseInt(String(formData.get("scoreLuxe") || "0"), 10),
      slides: String(formData.get("slides") || "[]"),
      caption: String(formData.get("caption") || "").trim() || null,
      hashtags: String(formData.get("hashtags") || "").trim() || null,
    },
  });
  revalidatePath("/contenu");
}

export async function updateContenuStatut(id: string, statut: string) {
  await prisma.contenu.update({
    where: { id },
    data: {
      statut,
      publishedAt: statut === "PUBLIE" ? new Date() : null,
    },
  });
  revalidatePath("/contenu");
}

export async function deleteContenu(id: string) {
  await prisma.contenu.delete({ where: { id } });
  revalidatePath("/contenu");
}

// ---------- AGENTS IA ----------

export async function saveAgentConfig(agentId: string, active: boolean, values: Record<string, string>) {
  await prisma.agentConfig.upsert({
    where: { agentId },
    create: { agentId, active, values: JSON.stringify(values) },
    update: { active, values: JSON.stringify(values) },
  });
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Teste la configuration d'un agent avec un vrai appel API.
 * - manychat : GET https://api.manychat.com/fb/page/getInfo
 * - meta     : GET https://graph.facebook.com/v19.0/me
 */
export async function testAgentConfig(
  agentId: string,
  values: Record<string, string>
): Promise<{ ok: boolean; message: string }> {
  try {
    if (agentId === "manychat") {
      const token = values.apiKey || values.token;
      if (!token) return { ok: false, message: "Clé API ManyChat manquante" };
      const res = await fetch("https://api.manychat.com/fb/page/getInfo", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { ok: true, message: `Connecté à la page : ${data?.data?.name || "OK"}` };
      }
      return { ok: false, message: `Erreur ManyChat (${res.status}) : ${data?.message || "token invalide"}` };
    }

    if (agentId === "meta") {
      const token = values.accessToken || values.token;
      if (!token) return { ok: false, message: "Access token Meta manquant" };
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(token)}`,
        { cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { ok: true, message: `Connecté en tant que : ${data?.name || data?.id || "OK"}` };
      }
      return { ok: false, message: `Erreur Meta (${res.status}) : ${data?.error?.message || "token invalide"}` };
    }

    return { ok: false, message: `Agent inconnu : ${agentId}` };
  } catch (e) {
    return { ok: false, message: `Erreur réseau : ${e instanceof Error ? e.message : String(e)}` };
  }
}
