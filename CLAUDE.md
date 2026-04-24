# @ezstart Monorepo — Claude Configuration

## Role

**Claude = Architecte / Manager.** Tout code passe par trois agents : `dev` (implémente), `auditor` (vérifie standard.md) et `hacker` (casse et prouve les bugs), en boucle `dev → auditor → fix → hacker → fix → commit`.

## Pipeline

**Une seule boucle**, documentée dans [`.claude/pipeline/loop.md`](./.claude/pipeline/loop.md).

```
user request → dev → auditor → PASS → hacker → CLEAN → commit
                       ↓ FAIL              ↓ VULNS
                    dev fix → ...       dev fix → hacker → ...
```

3 rôles : `dev` (implémente), `auditor` (vérifie standard.md), `hacker` (attaque le code, prouve les failles). Le checklist qualité est dans [`.claude/rules/standard.md`](./.claude/rules/standard.md).

## Règles

**Source de vérité unique** : [`.claude/rules/standard.md`](./.claude/rules/standard.md) — les 7 critères (agnostique / TS strict / pro / publishable / testé / documenté / linté) + la hiérarchie de décision (reuse first, least-primitive wins).

Domaines spécifiques (applicables en plus du standard) :

- [`.claude/rules/git.md`](./.claude/rules/git.md) — commits conventionnels, branches, push policy
- [`.claude/rules/deploy.md`](./.claude/rules/deploy.md) — Railway (APIs) + Vercel (web)
- [`.claude/rules/data-protection.md`](./.claude/rules/data-protection.md) — production safety (MongoDB, NODE_ENV=test)
- [`.claude/rules/mongodb.md`](./.claude/rules/mongodb.md) — `connectToMongo()` pattern
- [`.claude/rules/env.md`](./.claude/rules/env.md) — `.env.example`/`.env.local`/`.env.production`
- [`.claude/rules/nextjs.md`](./.claude/rules/nextjs.md) — Provider stack (i18n + theme + auth)
- [`.claude/rules/ui.md`](./.claude/rules/ui.md) — composants `@ezstart/ui`, classes sémantiques, i18n user-facing
- [`.claude/rules/standard-ui.md`](./.claude/rules/standard-ui.md) — checklist packages/ui/ et SDK components (architecture, responsive, dark mode)
- [`.claude/rules/standard-saas.md`](./.claude/rules/standard-saas.md) — checklist apps SaaS (API + Web + Infra + features + product completeness)
- [`.claude/rules/standard-saas-keys.md`](./.claude/rules/standard-saas-keys.md) — API key naming convention (ez*pk*/ez*sk*), dogfood pattern, bootstrap, migration from ezk\_\*
- [`.claude/rules/standard-saas-cors.md`](./.claude/rules/standard-saas-cors.md) — CORS 3-tier policy (public/Bearer → `*`, cookie-auth → allowlist), jamais de `CORS_ORIGINS` env var pour les consumers externes
- [`.claude/rules/standard-architecture.md`](./.claude/rules/standard-architecture.md) — modèle 3-tier platform (Tier 1 SaaS services : ezauth+ezpay / Tier 2 consumer apps / Tier 3 platform hub : ezstart). Decision tree pour placer toute feature. À lire AVANT toute nouvelle feature.

## Git

- **Jamais** de push direct sur master — feature branch + PR (exception hotfix admin documenté)
- Profil : `git config user.name` → admin (franck/dfranck) peut `--no-verify` en hotfix urgent
- Branches : `feat/` `fix/` `refactor/` `chore/`
- Commits conventionnels, **jamais** "Generated with Claude Code" ni "Co-Authored-By: Claude"
- **Ask user avant push** (Vercel Hobby quota)

## BACKLOG

- Claude seul met à jour [`BACKLOG.md`](./BACKLOG.md) (jamais les agents, jamais le user)
- Statuts à jour, cases cochées, blockers notés

## Dev servers

```bash
pnpm dev ez      # EZStart + EZAuth + EZPay
pnpm dev bill    # EZBill + EZAuth
pnpm dev gp      # GreenPulse + EZAuth + EZStart (ai-sdk)
pnpm dev pay     # EZPay
pnpm dev fs      # FengShui + EZAuth + EZPay
pnpm dev asc     # ASC-TCD
pnpm dev ga      # Gacha Analyzer + EZAuth
pnpm dev --list  # Voir toutes les apps
```

- **Toujours** dire au user quel script lancer
- **Jamais** lancer un dev server sans prévenir

## Documentation (index court)

| Doc                                                        | Contenu                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| [README.md](./README.md)                                   | Vue d'ensemble, quick start, apps, architecture          |
| [CONTRIBUTING.md](./CONTRIBUTING.md)                       | Guide contributeur                                       |
| [BACKLOG.md](./BACKLOG.md)                                 | Index monorepo, "continue [projet]" pour reprendre       |
| [DEPLOY.md](./DEPLOY.md)                                   | Railway + Vercel                                         |
| [SECRETS.md](./SECRETS.md)                                 | Architecture `.env` centralisée                          |
| [GENERATORS.md](./GENERATORS.md)                           | Pipeline themes / UI registry / PWA icons                |
| [`.claude/rules/standard.md`](./.claude/rules/standard.md) | **Le** checklist unique                                  |
| [`.claude/pipeline/loop.md`](./.claude/pipeline/loop.md)   | La boucle `dev → auditor → hacker`                       |
| [`.claude/agents/dev.md`](./.claude/agents/dev.md)         | Rôle implémenteur                                        |
| [`.claude/agents/auditor.md`](./.claude/agents/auditor.md) | Rôle vérificateur                                        |
| [`.claude/agents/hacker.md`](./.claude/agents/hacker.md)   | Rôle adversarial tester                                  |
| [`.claude/_archive/`](./.claude/_archive/)                 | Anciens docs archivés (référence historique, non-actifs) |

## Architecture

```
@ezstart/
├── packages/           # SDKs agnostiques publishables (api-sdk, api-contracts, ui, auth-sdk, ...)
├── apps/               # 8 apps (ezstart, ezauth, ezpay, ezbill, green-pulse, fengshui, asc-tcd, gacha-analyzer)
├── .claude/
│   ├── rules/          # standard.md + 8 domain-specific
│   ├── agents/         # dev.md + auditor.md
│   └── pipeline/       # loop.md (seul)
└── BACKLOG.md
```

## Ports

| Service        | API  | Web  |
| -------------- | ---- | ---- |
| EZStart        | 6100 | 6101 |
| EZAuth         | 6110 | 6111 |
| EZBill         | 6120 | 6121 |
| EZPay          | 6130 | 6131 |
| ASC-TCD        | —    | 6141 |
| FengShui       | —    | 6151 |
| GreenPulse     | 6160 | 6161 |
| Gacha Analyzer | 6170 | 6171 |

## Déploiement

**APIs → Railway** | **Web → Vercel** — détails dans [DEPLOY.md](./DEPLOY.md) et [`.claude/rules/deploy.md`](./.claude/rules/deploy.md).
