import { PrismaClient } from "@prisma/client";

// DATABASE_URL doit pointer vers une base PostgreSQL (ex : Neon, gratuit).
// En local, copiez .env.example en .env et renseignez la même URL.
if (!process.env.DATABASE_URL) {
  console.warn(
    "[prisma] DATABASE_URL non défini — voir .env.example et DEPLOIEMENT.md"
  );
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
