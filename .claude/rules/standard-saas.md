# Standard SaaS — checklist apps

**Source de vérité pour toute app (API + Web).** Complémentaire à `standard.md` (packages). Chaque app passe ce checklist avant deploy prod. Pas d'exception.

## Légende des priorités

- **🔴 P0 / MVP** — bloquant pour launch first paying customer
- **🟠 P1 / V1** — nécessaire dans les 3 mois post-launch
- **🟡 P2 / V2** — devient "vraiment pro"
- **🟢 P3 / V3+** — excellence long-terme
- **⚡ QW** — Quick Win, < 1 jour, annotation EN PLUS de P\_

Items sans annotation explicite = **🔴 P0** (la base non-négociable). Voir `standard.md` "Système de priorisation" pour le pattern global.

Pour les domaines transverses détaillés, voir aussi :

- [`standard-saas-perf.md`](./standard-saas-perf.md) — performance, bundle, Lighthouse
- [`standard-saas-security.md`](./standard-saas-security.md) — headers, auth, audit logs, GDPR
- [`standard-saas-a11y.md`](./standard-saas-a11y.md) — WCAG 2.1 AA
- [`standard-saas-observability.md`](./standard-saas-observability.md) — Sentry, status page, deep health
- [`standard-saas-data.md`](./standard-saas-data.md) — migrations, API versioning, soft delete
- [`standard-saas-billing.md`](./standard-saas-billing.md) — plans, dunning, tax, refunds
- [`standard-sdk-dx.md`](./standard-sdk-dx.md) — SDK developer experience

---

## 1. API — Backend

### 1.1 Boot & Health

- [ ] `createApiServer(appName)` utilisé (pas `createApp` ni `express()` direct)
- [ ] `/health` + `/api/health` répondent `{ status: 'ok' }` (via api-core, automatique)
- [ ] `connectToMongo(dbName)` au boot (factory pattern, cf. `mongodb.md`)
- [ ] Graceful shutdown (automatique via `startServer`)

### 1.2 Sécurité

- [ ] Auth middleware sur toutes les routes protégées (`authMiddleware` ou `verifyTokenMiddleware`)
- [ ] Rate limiting global (preset `standard` minimum, `strict` sur auth routes)
- [ ] **CORS** via `createApiServer` avec politique 3-tier (public/Bearer → `*`, cookie-auth → allowlist strict) — cf. [`standard-saas-cors.md`](./standard-saas-cors.md). **Jamais** de `CORS_ORIGINS` env var pour les consumers externes.
- [ ] Input validation Zod sur TOUT body/params/query (jamais `req.body` brut)
- [ ] `sendError()` / `sendSuccess()` / `sendValidationError()` — jamais `res.json()` direct
- [ ] Pas de secrets dans le code (cf. `data-protection.md`)

### 1.3 OpenAPI & Documentation

- [ ] Routes enregistrées via `createRouterWithDoc` (pas `Router()` seul)
- [ ] `/docs` accessible (Swagger UI auto-monté par `startServer`)
- [ ] Schemas Zod avec `.describe()` ou `.openapi()` sur les params/query
- [ ] `.env.example` à jour avec TOUTES les variables utilisées

### 1.4 API Keys (quand applicable)

Voir [`standard-saas-keys.md`](./standard-saas-keys.md) pour la convention complète (naming, metadata, dogfood, bootstrap, migration).

Checklist rapide :

- [ ] Prefix suit `ez_(pk|sk)_(live|test)_` (pas de scope/app dans le prefix)
- [ ] `type: 'publishable' | 'secret'` en metadata DB
- [ ] Clés secret jamais en `NEXT_PUBLIC_*`
- [ ] Seed script idempotent pour bootstrap (`pnpm --filter <api> seed:self-key`)
- [ ] Header `X-API-Key` supporté côté API
- [ ] Clés hashées (sha256) en DB, jamais en clair
- [ ] `lastUsedAt` mis à jour (fire-and-forget)

### 1.5 Monitoring

- [ ] Pino logs (`@ezstart/logger/server`) → Railway/Vercel log aggregation. Sentry retiré 2026-04-25 (incident OTEL/Express CORS sur Railway). Re-add `@sentry/node-core` (sans OTEL) plus tard si dashboard centralisé devient utile.
- [ ] Logger `@ezstart/logger` utilisé (jamais `console.log`)
- [ ] Health checks incluent la connectivité DB

**Check rapide API** :

