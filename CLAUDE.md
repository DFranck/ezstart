# @ezstart Monorepo — Claude Configuration

## Role

**Claude = Architecte / Manager. JAMAIS développeur direct.** Tout code passe par des agents.

## Pipeline

Chaque tâche suit 8 étapes. Lire le fichier de l'étape en cours dans `.claude/pipeline/` :

| Étape       | Fichier             | Résumé                                              |
| ----------- | ------------------- | --------------------------------------------------- |
| 1. Plan     | `1-plan.md`         | Lire le code, plan, validation user                 |
| 2. Track    | `2-track-start.md`  | BACKLOG in-progress, créer issues, marquer tests ⏳ |
| 3. Code     | `3-code.md`         | Agents avec `coding-rules.md`                       |
| 4. Validate | `4-validate.md`     | Grep + tsc, bloquer si fail                         |
| 5. Track    | `5-track-update.md` | Issues fixed, tests à retester, BACKLOG progress    |
| 6. Test     | `6-test.md`         | vitest + MCP, résultats E2E-TESTS.md                |
| 7. Audit    | `7-audit.md`        | code-quality, i18n, ux, security (boucle fix)       |
| 8. PR       | `8-pr.md`           | Checklist finale, push, `gh pr create`              |

## Règles de code

**Tout est dans [DEV-RULES.md](./DEV-RULES.md)** + **[.claude/agents/coding-rules.md](.claude/agents/coding-rules.md)** (version agent).

## Git

- **JAMAIS** de push direct sur master — feature branch + PR
- Détecter le profil au démarrage : `git config user.name`
- **Admin** (franck/dfranck) : peut bypass `--no-verify` si urgence, review + merge PRs
- **Collaborator** (autres) : jamais de bypass, PR obligatoire, pas toucher aux configs monorepo
- Branches : `feat/`, `fix/`, `refactor/`, `chore/`
- Commits conventionnels, jamais "Generated with Claude Code" ou "Co-Authored-By: Claude"
- **ASK USER** avant push (Vercel free tier rate limits)

## BACKLOG

- Claude est le **SEUL** à mettre à jour BACKLOG.md (jamais les agents, jamais le user)
- Mettre à jour les statuts au bon moment, cocher les étapes, ajouter des notes si blockers

## Dev servers

```bash
pnpm dev ez      # EZStart + EZAuth + EZPay
pnpm dev bill    # EZBill + EZAuth
pnpm dev gp      # GreenPulse + EZAuth
pnpm dev pay     # EZPay
pnpm dev fs      # FengShui + EZAuth + EZPay
pnpm dev asc     # ASC-TCD
pnpm dev ga      # Gacha Analyzer + EZAuth
pnpm dev --list  # Voir toutes les apps
```

- TOUJOURS dire au user quel script lancer
- JAMAIS lancer un dev server sans prévenir

## Generators

Pipeline de génération zero-maintenance. Voir [GENERATORS.md](./GENERATORS.md).

- Convention : chaque package qui génère expose `"generate"` dans son `package.json`
- Sources committed (CSS, SVG, TS components) → outputs gitignored (`*.generated.ts`, `generated/**`)
- Triggers auto : `postinstall`, `prebuild`, `pnpm dev:packages`, husky pre-commit, CI
- Commandes : `pnpm generate` (all), `turbo run generate --filter=<pkg>` (ciblé)

## Documentation

| Doc                                      | Contenu                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| [README.md](./README.md)                 | Vue d'ensemble, quick start, applications, architecture                        |
| [CONTRIBUTING.md](./CONTRIBUTING.md)     | Guide contributeur (hiérarchie composants, workflow, ajouter feature/endpoint) |
| [DEV-RULES.md](./DEV-RULES.md)           | Index des règles dans `.claude/rules/` (UI, TS, MongoDB, routing, tests, ...)  |
| [BACKLOG.md](./BACKLOG.md)               | Index monorepo, "continue [projet]" pour reprendre                             |
| [DEPLOY.md](./DEPLOY.md)                 | Guide Railway/Vercel                                                           |
| [SECRETS.md](./SECRETS.md)               | Architecture `.env` centralisée (`secrets-loader`, shared vs app-specific)     |
| [GENERATORS.md](./GENERATORS.md)         | Pipeline de générateurs (themes, UI registry, PWA icons)                       |
| [.claude/agents/](./.claude/agents/)     | Rôles agents (coding-rules, code-quality, ux-quality, i18n, security, testing) |
| [.claude/rules/](./.claude/rules/)       | Règles détaillées par catégorie (chargées par DEV-RULES.md)                    |
| [.claude/pipeline/](./.claude/pipeline/) | Contexte par étape du pipeline (1-plan → 8-pr)                                 |
| [docs/audits.json](./docs/audits.json)   | Scores audit en direct (consommé par le dashboard monitoring)                  |

## Architecture

```
@ezstart/
├── packages/           # Partagés (ui, auth-sdk, pay-sdk, express-core, config, types...)
├── apps/               # Applications (ezstart, ezauth, ezpay, ezbill, green-pulse, fengshui, asc-tcd, gacha-analyzer)
├── .claude/agents/     # Rôles agents (coding-rules, audits)
├── .claude/pipeline/   # Étapes pipeline (1-plan → 5-pr)
├── DEV-RULES.md        # Règles de code
└── BACKLOG.md          # État des projets
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

**APIs → Railway** | **Web → Vercel** — Détails dans [DEPLOY.md](./DEPLOY.md)
