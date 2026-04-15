# Backlog History — Items terminés

Archive des items complétés à travers tous les backlogs du monorepo @ezstart. Référence historique — ne modifie pas (ajoute uniquement en haut à chaque archivage depuis `BACKLOG.md`).

Groupement : date (YYYY-MM) décroissante → domaine (Infrastructure / Apps / Packages) → sous-section.
Quand la date exacte est inconnue, l'item est placé dans le mois/section où il apparaissait dans le backlog d'origine, avec mention "date inconnue".

---

## 2026-04

### Infrastructure

- [x] 2026-04-12 — Centralized env vars + scripts cleanup + root files audit (PR #40)
- [x] 2026-04-15 — Scripts secrets push/pull/audit bidirectional workflow (PR #41)
- [x] 2026-04-15 — Lean env vars + TEST_USER cleanup (PR #42)
- [x] 2026-04-11 — Refactor UI : standardize component usage + lint rules + SDK consumption + Textarea rename (PR #38)
- [x] Component reorganization — 56 fichiers réorganisés en 8 sous-dossiers catégorisés
- [x] Registry generator refactor — Tag alias detection (38 aliases), token classification (standard/radix/candidate/specific), `deprecatedBy` field, multi-line export bug fix. 227 components registered.
- [x] Tag aliases expansion — 18 new aliases (Figure, Blockquote, Code, Pre, Fieldset, Legend, Details, Summary, Em, Small, Mark, Dl, Dt, Dd, Figcaption, Hr, Time, Address). CVA variants + types + exports.
- [x] DesignTokenProvider on containers — Modal (size), Dialog (radius), Sheet (size+density), AlertDialog (density), Accordion (density+size), Tabs (size+density). 6 new providers.
- [x] Context migration — Accordion, Tabs, Label, Checkbox now read inherited tokens via `useDesignTokens()` instead of hardcoded values.
- [x] DataTable density deprecation — `density` prop added, `tableSize` marked @deprecated. Maps `relaxed`→`comfortable`. 100% backwards compatible.
- [x] Migrate deprecated tokens — Spinner textSize @deprecated, SkeletonText spacing→density, CommandGroup headingVariant→intent, CTA bgColor→intent, Hero alignment→align. FeatureGrid already uses standard `variant`.
- [x] Unify size scale — `xs` and `xl` added to Button/Badge. `default` alias for `md` in Spinner/Modal/FloatingPanel. All 5 standard values supported everywhere.
- [x] Add providers to remaining organisms — Carousel (size+density), PasswordInput (size), Form (FormTokens wrapper).
- [x] Inspector deprecatedBy display — Strikethrough + `→ replacement` on main page, chain details, and token lexicon.
- [x] Theme presets — `preset` prop on DesignTokenProvider. 5 presets: dashboard, landing, form, data, admin.
- [x] Theme CSS scoping — `[data-app="xxx"]` selector on all 6 theme CSS files. `data-app` attribute on `<html>` in all 8 apps.
- [x] FengShui /health fix — `/health` excluded from middleware matcher (no backend).
- [x] Design System Inspector MVP — `/packages/ui/inspector` avec registry 210 composants, chaîne dynamique, controls dynamiques, preview par niveau atomique, token flow diagnostic, hierarchy explorer, token lexicon.
- [x] QuickSignUpForm density — DesignTokenProvider density wrapper pour propagation auto aux Card/CardContent/Input enfants.
- [x] Hide provider selector for non-admin users — AISelector visible uniquement pour admin/superadmin via useAuth().
- [x] packages/ui atomic levels — Re-exports par niveau: base/ (46 primitifs), composed/ (33 composés), complex/ (10 complexes). Subpath exports dans package.json.

### AI platform (PR #39)

- [x] 2026-04-09 — AI admin panel multi-provider + chat empty-provider state (PR #39)
- [x] Centraliser AI dans ezstart-api — Routes chat/conversations/providers/prompts migrées de green-pulse → ezstart API. `appName` scope tout. Auth + rate limiting + ownership checks.
- [x] ai-sdk routes agnostiques — `/api/ai/chat`, `/api/ai/conversations`, `/api/ai/providers`, `/api/ai/prompts`, `/api/ai/app-providers`, `/api/ai/global-providers`.
- [x] AI admin dashboard (`<AIAdminDashboard>`) — Prompts CRUD, providers toggle, conversations list. SuperAdmin (sans appName) voit tout. i18n FR+EN. Pagination.
- [x] ai-sdk prompt management — Modèle `AISystemPrompt` avec multi-provider assignment, config overrides. CRUD API + UI + seed defaults. Chat utilise prompt DB.
- [x] ai-sdk provider registry par app — Modèle `AppProvider` + `GlobalProviderAccess`. EZStart autorise, apps activent. Cascade/fallback dans le chat.
- [x] Chat UX responsive — Sidebar toggle gauche, ConversationItem actions mobile, safe-area composer, welcome offset, padding symétrique.
- [x] Green-pulse chat locale — L'IA répond dans la langue de la locale (localeMap dans sendMessage.ts).
- [x] 2026-04-08 — DEPLOY Railway ezauth-api — Ajouter `--filter @ezstart/fetch-client --filter @ezstart/email-service` au build command. Redeploy.
- [x] Waitlist system removed — Entièrement supprimé (ezauth API/web, auth-sdk, green-pulse). QuickSignup le remplace.
- [x] QR Code persistence — Save en DB si connecté, page "Mes QR codes", admin voit tout. Model + CRUD + UI.
- [x] EZAuth/EZPay/EZStart admin dashboards — appName optionnel, superadmin voit tout avec colonne Apps. i18n variables fixées.
- [x] EZPay fixes — populateUserFromToken sur purchase/subscribe, validation fallback, any→unknown, rate limiting stats.
- [x] AI security audit — Auth sur chat, IDOR conversations, role enforcement prompts, ObjectId validation, @ts-expect-error removed, OpenAI model→gpt-4o.
- [x] Usage tracking par app — AIUsage model + service créés. Tracking fire-and-forget dans sendMessage.
- [x] ai-sdk cascade/fallback — Provider cascade par priorité dans le chat. Si provider A échoue, fallback auto sur B.
- [x] ai-sdk usage tracking — AIUsage model + trackAIUsage service (fire-and-forget) + wired dans sendMessage.ts.
- [x] ai-sdk `<AILayout>` — Composant client agnostique (Thread UI + providers + cascade + streaming + conversations). Hook `useAIThread()`.
- [x] OpenAI billing setup — Crédits rechargés ($5), cascade testée E2E (gemini→openai→gemini).
- [x] GlobalProviderAccess enforcement — Chat endpoint vérifie isAppAuthorizedForProvider. Explicit providerId → 403 si non autorisé. Cascade filtre providers non autorisés.
- [x] auth-sdk: `<AuthAdminDashboard>` extrait dans auth-sdk/client.
- [x] pay-sdk: `<PayAdminDashboard>` extrait dans pay-sdk/client.
- [x] ezstart admin: Tabs importent `<AuthAdminDashboard>`, `<PayAdminDashboard>`, `<AIAdminDashboard>`, `<MonitoringTab>` depuis les SDKs.

### EZAuth audit 2026-04-06

- [x] Auto-refresh tokens dans auth-sdk — 401 auto-retry already in callApi (fetch-client).
- [x] Fallback httpOnly → bearer en dev — auto-detect already implemented in AuthProvider resolveAuthMode().
- [x] Timer proactif — proactive refresh 1 min avant JWT expiry via getTokenExpiry() + setTimeout dans AuthProvider.

### GreenPulse

- [x] 2026-04-09 — GP-002: Project access control implemented — Owner OR member access check using `req.userId`. Returns 403 if unauthorized.
- [x] 2026-04-09 — GP-042: Theme routes auth — `updateTheme.ts` utilise `req.userId` for `updatedBy`. Auth middleware already on parent router.
- [x] 2026-04-08 — GP-200: Conference landing page `/earthday` — page existe, traduite en/fr/vi, quicksignup integrated.
- [x] 2026-04-08 — GP-201: Promo code system CANCELLED — Replaced by quicksignup flow. Users créés directement comme real accounts via quicksignup + noreply email. Pas de Lead model séparé. PromoCode tracké sur user profile si besoin.

### EZStart

- [x] SystemOverview globalHealthScore hardcoded fix — Remplacé par computation dynamique.
- [x] EZStart API — remove `any` types dans health/page.tsx, audits/page.tsx, admin/page.tsx, admin/components/user-management-table.tsx, api/alerting.ts, api/PerformanceMetric.ts, api/history/by-service.ts, api/audit/list.ts. 8 files typed.
- [x] Native HTML in feature demos — Replaced raw `<textarea>/<select>/<option>/<input>` par composants `@ezstart/ui` dans cv-generator-page.tsx, qr-code-page.tsx, business-card-page.tsx.
- [x] `<a>` tag in ErrorsFeed replaced by `Link`.
- [x] Metrics endpoint implemented — Aggregate real data: uptime %, avg response time, error rate, checks count per period (`api/src/routes/metrics/root.ts`).
- [x] Wire alerting service to scheduler — `alertServiceDown()` et `alertHighResponseTime()` appelés depuis `healthCheckScheduler.ts`.
- [x] Remove `node-cron` unused dependency — Scheduler utilise `setTimeout` (adaptive intervals).
- [x] EZStart admin audit — Rename `/ez-libs` → `/packages`, `/ez-features` → `/tools`. Admin hub centralisé : Monitoring + EZAuth + EZPay + AI tabs dans `/admin`.

### EZBill

- [x] 2026-04-09 — i18n: Quote modal gaps — all labels now use `useTranslations()` with FR+EN keys.
- [x] 2026-04-09 — i18n: Mark-paid modal fully i18n'd — 7 new keys added FR+EN.
- [x] Quote PDF generation implemented — `generateQuotePdfUrl()` now returns proper URL.
- [x] Hardcoded locale `'fr'` fix — groupInvoicesByMonth/Week/Quotes/Receipts use current locale from next-intl.
- [x] No client search/filter on main dashboard — search/filter now functional.
- [x] Due date display on invoice cards — due date now shown.

### EZPay (Phase 4+ complete)

- [x] 2026-04-07 — EP-003: Cancel button only on active subscriptions (fix completed).
- [x] 2026-04-07 — EP-004: Superadmin app filter — showAppFilter prop for multi-app filtering in EZPay dashboard.

---

## 2026-03

### Monorepo — Full audit 2026-03-29

- [x] Package audit — 19 packages audités, agnostic, scalable (Button brand, Badge CSS vars, Tag merge, globals agnostic).
- [x] Standardize usage — sendSuccess/sendError all APIs (107 violations), console→logger (173), fetch→callApi (12), pagination (15 endpoints), React Query (3 files).
- [x] Shared auth middleware — extracted to express-core (replaces 5 copy-pasted files).
- [x] Package refactoring — config registry, rbac configurable, next-theme generic, seo-config injectable.
- [x] i18n compliance — ~275 strings translated across all apps.
- [x] HTML→Tag migration — all 8 apps clean, 0 violations.
- [x] Hardcoded colors→CSS vars — ~200+ fixed, ~20 legitimate remaining.
- [x] Deduplicate components — 8 components moved to `packages/ui`.
- [x] OAuth token encryption — AES-256-GCM in ezauth.
- [x] Localhost URLs — 3 files fixed, using `@ezstart/config`.
- [x] Reduce `any` types — 25 files fixed, all remaining `any` justified with eslint-disable.
- [x] HIGH: Gacha-analyzer — auth middleware sur DELETE/PUT routes.
- [x] HIGH: Green-Pulse — auth middleware centralisé sur workspaces.
- [x] HIGH: EZPay — auth middleware sur GET routes sensibles.
- [x] HIGH: login-cookie rate limiting — `createStrictRateLimiter` ajouté.
- [x] HIGH: Debug logging auth codes — remplacé par `logger.debug()`.
- [x] MEDIUM: Zod validation sur gacha-analyzer routes (get-scans, feedback, report, reanalyze, config).
- [x] Logger — filtre NODE_ENV ajouté (debug/info silencieux en prod).
- [x] Remplacer console.log par logger.debug() dans auth-sdk (7 logs clés restaurés).
- [x] CSRF protection — middleware created in express-core, applied to ezauth cookie routes.
- [x] Json type adoption — Json type created in express-core, used where applicable.
- [x] Large component splitting — 10 components split (data-page, BaguaPreviewModal, capture-preview, invoice-modal, green-pulse landing, rune-card-compact, scan/page, bench/page, fengshui/page, quote-modal).
- [x] Dynamic import recharts — 6 components import recharts statically.
- [x] Aria-labels — icon-only buttons across gacha-analyzer, fengshui now have aria-label.

### Monorepo — Cross-app audit 2026-03-31

#### P0 Security critical

- [x] Auth missing on write endpoints — green-pulse (9 routes), ezpay (3), ezstart (2) secured.
- [x] App enum desynchronized — gacha-analyzer + ezpay added to app list.
- [x] RBAC legacy migration — `createRoleMiddleware` in express-core, `requireAdmin` on ezauth admin.
- [x] Rate limiting on public endpoints — `/token`, `/waitlist/add`, `/waitlist/check-status`.

#### P1 Code quality cross-app

- [x] i18n enforcement — check:i18n script created.
- [x] Mongoose typing — eliminate @ts-expect-error across APIs via express-core model factory.
- [x] Zod schema deduplication — verified no actual duplication across SDKs.
- [x] Currency formatter — `formatCurrency` + `getCurrencySymbol` in `packages/ui`.
- [x] JWT payload builder — extracted helper in ezauth.

#### P2 New packages / improvements

- [x] `@ezstart/email-service` — ResendProvider + ConsoleProvider + templates, provider-agnostic pattern.
- [x] Socket.IO event constants — fixed mismatch in ezstart.
- [x] Webhook validation middleware — `createWebhookVerifier` in express-core.
- [x] Stripe key safety guard — fail fast if `sk_live` in dev or `sk_test` in prod.
- [x] Centralize app themes — all 8 apps have defined themes in config.

#### P2.5 Infra (2026-04-05)

- [x] SSR auth middleware — `createProtectedMiddleware()` dans auth-sdk/middleware. Config déclarative (publicPaths, protectedPaths, adminPaths+roles).

#### P2.6 Layout & Design System (2026-04-05)

- [x] Fix Header backdrop-blur à scroll y=0 — backdrop-blur déplacé dans condition `!isTop`.
- [x] headerOverlay prop — ClientLayout overlay/block mode + ezstart home wired.
- [x] Unified variant taxonomy — tokens + variants centralisés dans design-system, 30 composants migrés, 13 tag files supprimés.
- [x] Density variant — compact/default/relaxed ajouté sur tous les container tags.

#### P2.7 EZStart Hub (2026-04-06)

- [x] Rename `/ez-libs` → `/packages` — Documentation publique des packages.
- [x] Rename `/ez-features` → `/tools` — Micro-apps standalone (QR, CV, business card) avec free/pro.
- [x] Admin hub centralisé — Monitoring + EZAuth + EZPay + AI tabs dans `/admin`.

#### P3 DevOps / Testing

- [x] Test coverage baseline — setup `@ezstart/test-utils` package avec vitest config factory, MongoDB memory server, seed helpers.
- [x] Dead code detector — check:dead-code script created.
- [x] Component size limit — check:size script created.
- [x] Pagination response consistency — all list endpoints return `{ data, meta: { total, limit, offset } }`.

### Monorepo — Monorepo tooling (historique)

- [x] Husky + lint-staged — pre-commit hooks, prettier auto-format.
- [x] GitHub Actions CI — build + typecheck on PR/push to master.
- [x] Per-app BACKLOGs — (obsolète : fusionnés dans BACKLOG.md root le 2026-04-15).
- [x] Specialized agent roles — `.claude/agents/` avec 8 rôles réutilisables.
- [x] Pagination globale — toutes les APIs paginées (ezauth, ezbill, ezpay, green-pulse, gacha-analyzer).
- [x] Fix generators (create-app.js) — path bugs fixés, auto-register ports/tsconfig/scripts.
- [x] `insert-app.js` — scaffolding complet avec wiring automatique + templates.
- [x] `extract-app.js` — recursive dep analysis, copies app + packages, generates standalone config.
- [x] `new-monorepo.js` — starter kit avec turbo/pnpm/husky/agents, remplace @ezstart par @[name].
- [x] Workspace validator — `scripts/tools/validate-workspace.js` vérifie tsconfig/scripts/config.
- [x] Dynamic dev launcher — `scripts/tools/dev.js` avec auto-détection dépendances.
- [x] callApi React Query integration — queryKey + queryFn helpers dans createCallApi.
- [x] Rename cleanup — apps/game-analyzer supprimé, theme renommé.
- [x] Theme gacha-analyzer — game-analyzer.css → gacha-analyzer.css dans `packages/ui`.
- [x] Audit sécurité complet — 3 CRITICAL, 6 HIGH, 5 MEDIUM, 3 LOW identifiés.
- [x] Audit code quality — 20 problèmes identifiés, dead files + console.log packages fixés.
- [x] READMEs à jour — 19 packages + 8 apps READMEs réécrits (minimal <30 lignes).
- [x] Standardiser les réponses API — helpers `sendSuccess`/`sendError` dans express-core + migration progressive.
- [x] `alert()` → toast partout — ezbill + fengshui + ezstart fixés, 0 `alert()` restant.
- [x] CRITICAL: EZBill auth — JWT Bearer + X-User-Id fallback (dev), JWT_SECRET requis.
- [x] CRITICAL: JWT Secret — fallback supprimé, crash si non défini.
- [x] `extract-app.js` test — après extraction, vérifier automatiquement que `pnpm install && pnpm build` passent.
- [x] Zod validation sur TOUTES les routes API (ezauth, ezbill, ezpay, ezstart, green-pulse) — gacha-analyzer déjà fait.
- [x] OpenAPI descriptions complètes — zéro warning au démarrage.

### EZAuth — Audit complet 2026-03-29

#### P0 Sécurité critique

- [x] SEC-4: `/me` endpoint sans middleware auth standard — Utilise `verifyTokenMiddleware` et accède à `req.user`.
- [x] SEC-5: Crypto key derivation — `OAUTH_ENCRYPTION_KEY` séparé de JWT_SECRET.
- [x] SEC-7: Waitlist GET endpoints — auth + admin check.

#### P1 Fonctionnalités manquantes

- [x] FEAT-1: Password reset flow — Endpoints + model + page web + email.
- [x] FEAT-2: Email verification — Endpoints + `isVerified: false` default + middleware + email.
- [x] FEAT-4: 2FA (TOTP) — Model + endpoints setup/verify/disable + UI profile + flow login.
- [x] FEAT-5: Account deletion (self-service) — `DELETE /auth/account` + cascade OAuth + UI.
- [x] FEAT-6: Session management UI — Dashboard sessions + révocation.
- [x] FEAT-7: Refresh token rotation — Access 15min + refresh 30 jours.
- [x] FEAT-8: Admin delete user — `DELETE /admin/users/:id`.
- [x] FEAT-9: Admin search/filter users — Implémenté search (email/username) + role.
- [x] FEAT-10: Profile update endpoint — Self-service firstName/lastName/avatar.
- [x] FEAT-11: Session current marker — isCurrent flag + badge "Session actuelle" + bouton Révoquer masqué.
- [x] RBAC-1: Simplifier le système de roles — Hiérarchie `superadmin > admin > app:admin > app:editor > app:viewer > user`. Supprimé legacy `roles`/`permissions`/`features`. `hasAccess(user, app, requiredRole)` dans auth-sdk. Page admin EZAuth. Tests unitaires. Migration users.

#### P2 Qualité de code

- [x] CODE-1: Hardcoded strings dans web — login/register/home utilisent `useTranslations()`.
- [x] CODE-3: `as any` casts (4 occurrences) — Typés correctement.
- [x] CODE-5: appRoles Map-to-Object conversion — Extrait dans `utils/map-to-record.ts`.

#### P3 UX Web

- [x] UX-1: "Forgot password" link — Ajouté.
- [x] UX-2: Register form validation temps réel — Endpoint `check-availability` + debounce form.
- [x] UX-3: Register password strength indicator — Composant password strength.
- [x] UX-4: Register confirm password — Champ ajouté.
- [x] UX-5: Error messages pas i18n — Codes d'erreur API mappés vers messages i18n.
- [x] UX-7: Login/Register Suspense uniforme — Pattern Spinner partout.

#### P4 API Quality

- [x] API-1: Response format inconsistant — Toutes réponses via `sendSuccess`/`sendError`.
- [x] API-2: OpenAPI registries OAuth — Ajouté `google-authorize` et `google-callback`.
- [x] API-3: Waitlist routes dupliquées — Route publique supprimée/limitée aux stats.
- [x] API-4: Logout blacklist — JWT blacklist en Redis ou refresh tokens.
- [x] API-5: OAuth callback redirect_uri — Validation whitelist origins autorisées.

### EZPay — Phases 1-4 complete

#### Phase 1 Critical Security

- [x] 1.3 Auth manquant sur verify-payment — rate limiting specifique ou `optionalAuthMiddleware`.
- [x] 1.4 Webhook refund lookup — store `payment_intent` + chercher par payment_intent dans `charge.refunded`.
- [x] 1.5 Stripe API version — Upgrade v14 → v22 (API `2026-03-25.dahlia`).

#### Phase 2 Qualité Code

- [x] 2.3 Stats endpoint — `Payment.aggregate()` avec `$group` + `$facet`.
- [x] 2.4 Fallback silencieux validation échouée — `sendValidationError()` retourné.
- [x] 2.5 `Record<string, any>` dans pay-sdk types — Union type `DonationMetadata | PurchaseMetadata | SubscriptionMetadata | InvoiceMetadata`.
- [x] 2.7 `as any` dans tests — Types corrects.

#### Phase 3 UX Web

- [x] 3.1 Web app quasi vide — Pages `/donate/success`, `/donate/cancel`, `/dashboard`, `/donations`.
- [x] 3.2 Navigation/header/footer — Layout avec navigation cohérent.
- [x] 3.4 i18n incomplet — Traductions FR accents corrigés + layout.json utilisé.
- [x] 3.5 Page 404 custom — Design EZPay + i18n FR/EN + bouton retour.
- [x] 3.6 Remplacer `window.confirm` par AlertDialog — Admin dashboard, Test Center, RefundButton, SubscriptionCard. ConfirmActionDialog avec 4 états.

#### Phase 4 API Robustesse

- [x] 4.1 Endpoint refund — `POST /payments/:paymentId/refund` auth admin + DB status update.
- [x] 4.2 GET /payments (liste) — Pagination + filtres (type, status, projectId, userId, dateRange).
- [x] 4.3 Purchase redirect URLs — `/purchase/success`, `/purchase/cancel`, `/subscribe/success`.
- [x] 4.4 Subscriptions list filter projectId — Ajouté comme donations/purchases.
- [x] 4.5 Donations list requiert auth — `optionalAuthMiddleware` (mur public).

#### Phase 5 Features Manquantes

- [x] 5.1 Payment history users — `GET /payments/me` + SDK `getMyPayments()`.
- [x] 5.3 Multi-currency support — EUR/GBP + `Intl.NumberFormat`.
- [x] 5.6 Composants SDK purchases/subscriptions — PurchaseButton, PaymentSuccessPage, SubscribeButton, SubscriptionCard, PaymentHistory, RefundButton, ProductCard, ProductGrid, UserPaymentDashboard, ConfirmActionDialog, formatCurrency.

#### Phase 6 Tech Debt

- [x] 6.2 PayPal reference morte — Documenté dans code (futur support).
- [x] 6.3 Legacy export Payment model — `export const Payment = { get: getPaymentModel }` supprimé.
- [x] 6.4 Commented-out code DonateModal — Supprimé.
- [x] 6.5 `dangerouslySetInnerHTML` DonationWall — Déplacé en CSS / Tailwind animate-\*.
- [x] 6.6 useDonations missing deps — `loadDonations` dans useCallback + deps array.

#### Dependencies

- [x] P-RBAC — Package rbac upgradé avec permissions granulaires, `hasRole`/`hasAnyRole`. Toutes apps refactorées.

#### Phase 7 Admin & Marketplace

- [x] P-SUCCESS: Payment Success/Cancel Pages — PaymentSuccessPage/PurchaseButton exportés. Stripe test products. Webhook handling. Toast "Merci pour votre soutien !".
- [x] P-ADMIN: EZPay Admin Interface — Dashboard avec DataTable, stats, filtres, pagination. RBAC EZAuth. Boutons Rembourser/Annuler. Plans/Promos CRUD. Soft delete. Interface marketplace-ready.
- [x] P-SUBSCRIPTION: Subscription Management — SubscribeButton, Cancel (period end), purchase/subscription e2e testing, webhooks subscription events, `useSubscriptionStatus()` hook, `<FeatureGate>`.
- [x] P-PROMO: Codes Promo — Modèle `PromoCode`, CRUD API, validation achat, UI admin, UI client (Stripe coupons), `<PromoCodeInput>`.
- [x] P-MARKETPLACE: ProductGrid/ProductCard, PaymentHistory — Via pay-sdk.
- [x] P-TESTCENTER: Test Center & Admin Dashboard — Tabs, provider banner, stats, Rembourser/Annuler, SSO EZAuth, i18n FR/EN.

### EZStart — Audit monitoring

- [x] 1.3 Hardcoded `globalHealthScore = 96.6` fix.
- [x] 1.4 `any` types removed (9 files).
- [x] 1.5 Native HTML replaced by UI components.
- [x] 1.6 `<a>` tag replaced by Link.
- [x] 2.1 Metrics endpoint implemented.
- [x] 2.3 Alerting service wired to scheduler.
- [x] 2.5 Removed `node-cron` unused dependency.

---

## Notes de migration

Cette archive consolide les items `- [x]` des 8 anciens fichiers `apps/*/BACKLOG.md` + du `BACKLOG.md` root, fusionnés le 2026-04-15. Les dates précises antérieures à 2026-04-06 sont souvent manquantes (les audits historiques n'horodataient pas item par item). Les items non-datés sont placés dans le mois où ils apparaissaient dans le backlog d'origine (2026-03 pour les audits de mars, 2026-04 pour le reste).

Quelques items étaient marqués `done` via la convention textuelle (ex: `done`, `(done 2026-04-09)`, `Status: done`) plutôt que `- [x]` — ils sont inclus ici avec leur date d'origine quand disponible.
