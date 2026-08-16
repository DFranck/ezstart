# Standard SaaS Observability — Monitoring + alerting + logging

Source de vérité observability pour toute app SaaS @ezstart. Aligné sur Datadog / Better Stack / Sentry patterns. Sentry retiré 2026-04-25 (incident OTEL/Express CORS sur Railway) → trou critique à combler.

## Légende des priorités

- **🔴 P0 / MVP** — bloquant pour launch first paying customer (sans error tracking + status page → erreurs silencieuses)
- **🟠 P1 / V1** — nécessaire dans les 3 mois (RUM, alerting, deep health)
- **🟡 P2 / V2** — devient "vraiment pro" (latency histograms, slow query log, SLO)
- **🟢 P3 / V3+** — excellence (distributed tracing, chaos engineering)
- **⚡ QW** — Quick Win, < 1 jour

---

## 1. Error tracking

- [ ] 🔴 P0 : Error tracking ré-activé — Sentry SaaS plan (`@sentry/node-core` sans OTEL hook) OU alternative type Highlight / Better Stack / Bugsink (1-2 jours setup)
- [ ] 🔴 P0 : Frontend errors capturés (window.onerror + ErrorBoundary trigger) (1 jour)
- [ ] 🔴 P0 : Backend errors capturés (api-core middleware automatic capture) (1 jour)
- [ ] 🔴 P0 : Source maps uploadés en prod (next.config.js + sentry-cli) (4h setup)
- [ ] 🟠 P1 : Release tracking (chaque deploy = release tag) — release notes auto (1 jour)
- [ ] 🟠 P1 : Email alert sur new error type (frequency > 10/h) (config Sentry)
- [ ] 🟡 P2 : Session replay (Sentry / LogRocket) sur sample 1% errors (1 jour)
- [ ] 🟡 P2 : User feedback widget on error (1 jour)

**Note** : Si on garde "no third-party error tracking" temporairement, MINIMUM doit être un Pino transport vers un endpoint custom + alerting Slack via webhook. Le silence radio sur les erreurs prod est inacceptable.

## 2. Logging

- [ ] 🔴 P0 : Pino structured logging via `@ezstart/logger/server` partout — JAMAIS console.log (déjà checklist standard-saas)
- [ ] 🔴 P0 : Log levels (debug/info/warn/error) respectés — debug filtré en prod
- [ ] 🔴 P0 : Pas de PII dans les logs (déjà security checklist)
- [ ] 🔴 P0 : Request ID injected (correlation entre frontend/backend) (1 jour pattern api-core middleware)
- [ ] 🔴 P0 ⚡QW : **Pino-pretty via stream sync, JAMAIS via `transport: { target }`** — utiliser `pino(opts, prettyStream)` avec `pino-pretty({ sync: true })`. Le worker thread du transport crash en Next.js dev (`Error: the worker has exited`) à chaque request lifecycle, ce qui throw le SSR et provoque flash. (cf. pattern ci-dessous + `packages/logger/src/server.ts`) (10min — change config)
- [ ] 🟠 P1 : Logs centralisés (Better Stack / Logtail / Datadog) — Railway/Vercel logs ne sont pas searchables long-terme (1 jour setup)
- [ ] 🟠 P1 : Log retention 30 jours min, 90 jours pour audit logs
- [ ] 🟡 P2 : Log alerting (`level: error AND service:ezauth` → Slack) (1 jour)

### 2.1 Pino-pretty stream sync — pattern obligatoire

```ts
// ✅ BON — packages/logger/src/server.ts
import pino from 'pino'
import pretty from 'pino-pretty'

const isDev = process.env.NODE_ENV !== 'production'
const prettyStream = isDev
  ? pretty({
      colorize: true,
      sync: true, // 🔒 OBLIGATOIRE — évite worker thread + crash SSR
      translateTime: 'SYS:HH:MM:ss',
      ignore: 'pid,hostname',
    })
  : undefined

export const logger = prettyStream ? pino({ level: 'info' }, prettyStream) : pino({ level: 'info' })
```

