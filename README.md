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

## 🚀 Déploiement gratuit & fonctionnel — voir [DEPLOIEMENT.md](DEPLOIEMENT.md)

L'app complète (agent carrousel, webhooks, base de données) se déploie
**gratuitement sur Vercel**, branchée sur ce repo GitHub. Étapes détaillées
dans **[DEPLOIEMENT.md](DEPLOIEMENT.md)** (Vercel + base Neon, ~10 min, 0 €).

> ℹ️ GitHub Pages ne sert que des fichiers statiques : il ne peut pas exécuter
> l'agent carrousel ni les webhooks. Pour une app réellement fonctionnelle,
> il faut un hébergeur qui exécute Next.js (Vercel, Docker…).

## 🧪 Démarrage local

```bash
cp .env.example .env    # renseigne DATABASE_URL (Neon/Postgres) + AUTH_SECRET
npm install
npm run db:push         # crée les tables
npm run dev             # http://localhost:3000
```

Connexion démo : `promoteur@nightlife-paris.fr` / `nightlife2026` — mais `requireAuth()`
auto-crée la session du promoteur unique, le dashboard est donc accessible directement.

## 🐳 Déploiement Docker (auto-hébergé)

`docker compose up -d` lance l'app **et** une base PostgreSQL avec volume persistant.
Le seed de démo est injecté par `instrumentation.ts` si la base est vide.

```bash
# En local ou sur un VPS :
docker compose up -d        # build + volume persistant + port 3000
```

À chaque push sur `main`, le workflow
[`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml)
publie l'image sur **GitHub Container Registry** :

```bash
docker run -d -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  ghcr.io/agencywgm-arch/promonightlife:latest
```

Hébergeurs compatibles : Vercel (voir [DEPLOIEMENT.md](DEPLOIEMENT.md)),
VPS Docker/Coolify, Fly.io, Render, Scaleway, etc.

## 📡 Webhooks

- `POST /api/webhook/participant` — réception candidature ManyChat
  (`{ prenom, age, instagram, telephone?, email?, manychatId?, evenementId? }`)
- `POST /api/webhook/validate` — validation n8n (`{ id | manychatId, statut }`)
- Si `WEBHOOK_SECRET` est défini : header `x-webhook-secret` ou `?secret=` requis.

## 🛠 Stack de l'application

- Next.js 14 (App Router) · TypeScript
- Prisma ORM · PostgreSQL (Neon en gratuit)
- Server Actions (CRUD participants / événements / staff / contenu)
- Auth JWT (Jose)
- Webhooks ManyChat / n8n
- Générateur de carrousels Instagram 1080×1080 (Google Places API)
- Déploiement Vercel (gratuit) ou Docker · image publiée sur GHCR

## ⚙️ Variables d'environnement

Modèle complet et commenté dans **[`.env.example`](.env.example)**.

| Variable | Rôle | Obligatoire |
|---|---|---|
| `DATABASE_URL` | Base PostgreSQL (Neon) | ✅ oui |
| `AUTH_SECRET` | Secret JWT des sessions | recommandé |
| `GOOGLE_PLACES_API_KEY` | Photos de l'agent carrousel | pour le carrousel |
| `META_ACCESS_TOKEN` / `META_IG_USER_ID` | Publication Instagram | pour publier |
| `MANYCHAT_API_KEY` | Candidatures via DM Instagram | optionnel |
| `WEBHOOK_SECRET` | Protection des webhooks | optionnel |
