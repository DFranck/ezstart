# Déploiement - @ezstart Monorepo

**APIs → Railway** | **Web → Vercel**

> 📘 Secrets & env vars architecture: see [SECRETS.md](./SECRETS.md).

---

## Railway (APIs)

Toutes les APIs utilisent le même pattern de configuration dans le Railway Dashboard :

- **Root Directory** : `/` (racine monorepo)
- **Build Command** : `pnpm install --frozen-lockfile --shamefully-hoist && pnpm turbo build --filter=api-{name}...`
- **Start Command** : `pnpm --filter api-{name} start`
- **Watch Paths** : `apps/{name}/api/**`, `packages/api-core/**`, `packages/config/**`, `packages/logger/**`, `packages/monitoring/**`
- **Healthcheck** : `/health`

| Service            | Projet Railway | URL Production                            |
| ------------------ | -------------- | ----------------------------------------- |
| ezauth-api         | ezstart-apis   | https://ezauth-api.up.railway.app         |
| ezbill-api         | ezstart-apis   | https://ezbill-api.up.railway.app         |
| ezpay-api          | ezstart-apis   | https://ezpay-api.up.railway.app          |
| ezstart-api        | ezstart-apis   | https://ezstart-api.up.railway.app        |
| gacha-analyzer-api | ezstart-apis   | https://gacha-analyzer-api.up.railway.app |
| greenpulse-api     | TeamProjects   | https://greenpulse-api.up.railway.app     |

Variables d'environnement configurées directement dans Railway Dashboard (jamais committées).

---

## Vercel (Web apps)

Toutes les apps web utilisent le même pattern :

- **Root Directory** : `apps/{name}/web`
- **Build Command** : configuré dans `vercel.json` → `pnpm turbo build --filter=web-{name}...`
- **Framework** : Next.js

| App            | URL Production                     |
| -------------- | ---------------------------------- |
| EZStart        | https://www.ezstart.xyz            |
| EZAuth         | https://ezauth.ezstart.xyz         |
| EZBill         | https://ezbill.ezstart.xyz         |
| EZPay          | https://ezpay.ezstart.xyz          |
| FengShui       | https://ezfengshui.vercel.app      |
| ASC-TCD        | https://asc-tcd-web.vercel.app     |
| GreenPulse     | https://greenpulse.ezstart.xyz     |
| Gacha Analyzer | https://gacha-analyzer.ezstart.xyz |

Variables `NEXT_PUBLIC_*` configurées dans Vercel Dashboard → Environment Variables.

---

## Tooling

```bash
pnpm env:validate                   # Valide la cascade per-app (.env.local → .env.staging → .env.production)
pnpm env:push:railway <app> <env>   # Push merged cascade vers Railway pour 1 app+env
pnpm env:push:vercel <app> <env>    # Push merged cascade vers Vercel pour 1 app+env
pnpm env:push:all <env>             # Push toutes les apps en une seule commande
pnpm env:push:all <env> --dry-run   # Preview sans cloud call
pnpm secret:gen                     # Génère un secret crypto random (utilitaire ad-hoc)

# DEPRECATED (legacy hybrid layout — root .env.* dropped 2026-05-01)
# pnpm setup:env, pnpm validate-env, pnpm rotate-secrets, pnpm secrets:sync
```

Voir [SECRETS.md](./SECRETS.md) pour le détail des flags (`--dry-run`, `--from`, `--override`, `--apps`, `--continue-on-error`, etc.).

---

## Structure .env (per-app ONLY — pas de fichier root)

```
apps/{name}/{api|web}/
├── .env.example       ← Template (committé, sans secrets)
├── .env.local         ← Dev local complet (gitignored — TOUS les vars y vivent)
├── .env.staging       ← Staging overrides (gitignored — diffs vs local)
└── .env.production    ← Production overrides (gitignored — diffs vs local+staging)
```

- `.env.example` : à jour, contient placeholders + commentaires
- `.env.local` : valeurs réelles de dev, chargé par api-core / next-config
- `.env.staging` : DIFFS vs `.env.local` uniquement (ex: cluster URL staging)
- `.env.production` : DIFFS vs `.env.local + .env.staging` uniquement
- Pas de fichier `.env*` à la racine du monorepo (per-app cascade canonique)

---

## Checklist déploiement

1. Tester localement (`pnpm dev:{app}`)
2. Vérifier build (`pnpm turbo build --filter=api-{name}...`)
3. Vérifier typecheck (`pnpm typecheck`)
4. Mettre à jour `.env.example` si nouvelles variables
5. Push sur `master` → déploiement automatique Railway + Vercel
6. Vérifier healthcheck (`curl https://{service}.up.railway.app/health`)

