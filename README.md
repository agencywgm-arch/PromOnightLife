# Nightlife Paris — SaaS Promoteur

Dashboard de gestion d'événements nightlife parisiens : participants (via ManyChat),
événements, staff, contenu Instagram et agents IA d'automatisation.

## 🌐 Page vitrine (GitHub Pages)

La landing page du projet se trouve dans [`docs/`](docs/) et est déployée
automatiquement sur GitHub Pages par le workflow
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

**Activation (une seule fois) :** dans *Settings → Pages*, choisir
**Source : GitHub Actions**. La page sera ensuite publiée à chaque push sur
`main` touchant `docs/`, à l'adresse :

> https://agencywgm-arch.github.io/PromOnightLife/

## 🚀 Démarrage rapide

```bash
npm install            # installe les dépendances + prisma generate
npm run db:push        # crée la base SQLite (dev.db)
npm run dev            # http://localhost:3000
```

Connexion démo : `promoteur@nightlife-paris.fr` / `nightlife2026` — mais `requireAuth()`
auto-crée la session du promoteur unique, le dashboard est donc accessible directement.

## 🐳 Déploiement (Docker, sans Railway)

Le projet se déploie partout via Docker. La base SQLite vit sur le volume `/data`
et survit aux redéploiements. Le seed de démo est injecté par `instrumentation.ts`
si la base est vide.

```bash
# En local ou sur un VPS :
docker compose up -d        # build + volume persistant + port 3000
```

À chaque push sur `main`, le workflow
[`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)
publie l'image sur **GitHub Container Registry** :

```bash
docker run -d -p 3000:3000 -v nightlife-data:/data \
  ghcr.io/agencywgm-arch/promonightlife:latest
```

Hébergeurs compatibles avec cette image + un disque persistant : VPS (Docker/Coolify),
Fly.io, Render, Scaleway, etc. Pour Vercel il faudrait remplacer SQLite par une base
hébergée (Turso/Postgres) — non inclus ici.

## 📡 Webhooks

- `POST /api/webhook/participant` — réception candidature ManyChat
  (`{ prenom, age, instagram, telephone?, email?, manychatId?, evenementId? }`)
- `POST /api/webhook/validate` — validation n8n (`{ id | manychatId, statut }`)
- Si `WEBHOOK_SECRET` est défini : header `x-webhook-secret` ou `?secret=` requis.

## 🛠 Stack de l'application

- Next.js 14 (App Router) · TypeScript
- Prisma ORM · SQLite
- Server Actions (CRUD participants / événements / staff / contenu)
- Auth JWT (Jose)
- Webhooks ManyChat / n8n
- Générateur de carrousels Instagram 1080×1080 (Google Places API)
- Docker · image publiée sur GHCR

## ⚙️ Variables d'environnement (toutes optionnelles)

| Variable | Rôle | Défaut |
|---|---|---|
| `DATABASE_URL` | Base SQLite | `file:./dev.db` |
| `AUTH_SECRET` | Secret JWT | valeur de dev intégrée |
| `GOOGLE_PLACES_API_KEY` | Générateur de carrousels | — (générateur désactivé) |
| `WEBHOOK_SECRET` | Protection des webhooks | — (webhooks ouverts) |
