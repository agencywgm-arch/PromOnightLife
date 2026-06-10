# 🚀 Déployer Nightlife Paris gratuitement (app 100 % fonctionnelle)

GitHub Pages ne peut **pas** faire tourner l'agent carrousel ni les webhooks
(il n'exécute aucun serveur). Pour une app réellement fonctionnelle et gratuite,
on déploie la vraie application Next.js sur **Vercel**, branchée sur ce repo GitHub :
chaque `git push` redéploie automatiquement.

Coût total : **0 €**. Comptez ~10 minutes.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/agencywgm-arch/PromOnightLife&env=DATABASE_URL,AUTH_SECRET&envDescription=DATABASE_URL%20%3D%20Postgres%20Neon%20%C2%B7%20AUTH_SECRET%20%3D%20openssl%20rand%20-hex%2032&project-name=nightlife-paris&repository-name=nightlife-paris)

> Le bouton ci-dessus pré-remplit l'import GitHub + les variables. Il te restera
> juste à coller ton `DATABASE_URL` Neon et un `AUTH_SECRET`.

---

## Étape 1 — Base de données gratuite (Neon)

1. Va sur **https://neon.tech** → *Sign up* (connexion avec GitHub, sans carte bancaire).
2. *Create project* → choisis la région **Europe (Frankfurt)**.
3. Copie la **Connection string** (elle commence par `postgresql://...`). Garde-la de côté.

## Étape 2 — Déployer sur Vercel

1. Va sur **https://vercel.com** → *Sign up* avec ton compte **GitHub**.
2. *Add New… → Project* → importe le repo **`agencywgm-arch/PromOnightLife`**.
3. Vercel détecte Next.js automatiquement — ne change rien au build.
4. Déplie **Environment Variables** et ajoute au minimum :
   - `DATABASE_URL` = la Connection string de Neon (étape 1)
   - `AUTH_SECRET` = une longue chaîne aléatoire (`openssl rand -hex 32`)
5. Clique **Deploy**. Au premier build, le schéma est créé et les données de
   démo sont injectées automatiquement.

➡️ Ton app est en ligne sur `https://<ton-projet>.vercel.app` — fonctionnelle,
avec serveur, base de données et API.

## Étape 3 — Activer l'agent carrousel Instagram

L'agent a besoin de deux choses (toutes les variables sont dans `.env.example`) :

| Besoin | Variable | Où l'obtenir |
|---|---|---|
| Photos des lieux | `GOOGLE_PLACES_API_KEY` | [Google Cloud Console](https://console.cloud.google.com) → activer **Places API**, puis *Credentials → API key* |
| Publier sur Instagram | `META_ACCESS_TOKEN`, `META_IG_USER_ID` | [Meta for Developers](https://developers.facebook.com/docs/instagram-api) (compte IG Business + page Facebook) |
| Candidatures auto | `MANYCHAT_API_KEY` | ManyChat → *Settings → API* |

Ajoute ces variables dans **Vercel → Settings → Environment Variables**, puis
**Redeploy**. Le générateur de carrousel (page *Contenu*) et le test des agents
(Dashboard) deviennent alors actifs.

> 💡 La clé Google demande un compte de facturation Google (carte), mais l'usage
> du générateur reste dans le **crédit gratuit de 200 $/mois** — tu ne paies rien
> en pratique.

## Étape 4 — Brancher les webhooks (optionnel)

Dans ManyChat / n8n, pointe les automatisations vers :

- `https://<ton-projet>.vercel.app/api/webhook/participant` (nouvelle candidature)
- `https://<ton-projet>.vercel.app/api/webhook/validate` (validation de statut)

Si tu définis `WEBHOOK_SECRET` dans Vercel, ajoute le header `x-webhook-secret`
(ou `?secret=...`) côté ManyChat/n8n.

---

### Alternative locale (développement)

```bash
cp .env.example .env      # renseigne DATABASE_URL (Neon) + AUTH_SECRET
npm install
npm run db:push           # crée les tables
npm run dev               # http://localhost:3000
```
