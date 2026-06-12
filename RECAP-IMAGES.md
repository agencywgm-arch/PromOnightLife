# 📸 Récap — Système de photos automatique pour les carrousels TikTok

> Dernière mise à jour : 12 juin 2026

## 🎯 Objectif

Générer des carrousels TikTok (4 slides, format 9:16) de restaurants parisiens
haut de gamme avec de **vraies photos du restaurant**, **sans aucune action
manuelle** de l'utilisateur.

---

## ✅ Ce qui est en place

### 1. Recherche d'images 100% automatique

Dès que l'agent propose un restaurant, chaque slide cherche ses photos
**tout seul** (plus aucun bouton à cliquer). La chaîne essaie dans l'ordre :

```
1️⃣ Foursquare / Google Places  →  vraies photos officielles du lieu
        ↓ si rien trouvé
2️⃣ Serper.dev (Google Images)  →  vraies photos du resto via Google  ⭐ RECOMMANDÉ
        ↓ si rien trouvé
3️⃣ Pexels / Pixabay            →  photos d'ambiance libres de droits
        ↓ si rien trouvé
4️⃣ Lien Google Images + champ "coller une URL" (dernier recours manuel)
```

### 2. Preview des photos en grand format

- Clic sur une vignette → **modal plein écran** avec l'image en haute résolution
- Bouton **"✓ Sélectionner cette image"** pour confirmer depuis la preview
- Bouton **"✕ Fermer"** ou clic en dehors pour annuler
- Crédits du photographe affichés sous l'image

### 3. Page de diagnostic des clés

Ouvre **`/api/images/test`** dans ton navigateur : la page teste toutes les
sources configurées (Foursquare, Google Places, Serper, Pexels) sur un
restaurant connu et affiche un **verdict clair** :

- ✅ `TOUT EST BON — les vraies photos viendront de <source>`
- ❌ Quelle clé est absente, invalide ou en quota épuisé (avec le message d'erreur exact)

### 4. Historique anti-répétition

L'agent ne repropose **jamais** un restaurant déjà en bibliothèque (lecture de
la base) ni déjà proposé dans la session en cours.

---

## 🔑 Les clés API (Vercel → Settings → Environment Variables)

| Variable | Rôle | Où l'obtenir | Gratuit ? |
|---|---|---|---|
| `SERPER_API_KEY` ⭐ | Vraies photos via Google Images | [serper.dev](https://serper.dev) — email seulement | ✅ 2500 req offertes, sans carte |
| `FOURSQUARE_API_KEY` | Vraies photos du lieu | [foursquare.com/developers](https://foursquare.com/developers) | ✅ sans carte |
| `GOOGLE_PLACES_API_KEY` | Vraies photos Google Maps | [console.cloud.google.com](https://console.cloud.google.com) | ⚠️ carte requise (200 $/mois de crédit offert) |
| `PEXELS_API_KEY` | Photos d'ambiance (secours) | [pexels.com/api](https://www.pexels.com/api/) | ✅ sans carte |
| `PIXABAY_API_KEY` | Photos d'ambiance (secours) | [pixabay.com/api](https://pixabay.com/api/docs/) | ✅ sans carte |
| `ANTHROPIC_API_KEY` | Agent IA (propositions de restos) | [console.anthropic.com](https://console.anthropic.com) | plan gratuit dispo |

> ⚠️ Après chaque ajout/modif de clé : **Deployments → ⋯ → Redeploy** (les
> variables ne sont prises en compte qu'au déploiement suivant).

---

## 🛣️ Les endpoints API

| Endpoint | Rôle |
|---|---|
| `POST /api/agent/suggest` | L'agent propose 3 restaurants (avec historique anti-répétition) |
| `GET /api/images/place?name=&address=` | Vraies photos du lieu (Foursquare → Google Places) |
| `GET /api/images/serper?q=` | Vraies photos via Google Images (Serper.dev), cache 24 h |
| `GET /api/images/auto?q=` | Photos d'ambiance (Pexels → Unsplash → Pixabay), cache 12 h |
| `GET /api/images/pexels?q=` | Photos Pexels seules |
| `GET /api/images/proxy?url=` | Proxy CORS pour le rendu canvas |
| `GET /api/images/test` | 🩺 Diagnostic de toutes les clés |

---

## 🗺️ Le parcours utilisateur (zéro friction)

1. Clique sur **"Proposer 3 restaurants"** — c'est le SEUL clic obligatoire
2. L'agent génère 3 restos différents (jamais déjà vus)
3. Les photos se cherchent **automatiquement** pour chaque slide
4. Clique sur une vignette → **preview plein écran** → "Sélectionner"
5. Clique sur **"Composer"** → les 4 slides 9:16 sont rendues, sauvegardées en
   bibliothèque et téléchargées

---

## 🪦 Ce qu'on a essayé et abandonné (et pourquoi)

| Tentative | Pourquoi ça ne marche pas |
|---|---|
| Scraping DuckDuckGo / Bing / Google direct | Les moteurs **bloquent les IP des serveurs cloud** (Vercel) → 403 |
| Scraping TripAdvisor | **Cloudflare** bloque les datacenters → impossible depuis Vercel |
| Yelp Fusion API | Devenue **payante** |
| Instagram Graph API | Demande un **compte Meta développeur** |
| Unsplash "sans clé" | En réalité une clé est requise (mon erreur, corrigée) |

**Leçon** : le blocage vient de l'**IP de Vercel**, pas de notre code. La seule
voie fiable = passer par un service qui fait la requête pour nous (Serper) ou
par les API officielles (Foursquare / Google Places).

---

## 🚨 En cas de problème

1. Ouvre **`/api/images/test`** → identifie la source en erreur
2. Vérifie que la clé est bien dans Vercel (sans espaces, sans guillemets)
3. **Redeploy** après toute modif de variable
4. Quota Serper épuisé ? Le dashboard serper.dev affiche ta consommation
   (le cache 24 h limite fortement les appels)
