# 📋 Backlog — @ezstart Monorepo

**Ce fichier est la source de vérité pour les projets cross-project et infra.**
**Les backlogs per-app sont dans `apps/[app]/BACKLOG.md`.**

Usage : "reprend/continue [nom-du-projet]" → Claude lit le state, suit le workflow (plan → validation → agents).

---

## 📱 Applications

| App            | Status      | Backlog                                                            |
| -------------- | ----------- | ------------------------------------------------------------------ |
| gacha-analyzer | in-progress | [apps/gacha-analyzer/BACKLOG.md](./apps/gacha-analyzer/BACKLOG.md) |
| ezbill         | in-progress | [apps/ezbill/BACKLOG.md](./apps/ezbill/BACKLOG.md)                 |
| ezauth         | maintained  | [apps/ezauth/BACKLOG.md](./apps/ezauth/BACKLOG.md)                 |
| ezpay          | maintained  | [apps/ezpay/BACKLOG.md](./apps/ezpay/BACKLOG.md)                   |
| ezstart        | maintained  | [apps/ezstart/BACKLOG.md](./apps/ezstart/BACKLOG.md)               |
| green-pulse    | maintained  | [apps/green-pulse/BACKLOG.md](./apps/green-pulse/BACKLOG.md)       |
| fengshui       | maintained  | [apps/fengshui/BACKLOG.md](./apps/fengshui/BACKLOG.md)             |
| asc-tcd        | maintained  | [apps/asc-tcd/BACKLOG.md](./apps/asc-tcd/BACKLOG.md)               |

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
23. [x] extract-app.js test — après extraction, vérifier automatiquement que pnpm install && pnpm build passent
24. [ ] insert-app.js reverse — importer un standalone dans le monorepo (inverse de extract)
25. [x] Zod validation sur TOUTES les routes API (ezauth, ezbill, ezpay, ezstart, green-pulse) — gacha-analyzer déjà fait
26. [x] OpenAPI descriptions complètes — zéro warning au démarrage

### Full audit 2026-03-29

