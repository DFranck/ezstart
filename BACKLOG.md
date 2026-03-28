# 📋 Backlog — @ezstart Monorepo

**Ce fichier est la source de vérité pour les projets cross-project et infra.**
**Les backlogs per-app sont dans `apps/[app]/BACKLOG.md`.**

Usage : "reprend/continue [nom-du-projet]" → Claude lit le state, suit le workflow (plan → validation → agents).

---

## 📱 Applications

| App | Status | Backlog |
|-----|--------|---------|
| gacha-analyzer | in-progress | [apps/gacha-analyzer/BACKLOG.md](./apps/gacha-analyzer/BACKLOG.md) |
| ezbill | in-progress | [apps/ezbill/BACKLOG.md](./apps/ezbill/BACKLOG.md) |
| ezauth | maintained | [apps/ezauth/BACKLOG.md](./apps/ezauth/BACKLOG.md) |
| ezpay | maintained | [apps/ezpay/BACKLOG.md](./apps/ezpay/BACKLOG.md) |
| ezstart | maintained | [apps/ezstart/BACKLOG.md](./apps/ezstart/BACKLOG.md) |
| green-pulse | maintained | [apps/green-pulse/BACKLOG.md](./apps/green-pulse/BACKLOG.md) |
| fengshui | maintained | [apps/fengshui/BACKLOG.md](./apps/fengshui/BACKLOG.md) |
| asc-tcd | maintained | [apps/asc-tcd/BACKLOG.md](./apps/asc-tcd/BACKLOG.md) |

---

## 🔧 Monorepo / Infra / Cross-project

### Pagination rule
- Toutes les APIs doivent supporter la pagination `{ data, pagination }` — implémenté sur ezauth, ezbill, ezpay, green-pulse, gacha-analyzer

### Package agnosticity
- Tous les packages doivent être 100% agnostiques, pas de logique project-specific

### Monorepo tooling
1. [x] Husky + lint-staged — pre-commit hooks, prettier auto-format
2. [x] GitHub Actions CI — build + typecheck on PR/push to master
3. [x] Per-app BACKLOGs — chaque app a son BACKLOG.md, root = infra only
4. [x] Specialized agent roles — `.claude/agents/` avec 8 rôles réutilisables
5. [x] Pagination globale — toutes les APIs paginées (ezauth, ezbill, ezpay, green-pulse, gacha-analyzer)
6. [ ] Fix generators (create-app.js) — path bugs, stale refs, auto-register ports/tsconfig/dev scripts
7. [ ] insert-app.js — scaffolding complet avec wiring automatique (ports, tsconfig, scripts, BACKLOG)
8. [ ] extract-app.js — extraire une app en standalone avec ses dépendances packages
9. [ ] new-monorepo.js — starter kit template pour créer un nouveau monorepo @ezstart-like
10. [ ] Workspace validator — script qui vérifie la cohérence tsconfig refs vs apps/packages réels
11. [ ] Dynamic dev launcher — remplacer les 10+ scripts dev:x par un launcher dynamique
12. [ ] callApi React Query integration — tags de cache automatiques dans callApi/fetch-client
13. [ ] Rename cleanup — supprimer apps/game-analyzer/ résiduel (Windows lock)
14. [ ] Theme gacha-analyzer — renommer game-analyzer.css → gacha-analyzer.css dans packages/ui

### Cross-project items
15. [ ] Audit sécurité complet — en cours (agent security)
16. [ ] Audit code quality — en cours (agent code-quality)
17. [ ] READMEs à jour — en cours (agent documentation)
18. [ ] Standardiser toutes les réponses API — format unique { success, data, meta }
19. [ ] alert() → toast partout (ezbill fait, vérifier les autres apps)

---

## 📱 claude-mobile

**Status :** `done` | **Dernière mise à jour :** 2026-03-22

### Résolution
L'utilisateur a un abonnement Anthropic Max plan qui inclut claude.ai/code.
Flow : téléphone → claude.ai/code → GitHub → commit/push → Vercel auto-deploy.
Pas besoin de VPS ni d'app custom.

---

<!-- Template pour nouveau projet :

## 🏷️ nom-du-projet

**Status :** `planned` | `in-progress` | `blocked` | `done` | **Priorité :** haute/moyenne/basse | **Dernière mise à jour :** YYYY-MM-DD

### Objectif
[Description courte]

### Architecture décidée
[Structure fichiers]

### Décisions prises
[Ce qui a été validé]

### Étapes
1. [ ] ...

### Notes
[Contexte important]

-->