```ts
// ❌ INTERDIT — worker crash en Next.js dev → SSR throw → flash
export const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty', // Worker thread, exits mid-request
    options: { colorize: true },
  },
})
```

**Pourquoi** : `transport: { target }` lance pino-pretty dans un worker thread. En Next.js dev, le HMR + le SSR re-mount du moteur node provoquent `Error: the worker has exited` qui remonte à React et crash le SSR. Le pattern stream sync charge pino-pretty inline dans le même thread → zéro worker, zéro crash.

### 2.2 Anti-patterns INTERDITS — Logging

- ❌ `pino({ transport: { target: 'pino-pretty' } })` → worker thread crash
- ❌ `console.log/warn/error` côté server (`@ezstart/logger/server` only)
- ❌ Logger client (`@ezstart/logger/client`) qui envoie en prod sans batching → noise sur Sentry/console
- ❌ Logger qui throw quand le transport fail (logger doit être no-op silent au pire)

## 3. Metrics / Web Vitals

- [ ] 🟠 P1 : Web Vitals tracking en production via `useReportWebVitals` → Vercel Analytics OU Plausible OU custom endpoint (2h setup)
- [ ] 🟠 P1 : Server metrics (CPU, RAM, event loop lag) via Railway dashboard (déjà OK natif)
- [ ] 🟠 P1 : API metrics — request count, latency p50/p95/p99 par endpoint (1-2 jours via api-core middleware + Prometheus-ish endpoint)
- [ ] 🟡 P2 : Latency histograms par endpoint exposés via `/metrics` Prometheus format (3 jours)
- [ ] 🟡 P2 : Custom business metrics (signups/jour, MRR, churn) → dashboard interne (3-5 jours)

## 4. Health checks

- [ ] 🔴 P0 : `/health` répond 200 + `{ status: 'ok' }` (déjà OK api-core)
- [ ] 🔴 P0 : Deep health check `/health/deep` qui ping DB + check externals (Stripe API, mail SMTP) (1 jour)
- [ ] 🔴 P0 : Railway healthcheck path = `/health` configuré
- [ ] 🟠 P1 : Status page publique mandatory (Better Uptime / Atlas / custom via ezstart) — affiche uptime + incidents (2-3 jours)
- [ ] 🟠 P1 : External uptime monitoring (UptimeRobot gratuit OU Better Stack OU Pingdom) — check chaque 60s, alert si > 1 fail (1h setup)
- [ ] 🟠 P1 : Alerting multi-channel (email + Slack + SMS pour P0 incidents) (4h)
- [ ] 🟡 P2 : Synthetic transactions (Playwright run hourly sur login flow) (3 jours)

## 5. Tracing

- [ ] 🟡 P2 : Distributed tracing (OpenTelemetry SDK manuel OU Sentry tracing OU Honeycomb) — capture span par request avec DB queries enfant (1 semaine)
- [ ] 🟢 P3 : Cross-service tracing (ezauth → ezpay → consumer app) avec trace propagation (W3C traceparent header) (2 semaines)

**Attention** : OpenTelemetry auto-instrumentation a causé l'incident Sentry/CORS du 2026-04-25. Si on re-introduit OTEL, instrumentation MANUELLE only — pas d'auto-hook sur HTTP/Express.

## 6. Database observability

- [ ] 🟠 P1 : Slow query log — Mongoose `set('debug', { enabled: process.env.MONGOOSE_DEBUG === 'true', shouldLog })` + Atlas Performance Advisor (1h setup)
- [ ] 🟠 P1 : Connection pool metrics (active / idle / waiting) exposed
- [ ] 🟡 P2 : Query plan analysis pour les queries fréquentes — explain() + index suggestions (1 jour audit récurrent)

## 7. SLO / SLA

- [ ] 🟠 P1 : SLO défini par service — ex: ezauth = 99.9% uptime, latency p95 < 500ms (4h doc)
- [ ] 🟠 P1 : Error budget tracking — combien on peut casser ce mois-ci (1 jour dashboard)
- [ ] 🟡 P2 : SLA contractuel publié (legal page) si plan Enterprise (1 jour legal)
- [ ] 🟢 P3 : SRE on-call rotation (PagerDuty / Opsgenie) si > 5 ingés (1 semaine)