35. [x] Package audit — 19 packages audités, agnostic, scalable (Button brand, Badge CSS vars, Tag merge, globals agnostic)
36. [x] Standardize usage — sendSuccess/sendError all APIs (107 violations), console→logger (173), fetch→callApi (12), pagination (15 endpoints), React Query (3 files)
37. [x] Shared auth middleware — extracted to express-core (replaces 5 copy-pasted files)
38. [x] Package refactoring — config registry, rbac configurable, next-theme generic, seo-config injectable
39. [x] i18n compliance — ~275 strings translated across all apps
40. [x] HTML→Tag migration — all 8 apps clean, 0 violations
41. [x] Hardcoded colors→CSS vars — ~200+ fixed, ~20 legitimate remaining
42. [x] Deduplicate components — 8 components moved to packages/ui
43. [x] OAuth token encryption — AES-256-GCM in ezauth
44. [x] Localhost URLs — 3 files fixed, using @ezstart/config
45. [x] Reduce `any` types — 25 files fixed, all remaining `any` justified with eslint-disable
46. [x] HIGH: Gacha-analyzer — auth middleware sur DELETE/PUT routes
47. [x] HIGH: Green-Pulse — auth middleware centralisé sur workspaces
48. [x] HIGH: EZPay — auth middleware sur GET routes sensibles
49. [x] HIGH: login-cookie rate limiting — createStrictRateLimiter ajouté
50. [x] HIGH: Debug logging auth codes — remplacé par logger.debug()
51. [x] MEDIUM: Zod validation sur gacha-analyzer routes (get-scans, feedback, report, reanalyze, config)
52. [x] Logger — filtre NODE_ENV ajouté (debug/info silencieux en prod)
53. [x] Remplacer console.log par logger.debug() dans auth-sdk (7 logs clés restaurés)
54. [x] CSRF protection — middleware created in express-core, applied to ezauth cookie routes
55. [x] Json type adoption — Json type created in express-core, used where applicable (merged with #45)
56. [x] Large component splitting — 10 components split (data-page, BaguaPreviewModal, capture-preview, invoice-modal, green-pulse landing, rune-card-compact, scan/page, bench/page, fengshui/page, quote-modal)
57. [x] Dynamic import recharts — 6 components import recharts statically
58. [x] Aria-labels — icon-only buttons across gacha-analyzer, fengshui now have aria-label

### Cross-app audit 2026-03-31

#### P0 — Security critical

59. [x] Auth missing on write endpoints — green-pulse (9 routes), ezpay (3), ezstart (2) secured
60. [x] App enum desynchronized — gacha-analyzer + ezpay added to app list
61. [x] RBAC legacy migration — createRoleMiddleware in express-core, requireAdmin on ezauth admin
62. [x] Rate limiting on public endpoints — /token, /waitlist/add, /waitlist/check-status

#### P1 — Code quality cross-app

63. [x] i18n enforcement — check:i18n script created
64. [x] Mongoose typing — eliminate @ts-expect-error across APIs via express-core model factory
65. [x] Zod schema deduplication — verified no actual duplication across SDKs
66. [x] Currency formatter — formatCurrency + getCurrencySymbol in packages/ui
67. [x] JWT payload builder — extracted helper in ezauth

#### P2 — New packages / improvements

68. [x] @ezstart/email-service — ResendProvider + ConsoleProvider + templates, provider-agnostic pattern
69. [x] Socket.IO event constants — fixed mismatch in ezstart
70. [x] Webhook validation middleware — createWebhookVerifier in express-core
71. [x] Stripe key safety guard — fail fast if sk_live in dev or sk_test in prod
72. [x] Centralize app themes — all 8 apps have defined themes in config

#### P2.5 — Infra (2026-04-05)

77. [ ] SSR auth middleware — `createProtectedMiddleware()` dans auth-sdk/rbac pour Next.js middleware. Zéro flash client, config déclarative (publicPaths, protectedPaths, adminPaths+roles). Remplace les AuthGuard/RequireRole client-side pour l'auth check. Toutes les apps utilisent le même pattern.

#### P2.6 — Layout & Design System (2026-04-05)

78. [x] Fix Header backdrop-blur à scroll y=0 — backdrop-blur déplacé dans condition !isTop
79. [x] headerOverlay prop — ClientLayout overlay/block mode + ezstart home wired
80. [x] Unified variant taxonomy — tokens + variants centralisés dans design-system, 30 composants migrés, 13 tag files supprimés
81. [x] Density variant — compact/default/relaxed ajouté sur tous les container tags
82. [ ] Theme presets — Presets déclaratifs par app (dashboard=compact, landing=relaxed)
83. [x] Component reorganization — 56 fichiers réorganisés en 8 sous-dossiers catégorisés
84. [ ] SSR Layout split — Séparer ClientLayout en RSC + client islands

#### P2.7 — EZStart Hub (2026-04-06)

85. [ ] Rename /ez-libs → /packages — Documentation publique des packages (@ezstart/ui, auth-sdk, etc.)
86. [ ] Rename /ez-features → /tools — Micro-apps standalone (QR, CV, business card) avec free/pro
87. [ ] Admin hub centralisé — Fusionner /monitoring dans /admin, ajouter tabs EZAuth + EZPay
88. [ ] Landing page pro — Refonte home avec sections portfolio, tools, packages, apps

#### P3 — DevOps / Testing

73. [x] Test coverage baseline — setup: @ezstart/test-utils package exists with vitest config factory, MongoDB memory server, seed helpers. Per-app test writing tracked in individual app backlogs.
74. [x] Dead code detector — check:dead-code script created
75. [x] Component size limit — check:size script created
76. [x] Pagination response consistency — all list endpoints return { data, meta: { total, limit, offset } }

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