```bash
# Boot sans crash
cd apps/<app>/api && node dist/index.js
# Health
curl http://localhost:<port>/health
# OpenAPI docs
curl http://localhost:<port>/docs
```

---

## 2. Web — Frontend

### 2.1 Provider Stack (obligatoire dans `layout.tsx`) — SSR-FIRST

Voir [`nextjs.md` §1](./nextjs.md) pour la règle complète et le code de référence. Résumé :

```
NextIntlClientProvider (messages SSR via getMessages)
  └─ ErrorBoundary
       └─ ThemeProvider (@ezstart/ui/theme — initialTheme SSR)
            └─ AuthProvider (@ezstart/auth-sdk — initialUser SSR via getServerAuth)
                 └─ [QueryProvider si data-heavy]
                      └─ {children}
Toaster (sonner, hors providers)
```

- [ ] `NextIntlClientProvider` avec `messages` + `locale` (déjà SSR par défaut)
- [ ] `ErrorBoundary` de `@ezstart/ui/components`
- [ ] `ThemeProvider` de `@ezstart/ui/theme` avec **`initialTheme` SSR-bootstrapped** + `<html className=...>` server-side
- [ ] `AuthProvider` avec `appName` + `authMode` + **`initialUser` SSR-bootstrapped** via `@ezstart/auth-sdk/server` `getServerAuth({ apiUrl, cookieHeader })` quand `authMode='httpOnly'`
- [ ] `Toaster` de sonner pour les notifications
- [ ] **Anti-flash check** : navigation A/B (logout / refresh / `/dashboard` → `/`) ne montre JAMAIS LoginButton avant UserMenu ni light avant dark — si flash visible = SSR bootstrap manquant ou cassé

### 2.2 i18n

- [ ] `messages/en/*.json` + `messages/fr/*.json` minimum
- [ ] TOUT texte user-facing via `useTranslations()` / `t()`
- [ ] Pas de string hardcodée visible par l'utilisateur
- [ ] `next-intl` middleware configuré (routing `[locale]`)
- [ ] Tous les `<Link>` importés depuis `@/i18n/navigation` (jamais `next/link`) — enforced par `eslint-plugin-ezstart/no-next-link-in-locale-apps`. Garantit que les URLs incluent la locale active (pas de 307 redirect).

### 2.3 Theme & UI

- [ ] `ThemeProvider` avec `defaultTheme="system"` + `suppressHydrationWarning` sur `<html>`
- [ ] Couleurs sémantiques uniquement (`bg-primary`, `text-foreground`, jamais `bg-gray-100`)
- [ ] Composants `@ezstart/ui/components` (jamais HTML natif, cf. `ui.md`)
- [ ] Dark mode fonctionnel
- [ ] Responsive (mobile-first, breakpoints Tailwind)
- [ ] Zéro URL hardcoded externe (Vercel preview, ancien domaine) — utiliser env vars pour les URLs cross-app (ex: `NEXT_PUBLIC_EZSTART_WEB_URL`)

### 2.4 SEO

- [ ] `metadata` exporté dans `layout.tsx` (title, description, keywords, themeColor)
- [ ] `robots.ts` présent
- [ ] `sitemap.ts` présent
- [ ] JSON-LD schema (Organization ou SoftwareApplication)
- [ ] OG images configurées
- [ ] URL canonique via `getCanonicalUrl()` de `@ezstart/config`

### 2.5 Auth & Dashboard

- [ ] Auth callback page (`/auth/callback`) fonctionnelle
- [ ] Dashboard/admin section protégée par `RequireAuth` ou `RequireRole`
- [ ] Rôles respectés : superadmin voit tout, admin voit son app, user voit son compte
- [ ] Page settings utilisateur (profil, sessions, 2FA si applicable)

### 2.6 Error Handling

- [ ] `ErrorBoundary` wrapping l'app entière
- [ ] Pages d'erreur custom (`error.tsx`, `not-found.tsx`)
- [ ] Toast pour les erreurs API (via `parseApiError` + `toast.error`)

**Check rapide Web** :

```bash
# Dev server
pnpm dev <app>
# Checklist manuelle
# - Page charge sans erreur console
# - Dark mode toggle fonctionne
# - i18n switch fonctionne
# - Login/logout flow complet
# - Admin dashboard accessible en superadmin
# - Mobile responsive (DevTools toggle)
# - /robots.txt et /sitemap.xml accessibles
```

---

## 3. Infra & Deploy

### 3.1 Environnements

