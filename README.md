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

## 🛠 Stack de l'application

- Next.js 14 (App Router) · TypeScript
- Prisma ORM · SQLite
- Server Actions (CRUD participants / événements / staff / contenu)
- Auth JWT (Jose)
- Webhooks ManyChat / n8n
- Générateur de carrousels Instagram 1080×1080 (Google Places API)
- Déploiement Railway

## ⚙️ Variables d'environnement (toutes optionnelles)

| Variable | Rôle | Défaut |
|---|---|---|
| `DATABASE_URL` | Base SQLite | `file:./dev.db` |
| `AUTH_SECRET` | Secret JWT | valeur de dev intégrée |
| `GOOGLE_PLACES_API_KEY` | Générateur de carrousels | — (générateur désactivé) |
| `WEBHOOK_SECRET` | Protection des webhooks | — (webhooks ouverts) |
