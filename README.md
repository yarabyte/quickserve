# QuickServe

SaaS multi-tenant de commande et réservation restaurant via WhatsApp (WATI).

## Stack

- Next.js 16 (App Router) + TypeScript strict
- Tailwind + composants style shadcn/ui
- Prisma 6 + PostgreSQL
- NextAuth (Credentials) + Google Sheets + API WATI

## Setup `.env`

```bash
cp .env.example .env
```

Variables essentielles :

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | PostgreSQL (`postgresql://user:pass@localhost:5432/quickserve`) |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | Secret NextAuth (JWT) |
| `NEXTAUTH_URL` | `http://localhost:3000` en local |
| `WATI_API_ENDPOINT` | ex. `https://live-server-XXXX.wati.io` |
| `WATI_ACCESS_TOKEN` | Bearer token WATI |
| `WATI_CHANNEL_NUMBER` | Numéro business (deep-link `wa.me`) |
| `WATI_WEBHOOK_SECRET` | Secret header webhook |
| `WATI_SESSION_EXPIRED_TEMPLATE` | Template hors session 24h (défaut `session_reopen`) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email du compte de service |
| `GOOGLE_PRIVATE_KEY` | Clé PEM (`\n` échappés sur une ligne) |
| `DEMO_SPREADSHEET_ID` | Sheet démo (optionnel en local) |
| `CRON_SECRET` | Protège `/api/cron/subscriptions` |

Le gérant partage son Google Sheet en **éditeur** avec `GOOGLE_SERVICE_ACCOUNT_EMAIL`.

## Migrations & seed

```bash
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Seed démo :

- Restaurant **Chez Douala** (`chez-douala`) — menu réaliste FCFA
- OWNER : `owner@chez-douala.test` / `changeme123`
- SUPERADMIN : `admin@quickserve.test` / `admin123456`
- 1 commande + 1 réservation d’exemple

## Webhook WATI

1. Déployez l’app (ou tunnel type ngrok) : `https://<host>/api/webhooks/wati`
2. Dans WATI : **Connectors → Webhooks**
3. Ajoutez l’URL, event **`message received`**
4. Configurez le même secret que `WATI_WEBHOOK_SECRET` (header `x-wati-webhook-secret` ou `Authorization: Bearer …`)

Comportement :

- Réponse **200** rapide après claim idempotent (`WebhookEvent.id`)
- Rate-limit IP (~120 req/min, configurable `WATI_WEBHOOK_RATE_LIMIT`)
- Hors session 24h → template approuvé (`WATI_SESSION_EXPIRED_TEMPLATE`)

## Deep-link client

Format :

```text
https://wa.me/<WATI_CHANNEL_NUMBER>?text=RESTO-<slug>
```

Exemple Chez Douala :

```text
https://wa.me/237641878260?text=RESTO-chez-douala
```

Le premier message contenant `RESTO-<slug>` lie la conversation au restaurant.

## Onboarding

1. `/onboarding` — crée restaurant (TRIAL 14j) + OWNER  
2. `/onboarding/setup` — crée ou connecte le Google Sheet (vérif read/write)  
3. Affiche deep-link + QR  
4. Dashboard : `/login`

## Cron abonnements

Endpoint protégé :

```text
GET /api/cron/subscriptions
Authorization: Bearer $CRON_SECRET
```

Les `TRIAL` expirés passent en `SUSPENDED`. Sur Coolify, planifier un cron HTTP quotidien (ex. `0 3 * * *`).

## Tests

```bash
npm test                 # unitaires + intégration (si DATABASE_URL)
npm run test:watch
```

Les tests d’intégration webhook → machine → effets utilisent Postgres + WATI mocké.

## i18n

Libellés bot + dashboard : `src/i18n/{fr,en}.ts` via `t(key, lang, vars?)`.

## Déploiement Coolify

Build pack : **Dockerfile** (fichier à la racine). Image standalone Next.js ; migrations Prisma au démarrage du conteneur.

### 1. Postgres dans Coolify

1. **+ Resource → Database → PostgreSQL**
2. Déployer la DB
3. Copier l’URL **interne** (réseau Docker Coolify), ex.  
   `postgresql://user:pass@<db-uuid>:5432/postgres`

### 2. Application

1. **+ Resource → Application** → repo Git (ou upload)
2. Build Pack : **Dockerfile**
3. Port : `3000`
4. Lier le domaine (HTTPS via Traefik / Caddy Coolify)

### 3. Variables d’environnement

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | URL **interne** Postgres Coolify |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` / `AUTH_URL` | `https://ton-domaine.com` |
| `WATI_API_ENDPOINT` | ex. `https://live-server-XXXX.wati.io` |
| `WATI_ACCESS_TOKEN` | Bearer WATI |
| `WATI_CHANNEL_NUMBER` | Numéro business |
| `WATI_WEBHOOK_SECRET` | Secret webhook |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Compte de service |
| `GOOGLE_PRIVATE_KEY` | PEM avec `\n` échappés sur une ligne |
| `CRON_SECRET` | Secret pour le cron HTTP |
| `WATI_SESSION_EXPIRED_TEMPLATE` | Défaut `session_reopen` |
| `DEMO_SPREADSHEET_ID` | Optionnel (seed / démo) |

### 4. Déployer

Coolify build → démarre le conteneur → `prisma migrate deploy` → `node server.js`.

Seed (une fois, depuis ta machine contre la DB) :

```bash
DATABASE_URL="postgresql://…" npm run prisma:seed
```

(Utilise l’URL **publique** Postgres Coolify si tu seeds depuis l’extérieur.)

### 5. Cron Coolify

Scheduled task / cron HTTP :

- URL : `https://ton-domaine.com/api/cron/subscriptions`
- Header : `Authorization: Bearer <CRON_SECRET>`
- Schedule : `0 3 * * *` (03:00 UTC)

### 6. Webhook WATI

`https://ton-domaine.com/api/webhooks/wati` — event **message received**.
