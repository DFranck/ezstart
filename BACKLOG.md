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
10. [x] Workspace validator — `scripts/tools/validate-workspace.js` vérifie tsconfig/scripts/config
11. [ ] Dynamic dev launcher — remplacer les 10+ scripts dev:x par un launcher dynamique
12. [ ] callApi React Query integration — tags de cache automatiques dans callApi/fetch-client
13. [x] Rename cleanup — apps/game-analyzer supprimé, theme renommé
14. [x] Theme gacha-analyzer — game-analyzer.css → gacha-analyzer.css dans packages/ui

### Cross-project items
15. [x] Audit sécurité complet — 3 CRITICAL, 6 HIGH, 5 MEDIUM, 3 LOW identifiés
16. [x] Audit code quality — 20 problèmes identifiés, dead files + console.log packages fixés
17. [x] READMEs à jour — 19 packages + 8 apps READMEs réécrits (minimal <30 lignes)
18. [ ] Standardiser toutes les réponses API — rapport audit fait, fix à implémenter (ezbill pire, ezauth mixte)
19. [x] alert() → toast partout — ezbill + fengshui + ezstart fixés, 0 alert() restant

### Sécurité (du rapport audit)
20. [ ] CRITICAL: EZBill auth — remplacer X-User-Id par JWT réel via EZAuth
21. [ ] CRITICAL: JWT Secret — supprimer fallback hardcodé, crash si non défini
22. [ ] CRITICAL: Stripe — utiliser sk_test en dev, sk_live uniquement via Railway env vars
23. [ ] HIGH: Gacha-analyzer — ajouter auth middleware sur routes destructives
24. [ ] HIGH: Green-Pulse — implémenter auth JWT (pas X-User-Id)
25. [ ] HIGH: EZPay — ajouter auth sur routes sensibles
26. [ ] HIGH: login-cookie rate limiting
27. [ ] HIGH: Debug logging auth codes — supprimer ou conditionner sur NODE_ENV
28. [ ] MEDIUM: Zod validation sur toutes les routes gacha-analyzer + green-pulse
29. [ ] Logger — ajouter filtre NODE_ENV dans @ezstart/logger (debug/info seulement en dev)
30. [ ] Remplacer console.log supprimés par logger.debug() dans les packages

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
