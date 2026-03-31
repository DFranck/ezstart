# Backlog — EZStart

**Status :** `maintained` | **Derniere mise a jour :** 2026-03-29

## Objectif

Landing page / portfolio + Monitoring dashboard (health, errors, audits) + Admin panel + Feature demos (CV, QR, Business Card) + Libraries showcase.

---

## Audit Summary

| Categorie      | Score  | Critique                                                                                          |
| -------------- | ------ | ------------------------------------------------------------------------------------------------- |
| Fonctionnalite | 75/100 | Metrics endpoint stub, activity logs incomplete, alerting not wired                               |
| Code quality   | 70/100 | `any` types, hardcoded strings, native HTML elements, eslint-disable                              |
| UX             | 65/100 | Hardcoded strings in monitoring, no mobile TrendingGraph, no uptime history page                  |
| API quality    | 80/100 | Good validation via Zod, pagination present, but metrics stub and missing auth on write endpoints |
| Feature gaps   | 60/100 | Alert system exists but not connected, no uptime history page, no deployment status               |

---

## Phase 1 — Bugs & Code Quality (priority: high)

### 1.1 Socket.IO event name mismatch (→ monorepo #69)

- **Status:** `planned`
- **Severity:** bug / real-time broken
- **Details:** API emits `health-check-updated` (singular, `healthCheckScheduler.ts:227`) but web listens for `health-checks-updated` (plural, `useSocket.ts:34`). Real-time updates never reach the frontend.
- **Files:** `api/src/services/healthCheckScheduler.ts`, `web/src/app/[locale]/monitoring/hooks/useSocket.ts`

### 1.2 Hardcoded strings in monitoring pages

- **Status:** `planned`
- **Severity:** i18n violation
- **Details:** Multiple hardcoded English strings that should use `t()`:
  - `errors/page.tsx:69` — "Failed to load monitoring data" (should use `t('failedToLoad')`)
  - `errors/page.tsx:89` — "Next update in:" (should use `t('nextUpdateIn')`)
  - `audits/page.tsx:76` — "Failed to load monitoring data" (same)
  - `audits/page.tsx:96` — "Next update in:" (same)
  - `audits/page.tsx:99` — "Error Status Score" / "Audits Quality Score" hardcoded
  - `audits/page.tsx:107` — `${audits.length} audits completed` hardcoded
  - `audits/page.tsx:117` — `Audits Overview (${audits.length})` hardcoded
  - `audits/page.tsx:153` — "No audits match your filters." hardcoded
  - `page.tsx:78` — "Failed to load monitoring data" in overview (same)
  - `TrendingGraph.tsx:74` — "Unable to load trending data" hardcoded
  - `TrendingGraph.tsx:119` — "No data available for the selected period"
  - `TrendingGraph.tsx:103-112` — "Uptime:", "Avg Response:", "Checks:" hardcoded
  - `ErrorsFeed.tsx:109-116` — severity labels "Critical", "Error", "Warning" hardcoded
  - `ErrorsFeed.tsx:136-139` — timeAgo strings "d ago", "h ago", "m ago", "Just now" hardcoded
- **Files:** All monitoring page/component `.tsx` files

### 1.3 Hardcoded `globalHealthScore = 96.6`

- **Status:** `planned`
- **Severity:** bug / misleading data
- **Details:** `SystemOverview.tsx:80` hardcodes `const globalHealthScore = 96.6` instead of computing it dynamically. The displayed "Global Health" stat card is always stale.
- **File:** `web/src/app/[locale]/monitoring/components/SystemOverview.tsx`

### 1.4 Remove `any` types

- **Status:** `planned`
- **Severity:** code quality
- **Details:**
  - `health/page.tsx:117` — `projects.map((project: any)` — should use `ProjectHealth` type
  - `audits/page.tsx:143` — `filteredAudits.map((audit: any)` — should use `MonitoringAudit` type
  - `admin/page.tsx:62` — `Record<string, any>` for query params — use `Record<string, string>`
  - `admin/components/user-management-table.tsx:38` — `Record<string, any>` for variants — type properly
  - `api/src/services/alerting.ts:27` — `Record<string, any>` for metadata
  - `api/src/models/PerformanceMetric.ts:16` — `[key: string]: any` in metadata interface
  - `api/src/routes/history/by-service.ts:48` — `as Promise<any[]>` — type the lean result properly
  - `api/src/routes/audit/list.ts:79-81` — `[string, any]` in Object.entries
- **Note:** Also 5 `eslint-disable` comments to review; some may be justified (dynamic icon names), others should be typed properly.

### 1.5 Native HTML elements instead of UI components