---

## CLIs et tokens

### Installation

Les CLIs **npm** sont installés en devDependencies à la racine (`vercel`). Les CLIs **système** (`gh`, `railway`, `atlas`) s'installent via le package manager de l'OS.

```bash
# npm (déjà dans package.json → pnpm install)
pnpm exec vercel --version

# Système (Windows: winget / macOS: brew)
winget install GitHub.cli        # ou brew install gh
winget install Railway.railway   # ou brew install railway
winget install MongoDB.Atlas     # ou brew install mongodb-atlas-cli
```

### Tableau récapitulatif

| Service       | CLI                       | Login              | Token retrieval                                                       | Manual fallback (dashboard)                            |
| ------------- | ------------------------- | ------------------ | --------------------------------------------------------------------- | ------------------------------------------------------ |
| GitHub        | `gh` (système)            | `gh auth login`    | `gh auth token`                                                       | https://github.com/settings/personal-access-tokens/new |
| Vercel        | `pnpm exec vercel`        | `vercel login`     | `%APPDATA%\com.vercel.cli\Data\auth.json` → `.token` (ou `~/.vercel`) | https://vercel.com/account/tokens                      |
| Railway       | `railway` (système)       | `railway login`    | `~/.railway/config.json` → `.user.accessToken`                        | https://railway.app/account/tokens                     |
| MongoDB Atlas | `atlas` (installer dédié) | `atlas auth login` | Dashboard only (API keys public/private)                              | https://cloud.mongodb.com/v2#/preferences/publicApi    |
| Resend        | aucun                     | dashboard only     | n/a                                                                   | https://resend.com/api-keys                            |
| Anthropic     | aucun                     | dashboard only     | n/a                                                                   | https://console.anthropic.com/settings/keys            |
| OpenAI        | aucun                     | dashboard only     | n/a                                                                   | https://platform.openai.com/api-keys                   |
| Gemini        | aucun                     | dashboard only     | n/a                                                                   | https://aistudio.google.com/app/apikey                 |
| Stripe        | `stripe` (système)        | `stripe login`     | `~/.config/stripe/config.toml` (restricted) — préférer dashboard      | https://dashboard.stripe.com/apikeys                   |

### Auth status check

```bash
gh auth status
pnpm exec vercel whoami
railway whoami
```

### Tokens auto-gérés (dans `apps/ezstart/api/.env.local`)

Ces variables sont auto-extraites depuis les CLIs locaux par le flow d'onboarding :

- `GITHUB_TOKEN` — `gh auth token`
- `GITHUB_USERNAME` — `gh api user --jq '.login'`
- `VERCEL_TOKEN` — Vercel auth.json
- `RAILWAY_TOKEN` — Railway config.json (access token)

### Tokens manuels obligatoires (dashboard only)

Ces variables **doivent** être créées manuellement via le dashboard du service, puis copiées dans `.env.local` / Railway / Vercel :

| Variable                    | Où créer                                            | Scopes / permissions                    |
| --------------------------- | --------------------------------------------------- | --------------------------------------- |
| `MONGODB_ATLAS_PUBLIC_KEY`  | https://cloud.mongodb.com/v2#/preferences/publicApi | Project Owner (pour clusters + backups) |
| `MONGODB_ATLAS_PRIVATE_KEY` | idem (généré en même temps que la public key)       | idem                                    |
| `MONGODB_ATLAS_PROJECT_ID`  | Dashboard → Project Settings                        | lecture                                 |
| `RESEND_API_KEY`            | https://resend.com/api-keys                         | Full access (sending domain vérifié)    |
| `ANTHROPIC_API_KEY`         | https://console.anthropic.com/settings/keys         | Per-workspace key recommandé            |
| `OPENAI_API_KEY`            | https://platform.openai.com/api-keys                | Scope restreint au projet               |
| `GEMINI_API_KEY`            | https://aistudio.google.com/app/apikey              | n/a (clé unique)                        |
| `VERCEL_TEAM_ID`            | https://vercel.com/teams/<team>/settings → General  | n/a (ID public du team)                 |
| `STRIPE_SECRET_KEY`         | https://dashboard.stripe.com/apikeys                | Secret key (préférer restricted key)    |
| `STRIPE_WEBHOOK_SECRET`     | https://dashboard.stripe.com/webhooks               | un par endpoint                         |

### Règles

- ❌ **JAMAIS committer** `.env.local` / `.env.production` (gitignored)
- ❌ **JAMAIS print un token** en clair (logs, stdout, PR descriptions)
- ✅ Toujours masquer en debug : `${TOKEN:0:4}***${TOKEN: -3}`
- ✅ Rotation JWT : `pnpm rotate-secrets`
