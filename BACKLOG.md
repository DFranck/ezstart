# @ezstart Monorepo Backlog

Source unique de vérité pour les items **en cours / à faire**. Les items terminés sont déplacés dans [BACKLOG-HISTORY.md](./BACKLOG-HISTORY.md).

## Conventions

- `- [ ]` item à faire / en cours
- `- [x]` terminé → déplace vers `BACKLOG-HISTORY.md` à la prochaine passe
- **Priorité** : items les plus importants en tête de section
- **Blockers** : note `**Bloqué par :** <ref>` si dépendance explicite
- Pour un item cross-app, préfixer par `[app]` quand utile

---

## Auth standalone V1 — Path to Clerk-level Pro (post-MVP)

**Status MVP** : ezauth standalone est production-ready à **~99.95%** (Day 2026-05-01 : massive Wave 1+2+3 + P0 SSR/UX session — ~38 commits, ezauth/ezpay/ezstart now consume `auth-sdk/server`, `pay-sdk/server`, `ai-sdk/server`, `api-core/crypto`, `api-core/audit-log`. Tier 1 SaaS service pattern aligned with `standard-architecture.md`). Tu peux vendre ezauth aujourd'hui à un client B2B externe — secret keys S2S server-to-server fonctionnent end-to-end avec multi-tenancy enforced.

Historique : **Day 2026-05-01 (Wave 1+2+3 + P0 SSR/UX)** : 38 commits, ~1500-1800 LOC duplicated → packages, ~700-1000 LOC net reduction. V1-V11 generic plumbing extraction + V_SSR/V_MOUNTED/V_CSP/V_P1_UI P0 fixes + V_SERVERONLY_FIX P0 boot crash. Cf. `BACKLOG-HISTORY.md` 2026-05 + reports `tmp/agent-full-audit-2026-05-01.md`, `tmp/agent-audit-duplications-2026-05-01.md`, `tmp/audit-pre-push-2026-05-01.md`, `tmp/hack-pre-push-2026-05-01.md`. **Night 2026-05-01** (X1+X2+X3 = 12 commits, +44 tests). **Sprint 2026-04-30** : 5 P1 quick wins + Wave 2 (5 V1 features shippées + 2 scaffolds prêts à activer + 3 minor cleanups). **Sprint 2026-04-29** : 60+ commits + 4 P0 sécurité fix + ~15 P1/P2 hardening + 5 QW disclosure/SEO/a11y.

**Night fixes 2026-05-01 (3 agents background pendant que user dort)** :