- **Status:** `planned`
- **Severity:** code quality / inconsistency
- **Details:** Feature demo pages use raw `<textarea>`, `<select>`, `<option>`, `<input type="checkbox">`, `<input type="color">`, `<input type="range">` instead of `@ezstart/ui` components (or at minimum the Tag component). This violates the UI component rule.
- **Files:**
  - `cv-generator-page.tsx` — textarea (x3), input checkbox, input color
  - `qr-code-page.tsx` — select (x2), input range, input color (x2), input checkbox
  - `business-card-page.tsx` — select (x1), input color (x2), input checkbox
- **Fix:** Replace with `Select`/`SelectContent`/`SelectItem` from `@ezstart/ui`, create or use Textarea/Checkbox/ColorPicker components.

### 1.6 `<a>` tag used directly in ErrorsFeed

- **Status:** `planned`
- **Severity:** code quality
- **Details:** `ErrorsFeed.tsx:192` uses raw `<a href>` instead of `Link` from next or the UI component.
- **File:** `web/src/app/[locale]/monitoring/errors/components/ErrorsFeed.tsx`

---

## Phase 2 — API Improvements (priority: high)

### 2.1 Implement metrics endpoint (stub)

- **Status:** `planned`
- **Details:** `GET /api/metrics` currently returns `{ message: 'Metrics endpoint - TODO: implement full metrics' }`. Should aggregate real data: uptime %, avg response time, error rate, checks count per period.
- **File:** `api/src/routes/metrics/root.ts`

### 2.2 Complete activity logs

- **Status:** `planned`
- **Details:** `activity/list.ts` has 3 TODOs at lines 69-71:
  - Fetch deployment events from Railway/Vercel webhooks
  - Fetch health changes from MongoDB
  - Fetch audit updates from MongoDB
    Only Sentry errors are fetched currently. Activity feed is incomplete.
- **File:** `api/src/routes/activity/list.ts`

### 2.3 Wire alerting service to scheduler

- **Status:** `planned`
- **Details:** `alerting.ts` has full email + Slack alerting implementation but it is never called from `healthCheckScheduler.ts`. When a service goes down, no alert is sent. Need to call `alertServiceDown()` and `alertHighResponseTime()` from the scheduler.
- **Files:** `api/src/services/alerting.ts`, `api/src/services/healthCheckScheduler.ts`

### 2.4 Add authentication to write endpoints (→ monorepo #59)

- **Status:** `planned`
- **Details:** `POST /api/trigger-checks` and `POST /api/performance` have no auth guard. Any client can trigger health checks or record arbitrary performance metrics. Should require at least an API key or auth token.
- **Files:** `api/src/routes/trigger.ts`, `api/src/routes/performance/record.ts`

### 2.5 Remove `node-cron` unused dependency

- **Status:** `planned`
- **Details:** `node-cron` is in `package.json` but never imported. The scheduler uses `setTimeout` (adaptive intervals). Remove dead dependency.
- **File:** `api/package.json`

### 2.6 Remove mock history utility or guard it

- **Status:** `planned`
- **Details:** `api/src/utils/mockHistory.ts` provides mock data generators. Not imported anywhere in production routes but shipped in the build. Either delete it or ensure it is test-only.
- **File:** `api/src/utils/mockHistory.ts`

---

## Phase 3 — Monitoring UX (priority: medium)

### 3.1 Uptime history page

- **Status:** `planned`
- **Details:** There is no dedicated page to view historical uptime graphs. The TrendingGraph component exists and works but is not accessible from any navigation. Need a `/monitoring/history` or `/monitoring/health/:serviceId` detail page with configurable time range (24h, 7d, 30d).
- **Components ready:** `TrendingGraph.tsx`, `UptimeGraphClient.tsx`

### 3.2 Fix `minutes`/`seconds` countdown unused in overview

- **Status:** `planned`
- **Details:** `monitoring/page.tsx` computes `minutes` and `seconds` at line 86-87 but never displays them. The "Next update in" countdown is shown on health/errors/audits sub-pages but missing from the overview page.
- **File:** `web/src/app/[locale]/monitoring/page.tsx`

### 3.3 Responsive improvements for monitoring

- **Status:** `planned`
- **Details:**
  - `MetricsOverview` is hidden on mobile (`isDesktop && <MetricsOverview ...>`). Consider a compact mobile version.
  - `TrendingGraph` uses Recharts `ResponsiveContainer` but axis labels may overflow on small screens.
  - Monitoring overview "Quick Actions" buttons use `router.push` which won't benefit from Next.js prefetching — switch to `Link`.

### 3.4 Dashboard navigation improvements

- **Status:** `planned`
- **Details:** No breadcrumbs or sub-navigation within monitoring. Users must use browser back. Add a tab bar or breadcrumb for monitoring/health, monitoring/errors, monitoring/audits.

### 3.5 Auto-refresh indicator

- **Status:** `planned`
- **Details:** The countdown timer should also show "Refreshing..." state when `isFetching` is true. Currently `isFetching` is destructured but unused in health and audits pages.

---

## Phase 4 — Feature Demos Completeness (priority: medium)

### 4.1 CV Generator — missing sections