## 8. Audit logs (cross-référence security)

- [ ] 🟠 P1 : Audit logs sur sensitive actions persistant en DB — pattern existant via `audit-log-card` component, à standardiser sur toutes les apps (3-5 jours)
- [ ] 🟠 P1 : Audit logs queryable par admin (filter user/action/date)
- [ ] 🟡 P2 : Audit logs export CSV / JSON (2 jours)
- [ ] 🟡 P2 : Audit logs immutables (append-only collection) (1 jour Mongoose plugin)

## 9. Cost monitoring

- [ ] 🟡 P2 : Cost alerts MongoDB Atlas + Vercel + Railway (config dashboard)
- [ ] 🟡 P2 : Per-tenant cost tracking si feature enabled (3 jours)

## 10. Audit grep commands

```bash
# console.log/warn/error (interdit)
grep -rnE "console\.(log|warn|error)" apps/ packages/ --include="*.ts" --include="*.tsx" | grep -v "node_modules\|test\|stories"

# logger.error sans context object
grep -rnE "logger\.(error|warn)\(['\"]" packages/ apps/ --include="*.ts"

# /health endpoint coverage
ls apps/*/api/src/routes/health* 2>/dev/null || echo "Use api-core auto-mount"

# Sentry / error tracker imports (vérifier ré-activation)
grep -rn "@sentry\|@highlight\|bugsnag" apps/ packages/ --include="*.ts" --include="package.json"

# Web Vitals reporting
grep -rn "useReportWebVitals\|onCLS\|onLCP\|onINP" apps/ --include="*.tsx"

# Pino transport target (interdit — worker crash en Next.js dev)
grep -rnE "transport:\s*\{\s*target.*pino-pretty" packages/ apps/ --include="*.ts"
```

## 11. Comparaison modèles pro

| Service            | Error tracking              | Status page           | Deep health       | SLO public |
| ------------------ | --------------------------- | --------------------- | ----------------- | ---------- |
| **Stripe**         | Internal + Sentry-like      | status.stripe.com     | DB + externals    | 99.99%     |
| **Vercel**         | Sentry + custom             | vercel-status.com     | Multi-region      | 99.99%     |
| **Linear**         | Sentry + LogRocket          | status.linear.app     | Real-time sync    | 99.9%      |
| **Clerk**          | Sentry                      | status.clerk.com      | Auth chain        | 99.99%     |
| **@ezstart cible** | Sentry P0 + Better Stack P1 | status.ezstart.xyz P1 | DB + externals P0 | 99.9% P1   |

## 12. Implementation pattern recommandé (post-Sentry-incident)

### Option A — Sentry SaaS sans OTEL (recommandée)

```ts
// packages/api-core/src/observability/sentry-init.ts (à créer)
import * as Sentry from '@sentry/node-core'

export function initSentry(serviceName: string) {
  if (!process.env.SENTRY_DSN) return
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.DEPLOY_ENV ?? 'development',
    serverName: serviceName,
    tracesSampleRate: 0.1,
    integrations: [], // ❗ ZERO auto-integrations (no Express, no HTTP)
  })
}
```

Capture manuelle dans le error handler middleware d'api-core.

### Option B — Better Stack / Logtail (alternative)

Logger Pino transport vers Logtail HTTP endpoint. Querying & alerting via Better Stack UI. Pas d'instrumentation = zero risk de collision OTEL.

## 13. Checklist par app avant launch

- [ ] Error tracker actif et testé (forcer un throw, vérifier capture)
- [ ] Logs centralisés et searchables
- [ ] /health + /health/deep répondent correctement
- [ ] External uptime monitor configuré
- [ ] Alerting Slack/email actif sur P0 incidents
- [ ] Status page publique up
- [ ] Web Vitals tracked (au moins sur landing + dashboard)
- [ ] Audit logs DB sur actions sensibles

## Related

- `standard-saas.md` — checklist apps SaaS générale
- `standard-saas-security.md` — audit logs, log security
- `standard-saas-perf.md` — Web Vitals
- `mongodb.md` — connectToMongo