- [x] **TESTMODE-COALESCE** 🟡 P2 — testModeScopePlugin live mode coalesces `isTestMode: undefined` (backward compat pre-V2 docs). Plus besoin de run la migration manuellement pour la visibilité — le plugin fait `$or: [{isTestMode:false}, {isTestMode:{$exists:false}}]` automatiquement. Strict opt-in en test mode (jamais accidental surface). Commits `5aab6f55`/`d964ede4`/`b046d7b7` (X1) — +12 tests.
- [x] **ADMIN-APP-DETAIL-LINK** 🟢 UX — Bouton "View details" sur chaque row de /admin/applications → navigate `/{locale}/developer/<id>` via next-intl router. SDK i18n-agnostic (`onApplicationOpen` callback prop, default omits button). Commits `65ab5bff`/`3ba37312` (X2) — +4 tests.
- [x] **UNIFIED-AUTH-S2S** 🔴 P0 — `unifiedAuthMiddleware` dans api-core accepte JWT cookie OU API key header (`Authorization: ApiKey ez_sk_*` ou `X-API-Key`). Wired sur 9 routes admin (applications/_ + api-keys/_ + admin/list-users + admin/analytics-overview). Multi-tenancy enforced : admin key bound to slug "acme" voit ONLY acme data même si underlying user est superadmin (security boundary testé). pk\_\* rejetés sur routes admin (insufficient scope 403). Customers peuvent maintenant call l'API server-to-server avec leur sk_live sans passer par SDK ou superadmin JWT. Commits `14bb748e`/`46c1cf3c`/`b9a66623`/`9c30dd36`/`d27e166d`/`d866e021` (X3) — +18 tests + +14 tests api-core.
- [x] **DASHBOARD-DROP-API-KEYS-001** 🟠 P1 — Drop `?section=api-keys` (cross-app `<DeveloperPortal>`) du `EZAuthDashboard` — redondant avec le tab Keys per-Application sous `/developer/<id>` (industry pattern Stripe/Clerk/Auth0/Supabase). Sidebar "Applications" relabelled to "Developer" (icon `lucide:Code`), section path slug `'applications'` kept stable (no deeplink break). Apps list pedagogically improved : sub-title "Apps organize your API keys, themes, and webhooks" + key count badge per card + clearer empty state. `<UserDashboard>` untouched (separate component, has its own tabs). Consumers wanting a global keys view can still mount `<DeveloperPortal>` via `extraSections`.
- [x] **UX-SIGNIN-ARIA-HASPOPUP** 🟠 P1 (#137) — `<UserMenuV2Trigger>` no longer announces `aria-haspopup="menu"` on the inner `<Button>`. Two-state semantics: (1) Authenticated — the trigger is wrapped by `<Dropdown>` whose `<div role="button">` already exposes `aria-haspopup="menu"`, the duplicate inner attribute caused redundant double-announcement. (2) Not authenticated — the trigger fires `login()` which performs a hard `window.location.href` redirect to the EZAuth sign-in page (a page navigation, NOT a popup), so any `aria-haspopup` value would mislead screen readers into expecting a menu/dialog that never appears. Screen readers now hear "Sign in, button" instead of "Sign in, menu button" on the public landing CTA. Inline JSDoc documents the dual semantics so the next contributor doesn't naively re-add the attribute. Zero functional change ; pure a11y fix.
- [x] **USER-MENU-PLAN-BADGE-SUPERADMIN** 🟠 P1 — `<UserMenuV2>` identity-card badge no longer surfaces a misleading "Free" subscription tier for superadmin / app-level admin users. New `resolvePlanBadge(user, planLabel, texts)` helper resolves the badge by priority : (1) `globalRoles.includes('superadmin')` → "Platform" (purple variant + Crown icon), (2) any `appRoles[*].includes('admin')` → "Admin" (info variant + ShieldCheck icon), (3) consumer-provided `planLabel` → subscription tier (variant per tier : Free=secondary, Pro=primary, Enterprise=purple), (4) nothing → no badge. New i18n keys `userMenu.platformBadge` / `userMenu.adminBadge` shipped in EN/FR/VI. Consumer apps (ezauth `app-shell.tsx` + admin `page.tsx`) keep their `planLabel="Free"` prop unchanged — the SDK now overrides it for elevated roles. +10 unit tests for the resolver cover priority order, locale override, and defensive missing-roles handling.
- [x] **JWT-ISVERIFIED-CLAIM-001** (#119) 🟠 P1 — JWT payload now carries the user's `isVerified` claim alongside `userId` / `email` / `globalRoles`. Consumer apps can gate verified-only features straight from the decoded token without an extra `/me` round trip. Single source of truth `buildJwtPayload()` in `apps/ezauth/api/src/services/auth.service.ts` — automatically picked up by every issuance route (login, refresh rotation, OAuth authCode exchange, magic-link, 2FA validate, SSO exchange, quick-signup) since they all funnel through `issueSession()`. Backward compat: SDK `JWTPayload.isVerified?: boolean` is optional — legacy tokens signed before this change simply omit it and the decoder returns `undefined` (consumers fall back to `user.isVerified` from the auth store, or coerce to `false` for a strict gate). Once the longest refresh token has rotated (~30 days), the field can be made required. Test helpers `generateAccessToken` / `generateExpiredToken` updated to carry the new claim. Tests: +5 vitest cases (3 in `auth.service.test.ts` covering buildJwtPayload + issueSession verified/unverified, +2 in `jwt-handling.test.ts` covering SDK decoder backward-compat including legacy tokens that omit the field).
- [x] **REGISTRY-GENERATED-TYPECHECK** (#130) 🟡 P2 — Hardened both registry generators (`packages/auth-sdk/scripts/generate-registry.cjs` + `packages/ui/scripts/generate-ui-registry.cjs`) against future regressions. (1) New `isInternalComponent()` helper filters out components whose immediately-attached TSDoc carries `@internal`, even if they're re-exported via the public components index (caught `AuthCardShell` + `AuthModalShell` in auth-sdk : explicitly tagged `@internal` with "consumers should reach for the public X / Y components instead" — now hidden from `/docs/components`, still importable for advanced users). (2) Atomic write pattern (`writeFileSync` to `.tmp` + `renameSync`) eliminates the WelcomeModal-corruption-001 race window flagged by agent #152 — no more half-written buffer visible to a concurrent reader / HMR / crashed run. Validated : `pnpm typecheck` passes 39/39, both generators produce zero diff across 3 consecutive runs (modulo timestamp), 564 auth-sdk tests + 56 ui tests still green.
- [x] **ADD_CARD_INTENT_PROP-001** (#167) 🟠 P1 — `<Card>` from `@ezstart/ui` accepts a new `intent` prop (`none` | `warning` | `success` | `info` | `destructive` | `primary`) following the Mantine `color` / Chakra `colorScheme` pattern for callout cards (notifications, demo mode, past-due billing, etc.). Adds a tinted border + soft tinted background that composes ON TOP of the existing `variant` (variant handles shadow / padding / elevation, intent handles the semantic accent color). Default `intent="none"` adds zero classes → backward-compat zero break for every existing Card usage in the monorepo. Refactored the DEMO MODE banner on `/docs/components/[category]/[component]/page.tsx` (PreviewFrame.tsx) to drop the absolute-overlay hack and use `<Card intent="warning">` with `<CardHeader>` (banner) + `<CardContent>` (sandbox visual + checker pattern) composition — banner is now structurally part of the preview card. +10 vitest cases (`packages/ui/src/__tests__/components/data-display/card.test.tsx`) covering default `none`, all 5 non-`none` intents, combo `variant="floating" intent="warning"`, children rendering inside intent-tinted card, and consumer className composition. CHANGELOG updated. No version bump.

**New P1/P2 items discovered during Day 2026-05-01 audits (HACKER + AUDITOR + FULL_AUDIT)** :

- [ ] **WEBHOOK-RAWBODY-001** 🟠 P1 (~1h) — `apps/ezauth/api/src/routes/subscriptions/webhook.ts:211` re-serializes the body via `JSON.stringify(req.body)` to verify HMAC signature instead of using `rawBodyRoutes`. Works today but a future engine upgrade (Bun/Deno/V8) could change key ordering and silently break webhook signatures. Fix : switch receiver to raw body capture via `bodyParser.raw()` and pass to `verifyEzstartSignature` directly. (HACKER finding `tmp/hack-pre-push-2026-05-01.md`)
- [ ] **AUTH-SSR-CONSUMERS-001** 🟠 P1 (~1-2h total) — 3 consumer web apps still ship `<AuthProvider authMode="httpOnly">` without `initialUser` SSR-bootstrap → flash LoginButton → UserMenu on cold load. Apply the V_SSR pattern (already done for ezpay-web + ezstart-web today) to : `apps/ezbill/web/.../layout.tsx + providers`, `apps/fengshui/web/.../layout.tsx`, `apps/gacha-analyzer/web/.../layout.tsx`. Call `getServerAuth({ apiUrl, cookieHeader })` in `app/[locale]/layout.tsx`, forward to Providers. (AUDITOR finding `tmp/audit-pre-push-2026-05-01.md`)
- [ ] **STATUS-PAGES-REAL-001** 🟠 P1 (1-2 jours) — Status pages still stubs : ezauth `/status` lists 3 components but never queries them, ezpay `/status` is hardcoded "All systems operational" with no i18n, ezstart has no public `/status` at all. Wire real cross-service health queries (consume `@ezstart/monitoring`), i18n strings, real-time updates. Cross-ref DOCS-003 below. (FULL_AUDIT finding `tmp/agent-full-audit-2026-05-01.md`)
- [ ] **HACK-DEFENSE-DEPTH-001** 🟢 P3 (≤1 jour total) — 5 defense-in-depth items from HACKER pass : (1) V8 path sanitization length cap, (2) `getServerAuth` cookie CRLF stripping, (3) audit metadata redaction policy (PII), (4) audit enum bypass via cast, (5) derive-mode superadmin scope cross-app. Detailed in `tmp/hack-pre-push-2026-05-01.md`.
- [ ] **CONFIG-ENV-TESTS-001** 🟡 P2 (~1h) — `packages/config/src/__tests__/env.test.ts` has 3 failing tests asserting `'development'` when the resolver returns `'local'`. Test-only failure — does not affect prod. Either update the assertions (resolver is correct) or restore the `'development'` mapping if intended behavior is otherwise.
- [ ] **PAY-SDK-VITEST-CLEANUP-001** 🟡 P2 (~30min, follow-up V9 + V_SERVERONLY_FIX) — Optional cleanup : remove `server-only` aliases from `test-utils/createVitestConfig.ts` + per-package `vitest.config.ts` (no longer needed after V_SERVERONLY_FIX uses runtime guard). Harmless but cruft.
- [x] **DASHBOARD-ACCOUNT-DUPLICATE-001** 🟠 P1 — `?section=account` and `?section=settings` both rendered the identical `SettingsBlock` (copy-paste regression when `'account'` was added to `DEFAULT_SECTION_ORDER`). Fix : new `ProfileBlock` (avatar / firstName-lastName edit / email + verification / connected accounts read-only / member-since / `<DeleteAccountSection>`) on `?section=account` ; `SettingsBlock` slimmed to security/preferences (UserSettings / TwoFactor / Sessions / OAuthProviders) on `?section=settings`. New `EZAuthDashboardTexts.profile*` keys + EN/FR translations wired in DashboardClient. Auth-sdk i18n-agnostic preserved (texts via props, EN defaults). +0 SDK net LOC change after split (file ≈ 442 lines, under 400-line policy by component-decomposition rationale documented in `@internal` JSDoc). Follow-up V2 : avatar upload + cropper integration in ProfileBlock (currently only via AccountModal).
- [ ] **DASHBOARD-PROFILE-AVATAR-UPLOAD-002** 🟡 P2 (~1 jour) — Follow-up to DASHBOARD-ACCOUNT-DUPLICATE-001 : add the AccountModal-style avatar upload flow (file picker + cropper) directly in the dashboard `ProfileBlock`. Today the avatar is read-only inside `?section=account` ; full upload UX lives only in the AccountModal. Refactor the picker + cropper as a standalone hook so both surfaces share the implementation.

**Quick wins ajoutés au MVP (2026-04-30)** :

- [x] security.txt RFC 9116 (Contact security@ezstart.xyz + Policy link to /security + Expires 2027-04-30)
- [x] /security disclosure page publique (metadata indexable + sitemap entry, email aligné canonical .xyz partout)
- [x] hreflang SEO tags multi-langue (`generateMetadata` per-locale + alternates.languages en/fr/vi + x-default)
- [x] autoComplete browser UX sur tous les auth forms (SignIn/SignUp/ForgotPassword/ResetPassword + 2FA — username/email/current-password/new-password/given-name/family-name/one-time-code)
- [x] aria-required + visual `*` markers WCAG (SignIn/SignUp/ForgotPassword/ResetPassword/2FA — `<Span aria-hidden="true" className="text-destructive ml-0.5">*</Span>` + `aria-required="true"` + `required` sur tous les Inputs requis)

**Reste pour franchir le palier "vraiment Clerk Pro" (V1, ~2-4 semaines)** :

- [x] **AUTH-V1-TESTMODE** 🔴 P0 — Test mode isolation API (Stripe-pattern) shipped 2026-04-30 (Option A : `isTestMode` flag + Mongoose pre-find hook + AsyncLocalStorage middleware). Live key vs test data totalement isolés via middleware api-key extract `req.mode` from prefix + auto-scope queries by `{ isTestMode }`.
- [ ] **AUTH-V1-ERRORTRACKER** 🔴 P0 — Sentry scaffold shipped 2026-04-30 (Option a : `@sentry/node-core` sans OTEL auto-instrumentation, évite incident 2026-04-25). Activation user-side requise, voir AUTH-V1-SENTRY-ACTIVATE ci-dessous.
- [ ] **AUTH-V1-CAPTCHA** 🟠 P1 — Cloudflare Turnstile scaffold shipped 2026-04-30 (free unlimited + GDPR-friendly). Activation user-side requise, voir AUTH-V1-TURNSTILE-ACTIVATE ci-dessous.
- [x] **AUTH-V1-EMAILCHANGE** 🟠 P1 — Email change flow shipped 2026-04-30. Route `POST /api/auth/change-email` → send verify to NEW email + cooldown on OLD email until confirmed. UI via `<EmailChangeForm>` in account settings.
- [x] **AUTH-V1-IDLETIMEOUT** 🟠 P1 — Session idle timeout shipped 2026-04-30 (auto-logout après X min inactivité, configurable per Application). Activity tracker côté SDK + warning toast 1 min avant logout.
- [x] **AUTH-V1-MAGICLINK** 🟡 P2 — Magic link login (passwordless email) shipped 2026-04-30. New route + `<MagicLinkButton>` + email template. Alternative à password pour users qui le préfèrent.
- [ ] **AUTH-V1-PASSKEY** 🟢 V2 (DEFERRED 2026-04-30) — WebAuthn / Passkey support. Apple/Google ecosystem natif. Skip password entirely sur devices trusted. **Reporté post first paying customer feedback** (complex WebAuthn protocol needs supervised sprint).

### Wave 2 ready-to-activate (scaffolded — needs user provisioning)

- [ ] **AUTH-V1-SENTRY-ACTIVATE** 🔴 P0 (5min user setup) — Scaffold complet (commits Wave 2). User signup sentry.io → 2 projects (`ezauth-api`, `ezauth-web`) → set `SENTRY_DSN` (Railway api), `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN` + `SENTRY_AUTH_TOKEN` (Vercel web) → update `apps/ezauth/web/next.config.js` placeholders `org: 'ezstart'` / `project: 'ezauth-web'` with real Sentry slugs. Init code is no-op tant que DSN absent.
- [ ] **AUTH-V1-TURNSTILE-ACTIVATE** 🟠 P1 (10min user setup) — Scaffold complet (commits Wave 2). User signup dash.cloudflare.com → Turnstile → Add Site (`ezauth.ezstart.xyz` + `localhost`) → set `TURNSTILE_SECRET_KEY` (api), `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (web) → pass `turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}` à `<SignInForm>` / `<SignUpForm>` / `<ForgotPasswordForm>` (or modals). Backend verify est no-op tant que secret absent.

### Decisions taken 2026-04-30 (architecture choices)

- **TESTMODE → Option A** (flag + pre-find hook) — implemented in Agent E sprint, see commits `57983ed6`...`610ede3a`
- **ERRORTRACKER → Sentry option (a)** — `@sentry/node-core` without OTEL (avoids 2026-04-25 incident), see scaffold commits `2b04b2e9`/`033c6224`/`81f50d0b`/`c7ef608b`
- **CAPTCHA → Cloudflare Turnstile** — free unlimited + GDPR-friendly, see scaffold commits `2b60675c`/`c80e2e35`/`a5062370`/`7b1f6499`
- **PASSKEY → DEFERRED V2** — post first paying customer feedback, complex WebAuthn protocol needs supervised sprint
- **CONNECT RESUME → Option C** — Resume button + auto-clean + email J-6 (all 3 mechanisms), see commits `2b04b2e9`...`102d040c`

### Wave 2 minor cleanups shipped (2026-04-30)

- [x] **PAY-OVERVIEW-001** — `NaN €` in PayAdminDashboard fixed (frontend defensive guards + backend response shape aligned + 9 tests)
- [x] **SIDEBAR-ANCHORS-001** — EZAuthDashboard sidebar links now use `?section=` query param + router.replace (no more `#` placeholders)
- [x] **CONNECT-RESUME-001** — Resume button on pending Connect rows < 7d + cron job daily auto-clean > 7d + email J-6 expiration warning (Option C)

### CSP follow-ups (active)

- [x] **AUTH-V1-CSP** 🟠 P1 — CSP baseline Report-Only shipped sur `apps/ezauth/web/vercel.json` (2026-04-29) + `apps/ezpay/web/vercel.json` + `apps/ezstart/web/vercel.json` (2026-05-01 V_CSP wave). Soak phase 2 semaines (deadline 2026-05-13 ezauth, 2026-05-15 ezpay/ezstart) avant enforce. Doc complète : `apps/ezauth/web/README.md` §CSP. Splits in two follow-ups :
  - [ ] **AUTH-V1-CSP-ENFORCE** 🟠 P1 (~1j post-soak) — Switch `Content-Security-Policy-Report-Only` → `Content-Security-Policy` (enforce) après review violations + ajout sources légitimes. Backport sur autres apps `*/web/vercel.json` restantes (ezbill, fengshui, green-pulse, asc-tcd, gacha-analyzer).
  - [ ] **AUTH-V1-CSP-NONCES** 🟡 P2 (~3j) — Hardening nonce-based : middleware injecte nonce per-request, drop `'unsafe-inline'` + `'unsafe-eval'` du `script-src`. Pattern Next.js `<Script nonce={...} />`. Refactor middleware requis.

**Bugs identifiés non bloquants** : aucun pending P0/P1/P2 — tous traités cette session.

**Audit complet** : voir le rapport `Audit consolidé — ezauth scope` produit en début de session 2026-04-29 (4 agents Explore parallèles : ezauth/api + ezauth/web + auth-sdk + shared deps).

---

## Reste avant P10 (post P9)

- [x] **STD-REFACTOR-001** — Standards SaaS-pro priority system + 7 new rule files (2026-04-27) _Refactor complet de `.claude/rules/*.md` pour ajouter le système de priorités 🔴 P0 / 🟠 P1 / 🟡 P2 / 🟢 P3 + ⚡ Quick Win. 7 nouveaux fichiers : `standard-saas-perf.md`, `standard-saas-security.md`, `standard-saas-a11y.md`, `standard-saas-observability.md`, `standard-saas-data.md`, `standard-saas-billing.md`, `standard-sdk-dx.md`. `standard.md` + `standard-saas.md` + `standard-ui.md` + `nextjs.md` + `data-protection.md` + `git.md` + `env.md` + `mongodb.md` mis à jour avec en-tête priorités. UX states section ajoutée à `standard-ui.md` (loading/empty/error/optimistic). i18n complet ajouté à `nextjs.md` (Intl API, hreflang, RTL). CLAUDE.md root index étendu avec la nouvelle hiérarchie de docs. **Use case** : (1) lancer un nouveau SaaS = focus P0 only, (2) auditer un SaaS existant = identifier les gaps par priorité. Ready for ezauth re-audit against new standards._
- [x] **STD-DISCOVERY-001** — Pino-pretty stream sync rule codifiée 🔴 P0 (2026-04-27) — `transport: { target: 'pino-pretty' }` interdit (worker thread crash en Next.js dev). Pattern `pino(opts, prettyStream)` avec `pino-pretty({ sync: true })` documenté dans `.claude/rules/standard-saas-observability.md` §2.1 + grep check + anti-patterns INTERDITS section.
- [x] **STD-DISCOVERY-002** — BroadcastChannel défensif (try/catch + flag) 🔴 P0 (2026-04-27) — Tout `channel.postMessage(...)` wrappé en try/catch + flag `channelOpen=false` au premier échec. HMR + StrictMode unmount peuvent fermer le channel. Documenté dans `.claude/rules/standard-sdk-dx.md` §11bis + grep check + anti-patterns INTERDITS.
- [x] **STD-DISCOVERY-003** — Logout pro flow obligatoire 🔴 P0 (2026-04-27) — 8 étapes chaînées (server revoke + reset store + reset persist + cross-tab broadcast + consumer hook + toast + hard redirect via `window.location.assign` + UserMenu loading state). Documenté dans `.claude/rules/standard-sdk-dx.md` §11ter + grep check dans `standard-saas-security.md` + anti-patterns INTERDITS.
- [x] **STD-DISCOVERY-004** — Login same-origin SDK default `/{locale}/dashboard` 🔴 P0 (2026-04-27) — `<SignInForm>` résout `redirectUri` selon priorité (prop > URL param > same-origin default). Pas de bounce inutile par `/auth/callback` quand same-origin. Documenté dans `.claude/rules/standard-sdk-dx.md` §11quater + anti-patterns INTERDITS.
- [x] **STD-DISCOVERY-005** — `mounted` guard anti-pattern qui détruit le SSR 🔴 P0 (2026-04-27) — INTERDIT le pattern `useState(false) + useEffect(setTrue) + if (!mounted) return Skeleton`. Détruit le HTML SSR + force skeleton flash sur chaque page load. Exception légitime documentée (browser API non-SSR). Documenté dans `.claude/rules/nextjs.md` §1.1 + `standard-saas-perf.md` §1 + grep check.
- [x] **STD-DISCOVERY-006** — Loading state full-viewport `<Spinner>` pattern 🟠 P1 (2026-04-27) — Pour loading full-page (auth, dashboard hydrating, plan fetching gate) : `<Div fixed inset-0 ... role="status" aria-busy>` + `<Spinner variant="primary" size="lg" text>`. Skeletons réservés aux cas où shape final EST connu. Documenté dans `.claude/rules/standard-ui.md` §2bis.1 + `standard-sdk-dx.md` §11quinquies + anti-patterns INTERDITS.
- [x] **STD-DISCOVERY-007** — `getServer<X>()` companion mandatory 🔴 P0 (2026-04-27) — Tout SDK component qui fetch des data runtime DOIT avoir un `getServer<X>({ apiUrl, cookieHeader })` exporté depuis `@ezstart/<sdk>/server` + `import 'server-only'` + entry point dans `package.json` exports. Documenté dans `.claude/rules/standard-sdk-dx.md` §11sexies + `nextjs.md` §1.2 + grep check + anti-patterns INTERDITS.
- [x] **STD-DISCOVERY-008** — Cookie Domain=localhost en dev 🟠 P1 (2026-04-27) — En dev, set `Domain: 'localhost'` sur cookies httpOnly pour permettre cross-port SSR (API 6110 + Web 6111). En prod, `Domain: '.ezstart.xyz'` (cross-subdomain). Helper `getCookieDomain()` centralisé. Documenté dans `.claude/rules/env.md` §7 + grep check.
- [x] **STD-DISCOVERY-009** — Test mode keys + data isolation (Stripe-pattern) 🟠 P1 (2026-04-27) — Live data + test data totalement isolés par mode dérivé du prefix de la key. Middleware extrait `req.mode`, queries auto-scopées par `isTestMode`. Stripe test/live keys dispatchées. Webhook handlers séparés. Dashboard toggle Live/Test. Documenté dans `.claude/rules/standard-saas-data.md` §4 + `standard-saas-keys.md` §7 + anti-patterns INTERDITS.
- [x] **PLATFORM-ARCH-001** — 3-tier architecture model codified (2026-04-24) _New `.claude/rules/standard-architecture.md` documents the decision tree (Tier 1 per-app SaaS = ezauth+ezpay / Tier 2 consumer apps / Tier 3 platform hub = ezstart), with ASCII diagram, anti-patterns, and references to Stripe/Clerk/Vercel benchmarks. README "Architecture" section updated with the same diagram. CLAUDE.md index links the rule. Agent memory `project_app_architecture.md` aligned._
- [x] **AUTH-CARDS-001** — Self-contained `<SignInCard>` / `<SignUpCard>` / `<ForgotPasswordCard>` / `<ResetPasswordCard>` / `<VerifyEmailCard>` shipped in `@ezstart/auth-sdk/components` (2026-04-27). Pattern Clerk `<SignIn />` — each Card embeds `<AuthCardShell>` (Card container + theme switcher + back button + brand subtitle + footer cross-link) + the matching `<SignInForm>` etc. + auto-resolved consumer brand via the new public `useKeyConfig(publishableKey)` hook (extracted from `apps/ezauth/web/src/hooks/useKeyConfig.ts` into `packages/auth-sdk/src/react/useKeyConfig.ts` along with `prettifySlug` + `deriveAppHintFromRedirectUri` helpers). i18n keys added to `signIn`/`signUp`/`forgotPassword`/`resetPassword` + new `verifyEmail` section in en/fr/vi locale dicts. ezauth `(auth)/*` pages collapsed from **644 → 78 lines** (88% reduction): `LoginClient.tsx` 233→29, `RegisterClient.tsx` 149→17, `ForgotPasswordClient.tsx` 98→18, `reset-password/page.tsx` 105→7, `verify-email/page.tsx` 59→7. Consumer apps now drop-in `<SignInCard />` and inherit consistent chrome — zero need to redesign auth pages per app. Typecheck + build + lint PASS (0 new warnings). _**Superseded by AUTH-MODALS-001 (2026-04-28)** — Cards converted to Modals for embeddability beyond standalone routes._
- [x] **AUTH-MODALS-001** — Auth Cards converted to Modals for embeddability anywhere (2026-04-28). Hard-break rename: `cards/` directory → `modals/`, `<SignInCard>` → `<SignInModal>`, `SignInCardProps/Texts` → `SignInModalProps/Texts` (same for SignUp/ForgotPassword/ResetPassword/VerifyEmail), `<AuthCardShell>` → `<AuthModalShell>`. Each Modal now exposes `isOpen`/`onClose` as required props built on `<Modal>` (Radix Dialog) instead of a static `<Card>` — same component works as **(1)** standalone auth route (`<SignInModal isOpen onClose={() => router.push('/')} />` in ezauth `/login`/`/register`/etc.) AND **(2)** embeddable from any consumer page (button trigger + `useState` state). `<BackButton>` dropped (Modal close X is the dismiss affordance). `<ThemeSwitcher>` repositioned top-left of modal content (close X owns top-right). Default `size='default'` + `scrollBehavior='inside'` (form scrolls inside, modal stays viewport-bounded — important on mobile). i18n keys preserved as-is (`cardTitle`/`cardSubtitleWithApp`/`noAccount`/`registerLink`/etc.) — only TS type aliases renamed, locale JSON files (en/fr/vi) untouched. Public exports updated in `packages/auth-sdk/src/components/index.ts` + `src/index.ts` (zero backcompat aliases — Cards just landed previous day, no external consumer). ezauth `(auth)/*` clients updated (5 files): each now uses `useRouter` from `@/i18n/navigation` + `<XxxModal isOpen onClose={() => router.push('/')} />`. Validation: `pnpm --filter @ezstart/auth-sdk typecheck/build/lint` + `pnpm --filter web-ezauth typecheck/lint` + full monorepo `pnpm typecheck` ALL PASS (0 new warnings, all pre-existing).
- [ ] **EZP-CONNECT-001** — Stripe Connect Express KYC E2E (clic manuel user requis — user doit compléter onboarding Stripe sur staging)
- [ ] **STD-DEPRECATION-001** — Custom ESLint rule `@ezstart/ezstart/deprecation-runtime-warning` that flags `@deprecated` JSDoc markers in `packages/ui/src/components/`, `packages/auth-sdk/src/components/`, `packages/pay-sdk/src/components/` (and future SDKs) without a matching `useDeprecationWarning(...)` (component-level) or `warnDeprecation(...)` / `log.warn('[<sdk>] ...deprecated...')` (prop-level) call in the same file. Auto-enforces the convention documented in `.claude/rules/standard-ui.md` §10. Allows IDE-only warnings on type aliases (`/** @deprecated */ export type Foo = Bar`) since runtime warning is impossible there. Initial pass (2026-04-27) covered all existing markers — see commit log.
- [x] **ADD_SERVER_DEPRECATION_PATTERN-001** 🟠 P1 (2026-05-01) — `deprecatedRoute()` middleware shipped in `@ezstart/api-core`. Server-side counterpart to the browser `useDeprecationWarning()` hook : sets RFC 8594 HTTP headers (`Sunset`, `Deprecation: true`, `Warning: 299`, `Link: rel="sunset"`) and emits a structured warn entry through the injected `ServerLogger` (silent no-op default to keep the agnostic core dependency-free; pass `logger` from `@ezstart/logger/server` to surface to Pino → Sentry / Better Stack). 16 unit tests cover header shape, custom `log` callback precedence, default silent behavior, multi-method handling, missing User-Agent. Exported from the package entry barrel. Documented in `.claude/rules/standard-ui.md` §10.8 + cross-referenced from `standard-saas-data.md` §2 (API versioning checklist). New `packages/api-core/CHANGELOG.md` initialized with this entry under `[Unreleased]`.
- [ ] **API-SDK-DEPRECATION-WARNING-001** 🟡 P2 — `apiCall()` in `@ezstart/api-sdk` should read the response `Deprecation: true` + `Warning: 299` headers and `console.warn` automatically (deduped by URL+method) so consumers see deprecation notices without explicit handling. Pairs with `deprecatedRoute()` server middleware (cf. `ADD_SERVER_DEPRECATION_PATTERN-001`). Optional toast via consumer-provided callback in client config. Skipped in initial pass to avoid mutating the hot path without dedup design + benchmarks.
- [x] **DOGFOOD-PATTERN-001** — Application.isPlatformOwned + hasFeature helper + ezpay tenant key seeded. (2026-04-24) _(1) `seed-consumer-app-keys.ts` updated to include `ezpay` — new staging tenant key `ez_pk_live_79c360...` generated and wired into Vercel ezpay web staging (`NEXT_PUBLIC_EZAUTH_KEY`); `GET /api/keys/config?key=ez_pk_live_79c360...` returns `{appName:'ezpay', scope:'user'}`. (2) `Application.isPlatformOwned: boolean` field added to the Mongoose schema + serializer + Zod response schemas (list/get/create/update/update-theme) + `Application` type in auth-sdk core. (3) New idempotent `seed-platform-owned-flag.ts` script (npm `seed:platform-owned`, 5 vitest tests) flagged the 8 EzStart-owned apps on staging (ezauth/ezpay/ezstart/ezbill/green-pulse/fengshui/asc-tcd/gacha-analyzer). (4) New `@ezstart/auth-sdk/server/features.ts` exports `hasFeature({app, user, appSlug, feature})` with 5-step priority: platform-owned bypass → superadmin → plan grants → user `pro` role → deny. 16 unit tests. Exported from `@ezstart/auth-sdk/server` barrel. Ready to wire into future feature gates (custom-theme, extended-monitoring, …)._

---

## Known minor issues post-P7 (2026-04-23)

Non-bloquants, à traiter opportunistiquement. Certains attendent CROSS-KEY-001 ou la suite P8/P9.

- [ ] **Sidebar nav `#` anchors**: several links in the unified dashboard sidebar still point to `#` placeholders instead of real client routes. UX minor — no 404 (anchor stays on page), but breadcrumb / deep link doesn't work.
- [ ] **Connect app stuck pending — no "Resume onboarding" button**: when a Connect onboarding flow is started and abandoned before KYC, the ConnectedAccount stays `status=pending` with no UI affordance to resume. Today the user must re-trigger via the `Stripe Connect` tab, which creates a new onboarding link server-side but the existing pending row is never rehydrated in the UI.
- [x] **EZAUTH-LAYOUT-001 — dual `<html>/<body>` in ezauth web** (2026-04-25): deleted `apps/ezauth/web/src/app/layout.tsx` (the dual root layout) and moved `import '@ezstart/ui/globals.css'` into `apps/ezauth/web/src/app/[locale]/layout.tsx`. ezauth now follows the same single-locale-layout pattern as ezpay/ezstart. Hydration mismatch root cause (Turbopack polyfill colliding with the inner `<html>`) eliminated. The feared `/fr/login` "useContext null" regression did NOT occur — the current providers stack (`NextIntlClientProvider` → `ErrorBoundary` → `Providers`) at the locale layout level is sufficient. Typecheck + lint PASS. Build still fails on the **pre-existing** unrelated `/404` static gen error (`<Html> should not be imported outside of pages/_document`) — verified this same error affects ezpay AND ezstart builds, so it is monorepo-wide and out of scope here. **Follow-up needed (new item below)**: fix the `/404` static gen error across all apps.
- [ ] **NEXT-404-001 — `/404` static gen fails monorepo-wide** (2026-04-25, follow-up of EZAUTH-LAYOUT-001): `pnpm --filter web-ezauth build`, `web-ezpay build`, `web-ezstart build` all fail with `Error: <Html> should not be imported outside of pages/_document. Error occurred prerendering page "/404"`. Likely cause: no root App Router `not-found.tsx`, so Next.js falls back to its synthesized Pages Router `/404` which collides with `app/` strict mode. Probably affects all 8 apps (only those 3 verified). Fix candidates: (a) add root `app/not-found.tsx` (requires a minimal root layout, must NOT reintroduce dual `<html>`), (b) configure `next.config` to skip `/404` static gen, (c) middleware-level redirect of `/404` → `/en/not-found`. Needs investigation across all 8 apps + Vercel deploy logs to confirm whether builds currently slip through to deploy or if Vercel also fails (and how the apps reach prod despite this). **DEFERRED 2026-04-30** — Agent C investigated 4 fix options (root not-found.tsx, globalNotFound flag, custom \_document, build-mode=compile). All blocked by Next.js 15.5.9 bug : `globalNotFound` is recognized but doesn't suppress synthesized Pages Router /404. Real fix : (a) upgrade to Next.js 16 (when stable + verified compat), OR (b) refactor 8 apps to move `<html>`/`<body>` out of `[locale]/layout.tsx` into root `app/layout.tsx` (significant SSR theme/auth bootstrap touchwork). Sprint-sized work, scheduled for V2.
- [x] **PAY-OVERVIEW-001 — `NaN €` in PayOverviewSection "Top apps by revenue"** (2026-04-29, fixed 2026-04-30 Wave 2): consolidated `<PayAdminDashboard>` Overview tab no longer renders `NaN €`. Frontend defensive guards added in `packages/pay-sdk/src/components/admin/_internal/PayOverviewSection.tsx` (`Number.isFinite(value)` checks before formatCurrency) AND backend `apps/ezpay/api/src/routes/admin/analytics-overview.ts` response shape aligned with pay-sdk types (revenueByCurrency/mrrByCurrency/completedPayments/failedPayments/refundedPayments/revenueTrend/topAppsByRevenue). 9 tests added.
- [x] **VERCEL-BUILD-001** — `web-ezbill` + `web-ezauth` builds broken on master (TS strict null) — fixed 2026-04-30 (this sprint, see commits `fix(ezbill/web): null-guard useParams() in [clientId]/page.tsx (TS strict null)` + `fix(ezauth/web): null-guard useSearchParams in sso-callback (TS strict null)`). Note : `next build` still fails on the unrelated NEXT-404-001 `<Html>` bug (deferred V2), but TS compilation now passes which is what's in scope here.

---

## Monorepo / Infrastructure

### External-devs readiness — Phase 0 (prép funding)

Rendre le monorepo "hire-ready" pour accueillir des devs externes sur une app (ex: green-pulse) sans leur donner accès aux autres apps. Objectif : split apps standalone + packages publiés + rules auto-enforced. **~2 jours total.**

- [ ] **GitHub Packages registry** — setup private npm registry, `publishConfig` dans chaque `packages/*/package.json`, test publish local (~30 min)
- [x] **`@ezstart/eslint-plugin-ezstart`** — 11 règles actives (2026-04-23) : `no-express-core` (error), `no-fetch-client` (error), `no-raw-fetch` (warn), `no-raw-html` (warn), `parse-api-error-required` (warn), `no-alert-confirm` (warn), `no-console-log` (warn), `no-hardcoded-tailwind-colors` (warn, 79 matches in packages/ui), `no-dialog-outside-ui` (warn), `require-i18n-string` (warn), `no-local-ui-components` (warn). Presets `recommended` + `strict` exportés. 110 tests passent. Dette technique exposée (Tailwind colors principalement) → cleanup progressif à prévoir.
- [x] **Test `scripts/generators/extract-app.js`** — extraire green-pulse en sandbox local, valider que `pnpm install && pnpm build` passe depuis le standalone, documenter les edge cases (~1h) [2026-04-23: green-pulse extracted to D:/tmp/green-pulse-standalone, 877 files / 16 packages, `pnpm install` PASS in 3m17s, edge cases in `tmp/extract-app-edge-cases.md` (regex artifact NEXT_PUBLIC_*, test-only vars, etc.)]
- [ ] **CI auto-publish** — GitHub Action sur tag `v*.*.*` qui publish tous les `@ezstart/*` modifiés vers GitHub Packages (via changesets ou script custom) (~1h)
- [x] **Doc `CONTRIBUTING-EXTERNAL.md`** — workflow onboarding dev externe, comment proposer un change sur un package (PR via `packages/**` uniquement sur le monorepo), versioning & release (~1h) [2026-04-23: créé à la racine du monorepo, sections quick-start, env handling self-contained, contributing back, versioning, common issues]
- [ ] **Test du pattern end-to-end** — simuler un dev externe : extract green-pulse, npm install les packages publiés, dev un composant, open PR, validate que les règles bloquent bien un `<div>` natif, etc. Valide la boucle complète avant d'onboard qqn en vrai.
- [x] **`extract-app.js` env handling** — quand une app est extraite standalone, elle perd l'accès au root `.env.local` du monorepo (qui centralise les secrets shared). Le script doit : (a) grep `process.env.*` dans la source de l'app pour identifier les vars utilisées, (b) extraire ces vars depuis root `.env.local` + app-local override, (c) générer un `.env.local` + `.env.example` autonomes dans le standalone, (d) doc dans `CONTRIBUTING-EXTERNAL.md` que le standalone est self-contained env-wise. [2026-04-23: lib `env-handler.js` + 9 node:test tests, integrated into extract-app.js, --help/--dry-run flags added, CONTRIBUTING-EXTERNAL.md créé]

### Cross-cutting

- [x] **TURBO-ENV-VARS-DECLARE** (#129) 🟡 P2 (2026-05-01) — Declared explicit env vars in `turbo.json` to improve cache invalidation accuracy and silence undeclared env warnings in dev/CI. `globalEnv` (NODE*ENV, DEPLOY_ENV, CI, VERCEL_ENV, RAILWAY_ENVIRONMENT) affects all task hashes. `globalPassThroughEnv` (SENTRY_AUTH_TOKEN, TURBO_TOKEN, TURBO_TEAM, RAILWAY_TOKEN, VERCEL_TOKEN, GITHUB_TOKEN, MONGODB_ATLAS*_, VERCEL*TEAM_ID, VERCEL_GIT_COMMIT*_, RAILWAY*GIT_COMMIT_SHA, GIT_COMMIT_SHA) passed but NOT cache-keyed (secrets that don't change build output). `build.env` lists 30+ vars used at build time (NEXT_PUBLIC*_, MONGO*URL, JWT_SECRET, OAUTH*_, RESEND*\*, STRIPE*\_, ESG\__, EZPAY*\*, ALERT*_, SENTRY*DSN, GOOGLE_CLIENT*_, ANTHROPIC*API_KEY, GEMINI_API_KEY, OPENAI_API_KEY, etc.) using wildcards where appropriate. `build.passThroughEnv` (VERCEL*_, RAILWAY\_\_) for runtime-only vars. New `test` task definition with NODE_ENV-aware vars. Validated via `pnpm turbo build --dry-run` (env vars properly listed per task) + `pnpm typecheck` (39/39 PASS, 39/39 FULL TURBO cache hit on subsequent runs).
- [x] **BUNDLE_NODE_ENGINES_CI-001** 🟠 P1 (2026-05-01) — Declared `engines.node: ">=18.0.0"` on all 9 publishable packages (`auth-sdk`, `api-sdk`, `ui`, `api-core`, `api-contracts`, `logger`, `config`, `pay-sdk`, `ai-sdk`) — supply chain compat signal for npm consumers. CI workflow split into `drift` job (Node 22, generator drift check) + `test` job (matrix Node 18/20/22, install + build + typecheck + test). `paths-ignore` added (md/docs/.claude) and `concurrency.cancel-in-progress` set so docs-only commits don't burn Actions minutes. `logger` engines broadened from pinned `20.18.x` (dev pin) to `>=18.0.0` (consumer signal). Bundle report follow-up of #156. No version bumps — release will be cut via changesets next time. CHANGELOG entries added (created `CHANGELOG.md` for `api-contracts`, `config`, `ai-sdk` — were missing).
- [x] **PHASE_1_MIGRATE_GENERIC_COMPONENTS-001** 🟠 P1 (2026-05-01) — 4 generic components extracted out of `@ezstart/auth-sdk` per audit `tmp/audit-full-registry-matrix.md`. (1) `AuthErrorBanner` → `@ezstart/ui` as `ErrorAlert`. (2) `ScopeContextIndicator` → `@ezstart/ui` as `ScopeContextSwitcher`. (3) `PasswordStrength` → `@ezstart/ui`. (4) `TurnstileWidget` → `@ezstart/api-sdk/integrations` (Cloudflare captcha is generic, not auth-specific). All 4 re-exported from auth-sdk with `useDeprecationWarning` for 90 days backward compat. Internal auth-sdk consumers (SignInForm, SignUpForm, ForgotPasswordForm, ResetPasswordForm) updated to import from new locations directly. Tests migrated to new packages + minimal contract tests retained on the deprecated re-exports. Removal planned 2026-08-01 (see PHASE_1_REMOVAL-001).
- [x] **PHASE_2_AMBIGUOUS_REVIEW-001** 🟠 P1 (2026-05-01) — User-validated SaaS-pro decisions on the 3 components flagged AMBIGUOUS in audit `tmp/audit-full-registry-matrix.md`. (1) `MaintenanceBanner` SPLIT — `useMaintenanceStatus` hook moved to `@ezstart/api-sdk/react` (platform-wide concern, not auth-specific), `<MaintenanceBanner>` UI moved to `@ezstart/ui/components` (props-driven, accepts resolved `status` prop). Auth-sdk re-exports a deprecated wrapper that internally composes both for backward-compat. (2) `UsageBadge` — internal refactor: now a thin wrapper around the new generic `<ProgressBadge>` in `@ezstart/ui/components` (extracted so any quota surface across the platform reuses the same look + thresholds). Public API + visual contract unchanged. (3) `DevModeBanner` — KEPT in `@ezstart/auth-sdk` (auth-domain specific via `useAuth`/`useAuthContext`, returns `null` in production = zero footprint, no migration justified). All split deprecated re-exports surface a runtime warning via `useDeprecationWarning` and are scheduled for removal 2026-08-01 (see PHASE_1_REMOVAL-001).
- [ ] **PHASE_1_REMOVAL-001** 🟡 P2 — 2026-08-01: remove deprecated re-exports from `@ezstart/auth-sdk` (`AuthErrorBanner`, `ScopeContextIndicator`, `PasswordStrength`, `TurnstileWidget`, `MaintenanceBanner`, `useMaintenanceStatus`). Bump major version (breaking change). Verify all consumer apps already import from `@ezstart/ui/components` / `@ezstart/api-sdk/integrations` / `@ezstart/api-sdk/react` before removal. Update `apps/ezauth/web/src/components/providers.tsx` to compose `useMaintenanceStatus` (api-sdk) + `<MaintenanceBanner>` (ui) directly instead of using the deprecated auth-sdk wrapper.
- [ ] **npm publish setup** — In progress. Setup `npm publish --access public` for all `@ezstart/*` packages. Changesets for versioning + changelog. GitHub Action on tag `v*.*.*` auto-publishes modified packages. Packages: api-contracts, api-core, api-sdk, auth-sdk, pay-sdk, ui (phase 1).
- [ ] **Developer API key system** — Après publish npm. Chaque SDK accepte `{ apiKey }` dans sa config. EZAuth dashboard génère des API keys par app. Middleware `validateApiKey` dans api-core. Free tier (ex: 1000 users auth, 100 transactions pay) → payant via EZPay subscriptions. Self-dogfood: toutes les apps monorepo utilisent le même système (clé admin gratuite / illimitée). Modèle Clerk/Stripe : SDK gratuit npm, service payant via API key + quotas.
- [ ] **Developer dashboard (EZStart hub)** — Dashboard pour devs externes : créer un compte, générer API keys, voir usage/quotas, gérer billing via EZPay. Pages: `/developer/apps`, `/developer/keys`, `/developer/usage`, `/developer/billing`. Consomme auth-sdk + pay-sdk en dogfood.
- [ ] **Standardize admin dashboards UI/UX** — Actuellement chaque AdminDashboard (AI, Auth, Monitoring, EZPay, Services) utilise `DataTable`, `Badge`, `Card`, filters, pagination avec des micro-variations. Objectif : audit + uniformisation via wrappers/presets dans `@ezstart/ui` : (1) `AdminTable` preset avec columns factory + loading/empty states, (2) `AdminBadgeGroup` multi-badges truncate/tooltip, (3) `AdminFilters` pattern unifié, (4) `AdminPagination` preset, (5) guidelines layout admin page. À attaquer quand 3+ dashboards sont stabilisés.
- [ ] **UI-CHARTS-PRIMITIVES-001** 🟡 P2 (3-5 jours) — Add `<StatCard>` / `<TimeSeriesChart>` / `<UsageGrid>` primitives to `@ezstart/ui` for cross-SDK usage dashboards. Lib choice: shadcn/charts (Recharts wrapper, theme-aligned, tree-shakable). Replaces the "Coming soon" placeholder in usage tabs across auth-sdk/pay-sdk/ai-sdk. Blocks AUTH-SDK-USAGE-V1-001.
- [ ] **auth-sdk i18n embed pattern** — Pour composer les composants `@ezstart/auth-sdk` (QuickSignupForm, LoginForm, ResetPasswordForm) directement dans une app consumer. Options : (A) chaque app duplique les keys `messages/{locale}/auth.json` (drift garanti), ou (B) **créer `packages/auth-sdk/messages/{locale}/auth.json`** + helper `getAuthTexts(locale, formKey)` + doc pour merger dans next-intl provider. **Bloqué par :** le 1er composant auth embed hors ezauth web (probablement QuickSignup sur green-pulse earthday).
- [ ] **Theme Overriding dynamic (paused)** — Projet `ThemeStyleInjector` + `/api/theme` endpoint pour que des clients non-devs puissent overwrite dynamiquement les couleurs de leur app depuis un éditeur visuel. Infra en place (`packages/ui/src/theme/server/`) mais non câblée dans les apps (retirée de `green-pulse/layout.tsx` et `gacha-analyzer/layout.tsx` le 2026-04-13). Reprendre quand l'UI éditeur sera planifiée.
- [x] **insert-app.js reverse** — importer un standalone dans le monorepo (inverse de extract) [2026-04-23: `scripts/generators/insert-app.js` + `lib/insert-helpers.js` (24 unit tests + roundtrip extract→insert validé sur green-pulse, 877 fichiers src identiques). Ancien `insert-app.js` (scaffolder) renommé `scaffold-app.js`. Env diff vs root .env.local, cross-layer `@<old>/types` rewrite automatique. Doc dans CONTRIBUTING-EXTERNAL.md section "Re-importing a standalone".]
- [ ] **Theme presets app-specific** — Presets déclaratifs par app (dashboard=compact, landing=relaxed)
- [ ] **SSR Layout split** — Séparer `ClientLayout` en RSC + client islands

### Monitoring & audits CI

- [x] **Recharts graphs on /monitoring/health** — latency p95 trending (7d/30d), uptime % timeline, error rate per service. Data déjà en MongoDB (HealthCheck model avec responseTime + status + timestamp, TTL 30d). Utiliser Recharts de `packages/ui`. _(2026-04-23: New `/api/history/aggregate` endpoint + `HealthCharts.tsx` with `LineChart` (p95), `AreaChart` (uptime%), `BarChart` (error rate per service). 7d/30d tabs, theme tokens for colors, i18n EN/FR, 7 tests passing.)_
- [ ] **Monitoring app-scoping (future)** — Currently superadmin-only in EZStart. Each app could have `/admin/monitoring` filtered by appName. Requires: API query param `?appName=ezbill`, SDK component `<MonitoringDashboard appName="ezbill" />`. Low priority — only 1 superadmin user today.
- [ ] **Monitoring package extraction (future)** — Extract SystemOverview + hooks from ezstart/monitoring into `packages/monitoring/client` (UI) + keep `packages/monitoring` (types/collectors). **Bloqué par :** décision de design app-scoping.
- [ ] **CI audit trending (future)** — Run `check:dead-code`, `check:size`, `check:i18n` in GitHub Actions. Parse results → MongoDB. Dashboard shows score evolution. Currently audits.json is static (score 96.6/100).
- [ ] **`@ezstart/workspace-sdk` (future)** — multi-tenancy primitive: Workspace + Project + Members + Roles, factory agnostique suivant `.claude/rules/standard.md`. Utilisé par greenpulse-premium / ezbill / ezpay quand le besoin se concrétise. Le code green-pulse précédent (workspaces/projects/forms) a été supprimé en commit `7f6aa9db`.

### AI platform

- [ ] **chat-sdk `<ChatLayout>` (futur)** — Même pattern que AILayout : wrappe Thread de packages/ui + logique chat temps réel (Socket.IO, rooms, typing indicators, presence, P2P). Les deux SDKs partagent le même design system via packages/ui.
- [x] **Dynamic plans** — green-pulse `/chat` sidebar plan label is now dynamic via `usePlans({ active: true })` wrapped in `<PayProvider applicationId={NEXT_PUBLIC_EZAUTH_APP_ID}>`. New idempotent seed script `apps/ezpay/api/src/scripts/seed-green-pulse-plans.ts` (`pnpm --filter api-ezpay seed:green-pulse-plans`) creates the Free "Self-Awareness" plan (amount=0, no Stripe sync). Hardcoded i18n keys `plans.{free,premium,golden}` removed (replaced by `plans.{loading,noPlan}`). Tests: 3 new + 550 ezpay green. Local commit only — needs `seed:green-pulse-plans` run on prod to materialise the plan. (2026-04-23)
- [ ] **Alertes quota** — Notification (email/toast) quand une app atteint 80% de son quota tokens/coût. Bloquer à 100%.
- [ ] **API key rotation** — Pouvoir changer une clé API provider sans downtime. Hot-reload dans ProviderRegistry.
- [x] **Provider health check** — `IAIProvider.healthCheck(signal)` optional method (OpenAI uses `models.list()`, Anthropic/Gemini use 1-token ping), `ProviderRegistry.runHealthChecks()` + circuit breaker (3 consecutive failures → auto-disabled), recovery (continues probing disabled providers, re-enables on success), latency-based degradation (>3s = degraded). `startHealthCheckScheduler()` helper boots in ezstart API (default 5min, `AI_HEALTH_CHECK_INTERVAL_MS` env override). `getStatus()` snapshot + `GET /api/ai/providers/status` public endpoint. `provider.status.changed` event for subscribers. 25 new tests. (2026-04-23)
- [ ] **Rate limiting per-app** — Limiter le nombre de requêtes AI par app (pas juste global IP). Basé sur `AppProvider` config.
- [x] **AI streaming SSE** — Route `POST /api/ai/chat/stream` (ezstart-api) + hooks SDK `useAIThread` / nouveau `useAIChatStream` (lightweight). Tests unitaires `OpenAIProvider.handleStreaming` + parser SSE `readSseStream` (adversarial: chunk boundaries, CRLF, JSON malformé, abort, erreur mid-stream). (2026-04-23)
- [ ] **Smart provider routing** — Router automatiquement chaque message vers le provider le plus adapté dans une même conversation (ex: factuel→gemini, complexe→gpt-4o, vision→gemini). Critères: type de prompt, mots-clés, coût, complexité.
- [x] **Provider model override dynamique** — `AppProvider.config.model` est maintenant passé per-request via `ProviderSendOptions.model` (concurrency-safe, ne mute pas le singleton). Providers exposent `getModel()` / `setModel()` ; registry expose `updateModel(id, model)`. Routes `sendMessage` + `streamMessage` (ezstart-api) résolvent et appliquent l'override en runtime. Helper `assertValidModelName` centralisé. Tests : 30 nouveaux (per-request override, setModel, updateModel, concurrent in-flight, validation). (2026-04-23)
- [ ] **Provider status/health dans l'UI** — Afficher le status (active/quota expired/error/disabled) dans les dashboards admin. Si un provider a plus de quota, le marquer visuellement et le masquer côté user.
- [x] **utm_source tracking** — Send utm_source from localStorage to backend during quicksignup + register. Stored on auth_users alongside promoCode. Schema cap 128 chars, shared `readUtmSource()` helper in auth-sdk. (2026-04-23)

---

## Apps

### ezstart (api 6100 / web 6101)

Landing page / portfolio + Monitoring dashboard (health, errors, audits) + Admin panel + Feature demos (CV, QR, Business Card) + Libraries showcase. **Status:** maintained.

#### P1 — Admin federation hub (après ezauth/ezpay nouveau key system finalisé)

Objectif : EZStart = hub admin central, agrège les panels admin de chaque app via SDK components. Zero duplication, zero aller-retour entre apps pour un superadmin.

- [ ] **EZHUB-001: Admin federation hub** — `apps/ezstart/web/src/app/[locale]/(dashboard)/admin/` en tabs qui embed `<AuthAdminDashboard />`, `<PayAdminDashboard />`, `<MonitoringDashboard />`, etc. Remplace les admin panels per-app.
- [ ] **EZHUB-002: pay-sdk exporter `<PayAdminDashboard />`** — actuellement l'admin ezpay vit dans `apps/ezpay/web`, à extraire dans `@ezstart/pay-sdk/components` (agnostique, publishable).
- [ ] **EZHUB-003: Superadmin JWT global** — même JWT accepté par ezauth-api + ezpay-api + ezstart-api (JWT_PUBLIC_KEY partagé). Pas de clé API par app pour le superadmin.
- [ ] **EZHUB-004: SDK AdminDashboard `apiUrl` + `authToken` props** — chaque component admin accepte ces props pour pointer vers l'API distante (cross-origin).
- [ ] **EZHUB-005: Migration admin panels ezauth/ezpay vers hub** — une fois EZHUB-001 à 004 fait, supprimer les routes `/admin` dans ezauth/web et ezpay/web (tout passe par ezstart/admin).

#### P2 — Footer pages automation (après sprint ezauth+ezpay)

Stratégie pour que les pages footer (docs, changelog, status, blog) soient **zero-maintenance manuelle**. Pattern suivi par Stripe/Clerk/Vercel : source de vérité = code/git, rendu MDX automatique.

- [ ] **DOCS-001: `/docs` auto-render package READMEs** — page `/docs` render les `packages/*/README.md` en MDX avec nav sidebar (auth-sdk, pay-sdk, api-sdk, ui). Source de vérité = README packages, zéro duplication.
- [ ] **DOCS-002: Setup `changesets` + `/changelog` auto** — `@changesets/cli` au monorepo : chaque `feat:`/`fix:` conventional commit → CHANGELOG.md auto-généré à chaque release. `/changelog` render le CHANGELOG en MDX.
- [ ] **DOCS-003: `/status` public app-scoped** — endpoint `GET /api/status?app=xxx` (public, pas d'auth) retournant uptime % + incidents récents depuis MongoDB HealthCheck model. Page `/status` par app consomme cet endpoint. Réutilise infra existante `@ezstart/monitoring` + `ezstart` API.
- [ ] **DOCS-004: Blog — keep or drop decision** — tout SaaS pro n'a pas de blog (Anthropic n'a qu'une section Research). Options : (a) placeholder "Coming soon" jusqu'au 1er post, (b) remplacer par `/customers` (testimonials), (c) supprimer du footer. Décision user à documenter ici.

#### P1 — Bugs & code quality

- [ ] **Hardcoded strings monitoring pages** — i18n violation. Remplacer par `t()` dans `errors/page.tsx`, `audits/page.tsx`, `page.tsx`, `TrendingGraph.tsx`, `ErrorsFeed.tsx` (severity labels, timeAgo strings, "Failed to load monitoring data", "Next update in:", score labels, no-audits message).

#### P2 — API improvements

- [ ] **Complete activity logs** — `activity/list.ts` a 3 TODOs : fetch deployment events (Railway/Vercel webhooks), health changes from MongoDB, audit updates. Aucune source live raccordée (Sentry retiré 2026-04-25).
- [ ] **Remove mock history utility or guard it** — `api/src/utils/mockHistory.ts` pas importé en prod mais shippé. À supprimer ou test-only.

#### P2 — Monitoring UX

- [ ] **Uptime history page** — Pas de page dédiée pour l'historique uptime. `TrendingGraph` existe mais pas accessible depuis nav. Besoin `/monitoring/history` ou `/monitoring/health/:serviceId` avec time range configurable (24h, 7d, 30d).
- [ ] **Fix `minutes`/`seconds` countdown unused in overview** — `monitoring/page.tsx` calcule mais n'affiche pas. "Next update in" manque sur l'overview.
- [ ] **Responsive improvements** — `MetricsOverview` hidden on mobile (considérer version compacte). `TrendingGraph` axis labels peuvent overflow petits écrans. Quick Actions : switch `router.push` → `Link` pour prefetching.
- [ ] **Dashboard navigation** — Pas de breadcrumbs ou sub-nav. Ajouter tab bar ou breadcrumb pour monitoring/health/errors/audits.
- [ ] **Auto-refresh indicator** — Countdown timer doit afficher "Refreshing..." quand `isFetching=true`. Actuellement `isFetching` destructuré mais unused dans health/audits pages.

#### P3 — Feature demos

- [ ] **CV Generator — missing sections** — Form n'a que personal info + summary. `CVData` définit experience/education/skills/languages/certifications mais pas de sections form.
- [ ] **CV Generator — PDF export** — `jspdf` et `html2canvas` installés mais aucun bouton download.
- [ ] **QR Code — download button** — Canvas rendu mais aucun download (PNG/SVG).
- [ ] **Business Card — download/print** — Idem, pas d'export. Feature section mentionne "Print Ready" mais aucune action.
- [ ] **Feature demos access control inconsistency** — QR Code = `RequireAuth` seul. CV Generator et Business Card = `RequireAuth` + `RequireRole("superadmin")`. Choisir une ligne cohérente.

#### P3 — Feature gaps

- [ ] **Alert system activation** — Email + Slack alerting est codé mais nécessite ENV vars (`ALERT_EMAIL_ENABLED`, `ALERT_SLACK_ENABLED`, SMTP, Slack webhook). Ajouter `.env.example` + documentation + toggle admin UI ou test endpoint.
- [ ] **Deployment status integration** — Routes `/api/deployments` utilisent `child_process.exec('git log')` qui ne fonctionne que sur repo cloné. Intégrer Railway/Vercel API pour last deploy time, build status, deploy URL.
- [ ] **Real-time monitoring improvements** — Socket.IO n'émet que sur health check results. Pourrait émettre sur error threshold breached, deployment detected. Considérer SSE. Ajouter indicateur "live" quand socket connected.
- [ ] **Performance dashboard page** — Endpoints existent (`/api/performance/:serviceId`, `/api/performance/:serviceId/endpoints`) avec p50/p95/p99 mais pas de page frontend. Ajouter `/monitoring/performance`.
- [ ] **More feature demos** — Color palette generator, Markdown to PDF, Image compressor, Password generator, JSON formatter.
- [ ] **Admin panel — CRM / CMS / UX overhaul** (priorité haute) — EZStart admin doit devenir le hub central (CRM + CMS + monitoring).
  - **CRM — Gestion utilisateurs :** User creation from admin panel, deletion/deactivation (soft delete + motif), bulk operations (assign role, delete, export), server-side search + filters (email, username, role, app, date range), user detail page (profil, sessions, payments, apps), audit log admin actions, export CSV/JSON, stats dashboard (users actifs, inscriptions/jour, retention).
  - **CMS — Gestion contenu :** CRUD projets landing page (order, visibility), feature demos (enable/disable, access), textes/traductions (edit inline, preview), upload assets, blog/announcements (v2).
  - **UX Admin :** Sidebar nav (Dashboard, Users, Content, Monitoring, Settings), breadcrumbs, dark/light cohérent, mobile responsive, real-time notifications, quick actions (ban user, trigger health check, view logs).
  - **Bloqué par :** RBAC propre (done via RBAC-1 EZAuth) — peut démarrer.

#### P3 — Testing & DX

- [ ] **API documentation** — Certaines routes utilisent `createRouterWithDoc` + OpenAPI (health, audits), d'autres non (activity, history, performance, projects, trigger, scheduler). Harmoniser.
- [ ] **Duplicate HealthChecker instances** — Plusieurs routes créent leur propre `new HealthChecker()` (`health/list.ts`, `health/get-by-service.ts`, `health/history.ts`, `trigger.ts`). Chacune a sa propre in-memory history. Partager un singleton ou se baser uniquement sur MongoDB.

---

### ezauth (api 6110 / web 6111)

Authentication SaaS (Clerk clone) pour tout le monorepo + external devs. **Status:** active — en route vers publishable key Clerk/Stripe pattern.

#### Backlog 2026-03-29 + P6/P7/P8/P9 done — voir BACKLOG-HISTORY.md

- [x] **THEME-TENANT-CUSTOM-001** — SSR-first white-label theme per-tenant on auth pages. DONE 2026-04-24 : (a) `Application` schema extended avec `theme?: { primary, background, foreground, accent, logo }` + `themeEnabled` flag, Zod strict validation (hex/oklch/hsl/rgb only, rejette `<`, `{`, `;`, logo = http/https), (b) `PATCH /api/applications/:id/theme` endpoint (owner+superadmin RBAC, 404 on tenant mismatch), (c) `GET /api/keys/config` enrichi avec tokens quand `themeEnabled && theme` (LRU cache 30s, invalidé sur PATCH), (d) middleware ezauth web async fetch du config via `?key=` (800ms timeout, LRU 30s) → set `x-app-theme` + `x-app-theme-tokens` headers, (e) `[locale]/layout.tsx` SSR lit headers → injecte inline `<style>` avec `:root[data-app="<slug>"]{--primary:...}` → zero flash au first-paint, (f) nouveau tab "Theme" dans `ApplicationDetailView` (SDK) avec color pickers, preview en direct, enable toggle gated par `canEnableTheme` prop (Pro), i18n en/fr complète. Tests : 30 unitaires (theme utils) + 10 intégration (PATCH route + key config) + 11 SSR (header parsing + CSS render).
- [x] **REFACTOR_DOCS_COMPONENTS-001** 🟠 P1 — DONE 2026-05-01 : Refactored `/docs/components` (apps/ezauth/web) to follow Stripe Elements / Clerk docs pattern. Components are now projected onto 8 high-level domains (Auth Forms / Auth Buttons / User Profile / Dashboards / Applications & Keys / Guards & Banners / Security / Audit) instead of the 17 file-system "folder bucket" categories the registry generator emits. Variant triplets (`SignInForm` + `SignInCard` + `SignInModal`, etc.) are collapsed into one feature card per primitive — 5 features (Sign In / Sign Up / Forgot Password / Reset Password / Verify Email) replace 15 duplicate entries. Internal shells (`AuthCardShell`, `AuthModalShell`, `SignedIn`, `SignedOut`) are filtered. View-source GitHub link is exposed on every single-component card. Sidebar + Cmd+K palette consume the same domain tree (single source of truth in `_lib/grouping.ts`). `@internal` text-marker filter is defensive (degrades gracefully when #153 ships an explicit `isInternal` boolean on registry entries). i18n: 18 new keys × 3 locales (en/fr/vi) under `components.domain.*` + 5 new top-level keys for badges + counts. Follow-up backlog: `DOCS-COMPONENTS-ADMIN-INTERNAL-TOGGLE-001` 🟡 P2 (admin-only "Show internal components" switch — skipped here to keep PR scoped).
- [x] **USER-EDIT-MODAL-LIMITED** 🟠 P1 — DONE 2026-05-01 : Edit User modal in `/admin` was role-only. Now supports profile fields (firstName / lastName / email + read-only avatar deep-linked to `/dashboard?section=account`) + roles (existing) + status toggles (`isVerified` force-verify, `isActive` soft-delete inverse with 30-day grace period, `mustChangePassword` next-login forced reset). Email change auto-resets `isVerified` and triggers a fresh verification email to the new address (anti-bypass: `isVerified: true` in same request is ignored). Backend: `PATCH /api/admin/users/:id` Zod schema extended; new audit log actions `admin_user_updated` / `admin_email_changed` / `admin_account_deactivated` / `admin_account_reactivated` / `admin_must_change_password_set` / `admin_force_verified` (every sensitive mutation logged with actor identity). New `mustChangePassword` field on `AuthUserDocument` + `AuthUser` DTO (enforcement at login is V2 — flag is persisted + audit-logged only). RBAC: superadmin-only, peer protection (cannot deactivate / demote another superadmin), self-protection (cannot deactivate or remove own superadmin role). SDK: renamed `EditRolesModal` → `EditUserModal` with 3 sections separated by `<Div className="h-px bg-border" />` (deprecation alias preserved for backwards compat). i18n: 16 new keys × 3 locales (en/fr/vi) under `admin.editUser`. Tests: 10 new vitest cases (firstName/lastName, email change side-effect, taken-email 409, anti-bypass, soft-delete + grace period, reactivate, self-deactivation 400, peer protection 403, mustChangePassword toggle, force-verify) on top of existing 22 → 32 passing total. Avatar upload remains user-only (admin sees current avatar read-only with explanatory help text).
- [ ] **THEME-PRESETS-001** — Ajouter des presets de thèmes pré-construits (Stripe-like: Default, Dark, Vibrant, Minimalist) sélectionnables en 1 clic depuis le dashboard avant de personnaliser les tokens. Stocker les presets dans `packages/ui/src/lib/design-system/presets.ts` pour réutilisation cross-SDK.
- [ ] **THEME-LOGO-UPLOAD-001** — Intégration Vercel Blob (ou S3) pour upload du logo tenant. Actuellement le champ `theme.logo` accepte uniquement une URL http/https ; ajouter un upload direct avec resize auto + preview. Exposer le logo via `<img src={theme.logo}>` dans le header de la page login quand présent (actuellement le champ est persisté mais non rendu).
- [x] **DOCS-COMPONENTS-ADMIN-INTERNAL-TOGGLE-001** 🟡 P2 — DONE 2026-05-01 : Superadmin-only "Show internal components" switch on `/docs/components` (hidden for non-admins, default off, persisted to `localStorage`). Registry generator now surfaces `isInternal: boolean` on each entry instead of silently filtering `@internal`-tagged components — `AuthCardShell` and `AuthModalShell` are now in the registry (60 entries, +2) and gated by the toggle. `<DocsInternalToggleProvider>` Context wraps the layout so the landing page, sidebar, and Cmd+K palette all share a single toggle source. Internal entries get a dashed warning border + `<Badge variant="warning">internal</Badge>` for clear visual differentiation. When the toggle is ON, an `ADMIN VIEW` warning badge surfaces next to the switch. i18n: 5 new keys × 3 locales (en/fr/vi) under `components.adminToggle*`. No SDK changes — purely consumer-side curation surface.
- [x] **DOCS_UI_INTERACTIVE-001** (#164) 🟠 P1 — DONE 2026-05-01 : Made `/docs/components` (apps/ezauth/web) interactive : (1) sidebar category headers are now clickable links that route to `/docs/components?category=<domain-key>` — landing page filters the visible sections + smooth-scrolls to the active one + surfaces a "Filtering: …" badge with a clear-filter CTA. New "All categories" entry at the top of the sidebar resets the filter (active state surfaces when no `?category=` param is set). (2) F/C/M variant badges replaced with interactive Radix Tabs everywhere : on landing-page feature cards (local state, "Open detail" link carries `?variant=<slug>` so the deeplink lands on the right page) and on the detail page itself (new `<FeatureVariantSwitcher>` wraps `<ComponentShowcase>` and uses `router.replace()` to swap component slug + variant param without polluting back history). (3) Cmd+K palette now passes the variant label to its navigate helper so picking "Sign In Card" lands on `/docs/components/forms/sign-in-card?variant=card` directly. New `_components/VariantTabs.tsx` (thin Radix `<Tabs><TabsList>` abstraction with controlled active value + onChange) + new `_components/FeatureVariantSwitcher.tsx` (client component that resolves the feature group via `findFeatureGroupForComponent` reverse lookup added to `_lib/grouping.ts`). i18n : 8 new keys × 3 locales (en/fr/vi) — `sidebarAllEntry`, `landingFeatureSwitchLabel`, `landingFeatureDetailLink`, `landingFilterActive`, `landingClearFilter`, `detailFeatureGroupLabel`, `detailFeatureVariantsCount`, `detailFeatureVariantsAriaLabel`, `detailFeatureVariantsHelp`. Keyboard nav free via Radix arrow keys. Zero SDK changes — purely consumer-side `/docs/components` ergonomics.
- [x] **DOCS_DEMO_SANDBOX_BACKEND-001** (#163) 🟠 P1 — DONE 2026-05-01 : Backend infrastructure for live `/docs/components` previews. Reserved Application slug `_docs-demo` (only superadmins may create `_*` slugs via the API route, 403 otherwise) with `isPlatformOwned: true` + `isTestMode: true` + `quotas: { maxUsers: 100, maxEventsPerDay: 500 }`. Hard quota gates enforced by new `middleware/check-demo-quotas.ts` on `/auth/register` + `/auth/login` + `/auth/login-cookie` (strict no-op for non-demo traffic — short-circuits via `req.body.app !== '_docs-demo'` before any Mongo lookup). 24h reset cron (`services/docs-demo-reset.service.ts`) wipes `apps: ['_docs-demo']` AuthUsers + their refresh tokens + audit logs older than 24h, preserves the Application + API keys. Manual reset endpoint `POST /api/admin/docs-demo/reset` (superadmin-only, audit-logged). Idempotent seed script `pnpm --filter api-ezauth seed:docs-demo` creates the Application + 2 keys (`pk_test`, `sk_test`); self-heals legacy Applications by back-filling quotas / reservedSlug / isPlatformOwned / isTestMode in place. New optional fields on `Application`: `reservedSlug?: boolean` + `quotas?: { maxUsers?, maxEventsPerDay? }` (backward-compat). `APPLICATION_SLUG_REGEX` widened from `/^[a-z0-9-]{2,32}$/` → `/^(?:_[a-z0-9-]{1,31}|[a-z0-9-]{2,32})$/`. Tests: +8 unit tests for the seed script + 15 cross-tenant isolation tests (`__tests__/isolation/docs-demo-isolation.test.ts`) proving reserved slug protection (regular tenant 403 / superadmin 200), quota gates (max users + max events/24h), strict no-op for non-demo even when sandbox is full, reset deletes ONLY `_docs-demo` data (live tenant data + their refresh tokens untouched), reset preserves the sandbox skeleton. `apps/ezauth/web/.env.example` exposes `NEXT_PUBLIC_EZAUTH_DOCS_DEMO_KEY=` placeholder. Total: 599/599 tests passing. Wave 2 follow-ups (depends on this): #164 (UI interactive — done) + #165 (wire docs with demo key).
- [x] **DOCS_DEMO_WIRE_PAGES-001** (#165) 🟠 P1 — DONE 2026-05-01 : Wired every `/docs/components/*` page with a real live preview connected to the platform-internal `_docs-demo` sandbox Application (depends on #163 backend). New `_demos/_lib/DemoSandbox.tsx` mounts a nested `<AuthProvider publishableKey={NEXT_PUBLIC_EZAUTH_DOCS_DEMO_KEY} appName="_docs-demo" storageKey="ezauth-docs-demo">` per demo so visitor interactions (signup, signin, key creation, account deletion) hit a sandboxed dataset isolated from the visitor's main session — the nested provider creates its OWN Zustand store via Context, so there's zero risk of mutating real account state from the docs surface. Replaced 18 of 20 `<Placeholder>` demos with live wiring (UserMenu, UserMenuV2, UserSettings, UserDashboard, EZAuthDashboard, AuthAdminDashboard, OAuthProvidersSection, AuditLogSection, SessionsManager, EmailVerificationStatus, TwoFactorSettings, ApplicationsList, DeveloperPortal, CreateKeyModal, KeyCreatedModal, UsageDetailsModal, CreateApplicationModal, MaintenanceBanner) — only `AuthCallbackPage` (consumes a real OAuth code) and `ApplicationDetailView` (requires a real Application ID seeded in the sandbox) keep neutral Placeholders with factual, non-marketing reasons. Existing wired demos (AccountModal, AccountModalV2, DeleteAccountSection) backfilled with `<DemoSandbox>` for consistent isolation. New persistent **DEMO MODE** banner on every detail page (yellow `bg-warning/10 border-warning/30` card with `lucide:FlaskConical` icon, `role="note"`) signals that interactions are real-but-isolated. Graceful degrade : when `NEXT_PUBLIC_EZAUTH_DOCS_DEMO_KEY` is unset (typical for forks before the seed script runs), the `<DemoSandbox>` wrapper auto-falls back to a Placeholder explaining how to enable live previews — no crash. **Marketing speak dropped** : every "Stripe/Clerk parity", "Sign in to see it live", and similar tease replaced by factual descriptions of what the component does (the Placeholder fallback now explicitly recommends "factual" reasons in its JSDoc). i18n : 1 new key × 3 locales (en/fr/vi) — `components.demoModeBanner.{title,description}`. Follow-up backlog : `DOCS-CODE-HIGHLIGHT-001` 🟡 P2 (side-by-side syntax-highlighted source preview), `DOCS-DEMO-RESET-CTA-001` 🟡 P2 (superadmin-only "Reset demo data" button on detail pages calling `POST /api/admin/docs-demo/reset` from #163).
- [x] **DOCS_DEMO_BANNER_INLINE-001** 🟡 P2 — DONE 2026-05-01 : DEMO MODE banner inlined inside the live preview card top-left (UX cleanup follow-up to #165). Was a separate full-width `<Div>` block above the preview card, visually disjoint and adding vertical noise. Now a compact pill-style overlay (`absolute top-3 left-3 z-10`) inside `<PreviewFrame>` with `border-warning/40 bg-warning/15 backdrop-blur-sm` for readability over the checker pattern background, kept the `lucide:FlaskConical` icon + `role="note"`. `min-h` bumped 200px → 240px and demo wrapper gets `pt-12` so the banner never overlaps centred demos. i18n keys unchanged.
- [x] **WAVE_8_DOCS_DESCRIPTIONS_CLEANUP-001** (#166) 🟠 P1 — DONE 2026-05-01 : Three follow-up issues found by E2E test on `/docs/components` after #165 shipped. (1) **Marketing speak in JSDoc** — `UserMenuV2` ("V2 — SaaS-pro user dropdown (Stripe / Clerk / Vercel parity)"), `EZAuthDashboard` ("Stripe/Clerk-style sidebar with progressive RBAC disclosure"), `AccountModal` ("Drop-in account management modal"), `AuthAdminDashboard` ("Drop-in component for both…"), all 5 `cards/*` ("drop-in for any /login page"), 2 `modals/*` ("Equivalent to Clerk's `<SignIn />`"), `RegisterButton` ("Drop-in replacement for `<Link>`"), `EmailChangeForm` ("EmailChangeForm — drop-in form"), `MagicLinkButton` + `MagicLinkForm` (re-attached JSDoc to function declaration so it surfaces in the registry), `UserMenu`, `index.ts` re-export comments, `user-menu-v2/types.ts`, `react/use-idle-timeout.ts` ("Stripe / Clerk parity"). Plus the docs hero subtitle ("Production-grade React components… Drop them into any Next.js app — zero CSS to write.") in `apps/ezauth/web/src/messages/{en,fr,vi}/components.json` `landingSubtitle`. All replaced with factual descriptions (verb-active, what the component does — never why it's "cool"). (2) **Phase-1 migrated wrappers showed only `@deprecated` message as summary** — `AuthErrorBanner`, `MaintenanceBanner`, `ScopeContextIndicator`, `PasswordStrength`, `TurnstileWidget` now have a functional top-level summary BEFORE the `@deprecated` tag (the registry generator parses prose first and the deprecation message is correctly skipped via the existing `@<tag>` filter). (3) **30 components had no JSDoc summary** ("No summary available." in docs) — added 1-sentence factual description + `@example` to each: `LoginButton`, `UserAvatar`, `UserMenu`, `UserSettings`, `EmailVerificationStatus`, `VerifyEmailFlow`, `EmailVerificationBanner`, `EmailChangeForm`, `ForgotPasswordForm`, `QuickSignUpForm`, `ResetPasswordForm`, `SignInForm`, `SignUpForm`, `SessionsManager`, `TwoFactorPrompt`, `TwoFactorSettings`, `RequireEmailVerified`, `UserDashboard`, `AuditLogSection`, `ApplicationCard`, `ApplicationDetailView`, `ApplicationsList`, `CreateApplicationModal`, `ApiKeysTable`, `CreateKeyModal`, `DeveloperPortal`, `KeyCreatedModal`, `UsageDetailsModal`, `MagicLinkButton`, `MagicLinkForm`. Registry regenerated: 60 components / 17 categories / **0 empty summaries** (was 30/60). Audit grep confirms zero `production-grade|saas-pro|stripe.*clerk.*parity|battle-tested|industry-standard|drop them` in `packages/auth-sdk/src/` outside the registry generated file. Validation: `pnpm typecheck` 39/39 pass, `pnpm --filter @ezstart/auth-sdk build` clean, `pnpm --filter @ezstart/auth-sdk test --run` 567/567 pass. Backward compat preserved (deprecated wrappers still functional, JSDoc additions only).
- [ ] **AUTH-SDK-USAGE-V1-001** 🟠 P1 (3-5 jours post UI-CHARTS-PRIMITIVES-001) — Implement real `<UsageSection>` in auth-sdk: `GET /api/usage/me` (user) + `GET /api/usage/app/:slug` (admin) endpoints aggregating from `auditlogs` collection. Render via UI-CHARTS-PRIMITIVES-001 (blocks on it). SSR companion `getServerUsage()`. Texts props i18n-agnostic. Trigger: 1+ paying customer asks for analytics.

---

### ezbill (api 6120 / web 6121)

Invoicing & billing pour les SME. **Status:** in-progress, priorité haute.

#### P0 — Before launch

- [ ] **i18n: Delete quote dialog hardcoded English** — "Delete Quote" et description.
- [ ] **Security: Add per-user rate limiting on `/api/ai/extract-invoice-data`** — AI costs money.
- [ ] **Feature: Stripe/PayPal checkout integration** — Generate payment links pour invoices.
- [ ] **Feature: Email sending** — Envoyer invoices/quotes par email (Resend ou `@ezstart/email-service`).
- [ ] **EB-060: Migrer exchange rates vers Frankfurter (zero-key) + extraire SDK `@ezstart/exchange-rate`** — `apps/ezbill/api/src/utils/fetch-exchange-rate.ts` appelle `api.exchangerate.host` qui requiert maintenant un `access_key`. Frankfurter (`api.frankfurter.app`) est free/no-key/illimité, data ECB officielle. Une fois migré, extraire en package shared consumable par ezpay + ezstart (multi-currency display). Var `EXCHANGE_RATE_API_KEY` à supprimer de `IGNORED_VARS` après migration.

#### P1 — Essential for pro

- [ ] **Feature: Client portal** — Vue invoice non-authentifiée + payment flow via public link.
- [ ] **Feature: Onboarding wizard** — Setup guidé (company → payment method → first invoice).
- [ ] **Fix: Quote modal form non reset** — State persiste entre opens (contrairement à invoice-modal qui a useEffect reset).
- [ ] **Fix: No confirmation dialog for quote accept/decline** — Clic Accept/Decline fire API call immédiatement sans confirmation.
- [ ] **Fix: Share modal "Copy Link" copies blob URL** — Seulement valide dans tab courant. Useless pour partager.
- [ ] **UX: Wire client search input on dashboard** — Skeleton existe mais pas hooked.
- [ ] **UX: No invoice delete action** — Seulement via settings trash. QuoteCard a delete button mais pas InvoiceCard.
- [ ] **UX: Date range filtering on client dashboard.**
- [ ] **No overdue invoice detection** — Pas d'indicateur visuel pour past due date.
- [ ] **PDF preview only for invoices/receipts** — Quotes montrent "click refresh" qui ne fait rien d'utile.
- [ ] **v2 landing page placeholder** — "Dashboard Screenshot" au lieu d'image réelle.
- [ ] **v2 landing page hardcoded strings** — "BEST VALUE", "Challenge", "Solution" non i18n.
- [ ] **Feature: CSV/Excel export** — Pour invoices et clients.
- [ ] **Code: Delete dead components** — `status-change-modal`, `login-section`, v1 cards, `CombinedRevenueChart`, `useUserStore`, `cleanup-old-auth`.
- [ ] **Admin dashboard: DataTable-based** — Replicate ezauth pattern, puis add to ezstart admin hub.
- [ ] **`billing-permissions.ts` dupliqué** — Entre `web/src/utils/` et `api/src/utils/`. Risque drift (web a `canDecline` alias, API non). Extraire en shared package ou `@ezbill/types`.

#### P2 — Professional polish

- [ ] **Remove 5 remaining `any` types** — `extractItems(response: any)` in settings, `doc?: any` + `openPreview(..., doc: any)` in client page, `cleanData: any` in payment-method-modal, `updateLineItem(... value: any)` in quote-modal.
- [ ] **Refactor quote-modal.tsx (542-647 lines)** — Extract FormFields, ItemsTable, Summary.
- [ ] **Client dashboard page (627 lines) too large** — Extract invoice/quote/receipt sections.
- [ ] **Payment method modal (514 lines) split** — Extract bank transfer, crypto fields.
- [ ] **Consolidate `useInvoicePDF.ts` and `use-generate-pdf.tsx`** — Into one hook.
- [ ] **Invoice modal form data init duplicated** — Same 15-field object built twice (lines 59-80 and 90-113).
- [ ] **Legacy v1 card components unused** — `ClientCard.tsx`, `CompanyCard.tsx`, `PaymentMethodCard.tsx` — dashboard utilise `_v2` versions.
- [ ] **`protected-version-switch.tsx` + `v2/page.tsx`** — Suggèrent version toggle. Si v2 est default, remove v1 remnants.
- [ ] **UX: Invoice number format customization** — Ex: FACTURE-2025-001.
- [ ] **UX: Multi-currency revenue aggregation in charts.**
- [ ] **UX: Bulk actions** — Select multiple invoices for delete/export/status change.
- [ ] **UX: Empty state illustrations.**
- [ ] **UX: Mobile action button overflow fix.**
- [ ] **API `findWithQuery` limit=20 non utilisé** — Web fetche TOUT en une fois (no pagination in billing-provider). Pagination effective inutilisée.

#### P3 — Nice to have

- [ ] **Feature: Recurring invoices with cron scheduling.**
- [ ] **Feature: Invoice templates (save/load).**
- [ ] **Feature: Analytics dashboard (MRR/ARR).**
- [ ] **Feature: Partial payments tracking.**
- [ ] **Feature: Credit notes / refund tracking.**
- [ ] **Feature: Tax profiles (save common tax rates).**
- [ ] **Feature: Keyboard shortcuts.**
- [ ] **Feature: Payment reminders** — Automated email quand invoice approche ou dépasse due date.
- [ ] **Feature: Quote expiration reminders.**
- [ ] **Feature: Duplicate invoice/quote** — One-click.
- [ ] **Feature: Multi-user/team** — Invite team members per company.
- [ ] **Feature: Dashboard date range picker.**
- [ ] **Feature: Client statements** — All transactions per client.
- [ ] **Feature: Expense tracking** — Revenue + expenses pour profit/loss view.
- [ ] **Feature: Document attachments** — Contracts, receipts sur invoices/quotes.
- [ ] **No animations/transitions between group-by modes** (month/week/status).
- [ ] **Toast keys pattern** — create/created/createFailed séparés, pourrait utiliser interpolation.
- [ ] **`create-test-user.ts` has ~30 console.log** — Déplacer en `scripts/` ou utiliser logger.
- [ ] **No character limit on notes/terms/description** — Ni client, ni server.
- [ ] **Testing: E2E invoice/quote/receipt flows.**
- [ ] **Testing: API endpoint tests (target 60%+ coverage).**
- [ ] **Testing: Service layer (markAsPaid, convertQuoteToInvoice).**
- [ ] **Testing: Web component tests** (modals, forms, billing permissions).
- [ ] **Testing: Exchange rate cron job.**
- [ ] **Testing: Document number generation race conditions.**

---

### ezpay (api 6130 / web 6131)

Payment SaaS (Stripe clone) avec SDK publishable + SaaS dashboard. **Status:** active — doit consommer ezauth via publishable key comme un vrai SaaS externe.

#### P0 — Post-P7 (config staging/prod après dogfood validated 2026-04-21)

- [ ] **EZP-PROD-001: Setup `EZPAY_PLATFORM_STRIPE_ACCOUNT_ID`** dans staging + prod
  - Récupérer `acct_*` du compte Stripe EZStart LLC sur dashboard.stripe.com
  - Ajouter `EZPAY_PLATFORM_STRIPE_ACCOUNT_ID=acct_xxx` dans Railway api-ezpay env vars (staging + prod)
  - Re-run `pnpm --filter api-ezpay migrate:connected-accounts-to-apps` pour seed platform ConnectedAccount sur 8 apps EZStart (skip auto si env var absent)
- [ ] **EZP-PROD-002: Generate `EZPAY_SERVER_EZAUTH_KEY`** dans staging + prod
  - Login superadmin sur ezauth dashboard (staging URL puis prod)
  - Create key `ez_sk_live_*` scoped Application "ezpay", scope: admin, type: secret
  - Set dans Railway api-ezpay env vars `EZPAY_SERVER_EZAUTH_KEY=ez_sk_live_*`
- [x] **EZP-PROD-003: V2 per-Application webhook secret** (DONE 2026-05-01)
  - ✅ Stripe-pattern per-Application secret stored on `Application.webhookSecret` in MongoDB
  - ✅ Removed shared `EZAUTH_WEBHOOK_SECRET` env var on both ezauth + ezpay sides
  - ✅ `POST /api/applications/:id/regenerate-webhook-secret` route + reveal-once UX in auth-sdk
  - ✅ `pnpm --filter api-ezauth seed:webhook-secrets` backfill script
  - ✅ ezpay sender fetches secret via `getApplication(id, { includeWebhookSecret: true })`
  - **Post-deploy migration**:
    1. Deploy this version to ezauth + ezpay (staging then prod)
    2. Run `railway run --service ezauth-api --environment <env> -- pnpm --filter api-ezauth seed:webhook-secrets --force` to backfill
    3. **REMOVE** the legacy `EZAUTH_WEBHOOK_SECRET` env var from BOTH `ezauth-api` and `ezpay-api` Railway services (no longer used; harmless if left, but clean it up)
- [ ] **EZP-PROD-004: Run all migrations en staging + prod**
  - `pnpm --filter api-ezauth migrate:keys-to-apps` (P6-A backfill)
  - `pnpm --filter api-ezpay migrate:plans-to-apps` (P7-A backfill)
  - `pnpm --filter api-ezpay migrate:connected-accounts-to-apps` (P7-B backfill + platform seed)
  - `pnpm --filter api-ezauth seed:self-key` + copy `NEXT_PUBLIC_EZAUTH_KEY` dans web env
  - `pnpm --filter api-ezpay seed:plans` (P7-A seed Starter/Growth/Enterprise EZPay)
  - `pnpm --filter api-ezpay seed:self-key` + copy `NEXT_PUBLIC_EZPAY_KEY` dans web env
- [ ] **EZP-PROD-005: Configurer Stripe Webhook prod** dans dashboard.stripe.com
  - Endpoint URL : `https://api-ezpay.up.railway.app/api/webhooks/stripe` (production URL)
  - Events : `checkout.session.completed`, `customer.subscription.*`, `invoice.*`, `charge.refunded`
  - Copy `STRIPE_WEBHOOK_SECRET` (whsec\_\*) dans Railway env vars (différent du local Stripe CLI)
  - Idem pour staging avec son URL Railway
- [ ] **EZP-LANDING-001: EZPay landing page embed `<PricingPage />`** au lieu du placeholder "Pricing coming soon"
  - `apps/ezpay/web/src/app/[locale]/(public)/page.tsx` — section pricing
  - Embed `<PricingPage applicationId="<ezpay-app-id>" />` (les 3 plans seedés Starter/Growth/Enterprise)
- [ ] **EZP-CONNECT-001: Onboarding Stripe Connect Express pour devs externes (test e2e)**
  - Créer un compte test acme dans ezauth, login, créer Application, attempt onboarding Stripe Connect
  - Vérifier ConnectedAccount stocké correctement, status=active après KYC
  - Test split payment réel : carte 4242 sur acme app embed → split AcmeBank + EZStartBank avec fee 5% (Starter par défaut)

#### Future — Features post-P7

- [ ] **EP-025: Multi-provider architecture** — pay-sdk core `PayClient` already provider-agnostic. Add PayPal provider behind same API. Routes: `POST /api/checkout` accepts `provider: 'stripe' | 'paypal'`. SDK consumer chooses provider or lets API auto-select.

#### Future — Features

- [ ] **3.3 Landing page polish** — Page actuelle est une page de doc SDK, pas adaptée pour utilisateurs finaux. Vraie landing + CTA vers démos. Code snippets stylisés (`<pre>`/`<code>`).
- [ ] **4.6 Idempotency-Key header** — Routes create (donate, purchase, subscribe) ne gèrent pas l'idempotence. Retry → 2e payment record (unique constraint paymentId empêche les doublons Stripe mais pas métier).
- [ ] **5.1 Web `/dashboard` page** — Liste paginée "mes paiements" pour user connecté (API + SDK déjà fait).
- [ ] **5.2 EZBill invoice integration** — Model Payment supporte `type: 'invoice'` avec metadata invoiceId/invoiceNumber. Aucune route API invoice. Créer routes + intégration EZBill.
- [ ] **5.4 Email receipts** — Option 1 : `receipt_email` dans Stripe checkout. Option 2 : email custom via email-service après webhook `checkout.session.completed`.
- [ ] **5.5 Payment analytics dashboard** — Revenue par période, paiements par type/status, graphiques évolution, top projets par revenue.
- [ ] **6.1 `dist/` committed in repo** — `api/dist/` versionné. Supprimer du repo + ajouter `.gitignore`.
- [ ] **P-ADMIN: Filtrage par app** — Chaque app (greenpulse, fengshui) voit ses propres produits dans admin.
- [ ] **P-MARKETPLACE: CartProvider** — Panier multi-produits pour les apps.
- [ ] **P-AI: AI Product Descriptions** — Route API EZPay utilisant `@ezstart/ai-sdk` pour générer descriptions produits. UI édit/valider. Multi-langue FR/EN automatique.
- [ ] **EP-002: Clean stale pending payments** — Auto-archive/delete "pending" payments après 24h (abandoned checkouts).
- [ ] **EP-005: SDK Payment Cards** — SubscriptionCard, DonationCard, PurchaseCard (auto-fetch plan/product data, checkout modal embedded). Apps passent `appName` + `planId`. Variants : default/featured/compact. Props: appName, planId/productId, className, variant, promoCode, onSuccess, onCancel, texts. **Priorité HIGH.**
- [ ] **EP-009: Invoice management** — `GET /api/invoices` (list from Stripe API, non stockées en DB), `GET /api/invoices/:id/pdf` (redirect Stripe URL). SDK `<InvoiceHistory>`. Admin tab in PayAdminDashboard.
- [ ] **EP-010: Currency conversion in dashboard stats** — Save exchange rates à checkout time. Dashboard stats en currency base choisie admin.
- [ ] **EP-011: Promo code targeting** — Plan-specific, type-specific (subscription only), product-specific. Currently universal.
- [ ] **EP-012: Audit ALL DELETE endpoints for soft delete** — All DELETE cross-monorepo doit utiliser soft delete (`deletedAt`). Hard delete only for superadmin + confirmation. Check ezauth users, ezpay payments, green-pulse data. **Priorité HIGH.**

---

### green-pulse (api 6160 / web 6161)

AI-powered ESG & energy resilience platform. Chat assistant (GP.A), workspace/project, blockchain credentials, admin panel. Target: SMEs Southeast Asia (2026 energy crisis, Vietnam ETS, EU CBAM). **Status:** active.

#### P0 — Earth Day Conference (17 avril 2026)

Deadline dur : conférence HCMUSTA HCMC. Audience: SME vietnamiens + ESG experts. Présence Amber via slide QR code + roll-up banner.

- [ ] **GP-202: GP.A chat welcome message update** — Deadline 14 avril. Welcome + suggestions adaptés conference attendees (énergie, green credit, EU exports). Strings VN/EN (hardcoded acceptable pour deadline, i18n propre = Sprint 3).
- [ ] **GP-203: Conference slide design** — Deadline 15 avril. 16:9 slide avec logo + photo Amber + QR code (→ `/earthday?utm_source=earthday&utm_medium=qrcode`) + headline VN/EN + credentials Amber + Earth Day co-branding. PowerPoint + PNG export.
- [ ] **GP-204: Conference banner/roll-up design** — Deadline 14 avril (print lead time). Vertical 85x200cm ou A2. Print-ready PDF CMYK 300dpi bleed. Confirmer printer HCMC same-day/next-day.
- [ ] **GP-205: Lead tracking & follow-up system (post-event)** — Welcome email J+1. Week-1 check-in. Admin dashboard Earth Day leads. Tag `source: earthday2026`. **Bloqué par :** GP-200, GP-201.
- [ ] **GP-200 follow-up checklist** — Landing page form : stocker promoCode `EARTHDAY2026` sur user profile, utm_source tracking (cf. utm_source tracking cross-cutting).

#### P0 — Security

- [ ] **GP-003: Form config CRUD incomplete** — Create/list/getById seulement. Missing PUT/PATCH + DELETE. Admin ne peut pas edit/remove form templates. Files: `api/src/routes/forms/configs/`.
- [ ] **GP-004: Prompts admin panel publicly accessible** — `/api/prompts` CRUD (create/update/delete system prompts) sans auth. Admin panel `/(views)/admin` besoin server-side role check. Files: `api/src/routes/prompts/index.ts`, `web/src/app/[locale]/(views)/admin/`.
- [ ] **GP-005: Auth missing on form config CRUD routes** — Create/list/getById sans auth middleware. User non-authenticated peut créer/list form templates. Files: `api/src/routes/forms/configs/`.
- [ ] **GP-006: Remove waitlist/RequireRole** — Open chat to all authenticated users. Remove `RequireRole` wrapper AND `BetaAccessRequest` component. Quicksignup remplace old waitlist flow. Remove dead waitlist code from `chat/page.tsx`.

#### P1 — Code quality / type safety

- [ ] **GP-010: 39 remaining `any` types across 16 files** — Key offenders: `useConversations.ts` (x2), `FormChatInterface.tsx` (x3), `FormFillingInterface.tsx` (x2), `FormPreview.tsx` (x2), `gemini.service.ts`, `openai.service.ts`, `formExtractor.service.ts` (x6), `types/src/api.ts` (x5), `types/src/formInstance.ts` (x7), `types/src/chat.ts` (x3), `page.tsx` (return type), `PromptConfigEditor.tsx`.
- [ ] **GP-013: Stale/temp files at root** — `web/NEW_SECTIONS.tsx` (empty), `web/waitlist.json` (4 lines, shouldn't be in source), `api/test-openai.mjs` (41-line script, déplacer en `api/src/scripts/` ou remove).

#### P1 — i18n / hardcoded strings

- [ ] **GP-020: LiaThread hardcoded English** — "LIA is thinking", "Welcome to GP.A", "Your AI assistant...", "Ask GP.A anything...", inline `locale === 'fr' ?` au lieu d'i18n. Critical pour Vietnam/ASEAN (Vietnamese support = Plan 1 requirement).
- [ ] **GP-021: FormChatInterface hardcoded English** — "Hello! I'm here to help...", "Thanks! I've extracted...", "Sorry, I had trouble...", "Still need:", "Analyzing...", "Send" button, "Type your message..." placeholder, "Form submitted - no more editing".
- [ ] **GP-022: FormPreview hardcoded** — "Form Preview", "fields filled", "confident", "All fields filled!", "Enter {label}".
- [ ] **GP-023: FormFillingInterface hardcoded** — "Form not found", "Submit Form", "Submitting...", `window.confirm("Submit this form?...")`.
- [ ] **GP-024: Chat suggestions API hardcoded English** — `sendMessage.ts` et `chat-v2.ts` retournent "Tell me about your energy usage", "Review extracted data", etc.

#### P1 — UX

- [ ] **GP-030: Chat streaming not fully integrated** — Web config `stream: true` mais API `sendMessage.ts` retourne single JSON. `enableStreaming: true` auto-detect mais pas de réel incremental streaming.
- [ ] **GP-031: Large components need decomposition** — `PromptsManagement.tsx` (545L), `LiaThread.tsx` (483L), `PromptConfigEditor.tsx` (424L), `chat/page.tsx` (381L, extract BetaAccessRequest), `careers/page.tsx` (370L), `features-section.tsx` (342L), `WaitlistManagement.tsx` (304L).
- [ ] **GP-032: Mock AI model selector in LiaThread** — `MOCK_AI_MODELS` hardcoded, tous `enabled: false` sauf Gemini Flash. Vrai `AISelector` aussi rendu dans composer. 2 selectors simultanés.
- [ ] **GP-033: Form filling responsive basic** — Split-screen chat+preview utilise `lg:` breakpoint. Fixed `h-screen` peut causer scroll issues mobile. Pas d'optimisation medium screens. Mobile-first = core requirement (60% target SMEs sont rural + phone).
- [ ] **GP-034: `window.confirm` for form submission** — Remplacer par dialog `@ezstart/ui`.
- [ ] **GP-035: Dark mode minimal in form components** — Seulement 2 usages `dark:` classes.
- [ ] **GP-036: Conversation unread logic not implemented** — `listConversations.ts` retourne `unread: false` avec TODO.

#### P2 — API quality

- [ ] **GP-040: ESG routes no pagination** — Tous ESG endpoints lack pagination. Also no Zod validation on some routes.
- [ ] **GP-041: ESG webhook handlers are stubs** — `handleEsgReport.ts` (134L) 4 TODOs : "Save to database", "Send email notification", "Send failure notification", "Update dashboard". Core webhook logic non implémentée.
- [ ] **GP-042: Theme routes missing auth (deleteTheme)** — `deleteTheme` a un TODO pour auth (updateTheme fixé).
- [ ] **GP-043: Chat v1 et v2 actives** — Redondance. Consolider en un seul. Files: `api/src/routes/chat/`, `api/src/routes/chat-v2.ts`.
- [ ] **GP-044: Waitlist admin TODO** — `WaitlistManagement.tsx:95` : "If user exists, remove beta-tester role" — role removal on rejection non implémenté.
- [ ] **GP-045: ESG extract_esg feature disabled** — `extract_esg` hardcoded `false` dans `chat/page.tsx`. Prompt types ('extraction') unused. Re-enabling = prerequis Plan 2 ESG data collection.
- [ ] **GP-046: Conversations & messages pagination (frontend)** — API supporte déjà `limit/offset/meta` mais frontend load all conversations at once (max 20) et tous messages en single fetch. Besoin : (1) paginated/infinite scroll conversation list, (2) paginated message loading per conversation (oldest first, load more on scroll up). React Query avec cache keys propres.
- [ ] **GP-047: Clean `esg.service.ts` (SaaS stub abandonné)** — Le service pointe vers `https://api.esg-saas.example` (fake URL) avec `ESG_CLIENT_ID/SECRET/BASE_URL` stubbed. L'archi Plan 2 (`GP-101 energy intensity`, `GP-102 ETS`, `GP-106 CBAM`) est **interne** — data model + UI natifs, pas de wrapper SaaS. Les vars `ESG_*` + `WEBHOOK_SIGNING_SECRET` sont en `IGNORED_VARS`. À faire au moment d'attaquer Plan 2 : supprimer `esg.service.ts`, remplacer les 5 routes `routes/esg/*` par de la logique interne, nettoyer IGNORED_VARS.

#### P2 — Feature gaps

- [ ] **GP-050: No form templates system** — Form configs seeded via `seedForms.ts` mais aucune UI admin pour CRUD form templates. Endpoint `createFormConfig` existe sans UI.
- [ ] **GP-051: No form analytics/insights** — Pas de dashboard completion rates, avg fill time, field-level completion, AI extraction accuracy.
- [ ] **GP-052: No form data export (CSV, PDF)** — Users ne peuvent pas download données submitted. Plan 2 core requirement (PDF/Word/Excel pour ESG reports).
- [ ] **GP-053: No multi-language forms** — Form configs n'ont pas d'i18n support. Labels/descriptions/help mono-langue. Vietnamese + English minimum pour BIDV pilot.
- [ ] **GP-054: No form versioning** — No version tracking. Editing affects all existing instances retroactively.
- [ ] **GP-055: No collaboration features** — Workspace/project members existent dans model mais pas d'invite UI, real-time collab, activity feed, notifications.
- [ ] **GP-056: No AI model selection per conversation** — Mock selector UI mais tous requests vont au même backend. Pas de persistence per-conversation.
- [ ] **GP-057: No form field types beyond text/number** — `FormPreview.tsx` seulement `<Input type="text|number">`. Pas de select/dropdown, date picker, file upload, textarea, checkbox, radio, rich text. Photo upload avec tags = Plan 2 requirement pour field data (machines, equipment, energy meters).
- [ ] **GP-058: No vocal mode implementation** — Dialog offre "Vocal Mode" mais pas de Web Speech API. Plan 1/2 requirement pour rural SME.
- [ ] **GP-059: No ESG dashboard** — ESG routes existent (create project, push activity data, generate report) mais pas de web UI. Single biggest gap entre current state et Plan 2 MVP. **Blocker BIDV pilot.**
- [ ] **GP-070: Admin dashboard DataTable** — Replicate ezauth pattern, add to ezstart admin hub.
- [ ] **GP-071: Unit + integration + E2E tests** — 0 test files. Besoin unit tests services, integration tests API routes, E2E form filling + chat.

#### P2 — Strategic features (April 2026 context)

> Features répondant à la convergence : (1) crise énergie Hormuz, (2) Vietnam ETS Decree 29/2026, (3) NDAChain / Digital Technology Law, (4) EU CBAM effective 2026. Organisés par plan tier.

- [ ] **GP-100: Energy vulnerability quick audit — Plan 1 (Awareness)** — Priorité HIGH. Diagnostic conversationnel énergie dans chat : sources, % coûts, dépendance supplier, backup options. Pas de data saved (Plan 1 stateless) mais summary + hook Plan 2. Nouveau system prompt GP.A combinant ESG + energy resilience. Remplacer suggestions générique par crisis-relevant. **Bloqué par :** GP-024, GP-020.
- [ ] **GP-101: Energy intensity mapping module — Plan 2 (Casual)** — Priorité HIGH (BIDV pilot differentiator). Structured energy tracking : sources (grid, diesel, solar, LPG), volumes (kWh, litres, m3), unit cost, % OPEX. Intensity ratio (energy cost / revenue ou energy / unit). MoM evolution. AI reduction roadmap. Data model extends ESG Scope 1/2. New dashboard widget. **Bloqué par :** GP-059, GP-041.
- [ ] **GP-102: ETS supply chain exposure assessment — Plan 2** — Priorité HIGH (market timing Decree 29/2026). Tool pour assess si SME est in supply chain des 110 facilities sous ETS (34 thermal, 25 steel, 51 cement). Inputs : clients/suppliers, sector, export destinations. AI cross-reference ETS-covered sectors + EU CBAM products. Outputs : risk score, affected relationships, compliance timeline, actions. Wizard 3-5 steps. **Bloqué par :** GP-057, GP-052.
- [ ] **GP-103: Green loan eligibility scoring — Plan 2/3** — Priorité HIGH (core BIDV value prop). Auto-assess SME readiness pour SBV green credit. Éval : ESG data completeness, energy efficiency trajectory, sector alignment green taxonomy, documentation readiness. Score 0-100 + gaps + improvement roadmap + timeline. Plan 2 = self-service + PDF. Plan 3 = white-label BIDV + pre-filled loan app + calendar booking loan officers + portfolio dashboard. **Bloqué par :** GP-101, GP-059, GP-052.
- [ ] **GP-104: Blockchain credential verification layer — Plan 3 (Pro)** — Priorité MEDIUM (V2 roadmap). Verifiable ESG credentials via blockchain hash verification. GreenPulse = digital notary (custodial wallet signe on behalf of SMEs). Hash + metadata on-chain, data reste en DB sovereign. NDAChain-compatible (W3C DID, permissioned blockchain, PoA + ZKP). Hash ESG snapshots à baseline/quarterly/annual. Credential URL verifiable (timestamped, tamper-proof). Tx fees : batch hashing. Files: `api/src/services/blockchain.service.ts`, `types/src/credential.ts`, `api/src/routes/credentials/`. **Bloqué par :** GP-059 + Plan 3 multi-site architecture.
- [ ] **GP-105: Credential legal framework & ToS — Plan 3** — Priorité MEDIUM (parallel track avec GP-104). Legal framework GreenPulse = digital notary, not data guarantor. Custodial wallet terms, liability scope, data sovereignty, credential validity, dispute resolution. Align avec Vietnam Digital Technology Law. ToS addendum Plan 3 + credential issuance terms + data processing agreement bank partners. **NOT CODE — Legal counsel task.**
- [ ] **GP-106: EU CBAM export readiness check — Plan 2** — Priorité HIGH (affecte 50K export-oriented SMEs VN). Tool pour exporters EU. Check product categories vs CBAM scope (iron, steel, aluminium, cement, fertiliser, electricity, hydrogen). Évaluate CBAM reporting documentation. Identifie CSRD requirements cascading from EU buyers. Plan d'action 6 mois. Wizard : products → markets → documentation → gaps → plan. **Bloqué par :** GP-057, GP-052.
- [ ] **GP-107: Carbon credit readiness module — Plan 3 (Pro)** — Priorité LOW (relevant once ETS trading starts Hanoi Exchange). Assess eligibility offset mechanisms (30% compliance via credits). Tracks baseline emissions, verified reductions, methodology (CDM, JCM, Art 6.4). Pre-application docs. **Bloqué par :** GP-104, GP-101, GP-102.
- [ ] **GP-108: BIDV white-label branding engine — Plan 3** — Priorité HIGH (BIDV pilot requirement). Config system pour banks deploy GreenPulse sous leur brand. Logo/colors/typography swap, custom domain, partner-specific prompts, co-branded reports, restricted user packages (1000 SME accounts/year). Bank staff UX : portfolio ESG health dashboard, client segmentation ("Green Loan Ready" >70 / "High Risk" <40), pipeline forecasting. Extends existing theme system. **Bloqué par :** GP-103, GP-059.

#### P3 — Tech debt

- [ ] **GP-060: Duplicate AI services** — `gemini.service.ts` (207L), `openai.service.ts` (200L), `lia.service.ts` (174L) overlapping. Should use `@ezstart/ai-sdk` UnifiedChat exclusivement.
- [ ] **GP-062: Providers route missing response schema** — `providers.ts` : `// responseSchema: TODO: Add proper schema for AI provider list`.
- [ ] **GP-063: `formExtractor.service.ts` largest (297L)** — Single file handles form config loading, AI prompt construction, response parsing, field extraction, confidence scoring. Split.

---

### fengshui (web 6151)

Analyse Bagua avec upload plan, orientation boussole, étoiles volantes annuelles, génération PDF, système premium/donation. 3 langues (fr/en/es). **Status:** maintained.

#### P0 — Must fix before launch

- [ ] **Remove dead code** — `handleDirectPDFDownload` in `AnalysisStep.tsx` (L70-103), `InfoSection` in `BaguaOrientationsGrid.tsx` (L388-418), obsolete JSON files (`bagua.2025.fr.stars.json`, `bagua.fr.base.json`, `etoiles-volantes-2026.json`), `BaguaSectorCard.tsx`, `fengshui-data.ts`.
- [ ] **Extract 7 hardcoded strings to i18n** — `pdf-preview.tsx` (3 FR strings), `BaguaOrientationsGrid.tsx` ("Element : "), `BaguaPreviewModal.tsx` ("Analyse Feng Shui Bagua"), `AuthCallbackPage` (2 EN strings), `client-layout.tsx` ("Made with ... serenity").
- [ ] **SVG dark mode** — `BaguaWheel` text utilise hardcoded `fill="black"` (invisible dark mode).
- [ ] **File upload validation** — Ajouter max 10MB + MIME type check.
- [ ] **Remove unused dependencies** — `html2canvas`, `@react-pdf/renderer` (pdf-generator.ts utilise `dom-to-image` + `jspdf`).

#### P1 — Quality polish

- [ ] **Replace 3 `as any` casts** — `loadBaguaConfig.ts:60` (`{} as any`), `AnalysisStep.tsx:50/54` (`{} as any` pour sectorRefs).
- [ ] **PDF generation performance** — Remplacer 3s hardcoded delay (`setTimeout(resolve, 3000)`) par readiness check.
- [ ] **Error toasts for failed operations** — Config loading error laisse UI stuck sans message.
- [ ] **Make SEO metadata dynamic** — Year in keywords/title. `layout.tsx` hardcode "2026", `page.tsx:36` `sessionStorage.getItem('lunar-popup-2026-seen')`.
- [ ] **PDF dark mode fix** — PDF force `#ffffff` background mais `isDarkMode` passé à `PdfCaptureContainers` affecte text colors. PDF doit toujours render in light mode.
- [ ] **PDF scrollbar hack** — `pdf-generator.ts` injecte global style pour hide scrollbars pendant generation (fragile).
- [ ] **UX: Keyboard support for compass** — Arrow keys +/-5 degrees.
- [ ] **UX: Remove commented rotation controls** — `CardinalPointsStep-v2.tsx` L170-210 (40 lignes commentées).
- [ ] **UX: Reset rotation button** — `resetRotation()` existe dans `CardinalWheel` mais pas exposé UI.
- [ ] **UX: PDF upload accepts PDFs** — Mais utilise `/api/pdf-preview` (route n'existe pas dans web-only app). Disable PDF upload ou implémenter.
- [ ] **UX: Crop with pixel sliders too technical** — Simplifier avec presets (A4, square, free).
- [ ] **UX: Stepper cast** — `AnalyzePage:101-108` `as unknown as Array<...>` pour steps.
- [ ] **Admin dashboard DataTable** — Replicate pattern, add to ezstart admin hub.

#### P2 — UX enhancements

- [ ] **Feature: Local data persistence** — localStorage pour in-progress analysis (plan + bearing + preferences).
- [ ] **Feature: Analysis history** — Thumbnails + metadata localStorage, cloud pour premium users.
- [ ] **Feature: Export/import JSON configs.**
- [ ] **Feature: Elements education page** — Interactive tooltips (5 elements, cycles productif/destructeur/affaiblissant).
- [ ] **Feature: Enhanced PDF** — Multi-sector detail pages, premium remedies, element cycles, room recommendations.
- [ ] **Feature: PDF branding** — Logo, brand colors, watermark free version.
- [ ] **Code: Refactor `PlanUploader` (543L)** — Extract CropEditor.
- [ ] **Code: Refactor `pdf-capture-containers` (489L)** — Factorize card rendering wheel/grid.
- [ ] **Code: Refactor `BaguaOrientationsGrid` (435L).**
- [ ] **Code: Extract `page.tsx` homepage sections (564L)** — HeroSection, BenefitsSection, ComparisonTable, CTASection, LunarPopup.
- [ ] **UX: Accessibility** — ARIA labels on SVG, focus management in modals.
- [ ] **UX: Compass badge contrast dark mode.**
- [ ] **UX: Bearing display during drag** — Show degree real-time.
- [ ] **UX: Snap-to-45 mode for compass precision.**
- [ ] **SEO: Use i18n messages for `layout.tsx` title/description per locale.**
- [ ] **SEO: Verify robots.ts and sitemap.ts coverage for localized routes.**

#### P3 — Advanced features

- [ ] **Feature: Multiple floor plans** — Multi-étages same bearing + side-by-side comparison.
- [ ] **Feature: Room-level recommendations** — Mark rooms on plan, cross avec Bagua sector.
- [ ] **Feature: AI-powered design suggestions** — Mood boards, ai-sdk image generation for premium.
- [ ] **Feature: Share analysis via URL** — Base64 encoded link + social sharing + OG image.
- [ ] **Testing: Unit tests for `loadBaguaConfig`, `usePremium`, E2E stepper flow.**

---

### asc-tcd (web 6141)

Association website (sports/cultural activities). **Status:** maintained.

Pas d'item actif connu.

---

### gacha-analyzer (api 6170 / web 6171)

App scan/analyse screenshots jeux gacha (Summoners War runes, Nikke Goddess of Victory gear). OCR scripté (Tesseract + regex) + fallback IA optionnel. **Status:** in-progress, priorité haute.

#### A — Bugs et dette technique

- [ ] **A1. Scan doublons — cache hash pas efficace** `P0` `M` — `quickHash()` échantillonne ~1000 pixels, hash trop faible (32-bit). Même rune photographiée 2x = hash différent (bruit camera, compression). Solution : perceptual hash (pHash/dHash) sur crop ROI, tolerance Hamming.
- [ ] **A2. `as unknown as` massif dans scan-service et reanalyze** `P1` `M` — 3x dans `scan-service.ts`, 3x dans `reanalyze-scan.ts`. Cause : `ParsedData` locale != `RuneData` de `@gacha-analyzer/types`, mêmes champs mais types séparés. Aligner ParsedData sur RuneData directement.
- [ ] **A3. `Record<string, any>` dans 5 routes API** `P2` `S` — `get-scan.ts`, `feedback-scan.ts`, `report-scan.ts`, `reanalyze-scan.ts`, `import-monsters.ts`. Mongoose `.lean()` retourne type générique. Typer avec `Scan & { _id: Types.ObjectId }`.
- [ ] **A4. `zones: any` et `masks: any` dans use-game-config.ts** `P2` `S` — Legacy hooks (`GameConfigData`). Typer avec `ZoneConfig[]`, `MaskRect[]` ou supprimer hooks deprecated.
- [ ] **A5. `as any` dans scan detail page** `P2` `S` — `scan/[id]/page.tsx:237` + `:246`. `ScanResult.data` = union `RuneData | GearData` pas narrowé. Discriminated union avec champ `type` ou narrower via `gameType`.
- [ ] **A6. TODO dans types/** `P2` `S` — `artifact-data.ts:7` (`atk: 100, // TODO: verify exact value`), `rune-data.ts:28-32` (3 TODO ranges flat stats hp/atk/def). Vérifier in-game.
- [ ] **A7. Code dupliqué handleSignificantChange et handleRescan** `P2` `M` — Logique quasi identique (~80 lignes x2) dans `scan/page.tsx`. Extraire `buildScanPayload(frame, roi, masks, profile, presets)`.
- [ ] **A8. `rune-card-compact.tsx` trop gros (1072L)** `P2` `M` — Extraire `rune-score-badge.tsx`, `rune-substat-list.tsx`, `rune-narrative.tsx`.
- [ ] **A9. `scan-service.ts` trop gros (699L)** `P2` `M` — Extraire `ocr-pipeline.ts` (OCR + merge), garder DB write dans scan-service.
- [ ] **A10. `rune-efficiency.ts` trop gros (1664L)** `P2` `L` — Extraire `gem-logic.ts`, `progressive-advice.ts`, `archetype-synergy.ts`.
- [ ] **A11. Deprecated hooks use-game-config.ts** `P3` `S` — `useGameConfig` et `useSaveGameConfig` marqués @deprecated, utilisés nulle part. Supprimer.

#### B — Qualité API

- [ ] **B1. Pas d'auth sur POST /scan** `P1` `S` — `scan-image.ts` sans `authMiddleware`. N'importe qui peut poster des images → ressources OCR/Gemini. Ajouter `optionalAuthMiddleware` ou rate limit renforcé.
- [ ] **B2. Thumbnails JPEG 50% stockés en MongoDB** `P2` `M` — Base64 ~50-100KB par scan dans document Scan. 10k scans = 500MB-1GB. Solution : S3/R2, ou compresser plus (25%, resize 200px).
- [ ] **B3. Pas de cleanup vieux scans** `P2` `S` — Pas de TTL, pas de limite par user. Solution : TTL index MongoDB (90j ?) ou endpoint purge.
- [ ] **B4. Image size limit non explicite** `P2` `S` — multer default = no limit. Limiter à 10MB, retourner 413.
- [ ] **B5. Gemini fallback hardcode pour SW uniquement** `P3` `S` — `scan-service.ts:615` : `if (needsFallback && gameType === 'summoners-war')`. Nikke sans fallback IA. Généraliser prompt Gemini par jeu.

#### C — UX / frontend

- [ ] **C1. Pas de support mobile camera directe** `P1` `L` — `getDisplayMedia()` = desktop only. Sur mobile pas d'API screen capture. Ajouter mode "upload photo" (camera ou galerie). Alternative PWA + share target.
- [ ] **C2. Hardcoded "Cached" string** `P2` `S` — `scan/page.tsx:622` `<Badge>Cached</Badge>` non traduit. `t('scan.statusBar.cached')`.
- [ ] **C3. Emojis dans les selects** `P3` `S` — `history/page.tsx:200-201` emoji dans `SelectItem` (agree, disagree). Contraire DEV-RULES. Icons SVG ou badges colorés.
- [ ] **C4. Inline SVG icons dans scan page** `P2` `S` — 2 inline SVG (settings gear, rescan arrows). Extraire fichier icons ou `lucide-react`.
- [ ] **C5. Flash colors hardcoded rgba() inline** `P3` `S` — `scan/page.tsx:189-197` couleurs en dur. Commentaire explique (dynamic alpha) mais pourrait utiliser CSS custom properties + opacity.
- [ ] **C6. History : filtres client-side sur données paginées serveur** `P1` `M` — 6 filtres (level, advice, set, slot, feedback, report) appliqués JS sur page courante. Filtrer "set=violent" → ne voit que violent de la page (20 items), pas tous en DB. Déplacer filtres côté serveur.
- [ ] **C7. Nikke : pas de rune card / gear analysis** `P1` `XL` — Parser Nikke existe (8 tests) mais pas analyzer, pas gear card dédiée, pas /data Nikke. Cf. E1.

#### D — Tests

- [ ] **D2. Tests dupliqués dans 2 dossiers** `P3` `S` — `api/src/__tests__/` et `api/src/analyzers/rune-efficiency.test.ts` (304L) en plus de `api/src/__tests__/rune-efficiency.test.ts` (1206L). Consolider dans `__tests__/`.

#### E — Feature gaps (roadmap)

- [ ] **E1. Nikke gear analyzer** `P1` `XL` — Efficiency calculator (manufacturer bonuses, overload lines), gear card dédiée Nikke, page /data Nikke, gem/grind equivalent (reroll overload), advice system Nikke (keep/reroll/lock).
- [ ] **E2. Detection grind existant (couleur verte in-game)** `P1` `L` — Stats grindées apparaissent vertes SW. OCR ne détecte pas couleur (grayscale preprocessing). Analyser pixels couleur avant grayscale, ou zone-based color detection. Impact: gem recommendations ne savent pas si stat déjà grindée.
- [ ] **E3. Batch scanning (multi-rune)** `P2` `L` — Scanner toutes runes d'un monstre d'un coup (6 slots). Navigation auto entre runes via détection UI. Résumé monstre complet (efficiency totale, sets, synergies).
- [ ] **E4. Fallback IA cascade (Gemini free tier)** `P2` `M` — Retry avec backoff, queue de fallback, cache résultats IA. Tester Claude Vision, GPT-4o.
- [ ] **E5. Import depuis export JSON (SWEX/SWProxy)** `P2` `M` — Parser JSON export (runes + monstres + artefacts). Analyse massive sans OCR (100% précis). Dashboard : top runes, worst, à vendre, coverage par set.
- [ ] **E6. Integration SWSTATS/Lucksack pour builds populaires** `P2` `M` — Fetch builds populaires APIs communautaires. Recommander monstres pour rune basée sur builds populaires. "Cette rune SPD/CR/CD/ATK% parfaite pour Savannah (usage: 89%)".
- [ ] **E7. Rune optimizer (quelles runes garder pour quel monstre)** `P3` `XL` — Assignment optimal rune → monstre. NP-hard, heuristiques. **Bloqué par :** E5 ou E3.
- [ ] **E8. Compare runes** `P3` `M` — Comparer 2+ runes côte à côte (même slot). Overlay différences (efficiency, rolls, gem potential).
- [ ] **E9. Share rune analysis** `P3` `M` — Image/lien partageable d'une analyse. OG image previews social. Deep link scan detail.
- [ ] **E10. Artifact analysis** `P3` `L` — Parser existe (33 substats, 10 tests). Reste : efficiency calculator artifacts (différents rolls/tiers), artifact card, /data artifacts. **Bloqué par :** définir scoring system (pas de Barion pour artifacts).
- [ ] **E11a. PiP overlay gaming** — `documentPictureInPicture` API (Chrome 116+). Mini-fenêtre flottante : conseil (SELL/KEEP/UPGRADE) gros + efficacité % + couleur tier. Always on top. Auto-update. Compact ~200x100px positionnable. Fallback mode mini-window CSS.
- [ ] **E11b. Optimisation vitesse détection** — Réduire frame diff interval 500ms → 200ms. OCR local-first (Tesseract in-browser) au lieu d'API pour <100ms. Pre-crop 8 zones en parallèle. Cache intelligent skip OCR si hash crop ROI inchangé.
- [ ] **E11c. Audio feedback** — Son distinct par conseil : bip = SELL, ding = KEEP, chime = UPGRADE. Volume configurable ou mute. TTS "sell"/"keep"/"upgrade" via SpeechSynthesis API.
- [ ] **E11d. Electron/Tauri overlay (futur)** — App desktop fenêtre transparente + clickthrough. Vrai overlay pixel-perfect over le jeu (comme SWLENS). Peut capturer directement fenêtre jeu sans getDisplayMedia.
- [ ] **E11f. Interface de test SDK (capture-sdk playground)** `P2` — Page de démo intégrée capture-sdk. Images reference embarquées. Test visuel frame diff (charger 2 images, score). Test preprocess (source → grayscale → contrast → binarize). Test crop (ROI draggable). Test mask (blackout → résultat). Test hash (comparer 2 images). 100% agnostique. Route dans ezstart `/packages/capture-sdk/playground` ou standalone.
- [ ] **E11g. Bench configurable par game** `P2` — Bench actuel hardcode SW. Rendre configurable par game. Interface add/remove/rename zones (fixe à 8 actuellement). Interface add/remove/rename masks. Selection template par game (SW rune, SW artifact, Nikke gear). Layout editor : sauvegarder zones/masks en DB par game. Utilise SDK (RoiSelector, BlackoutMask, crop, preprocess). Game-specific reste dans l'app (noms zones, presets par game, templates OCR). Tout configurable depuis UI.
- [ ] **E12. Multiple game support (au-delà SW + Nikke)** `P3` `XL` — Architecture multi-game en place (config/games, images). Candidats : Epic Seven, Genshin Impact, Honkai Star Rail. Chaque jeu : parser, analyzer, types, game config, i18n, assets.
- [ ] **E13. Deploy (Railway API + Vercel Web)** `P1` `M` — Railway service `gacha-analyzer-api`. Env vars Railway (MONGODB_URI, GEMINI_API_KEY, EZAUTH_URL). Vercel project web. Vérifier sharp fonctionne Railway. Tester OCR Tesseract Railway (binaire natif requis).

---

## Long-term (6+ mois)

- [ ] **Mobile pilot (React Native + Expo)** — **Bloqué par :** api-sdk stable en prod
- [ ] **ui-native miroir de `@ezstart/ui` pour cross-platform**
- [ ] **Carbon credit marketplace (ETS trading post-Hanoi Exchange launch)** — Cf. GP-107

---

## Dette technique (non-blocker)

- [x] **PAY-SDK-SPLIT** (2026-04-23) — `pay-client.ts` (727→356 lignes) et `types.ts` (644→61 barrel) splittés en `core/types/{common,payments,promos,plans,connect,billing,api-keys}.ts` + `core/methods/{http,donations,purchases,subscriptions,payments,promos,plans,connect,billing}.ts`. PayClient reste l'orchestrateur, méthodes délèguent à des fonctions pures. Zéro breaking change (surface publique identique, barrel `types.ts` préservé). 388/388 tests PASS, tous consumers typecheck OK.
- [ ] **PAY-SDK-ABORT-SIGNAL** — Étendre le pattern AbortSignal (threadé end-to-end dans `getPayments` / `usePaymentHistory` pour VULN-2) aux autres hooks list pay-sdk : `useSubscriptions`, `usePurchases`, `useDonations`, `usePlans`, `useSubscriptionStatus`. Ajouter `signal?: AbortSignal` sur `getSubscriptions`/`getPurchases`/`getDonations`/`listPlans` dans `pay-client.ts`, câbler un `AbortController` dans chaque hook, annuler sur unmount + dep change. Même motif pour auth-sdk hooks qui font des list fetch. Eviter les gaspillages réseau + race conditions sur scope change.
- [ ] **AUTH-MW-JWT-001** — TODO `apps/ezauth/api/src/routes/api-keys/config.ts:112` — quand billing implémenté, resolve plan/features depuis subscription user
- [ ] **AUTH-RATE-001** — TODO `apps/ezauth/api/src/routes/auth/sso-authorize.ts:34` — per-userId rate limiting
- [ ] **USER-EDIT-001** — TODO `packages/auth-sdk/src/components/UserSettings.tsx:33` — edit profile feature
- [ ] **AUTH-MW-JWT-002** — TODO `packages/auth-sdk/src/middleware/createAuthMiddleware.ts:266` — JWT validation
