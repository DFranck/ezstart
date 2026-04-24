# Backlog History — Items terminés

Archive des items complétés à travers tous les backlogs du monorepo @ezstart. Référence historique — ne modifie pas (ajoute uniquement en haut à chaque archivage depuis `BACKLOG.md`).

Groupement : date (YYYY-MM) décroissante → domaine (Infrastructure / Apps / Packages) → sous-section.
Quand la date exacte est inconnue, l'item est placé dans le mois/section où il apparaissait dans le backlog d'origine, avec mention "date inconnue".

---

## 2026-04

### Packages — auth-sdk + EZAuth white-label theme primary-only (2026-04-24)

- [x] 2026-04-24 — **White-label theme: primary-only + light/dark auto-sync + kill hardcoded app-themes.ts** — Simplification SaaS-pro du white-label theme EZAuth aligné Stripe/Clerk. (1) **UI editor primary-only** : `ApplicationThemeEditor` retire les 3 champs `background`/`foreground`/`accent` — ne garde que `primary` + `logo` + toggle `themeEnabled`. Preview card utilise `var(--preview-primary, var(--primary))` sur le bouton mock, sans override des tokens background/foreground. (2) **Backend backcompat** : Zod `applicationThemeSchema` conserve les 4 champs (ancienne data préservée en DB, jamais rendue en CSS). `GET /api/keys/config` expose désormais `appDisplayName` (depuis `Application.name`) pour le rendu "Sign in to access \<brand\>". (3) **SSR renderer simplifié** : `renderThemeStyle` émet uniquement `:root{--primary:<value>;}` — plus de scoping `data-app` ni de règle `.dark` dupliquée. Ezauth layout fixe `data-app="ezauth"` (au lieu de `ssrAppName`), ce qui rend obsolète la cascade via `packages/ui/src/styles/themes/<slug>/<slug>.css`. (4) **Light/dark auto-sync consumer ↔ ezauth** : `<LoginButton>` / `<RegisterButton>` auto-détectent la préférence via `detectCurrentThemePreference()` (cookie `theme` next-themes, `data-theme` attribut, classe `.dark`/`.light` sur `<html>`) et l'envoient à ezauth via `?theme=light|dark|system`. Middleware ezauth valide la valeur (whitelist) et écrit le cookie `theme` sur la réponse → next-themes pick up au prochain render. `SignInForm` renvoie la préférence actuelle d'ezauth via `?theme=` à l'URL callback consumer. `AuthCallbackPage` lit `?theme=` et applique (cookie + classe DOM) pour un switch complet à la fermeture de boucle. (5) **Kill hardcoded config** : `apps/ezauth/web/src/config/app-themes.ts` supprimé, hook `useDynamicAppTheme` supprimé (dead code après la refonte), 3 pages clients (login/register/forgot-password) utilisent désormais `ssrAppDisplayName` + `keyConfig.appDisplayName` + fallback `prettifySlug(slug)`. (6) **Tests** : 20 nouveaux tests (`ApplicationThemeEditor.test.tsx` 10 + `theme-preference.test.ts` 10), `theme-ssr.test.ts` réécrit pour le nouveau contrat (primary-only, bare `:root` selector), `register-button.test.tsx` +3 tests pour la propagation `?theme=`, `theme.test.ts` (api-ezauth) +2 tests pour `appDisplayName`. **Validation** : `pnpm --filter @ezstart/auth-sdk typecheck && test` PASS (296 tests, 32 files). `pnpm --filter api-ezauth typecheck && test` PASS (375 tests). `pnpm --filter web-ezauth typecheck && test` PASS (29 tests). `pnpm -r typecheck` PASS (tous packages). Audit greps PASS (zero `getAppTheme`, zero `:root[data-app` dans ezauth/web/src). Cf. `.claude/rules/standard-saas.md` §5.2 + JSDoc dans `ApplicationThemeEditor`.

### Packages — api-core CORS 3-tier refactor (2026-04-24)

