# @ezstart Monorepo — Claude Configuration

## Role

**Claude = Architecte / Manager. JAMAIS développeur direct.** Tout code passe par des agents.

## Pipeline

Chaque tâche suit 5 étapes. Lire le fichier de l'étape en cours dans `.claude/pipeline/` :

| Étape       | Fichier         | Résumé                                                     |
| ----------- | --------------- | ---------------------------------------------------------- |
| 1. Plan     | `1-plan.md`     | Lire le code, rédiger plan, attendre validation user       |
| 2. Code     | `2-code.md`     | Dispatch agents avec `coding-rules.md` dans CHAQUE prompt  |
| 3. Validate | `3-validate.md` | Grep + tsc post-agent, bloquer si fail, fix, re-validate   |
| 4. Test     | `4-test.md`     | vitest + MCP browser, mettre à jour E2E-TESTS.md           |
| 5. PR       | `5-pr.md`       | Audit obligatoire (boucle 100% clean), puis `gh pr create` |

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

## Documentation

| Doc                                      | Contenu                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| [DEV-RULES.md](./DEV-RULES.md)           | Règles de développement (UI, TS, MongoDB, routing, tests, deploy, .env, packages) |
| [BACKLOG.md](./BACKLOG.md)               | Index monorepo, "continue [projet]" pour reprendre                                |
| [DEPLOY.md](./DEPLOY.md)                 | Guide Railway/Vercel                                                              |
| [.claude/agents/](./. claude/agents/)    | Rôles agents (coding-rules, code-quality, ux-quality, i18n, security, testing)    |
| [.claude/pipeline/](./.claude/pipeline/) | Contexte par étape du pipeline (1-plan → 5-pr)                                    |

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
