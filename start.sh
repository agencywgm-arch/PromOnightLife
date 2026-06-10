#!/usr/bin/env bash
set -e

# DATABASE_URL doit pointer vers une base PostgreSQL (voir .env.example).
# Synchronise le schéma puis démarre Next.js.
# Le seed de démo est géré par instrumentation.ts si la base est vide.
npx prisma db push --skip-generate --accept-data-loss
exec npx next start -p "${PORT:-3000}"