- [x] 2026-04-24 — **CORS 3-tier refactor (api-core + all APIs)** — SaaS-grade origin policy (public/Bearer `*`, cookie-auth allowlist). New middlewares `createPermissiveCorsMiddleware` (Tier 1/2: `ACAO: *`, `credentials: false`) and `createStrictCorsMiddleware({ allowlist })` (Tier 3: reflects origin, `credentials: true`) added to `@ezstart/api-core`; legacy `createCorsMiddleware` kept `@deprecated` for backcompat. `createApiServer` now applies permissive globally and strict only on `cookieAuthRoutes` prefixes (mutually exclusive per-path to avoid `ACAO: *` leaking into rejected strict responses). `createEzstartServer` adds `cookieAuthRoutes[]` + `cookieAuthAllowlist[]` options; falls back to `getAllowedOrigins(appName)` when allowlist is omitted. Each API opts-in its cookie routes: `ezauth` declares `/api/auth/{login,refresh,logout,sso-exchange,token,oauth}` + Vercel preview regex allowlist; all others (`ezpay`, `ezbill`, `green-pulse`, `ezstart`, `gacha-analyzer`) declare `[]` (Bearer/publishable-key only — external consumers can now call them from any origin). `createCorsConfig` in `@ezstart/config` marked `@deprecated`. Tests: **38 CORS tests** total (24 in `cors.security.test.ts` — legacy + permissive + strict, 14 in new `ezstart-cors.test.ts` — integration with `createApiServer`). README `@ezstart/api-core` updated with dedicated "CORS policy" section citing the 3 tiers. Typecheck + test suites PASS for `api-core` (177), `api-ezauth` (373), `api-ezpay` (550), `api-ezbill` / `api-green-pulse` / `api-ezstart` / `api-gacha-analyzer` (typecheck). Unblocks external consumers on any origin (preview deploys, third-party sites). Cf. `.claude/rules/standard-saas-cors.md`.

### Packages — ai-sdk AnthropicProvider finalisation (2026-04-23)

- [x] 2026-04-23 — **Anthropic provider** — `AnthropicProvider` dans `packages/ai-sdk/src/server/providers/anthropic.ts` était déjà implémenté (commit 030074bc) mais (1) non exporté depuis `src/index.ts`, (2) sans aucun test, (3) modèle par défaut obsolète. Corrigé : `AnthropicProvider` + config types exportés (alongside OpenAI/Gemini), default model = `claude-sonnet-4-5` (+ constantes `DEFAULT_MAX_TOKENS` / `DEFAULT_TEMPERATURE`), vitest infra ajouté (`vitest.config.ts` + `__tests__/setup.ts`), **21 tests** (`anthropic.test.ts`) couvrent constructor/validateConfig, sendMessage non-stream (temperature/maxTokens/history/systemPrompt filter/empty-text), vision (base64 images), JSON extraction (valid + malformed), streaming (onChunk/onComplete + finalMessage errors), error handling (401 Auth, 429 RateLimit, 5xx overloaded_error, APIConnectionError). README mis à jour (section Providers avec tableau + quickstart direct/registry). L'entrée backlog disait `throw new Error('not yet implemented')` mais c'était obsolète — fermé pour de bon.
- [x] 2026-04-23 — **AI vision support (GeminiProvider + FengShui migration)** — Le `GeminiProvider` supportait déjà vision via `ImageInput[]` dans `ProviderSendOptions` (`inlineData` parts avec `mimeType` + `data` base64), aussi bien en non-stream (`generateContent`) qu'en streaming (`generateContentStream`). Ajouté **19 tests** (`gemini.test.ts`) couvrant : constructor/env fallback/custom model, sendMessage single + history (startChat pattern), vision (1 image, multi-images, images+history bypass chat mode, empty array), JSON extraction (valid, malformed, combined avec vision), streaming (onChunk/onComplete, streaming + images, streaming + history, empty chunk skip), error propagation (generateContent / stream / malformed base64). Ménage mineur : import `ChatMessage` inutilisé retiré. **Migration `apps/fengshui`** : `validate.service.ts` passe de `@google/generative-ai` direct à `GeminiProvider` de `@ezstart/ai-sdk` (`provider.sendMessage(VALIDATION_PROMPT, { images, temperature: 0.3, extractJson: true })`). Dépendance `@google/generative-ai` retirée du `package.json` de `web-fengshui`, remplacée par `@ezstart/ai-sdk: workspace:*`. Total 42 tests passent dans `@ezstart/ai-sdk` (21 anthropic + 19 gemini + 2 setup), typecheck + build ai-sdk + typecheck web-fengshui verts.

### Cross-cutting — Consumer app publishable keys + pay-sdk migration (2026-04-23)

