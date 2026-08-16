# 📐 Development Rules — @ezstart Monorepo

**Rules obligatoires** pour tous les contributeurs (humains et agents) travaillant sur ce monorepo.

---

## La source de vérité

Toutes les règles de qualité, agnosticité, publishability, tests, documentation et lint sont dans **un seul fichier** :

### 👉 [`.claude/rules/standard.md`](./.claude/rules/standard.md)

Lis-le avant toute contribution. Il contient :

- **Section 0** — Hiérarchie de décision : `reuse first`, `least-primitive wins`, créer seulement si absent, promote si pattern répété
- **Section 1** — Agnostique (packages publishable npm standalone)
- **Section 2** — Web-standard / TypeScript strict (zéro `any`, zéro console)
- **Section 3** — Pro (nommage, tailles, `@internal` tags)
- **Section 4** — Publishable (`package.json` complet)
- **Section 5** — Fully tested (vitest + `NODE_ENV=test`)
- **Section 6** — Documenté (README template strict)
- **Section 7** — Linté (ESLint plugin custom par package)
- **Grep commands** prêts à l'emploi pour audit rapide

## La boucle de développement

**Un seul pipeline**, documenté dans [`.claude/pipeline/loop.md`](./.claude/pipeline/loop.md) :

```
request → dev agent → auditor agent → PASS → commit
                         ↓ FAIL
                      dev fix → auditor → ...
```

- [`.claude/agents/dev.md`](./.claude/agents/dev.md) — rôle implémenteur
- [`.claude/agents/auditor.md`](./.claude/agents/auditor.md) — rôle vérificateur

## Règles domain-specific

En complément de `standard.md`, règles qui couvrent des domaines précis :

| Domaine             | Fichier                                                  |
| ------------------- | -------------------------------------------------------- |
| Protection des DB   | [data-protection.md](./.claude/rules/data-protection.md) |
| Git & commits       | [git.md](./.claude/rules/git.md)                         |
| Déploiement         | [deploy.md](./.claude/rules/deploy.md)                   |
| MongoDB             | [mongodb.md](./.claude/rules/mongodb.md)                 |
| Environnements .env | [env.md](./.claude/rules/env.md)                         |
| Next.js web setup   | [nextjs.md](./.claude/rules/nextjs.md)                   |
| Composants UI       | [ui.md](./.claude/rules/ui.md)                           |

## Archive

Les anciennes règles (organisées par catégorie fine avant consolidation) sont dans [`.claude/_archive/rules/`](./.claude/_archive/rules/). Référence historique uniquement — non-applicables.

## Documentation générale

- [README.md](./README.md) — Vue d'ensemble
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Guide contributeur
- [BACKLOG.md](./BACKLOG.md) — État des projets
- [DEPLOY.md](./DEPLOY.md) — Infrastructure
- [SECRETS.md](./SECRETS.md) — Gestion .env
- [GENERATORS.md](./GENERATORS.md) — Pipeline générateurs
