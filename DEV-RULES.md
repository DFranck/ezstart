# 📐 Development Rules - @ezstart Monorepo

**Rules obligatoires pour tous les développeurs (et Claude) travaillant sur le monorepo @ezstart.**

Last Updated: 2025-10-26 (Added CRITICAL database protection rules after data loss incident)

---

## Quick Reference

Pour les agents codeurs : voir [.claude/agents/coding-rules.md](.claude/agents/coding-rules.md)

## Rules par catégorie

| Catégorie       | Fichier                                                | Contenu                                    |
| --------------- | ------------------------------------------------------ | ------------------------------------------ |
| Data Protection | [data-protection.md](.claude/rules/data-protection.md) | CRITIQUE — rules post-incident MongoDB     |
| Packages        | [packages.md](.claude/rules/packages.md)               | Hiérarchie, agnosticité, structure, README |
| UI/UX           | [ui.md](.claude/rules/ui.md)                           | Composants, couleurs, theme, i18n          |
| Data Fetching   | [data-fetching.md](.claude/rules/data-fetching.md)     | React Query setup                          |
| TypeScript      | [typescript.md](.claude/rules/typescript.md)           | Config centralisée, tsc -b                 |
| URLs & Ports    | [urls-ports.md](.claude/rules/urls-ports.md)           | Pattern 61xx, CORS, @ezstart/config        |
| MongoDB         | [mongodb.md](.claude/rules/mongodb.md)                 | connectToMongo, factory functions          |
| API Express     | [api.md](.claude/rules/api.md)                         | Routes, rate limiting, OpenAPI             |
| Next.js Web     | [nextjs.md](.claude/rules/nextjs.md)                   | Providers, config, Vercel                  |
| Environnements  | [env.md](.claude/rules/env.md)                         | .env architecture, secrets                 |
| Déploiement     | [deploy.md](.claude/rules/deploy.md)                   | Railway/Vercel                             |
| Git             | [git.md](.claude/rules/git.md)                         | Commits, validation, backlog               |
| Tests           | [testing.md](.claude/rules/testing.md)                 | Vitest, typecheck                          |
| Checklists      | [checklists.md](.claude/rules/checklists.md)           | Nouveau package, nouvelle app              |
| Troubleshooting | [troubleshooting.md](.claude/rules/troubleshooting.md) | Problèmes fréquents                        |
| Scripts         | [scripts.md](.claude/rules/scripts.md)                 | Organisation scripts/                      |

---

## 📚 Ressources

### Documentation Interne

- [CLAUDE.md](./CLAUDE.md) - Configuration complète du monorepo
- [DEPLOY.md](./DEPLOY.md) - Guide de déploiement
- [docs/README.md](./docs/README.md) - Dashboard des audits
- [docs/AUDIT-SUMMARY.md](./docs/AUDIT-SUMMARY.md) - Executive summary

### Guides Packages

- [packages/config/README.md](./packages/config/README.md) - URLs, ports, CORS
- [packages/express-core/README.md](./packages/express-core/README.md) - Infrastructure API
- [packages/ui/README.md](./packages/ui/README.md) - Composants UI
- [packages/auth-sdk/README.md](./packages/auth-sdk/README.md) - SDK authentification
- [packages/pay-sdk/README.md](./packages/pay-sdk/README.md) - SDK paiement

### Audits (16/16 Complete)

Voir [docs/README.md](./docs/README.md) pour la liste complète des audits.

---

**Last Updated:** 2025-10-26
**Version:** 2.0.0
**Maintainer:** @ezstart team