- [x] 2026-04-23 — **CROSS-KEY-001: Publishable key migration for 6 consumer apps**: seed script `apps/ezauth/api/src/scripts/seed-consumer-app-keys.ts` creates one `ez_pk_live_*` publishable key per consumer app (ezstart, ezbill, green-pulse, fengshui, asc-tcd, gacha-analyzer) linked to its Application doc (scope='user', createdBy='system-seed-consumer'). Idempotent — re-runs are no-ops. Ran on Railway staging (6 keys generated). Each app's `.env.local` + `.env.example` updated with `NEXT_PUBLIC_EZAUTH_KEY=`. All AuthProviders already wired `publishableKey={process.env.NEXT_PUBLIC_EZAUTH_KEY}`. No `?app=` hardcoded links found (Mission 4 no-op). Keys captured in `tmp/consumer-app-keys-2026-04-23.txt` (gitignored). Tests: 5 new vitest specs in `__tests__/scripts/seed-consumer-app-keys.test.ts`.
- [x] 2026-04-23 — **pay-sdk `appName` deprecation closure — green-pulse admin/payments + admin/test-payments**: both pages migrated from `appName="green-pulse"` to `applicationId={process.env.NEXT_PUBLIC_EZAUTH_APP_ID}` (PayProvider + PayAdminDashboard + `client.listPlans()`). Unblocked by CROSS-KEY-001. Last two legacy consumers — pay-sdk is now 100% on the `applicationId` path.

### Apps — P7 closure + Stripe Connect dogfood + UX fixes (2026-04-23)

**P7 full closure — all 8 phases A-H validated E2E on staging** (commits a3432a2d → cccb28bb)

- [x] 2026-04-23 — **P7-H E2E matrice**: Subscription dogfood scenario validated end-to-end on staging via MCP (Stripe test card 4242 → webhook → DB update → role grant). Non-dogfood Connect handoff scenario also validated (subscription externe → split fee).
- [x] 2026-04-23 — **P7-RBAC-FIX**: 3 hacker vulnerabilities closed on `BillingDashboard` `applicationId` filter. `useSubscriptionStatus` / `usePaymentHistory` / `useApplicationContext` now refuse cross-app queries when `applicationResolutionStatus === 'failed'`. `PayProvider` no longer fails open on transient `resolveApplicationByKey` errors. Commits merged to staging.
- [x] 2026-04-23 — **Stripe Connect per-app scoping**: ConnectedAccount onboarding now scopes by `applicationId` (not just user) so an owner can onboard multiple apps independently. Connect route moved under `/developer/applications/<id>/connect` with the correct `applicationId` pre-filled. Fixes previous "Invalid onboard data" 400. Commit `cccb28bb`.
- [x] 2026-04-23 — **Connect callback HMAC-signed state**: the Stripe Connect return URL now ships an HMAC-signed `state` payload (shared secret between ezpay API + web callback) to prevent an attacker from swapping an `accountId` in the redirect. Commit `cccb28bb`.

**UX batch — 6 cross-service dashboard bugs fixed** (commit a5c08d56)

