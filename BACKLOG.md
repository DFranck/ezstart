# @ezstart Monorepo Backlog

Source unique de vérité pour les items **en cours / à faire**. Les items terminés sont déplacés dans [BACKLOG-HISTORY.md](./BACKLOG-HISTORY.md).

## Conventions

- `- [ ]` item à faire / en cours
- `- [x]` terminé → déplace vers `BACKLOG-HISTORY.md` à la prochaine passe
- **Priorité** : items les plus importants en tête de section
- **Blockers** : note `**Bloqué par :** <ref>` si dépendance explicite
- Pour un item cross-app, préfixer par `[app]` quand utile

---

## Reste avant P10 (post P9)

- [x] **PLATFORM-ARCH-001** — 3-tier architecture model codified (2026-04-24) _New `.claude/rules/standard-architecture.md` documents the decision tree (Tier 1 per-app SaaS = ezauth+ezpay / Tier 2 consumer apps / Tier 3 platform hub = ezstart), with ASCII diagram, anti-patterns, and references to Stripe/Clerk/Vercel benchmarks. README "Architecture" section updated with the same diagram. CLAUDE.md index links the rule. Agent memory `project_app_architecture.md` aligned._
- [ ] **EZP-CONNECT-001** — Stripe Connect Express KYC E2E (clic manuel user requis — user doit compléter onboarding Stripe sur staging)
- [x] **DOGFOOD-PATTERN-001** — Application.isPlatformOwned + hasFeature helper + ezpay tenant key seeded. (2026-04-24) _(1) `seed-consumer-app-keys.ts` updated to include `ezpay` — new staging tenant key `ez_pk_live_79c360...` generated and wired into Vercel ezpay web staging (`NEXT_PUBLIC_EZAUTH_KEY`); `GET /api/keys/config?key=ez_pk_live_79c360...` returns `{appName:'ezpay', scope:'user'}`. (2) `Application.isPlatformOwned: boolean` field added to the Mongoose schema + serializer + Zod response schemas (list/get/create/update/update-theme) + `Application` type in auth-sdk core. (3) New idempotent `seed-platform-owned-flag.ts` script (npm `seed:platform-owned`, 5 vitest tests) flagged the 8 EzStart-owned apps on staging (ezauth/ezpay/ezstart/ezbill/green-pulse/fengshui/asc-tcd/gacha-analyzer). (4) New `@ezstart/auth-sdk/server/features.ts` exports `hasFeature({app, user, appSlug, feature})` with 5-step priority: platform-owned bypass → superadmin → plan grants → user `pro` role → deny. 16 unit tests. Exported from `@ezstart/auth-sdk/server` barrel. Ready to wire into future feature gates (custom-theme, extended-monitoring, …)._

---

## Known minor issues post-P7 (2026-04-23)

Non-bloquants, à traiter opportunistiquement. Certains attendent CROSS-KEY-001 ou la suite P8/P9.

- [ ] **Sidebar nav `#` anchors**: several links in the unified dashboard sidebar still point to `#` placeholders instead of real client routes. UX minor — no 404 (anchor stays on page), but breadcrumb / deep link doesn't work.
- [ ] **Connect app stuck pending — no "Resume onboarding" button**: when a Connect onboarding flow is started and abandoned before KYC, the ConnectedAccount stays `status=pending` with no UI affordance to resume. Today the user must re-trigger via the `Stripe Connect` tab, which creates a new onboarding link server-side but the existing pending row is never rehydrated in the UI.

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

- [ ] **npm publish setup** — In progress. Setup `npm publish --access public` for all `@ezstart/*` packages. Changesets for versioning + changelog. GitHub Action on tag `v*.*.*` auto-publishes modified packages. Packages: api-contracts, api-core, api-sdk, auth-sdk, pay-sdk, ui (phase 1).
- [ ] **Developer API key system** — Après publish npm. Chaque SDK accepte `{ apiKey }` dans sa config. EZAuth dashboard génère des API keys par app. Middleware `validateApiKey` dans api-core. Free tier (ex: 1000 users auth, 100 transactions pay) → payant via EZPay subscriptions. Self-dogfood: toutes les apps monorepo utilisent le même système (clé admin gratuite / illimitée). Modèle Clerk/Stripe : SDK gratuit npm, service payant via API key + quotas.
- [ ] **Developer dashboard (EZStart hub)** — Dashboard pour devs externes : créer un compte, générer API keys, voir usage/quotas, gérer billing via EZPay. Pages: `/developer/apps`, `/developer/keys`, `/developer/usage`, `/developer/billing`. Consomme auth-sdk + pay-sdk en dogfood.
- [ ] **Standardize admin dashboards UI/UX** — Actuellement chaque AdminDashboard (AI, Auth, Monitoring, EZPay, Services) utilise `DataTable`, `Badge`, `Card`, filters, pagination avec des micro-variations. Objectif : audit + uniformisation via wrappers/presets dans `@ezstart/ui` : (1) `AdminTable` preset avec columns factory + loading/empty states, (2) `AdminBadgeGroup` multi-badges truncate/tooltip, (3) `AdminFilters` pattern unifié, (4) `AdminPagination` preset, (5) guidelines layout admin page. À attaquer quand 3+ dashboards sont stabilisés.
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
- [ ] **THEME-PRESETS-001** — Ajouter des presets de thèmes pré-construits (Stripe-like: Default, Dark, Vibrant, Minimalist) sélectionnables en 1 clic depuis le dashboard avant de personnaliser les tokens. Stocker les presets dans `packages/ui/src/lib/design-system/presets.ts` pour réutilisation cross-SDK.
- [ ] **THEME-LOGO-UPLOAD-001** — Intégration Vercel Blob (ou S3) pour upload du logo tenant. Actuellement le champ `theme.logo` accepte uniquement une URL http/https ; ajouter un upload direct avec resize auto + preview. Exposer le logo via `<img src={theme.logo}>` dans le header de la page login quand présent (actuellement le champ est persisté mais non rendu).

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
- [ ] **EZP-PROD-003: Generate `EZAUTH_WEBHOOK_SECRET`** identical des 2 côtés (staging + prod)
  - `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` → hex 64 chars
  - Set dans Railway api-ezpay AND api-ezauth env vars
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
