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
6. [x] Fix generators (create-app.js) — path bugs fixés, auto-register ports/tsconfig/scripts
7. [x] insert-app.js — scaffolding complet avec wiring automatique + templates
8. [x] extract-app.js — recursive dep analysis, copies app + packages, generates standalone config
9. [x] new-monorepo.js — starter kit avec turbo/pnpm/husky/agents, remplace @ezstart par @[name]
10. [x] Workspace validator — `scripts/tools/validate-workspace.js` vérifie tsconfig/scripts/config
11. [x] Dynamic dev launcher — `scripts/tools/dev.js` avec auto-détection dépendances
12. [x] callApi React Query integration — queryKey + queryFn helpers dans createCallApi
13. [x] Rename cleanup — apps/game-analyzer supprimé, theme renommé
14. [x] Theme gacha-analyzer — game-analyzer.css → gacha-analyzer.css dans packages/ui

### Cross-project items
15. [x] Audit sécurité complet — 3 CRITICAL, 6 HIGH, 5 MEDIUM, 3 LOW identifiés
16. [x] Audit code quality — 20 problèmes identifiés, dead files + console.log packages fixés
17. [x] READMEs à jour — 19 packages + 8 apps READMEs réécrits (minimal <30 lignes)
18. [x] Standardiser les réponses API — helpers sendSuccess/sendError dans express-core + migration progressive
19. [x] alert() → toast partout — ezbill + fengshui + ezstart fixés, 0 alert() restant

### Sécurité (du rapport audit)
20. [x] CRITICAL: EZBill auth — JWT Bearer + X-User-Id fallback (dev), JWT_SECRET requis
21. [x] CRITICAL: JWT Secret — fallback supprimé, crash si non défini
22. [x] MOVED → apps/ezpay/BACKLOG.md (config app, pas monorepo)
31. [ ] extract-app.js test — après extraction, vérifier automatiquement que pnpm install && pnpm build passent
32. [ ] insert-app.js reverse — importer un standalone dans le monorepo (inverse de extract)
33. [ ] Zod validation sur TOUTES les routes API (ezauth, ezbill, ezpay, ezstart, green-pulse) — gacha-analyzer déjà fait
34. [ ] OpenAPI descriptions complètes — zéro warning au démarrage
23. [x] HIGH: Gacha-analyzer — auth middleware sur DELETE/PUT routes
24. [x] HIGH: Green-Pulse — auth middleware centralisé sur workspaces
25. [x] HIGH: EZPay — auth middleware sur GET routes sensibles
26. [x] HIGH: login-cookie rate limiting — createStrictRateLimiter ajouté
27. [x] HIGH: Debug logging auth codes — remplacé par logger.debug()
28. [x] MEDIUM: Zod validation sur gacha-analyzer routes (get-scans, feedback, report, reanalyze, config)
29. [x] Logger — filtre NODE_ENV ajouté (debug/info silencieux en prod)
30. [x] Remplacer console.log par logger.debug() dans auth-sdk (7 logs clés restaurés)

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