- [x] 2026-04-23 — **Login redirect fix**: redirect after login now lands on the `return_to` param when present (was falling back to `/` after session establishment).
- [x] 2026-04-23 — **Whitelabel `scope=admin` fallback**: AuthAdminDashboard on whitelabel apps correctly falls back to `scope='admin'` when `scope='myApps'` returns empty.
- [x] 2026-04-23 — **Callback `appName` authoritative**: auth callback now uses the `app` param from the OAuth handoff as authoritative (no silent override to the ezauth-web first-party fallback).
- [x] 2026-04-23 — **`/developer` nav link**: Dashboard sidebar nav now links to `/developer` on non-ezauth apps (was 404'ing because the old ezauth-only route had moved).
- [x] 2026-04-23 — **Apps listing cross-app**: `ApplicationsList` on ezpay/ezstart dashboards now correctly shows apps the current user owns across all services (was limited to the caller's own app).
- [x] 2026-04-23 — **Connect route 404 fix**: `/developer/applications/[id]/connect` page restored after P6 refacto (was removed by mistake).

### Packages — auth-sdk callback error parsing (2026-04-16)

- [x] 2026-04-16 — **Auth callback error display**: `AuthCallbackPage` now routes unknown errors through `extractAuthErrorMessage()` which tries `parseApiError` (envelope + details), falls back to `Error.message` (rejecting `[object Object]`), then to `Error.cause`, then to the raw string, before using the provided fallback. Fixes the "[object Object]" display that appeared on rate-limited / validation callbacks. Commit `a7a26d40`.

### Infra — Staging readiness for P7 (2026-04-23)

- [x] 2026-04-23 — **Staging migrations verified**: ran 5 idempotent scripts on DB staging — `migrate:keys-to-apps`, `migrate:plans-to-apps`, `migrate:connected-accounts-to-apps`, `seed:self-key` (ezauth + ezpay), `seed:plans` (ezpay dogfood). All green.
- [x] 2026-04-23 — **Staging publishable keys rotated**: regenerated `NEXT_PUBLIC_EZAUTH_KEY` + `NEXT_PUBLIC_EZPAY_KEY` for staging and pushed them to Vercel per-app env vars.
- [x] 2026-04-23 — **Stripe webhook secret fix**: corrected `STRIPE_WEBHOOK_SECRET` mismatch between Stripe dashboard endpoint and Railway env var on api-ezpay staging.
- [x] 2026-04-23 — **Backfill ObjectId guard fix**: `migrate-connected-accounts-to-apps` now skips rows with a malformed legacy `appName` string when no `Application` can be resolved, instead of crashing.
- [x] 2026-04-23 — **Vercel orphans cleanup**: removed 8 orphan `web-*` Vercel projects that had no deployment attached (via `vercel projects rm`).

### Apps — P8 UI consolidate + per-app billing + EZ-AUTO-ROLES (2026-04-22)

- [x] 2026-04-22 — **UI-CONSOLIDATE-001**: Unified `/dashboard` sidebar pattern (Stripe/Clerk-style). Consolidated `/account`, `/developer`, `/billing` in one dashboard with sidebar + RBAC conditional sections (Overview / Account / Applications / API Keys / Billing / Usage / Settings + admin Users / Apps / Platform). Routes `/en/dashboard/[section]`. Deprecated old routes with 301 redirects. Mirror on ezpay/ezstart/ezbill. Commit `25abeed9`.
- [x] 2026-04-22 — **PER-APP-BILLING-001**: Wired `<BillingDashboard appName="<current-app>" userId={user._id}/>` slot on ezauth, ezbill, green-pulse, fengshui, asc-tcd web. Users see their local subs per app without going to ezpay. Commit `f5c8166a`.
- [x] 2026-04-22 — **EZ-AUTO-ROLES**: Auto-set `appRoles[slug]: ['admin']` on Application create (`apps/ezauth/api/src/routes/applications/create.ts`). Migration script `migrate-app-owners-to-admin-role.ts` backfills existing Applications. Enables direct JWT role check instead of fetch Application + compare ownerId. Future-proof for multi-tenant Org. Commit `f5c8166a`.
- [x] 2026-04-22 — **EZ-KEY-002**: Login/register first-party fallback `appName='ezauth'` (not 'ezstart'). Fixed in `apps/ezauth/web/src/app/[locale]/(auth)/login/page.tsx` + `register/page.tsx`.
- [x] 2026-04-22 — **EZ-KEY-003**: DevModeBanner hidden in first-party mode.

### Apps — P9 Trial + Annual + Stripe Tax + Customer Portal config + ChangePlan (2026-04-22)

- [x] 2026-04-22 — **EP-008 Trial periods**: Plan model `trialDays?: number`. Checkout passes `subscription_data.trial_period_days`. PricingPage displays trial badge. `useSubscriptionStatus()` already has `isTrialing`. Commit `6b002095`.
- [x] 2026-04-22 — **PricingPage annual/monthly toggle**: Monthly/Annual billing period switcher on PricingPage + Save N% badge when annual discount configured.
- [x] 2026-04-22 — **Stripe automatic_tax**: Enabled `automatic_tax: { enabled: true }` on Checkout Sessions for VAT/sales tax compliance.
- [x] 2026-04-22 — **configure-stripe-portal.ts script**: Idempotent script to configure Stripe Customer Portal features (cancel, update payment method, download invoices, etc.) via API. Run once per Stripe account.
- [x] 2026-04-22 — **EP-007 ChangePlan**: `POST /api/subscriptions/:id/change-plan` endpoint calls `stripe.subscriptions.update()` with new price + proration. SDK `<ChangePlanButton currentPlan targetPlan />` component exported. Commit `6b002095`.

### Apps — Bug fixes (2026-04-22)

- [x] 2026-04-22 — **Auth callback redirect URI fallback**: login/register first-party correctly falls back when no app context.
- [x] 2026-04-22 — **PayProvider apiUrl missing config fix**: providers.tsx adds `config={{ apiUrl: NEXT_PUBLIC_EZPAY_API_URL ?? 'http://localhost:6130' }}`.
- [x] 2026-04-22 — **AuthUser.appRoles enum removed**: Free-form `maxlength: 64` instead of hardcoded enum, allows apps to define their own role vocabulary.
- [x] 2026-04-22 — **Staging Stripe keys**: Fixed staging env using `sk_live_*` by accident → reverted to `sk_test_*` for safety.

### Apps — P6 multi-tenant Application + P7 Stripe Connect monetization (2026-04-21)

**P6 — Application multi-tenant cross-service** (commits a3432a2d → 9dc9cd4f, validated E2E via MCP)

- [x] 2026-04-21 — **EZ-KEY-001**: Renommer préfixes clés `ezk_*` → `ez_pk_*` / `ez_sk_*` (Stripe/Clerk pattern). KEY*PREFIX map, detectKeyFormat(), generateRawApiKey({type,env}). Backwards compat ezk*\* preserved (P6-A).
- [x] 2026-04-21 — **EZP-KEY-001**: EZPay consumer SaaS d'EZAuth via publishable key. NEXT*PUBLIC_EZAUTH_KEY=ez_pk_live*\*, AuthProvider config, LoginButton redirect ?key=. Validated E2E (P6).
- [x] 2026-04-21 — **P6-A**: EZAuth Application model (slug/name/ownerId/metadata) + 7 routes /api/applications/\* (CRUD + lookup + resolve) + migration script + seed dogfood (ezauth+ezpay Applications) + 75 tests.
- [x] 2026-04-21 — **P6-B**: auth-sdk Application hooks (useMyApplications/useApplication/useCreate/Update/Revoke/ResolveByKey) + components (ApplicationsList/Card/CreateModal/DetailView) + promoted api-keys-crypto to SDK core (agnostic) + 51 tests.
- [x] 2026-04-21 — **P6-C**: EZAuth web /developer refacto with ApplicationsList + [id] detail route + i18n EN/FR/VI.
- [x] 2026-04-21 — **P6-D**: EZPay API ApiKey model with applicationId + middleware validateApiKey (SHA-256 hot path, no cross-service per request) + 7 routes /api/keys/\* + ezauth-client S2S (5s timeout, circuit breaker 3 fails→30s) + 87 tests.
- [x] 2026-04-21 — **P6-E**: pay-sdk usePayKeys/useCreate/Revoke/Rotate/Usage hooks + PayDeveloperPortal + CreatePayKeyModal (re-export KeyCreatedModal from auth-sdk) + 31 tests.
- [x] 2026-04-21 — **P6-F**: EZPay web /developer tabs (Applications/API Keys/Stripe Connect/Plans) + /developer/applications/[id] detail stacking auth-sdk + pay-sdk dashboards + i18n.
- [x] 2026-04-21 — **P6-G**: EZPay seed-self-key idempotent script bootstrap (lookup Application ezpay via ezauth public lookup endpoint, no S2S key needed).

**P7 — Stripe Connect true monetization** (commits aee8a7fb → a7eeda40, validated E2E checkout 4242 → webhook → DB update)

- [x] 2026-04-21 — **P7-C4**: Stripe subscription fee bugfix — application_fee_percent (0-100) for subs, application_fee_amount (cents) for one-shots. ConnectOptions augmented + 13 tests.
- [x] 2026-04-21 — **P7-A / EZP-KEY-002**: Plan.applicationId + stripeProductId + metadata.grantsRoles/grantsFeatures/feePercent + auto-sync Stripe Product/Price (deterministic idempotency) + owner-scoped CRUD + migrate-plans-to-applications + seed-ezpay-plans (Starter Free 5% / Growth 49€ 3% / Enterprise 199€ 1.5%) + 41 tests.
- [x] 2026-04-21 — **P7-B / EP-020/021**: ConnectedAccount.applicationId unique + isPlatformAccount flag + migration backfill + seed platform dogfood for all EZStart apps (ezauth/ezpay/ezstart/ezbill/green-pulse/fengshui/asc-tcd/gacha-analyzer) + switchability route PATCH /api/connect/accounts/:id (superadmin spin-off) + 30 tests.
- [x] 2026-04-21 — **P7-C / EP-022**: connect-fee resolver(applicationId) with dogfood skip (isPlatformAccount=true → no transfer_data, no fee) + resolveActiveEzpayPlan (Starter/Growth/Enterprise tier) + caller updates in subscriptions/donations/purchases routes + 33 tests.
- [x] 2026-04-21 — **P7-D / EP-006**: Stripe Customer Portal POST /api/billing/portal (platform-side call, correct for Connect destination subs) + PayClient.createBillingPortalSession + useBillingPortal hook + ManageSubscriptionButton component + integrated in BillingDashboard + 18 tests.
- [x] 2026-04-21 — **P7-E / EP-024**: pay-sdk migrate appName→applicationId. PayProvider accepts publishableKey prop, fetches /keys/config once on mount, stores applicationId in context + components updated (PricingPage/SubscribeButton/etc.) + useApplicationContext hook + 12 tests.
- [x] 2026-04-21 — **P7-F / EZP-KEY-003**: cross-service subscription webhook EZPay→EZAuth via HMAC-SHA256 signed S2S call + new EZAuth POST /api/subscriptions/webhook receiver + SubscriptionEvent idempotency model (unique stripeEventId index) + role/feature grant/revoke logic + 41 tests.
- [x] 2026-04-21 — **P7-G / EP-023**: pay-sdk PlansManager + PlanEditorDialog + EZPay web /developer/applications/[id]/plans/ page + i18n + 16 tests.
- [x] 2026-04-21 — **P7-H**: E2E MCP full validation. Created Acme Pro €19/mo + EZAuth Free/Pro/Enterprise plans → Stripe Products/Prices auto-synced. Stripe Checkout test 4242 → Payment status=completed → cross-service webhook OK.
- [x] 2026-04-21 — **P7-I / EZ-KEY-005**: Unified /en/billing page ezpay with RBAC sections (My subscription / My apps revenue / Platform). PayAdminDashboard accepts scope prop ('mine'|'myApps'|'all') forwarded to backend. /api/payments + /api/subscriptions accept ?scope= query. Nav link added. 11 tests.
- [x] 2026-04-21 — **P7-J**: Unified /en/account page ezauth with RBAC sections (My profile / My apps users / Platform users). AuthAdminDashboard repurposed scope prop to AuthAdminAudienceScope ('mine'|'myApps'|'all'). /api/admin/users accept ?scope= query. UserMenu link onManageAccount → /account. 5 tests.
- [x] 2026-04-21 — **PricingPage applicationId fix**: PricingPage propagates applicationId prop to SubscribeButton + planId now uses Plan.\_id (DB ObjectId) instead of stripePriceId for backend Plan.findById lookup.
- [x] 2026-04-21 — **PayProvider apiUrl config fix**: providers.tsx adds config={{ apiUrl: NEXT_PUBLIC_EZPAY_API_URL ?? 'http://localhost:6130' }} so PayClient resolves ezpay API instead of relative paths.

### Infrastructure

- [x] 2026-04-16 — Migrate 6 APIs from `@ezstart/express-core` → `@ezstart/api-core`. 279 source files migrated, ESLint rule `no-express-core` blocks regressions, express-core package deleted.
- [x] 2026-04-16 — Fix OpenAPI params schemas crash. Added `extendZodWithOpenApi(z)` to api-core + fixed 23 route files `.describe()` → `.openapi()`.
- [x] 2026-04-16 — SDK 3-layer architecture (standard.md 0bis). api-sdk (core/react split), pay-sdk (core/react/components), auth-sdk (core/react/components + RBAC merged in). All packages standard-compliant.
- [x] 2026-04-16 — Deleted deprecated packages: `@ezstart/fetch-client` (replaced by api-sdk), `@ezstart/express-core` (replaced by api-core), `@ezstart/next-theme` (merged into ui/theme). `@ezstart/rbac` merged into auth-sdk.
- [x] 2026-04-16 — ESLint rules `no-express-core` and `no-fetch-client` set to `error` to block regressions on deleted packages.
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
