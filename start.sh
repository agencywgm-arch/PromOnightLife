#!/usr/bin/env bash
set -e

# Fallback identique à lib/prisma.ts : démarrage possible sans configuration.
export DATABASE_URL="${DATABASE_URL:-file:./dev.db}"

# Crée/synchronise le schéma SQLite puis démarre Next.js.
# Le seed de démo est géré par instrumentation.ts si la base est vide.
npx prisma db push --skip-generate
exec npx next start -p "${PORT:-3000}"