- [ ] `.env.example` à jour (committé, sans secrets)
- [ ] `.env.local` pour dev (gitignored)
- [ ] Variables Railway staging séparées de prod
- [ ] Variables Vercel staging séparées de prod
- [ ] `DEPLOY_ENV=staging` ou `production` configuré

### 3.2 Railway (API)

- [ ] Build command : `pnpm install --frozen-lockfile --shamefully-hoist && pnpm turbo build --filter=api-<app>...`
- [ ] Start command : `cd apps/<app>/api && node dist/index.js`
- [ ] Healthcheck path : `/health`
- [ ] Watch paths configurés (app + packages deps)
- [ ] Staging environment séparé avec sa propre DB

### 3.3 Vercel (Web)

- [ ] Root directory : `apps/<app>/web`
- [ ] Include files outside root directory : coché
- [ ] `vercel.json` avec buildCommand, outputDirectory, installCommand
- [ ] Framework : Next.js
- [ ] Staging branch deploie sur preview URL

### 3.4 Database

- [ ] MongoDB Atlas (ou compatible)
- [ ] DB séparée par environnement (`<app>-dev`, `<app>-staging`, `<app>-prod`)
- [ ] Indexes créés (vérifier performance)
- [ ] Backups configurés (M2+ Atlas pour prod, cf. `data-protection.md`)

---

## 4. SaaS Features (quand l'app est commercialisée)

### 4.1 API Keys

- [ ] CRUD API keys dans le dashboard (créer, voir, révoquer, rotater)
- [ ] Clé affichée une seule fois à la création (copy + warning)
- [ ] Prefix identifiable (`ezk_` pour auth, `epk_` pour pay, etc.)
- [ ] Key scoping par app (optionnel)

### 4.2 Quotas & Usage (Phase 5b — futur)

- [ ] Compteur requêtes par key par mois
- [ ] Free tier défini (ex: 1000 auth/mois, 100 transactions/mois)
- [ ] 429 quand quota dépassé avec message clair
- [ ] Dashboard usage (graphiques requêtes/jour)
- [ ] Email alerte à 80% du quota

### 4.3 Billing (Phase 5b — futur)

- [ ] Plans définis dans EZPay (Free, Pro, Business)
- [ ] Clé API liée à un plan
- [ ] Upgrade/downgrade depuis le dashboard
- [ ] Stripe checkout intégré via EZPay
- [ ] Factures automatiques

### 4.4 Developer Experience

- [ ] SDK publishé sur npm (`npm install @ezstart/<sdk>`)
- [ ] README avec quickstart 3 niveaux (core / React / components)
- [ ] `/docs` Swagger accessible
- [ ] Exemples de code dans la doc
- [ ] Status page (uptime, incidents)

---

## 5. SaaS Product Completeness

Chaque app SaaS (ezauth, ezpay, futur) doit avoir ces features avant launch production. Composants UI via SDK ou `packages/ui/` uniquement (cf. `standard-ui.md`).

### 5.1 Landing / Homepage