- **Status:** `planned`
- **Details:** The CV form only has personal info + summary. The `CVData` type defines `experience[]`, `education[]`, `skills[]`, `languages[]`, `certifications[]` but there are no form sections to edit them. The preview (`cv-preview.tsx`) may render them if AI-generated, but manual input is impossible.
- **File:** `web/src/app/[locale]/(views)/ez-features/[feature]/(cv-generator)/cv-generator-page.tsx`

### 4.2 CV Generator — PDF export

- **Status:** `planned`
- **Details:** `jspdf` and `html2canvas` are in dependencies but no export/download button exists in the CV generator UI. Should add "Download PDF" functionality.

### 4.3 QR Code — download button

- **Status:** `planned`
- **Details:** The QR code canvas renders but there is no download button (PNG/SVG). Users can only screenshot.
- **File:** `web/src/app/[locale]/(views)/ez-features/[feature]/(qr-code)/qr-code-page.tsx`

### 4.4 Business Card — download/print

- **Status:** `planned`
- **Details:** Same as QR code — no export functionality. The feature section mentions "Print Ready" but there is no print/download action.
- **File:** `web/src/app/[locale]/(views)/ez-features/[feature]/(business-card)/business-card-page.tsx`

### 4.5 Feature demos access control inconsistency

- **Status:** `planned`
- **Details:** QR Code only requires `RequireAuth`. CV Generator and Business Card require `RequireAuth` + `RequireRole("superadmin")`. This seems inconsistent — demos should either all be public, all auth-gated, or all role-gated.

---

## Phase 5 — Feature Gaps (priority: low)

### 5.1 Alert system activation

- **Status:** `planned`
- **Details:** Email + Slack alerting is fully coded but requires ENV vars (`ALERT_EMAIL_ENABLED`, `ALERT_SLACK_ENABLED`, SMTP config, Slack webhook). Add `.env.example` entries and document setup. Add an admin UI toggle or at least a test endpoint accessible from monitoring dashboard.

### 5.2 Deployment status integration

- **Status:** `planned`
- **Details:** The deployment routes (`/api/deployments`) fetch git commit info via `child_process.exec('git log')`. This only works on machines with the repo cloned (not Railway). Consider Railway/Vercel API integration for real deployment status (last deploy time, build status, deploy URL).

### 5.3 Real-time monitoring improvements

- **Status:** `planned`
- **Details:**
  - Socket.IO only emits on health check results. Could also emit on error threshold breached, deployment detected, etc.
  - Consider SSE as lighter alternative to Socket.IO for one-way server-to-client events.
  - Add visual "live" indicator pulse when socket is connected.

### 5.4 Performance dashboard page

- **Status:** `planned`
- **Details:** Performance API endpoints exist (`/api/performance/:serviceId`, `/api/performance/:serviceId/endpoints`) with p50/p95/p99 stats, but there is no frontend page to visualize them. Add a `/monitoring/performance` page with response time distributions, slowest endpoints chart.

### 5.5 More feature demos

- **Status:** `planned`
- **Details:** Potential additions to the feature showcase:
  - Color palette generator
  - Markdown to PDF
  - Image compressor/optimizer
  - Password generator
  - JSON formatter/validator

### 5.6 Admin panel improvements

- **Status:** `planned`
- **Details:**
  - No user creation from admin panel (only edit)
  - No user deletion / deactivation
  - No audit log of admin actions
  - No bulk operations
  - Search is client-side filter on already-fetched page; should be server-side query

---

## Phase 6 — Testing & DX (priority: low)

### 6.1 Expand test coverage (→ monorepo #73)

- **Status:** `planned`
- **Details:** Only one test file exists: `api/src/__tests__/models/HealthCheck.test.ts`. No route tests, no service tests, no web component tests.

### 6.2 API documentation

- **Status:** `planned`
- **Details:** Some routes use `createRouterWithDoc` + OpenAPI registry (health, audits) but others do not (activity, history, performance, projects, trigger, scheduler). Inconsistent Swagger coverage.

### 6.3 Duplicate HealthChecker instances

- **Status:** `planned`
- **Details:** Multiple routes create their own `new HealthChecker()` instance (`health/list.ts`, `health/get-by-service.ts`, `health/history.ts`, `trigger.ts`). Each has its own in-memory history. Should share a singleton or rely entirely on MongoDB history.

---

## Notes

- The overall architecture is solid: adaptive scheduler with exponential backoff, real-time Socket.IO, React Query with stale/gc/refetch config, proper Zod validation on API inputs.
- The monitoring package (`@ezstart/monitoring`) centralizes service configs, health checking, and deployment configs — good separation.
- The alerting service is production-ready code but needs to be wired into the scheduler loop.
- The audit system reads from `docs/audits.json` (filesystem), which works on Railway if the file is in the build. Verify this is the case.
- `motion` and `framer-motion` are both in web `package.json` — likely only one is needed (motion is the v12 rename of framer-motion).
