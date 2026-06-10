import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "nightlife-paris-dev-secret-change-me"
);

const COOKIE_NAME = "nightlife_session";

export type Session = { promoteurId: string; email: string; nom: string };

export async function createSessionToken(session: Session): Promise<string> {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function setSessionCookie(session: Session) {
  const token = await createSessionToken(session);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function readSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

/**
 * requireAuth() ne redirige PAS vers /login : s'il n'y a aucune session,
 * elle auto-crée la session du promoteur unique (accès direct au dashboard).
 * Le promoteur par défaut est créé en base s'il n'existe pas encore.
 */
export async function requireAuth(): Promise<Session> {
  const existing = await readSession();
  if (existing) return existing;

  let promoteur = await prisma.promoteur.findFirst();
  if (!promoteur) {
    promoteur = await prisma.promoteur.create({
      data: {
        email: "promoteur@nightlife-paris.fr",
        password: await bcrypt.hash("nightlife2026", 10),
        nom: "Promoteur",
      },
    });
  }

  const session: Session = {
    promoteurId: promoteur.id,
    email: promoteur.email,
    nom: promoteur.nom,
  };
  // Note : impossible d'écrire un cookie pendant le rendu d'un Server Component ;
  // la session est simplement retournée. Le cookie est posé lors du login explicite.
  return session;
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<Session | null> {
  const promoteur = await prisma.promoteur.findUnique({ where: { email } });
  if (!promoteur) return null;
  const ok = await bcrypt.compare(password, promoteur.password);
  if (!ok) return null;
  return { promoteurId: promoteur.id, email: promoteur.email, nom: promoteur.nom };
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}