- [ ] 🔴 P0 : Page publique presentant le service (pas d'auth requise)
- [ ] 🔴 P0 : Value proposition claire + features
- [ ] 🔴 P0 : CTA : login / signup / pricing
- [ ] 🔴 P0 : Responsive mobile-first, dark mode
- [ ] 🔴 P0 : TOUS composants depuis SDK ou `packages/ui/` (zero custom)
- [ ] 🔴 P0 : MUST use `LandingLayout` compound components from `@ezstart/ui`
- [ ] 🔴 P0 : Header: logo + nav + ThemeSwitcher + LocaleSwitcher + LoginButton/UserMenu (from auth-sdk)
- [ ] 🔴 P0 : Hero with value prop + CTA (adapts when user is authenticated: "Get Started" -> "Go to Dashboard")
- [ ] 🔴 P0 : Footer with link columns: Product, Company, Legal
- [ ] 🔴 P0 : ALL links must point to real pages (placeholder pages at minimum)
- [ ] 🟠 P1 : Social proof section (testimonials, logos, customer count) (1-2 jours)
- [ ] 🟠 P1 : Comparison table vs competitors (1 jour)

### 5.2 Auth Flow (Standalone)

- [ ] 🔴 P0 : Login fonctionne SANS redirect SSO (direct sur l'app)
- [ ] 🔴 P0 : Register fonctionne standalone
- [ ] 🔴 P0 : Forgot password fonctionne standalone
- [ ] 🔴 P0 : OAuth (Google) fonctionne
- [ ] 🔴 P0 : Tout via SDK components (`<AuthProvider />`, `<SignInForm />`, etc.)
- [ ] 🔴 P0 : Publishable key based (`NEXT_PUBLIC_EZAUTH_KEY`)
- [ ] 🔴 P0 : Email verification gate (cf. `standard-saas-security.md` §2)
- [ ] 🟠 P1 : 2FA TOTP optional (cf. `standard-saas-security.md` §2)
- [ ] 🔴 P0 : 2FA mandatory pour admin/superadmin (cf. `standard-saas-security.md` §2)
- [ ] 🟠 P1 : Session management UI (list devices, revoke per-device)

#### White-label theme — primary-only (2026-04-24)

**Règle :** le consumer définit UNIQUEMENT la couleur `primary` dans son Application. Le mode clair/sombre est géré automatiquement par `next-themes` côté ezauth et propagé entre les deux apps via le paramètre `?theme=`.

- [ ] Dashboard theme editor expose `primary` + `logo` + toggle `themeEnabled` uniquement (pas de background/foreground/accent)
- [ ] SSR middleware injecte `<style>:root{--primary:<db-value>;}</style>` — pas d'override scopé par `data-app`
- [ ] Layout ezauth fixe `data-app="ezauth"` (pas de propagation du slug consumer)
- [ ] `<LoginButton>` / `<RegisterButton>` auto-détectent la préférence light/dark du consumer et l'envoient via `?theme=<light|dark|system>` à l'ezauth
- [ ] `<AuthCallbackPage>` lit `?theme=` au retour et applique la préférence sur le consumer (pour le cas où l'utilisateur a switché sur la page ezauth)
- [ ] Backend Zod schema garde les 4 champs en backcompat, mais seul `primary` est rendu en CSS
- [ ] `/api/keys/config` expose `appDisplayName` (depuis `Application.name`) pour le rendu "Sign in to access \<brand\>" — fallback `prettifySlug(appName)` quand absent

### 5.3 User Dashboard (post-login)

- [ ] 🔴 P0 : Overview : mes apps / mes projets
- [ ] 🔴 P0 : Mes API keys (CRUD) — via auth-sdk DeveloperPortal
- [ ] 🟠 P1 : Mon usage / quotas
- [ ] 🟠 P1 : Mon plan + upgrade CTA — via pay-sdk PricingPage
- [ ] 🔴 P0 : Settings (profil, securite, 2FA) — via auth-sdk UserSettings
- [ ] 🔴 P0 : TOUT depuis SDK components, zero UI app-specific
- [ ] 🔴 P0 : Account deletion (GDPR) — via auth-sdk account-deletion-form
- [ ] 🔴 P0 : Data export (GDPR) — pattern à étendre à toutes les apps

### 5.4 Pricing / Plans

- [ ] 🔴 P0 : Page pricing publique (Free / Pro / Enterprise)
- [ ] 🔴 P0 : Plans geres dans EZPay dashboard (pas hardcodes)
- [ ] 🔴 P0 : Checkout via pay-sdk (Stripe)
- [ ] 🔴 P0 : Plan actuel visible dans le user dashboard
- [ ] 🔴 P0 : Flow upgrade/downgrade
- [ ] 🔴 P0 : Via pay-sdk PricingPage component (auto-fetch plans depuis API)
- [ ] 🔴 P0 : Plans MUST come from pay-sdk PricingPage component (auto-fetched from API)
- [ ] 🔴 P0 : NEVER hardcode pricing cards in the app
- [ ] 🔴 P0 : If no plans configured in EZPay: show "Pricing coming soon" placeholder
- [ ] 🟠 P1 : Past-due banner UI quand subscription past_due (cf. `standard-saas-billing.md` §4)
- [ ] 🟠 P1 : Update payment method UI (Stripe Customer Portal)
- [ ] 🔴 P0 : SCA / 3DS testé (`standard-saas-billing.md` §2)
- [ ] 🔴 P0 (EU) : Stripe Tax activé (TVA EU OSS, cf. `standard-saas-billing.md` §6)
- [ ] 🟠 P1 : Dunning emails (Stripe Smart Retries) configuré
- [ ] 🟠 P1 : Invoice PDF téléchargeable (cf. `standard-saas-billing.md` §5)

### 5.5 Admin Platform (superadmin)

Pattern **federated admin** : EZStart (hub) agrège les AdminDashboards de chaque SDK en tabs. Pas de panel admin dupliqué par app — un seul hub pour tout superadmin.

- [ ] Dashboard stats global
- [ ] User management (CRUD, roles, ban)
- [ ] Gestion de toutes les API keys
- [ ] Stats usage global, revenue
- [ ] Scope par key : app-scoped montre une app, platform-scoped montre tout
- [ ] Chaque SDK exporte son `<XxxAdminDashboard />` (auth-sdk `<AuthAdminDashboard />`, pay-sdk `<PayAdminDashboard />`, monitoring `<MonitoringDashboard />`, ...)
- [ ] `apps/ezstart/web/src/app/[locale]/(dashboard)/admin/` embed ces components en tabs
- [ ] Superadmin JWT global accepté par toutes les APIs (JWT_PUBLIC_KEY partagé, pas de clé par app pour le superadmin)
- [ ] Chaque SDK AdminDashboard accepte `apiUrl` + `authToken` props pour fonctionner cross-origin

### 5.6 Developer Experience

Cf. [`standard-sdk-dx.md`](./standard-sdk-dx.md) pour le détail des SDKs publishable.

- [ ] 🔴 P0 : Page quickstart / getting started
- [ ] 🔴 P0 : Instructions d'installation SDK
- [ ] 🔴 P0 : API docs (Swagger `/docs`)
- [ ] 🔴 P0 : Exemples de code
- [ ] 🔴 P0 : Status page (uptime) — cf. `standard-saas-observability.md` §4

### 5.7 Required Pages

- [ ] 🔴 P0 : `/privacy` — Privacy Policy (placeholder OK before launch)
- [ ] 🔴 P0 : `/terms` — Terms of Service
- [ ] 🔴 P0 : `/about` — About page
- [ ] 🔴 P0 : `/contact` — Contact page with email
- [ ] 🔴 P0 : `/docs` — Documentation (or link to external docs)
- [ ] 🟠 P1 : `/blog` — Blog (placeholder OK)
- [ ] 🟠 P1 : `/changelog` — Changelog
- [ ] 🔴 P0 : `/status` — Status page
- [ ] 🟠 P1 (EU) : Cookie consent banner (Cookiebot ou custom — bloquer analytics tant que pas accept)
- [ ] 🟠 P1 ⚡QW : `/security` page + `security.txt` (cf. `standard-saas-security.md` §10)
- [ ] 🟠 P1 : `/refund-policy` (si paid plans, cf. `standard-saas-billing.md` §11)

---

## Grep-commands audit rapide

```bash
# Provider stack
grep -l "AuthProvider\|ThemeProvider\|ErrorBoundary" apps/<app>/web/src/app/*/layout.tsx

# i18n completeness
ls apps/<app>/web/src/messages/

# SEO files
ls apps/<app>/web/src/app/robots.ts apps/<app>/web/src/app/sitemap.ts

# Auth on routes
grep -rn "authMiddleware\|verifyTokenMiddleware\|RequireAuth\|RequireRole" apps/<app>/

# console.log (interdit)
grep -rnE "console\.(log|warn|error)" apps/<app>/api/src/ apps/<app>/web/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules

# Native HTML (interdit dans web)
grep -rnE "<div |<span |<button |<input |<h[1-6] " apps/<app>/web/src/ --include="*.tsx" | grep -v node_modules | grep -v packages/ui

# Hardcoded colors (interdit)
grep -rnE "bg-gray|bg-red|bg-blue|bg-green|text-gray|text-red" apps/<app>/web/src/ --include="*.tsx" | grep -v node_modules
```

---

## Score par app (audit actuel 2026-04-16)

| App            | API | Web | Infra | SaaS Features | Product Completeness   | Total                    |
| -------------- | --- | --- | ----- | ------------- | ---------------------- | ------------------------ |
| ezauth         | 9/9 | 8/8 | OK    | API keys done | Landing + Auth + Admin | Reference                |
| ezbill         | 8/9 | 8/8 | OK    | -             | Landing only           | Excellent                |
| ezpay          | 8/9 | 8/8 | OK    | -             | Landing + Pricing      | Excellent                |
| ezstart        | 8/9 | 8/8 | OK    | -             | Landing only           | Excellent                |
| green-pulse    | 8/9 | 8/8 | OK    | -             | Landing only           | Excellent                |
| gacha-analyzer | 8/9 | 7/8 | OK    | -             | -                      | Good (admin manquant)    |
| fengshui       | N/A | 7/8 | OK    | -             | -                      | Good (admin manquant)    |
| asc-tcd        | N/A | 7/8 | OK    | -             | -                      | Good (auth intentionnel) |
