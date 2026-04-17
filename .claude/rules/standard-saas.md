# Standard SaaS — checklist apps

**Source de vérité pour toute app (API + Web).** Complémentaire à `standard.md` (packages). Chaque app passe ce checklist avant deploy prod. Pas d'exception.

---

## 1. API — Backend

### 1.1 Boot & Health

- [ ] `createEzstartServer(appName)` utilisé (pas `createApp` ni `express()` direct)
- [ ] `/health` + `/api/health` répondent `{ status: 'ok' }` (via api-core, automatique)
- [ ] `connectToMongo(dbName)` au boot (factory pattern, cf. `mongodb.md`)
- [ ] Sentry configuré (`instrument.mts` avec `initSentry('AppName API')`)
- [ ] Graceful shutdown (automatique via `startServer`)

### 1.2 Sécurité

- [ ] Auth middleware sur toutes les routes protégées (`authMiddleware` ou `verifyTokenMiddleware`)
- [ ] Rate limiting global (preset `standard` minimum, `strict` sur auth routes)
- [ ] CORS configuré via `createEzstartServer` (origins auto-détectées par app)
- [ ] Input validation Zod sur TOUT body/params/query (jamais `req.body` brut)
- [ ] `sendError()` / `sendSuccess()` / `sendValidationError()` — jamais `res.json()` direct
- [ ] Pas de secrets dans le code (cf. `data-protection.md`)

### 1.3 OpenAPI & Documentation

- [ ] Routes enregistrées via `createRouterWithDoc` (pas `Router()` seul)
- [ ] `/docs` accessible (Swagger UI auto-monté par `startServer`)
- [ ] Schemas Zod avec `.describe()` ou `.openapi()` sur les params/query
- [ ] `.env.example` à jour avec TOUTES les variables utilisées

### 1.4 API Keys (quand applicable)

- [ ] `validateApiKey` middleware disponible pour les routes consommées par des devs externes
- [ ] Header `X-API-Key` supporté
- [ ] Clés hashées en DB (sha256), jamais stockées en clair
- [ ] `lastUsedAt` mis à jour (fire-and-forget)

### 1.5 Monitoring

- [ ] Sentry error tracking configuré
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

### 2.1 Provider Stack (obligatoire dans `layout.tsx`)

```
NextIntlClientProvider
  └─ ErrorBoundary
       └─ ThemeProvider (@ezstart/ui/theme)
            └─ AuthProvider (@ezstart/auth-sdk)
                 └─ [QueryProvider si data-heavy]
                      └─ {children}
Toaster (sonner, hors providers)
```

- [ ] `NextIntlClientProvider` avec `messages` + `locale`
- [ ] `ErrorBoundary` de `@ezstart/ui/components`
- [ ] `ThemeProvider` de `@ezstart/ui/theme` (pas next-themes direct)
- [ ] `AuthProvider` avec `appName` + `authMode` configurés
- [ ] `Toaster` de sonner pour les notifications

### 2.2 i18n

- [ ] `messages/en/*.json` + `messages/fr/*.json` minimum
- [ ] TOUT texte user-facing via `useTranslations()` / `t()`
- [ ] Pas de string hardcodée visible par l'utilisateur
- [ ] `next-intl` middleware configuré (routing `[locale]`)

### 2.3 Theme & UI

- [ ] `ThemeProvider` avec `defaultTheme="system"` + `suppressHydrationWarning` sur `<html>`
- [ ] Couleurs sémantiques uniquement (`bg-primary`, `text-foreground`, jamais `bg-gray-100`)
- [ ] Composants `@ezstart/ui/components` (jamais HTML natif, cf. `ui.md`)
- [ ] Dark mode fonctionnel
- [ ] Responsive (mobile-first, breakpoints Tailwind)

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

- [ ] Page publique presentant le service (pas d'auth requise)
- [ ] Value proposition claire + features
- [ ] CTA : login / signup / pricing
- [ ] Responsive mobile-first, dark mode
- [ ] TOUS composants depuis SDK ou `packages/ui/` (zero custom)

### 5.2 Auth Flow (Standalone)

- [ ] Login fonctionne SANS redirect SSO (direct sur l'app)
- [ ] Register fonctionne standalone
- [ ] Forgot password fonctionne standalone
- [ ] OAuth (Google) fonctionne
- [ ] Tout via SDK components (`<AuthProvider />`, `<SignInForm />`, etc.)
- [ ] Publishable key based (`NEXT_PUBLIC_EZAUTH_KEY`)

### 5.3 User Dashboard (post-login)

- [ ] Overview : mes apps / mes projets
- [ ] Mes API keys (CRUD) — via auth-sdk DeveloperPortal
- [ ] Mon usage / quotas
- [ ] Mon plan + upgrade CTA — via pay-sdk PricingPage
- [ ] Settings (profil, securite, 2FA) — via auth-sdk UserSettings
- [ ] TOUT depuis SDK components, zero UI app-specific

### 5.4 Pricing / Plans

- [ ] Page pricing publique (Free / Pro / Enterprise)
- [ ] Plans geres dans EZPay dashboard (pas hardcodes)
- [ ] Checkout via pay-sdk (Stripe)
- [ ] Plan actuel visible dans le user dashboard
- [ ] Flow upgrade/downgrade
- [ ] Via pay-sdk PricingPage component (auto-fetch plans depuis API)

### 5.5 Admin Platform (superadmin)

- [ ] Dashboard stats global
- [ ] User management (CRUD, roles, ban)
- [ ] Gestion de toutes les API keys
- [ ] Stats usage global, revenue
- [ ] Scope par key : app-scoped montre une app, platform-scoped montre tout
- [ ] Via auth-sdk AuthAdminDashboard component

### 5.6 Developer Experience

- [ ] Page quickstart / getting started
- [ ] Instructions d'installation SDK
- [ ] API docs (Swagger `/docs`)
- [ ] Exemples de code
- [ ] Status page (uptime)

---

## Grep-commands audit rapide

```bash
# Provider stack
grep -l "AuthProvider\|ThemeProvider\|ErrorBoundary" apps/<app>/web/src/app/*/layout.tsx

# i18n completeness
ls apps/<app>/web/src/messages/

# SEO files
ls apps/<app>/web/src/app/robots.ts apps/<app>/web/src/app/sitemap.ts

# Sentry configured
grep -l "initSentry\|Sentry" apps/<app>/api/src/instrument.mts

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

| App | API | Web | Infra | SaaS Features | Product Completeness | Total |
|-----|-----|-----|-------|----------------|---------------------|-------|
| ezauth | 9/9 | 8/8 | OK | API keys done | Landing + Auth + Admin | Reference |
| ezbill | 8/9 | 8/8 | OK | - | Landing only | Excellent |
| ezpay | 8/9 | 8/8 | OK | - | Landing + Pricing | Excellent |
| ezstart | 8/9 | 8/8 | OK | - | Landing only | Excellent |
| green-pulse | 8/9 | 8/8 | OK | - | Landing only | Excellent |
| gacha-analyzer | 8/9 | 7/8 | OK | - | - | Good (admin manquant) |
| fengshui | N/A | 7/8 | OK | - | - | Good (admin manquant) |
| asc-tcd | N/A | 7/8 | OK | - | - | Good (auth intentionnel) |
