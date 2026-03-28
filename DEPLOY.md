# Déploiement - @ezstart Monorepo

**APIs → Railway** | **Web → Vercel**

---

## Railway (APIs)

Toutes les APIs utilisent le même pattern de configuration dans le Railway Dashboard :

- **Root Directory** : `/` (racine monorepo)
- **Build Command** : `pnpm install --frozen-lockfile --shamefully-hoist && pnpm turbo build --filter=api-{name}...`
- **Start Command** : `pnpm --filter api-{name} start`
- **Watch Paths** : `apps/{name}/api/**`, `packages/express-core/**`, `packages/config/**`, `packages/logger/**`, `packages/monitoring/**`
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
pnpm rotate-secrets    # Génère JWT_SECRET, met à jour .env.local + .env.production, push Railway via CLI
pnpm validate-env      # Valide les .env contre .env.example
```

---

## Structure .env

```
apps/{name}/api/
├── .env.example       ← Template (committé)
├── .env.local         ← Dev local (gitignored)
└── .env.production    ← Production (gitignored)
```

- `.env.example` : toujours à jour, contient placeholders
- `.env.local` : valeurs réelles de dev, chargé par express-core
- `.env.production` : référence pour les variables Railway

---

## Checklist déploiement

1. Tester localement (`pnpm dev:{app}`)
2. Vérifier build (`pnpm turbo build --filter=api-{name}...`)
3. Vérifier typecheck (`pnpm typecheck`)
4. Mettre à jour `.env.example` si nouvelles variables
5. Push sur `master` → déploiement automatique Railway + Vercel
6. Vérifier healthcheck (`curl https://{service}.up.railway.app/health`)
