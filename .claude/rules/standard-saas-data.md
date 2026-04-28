# Standard SaaS Data — Database, migrations, API versioning, reliability

Source de vérité data layer pour toute app SaaS @ezstart. Aligné sur Stripe API versioning + Atlas best practices. Complémentaire à `mongodb.md` (factory pattern) et `data-protection.md` (production safety).

## Légende des priorités

- **🔴 P0 / MVP** — bloquant pour launch (data loss risk, breaking changes)
- **🟠 P1 / V1** — nécessaire dans les 3 mois (versioning, soft delete, restore drill)
- **🟡 P2 / V2** — devient "vraiment pro" (read replicas, point-in-time recovery)
- **🟢 P3 / V3+** — excellence (multi-region, sharding)
- **⚡ QW** — Quick Win, < 1 jour

---

## 1. Database migrations

- [ ] 🔴 P0 : Migrations versionnées + reversible — JAMAIS d'écriture ad-hoc à `db.collection.update()` en prod (1-2 jours setup migrate-mongoose ou équivalent)
- [ ] 🔴 P0 : Migration script idempotent (re-run ne casse pas) — pattern `if (alreadyApplied) return`
- [ ] 🔴 P0 : Migrations testées en staging avant prod
- [ ] 🟠 P1 : Migration log persistant (collection `migrations` avec `{ name, appliedAt, hash }`)
- [ ] 🟠 P1 : Down-migration définie pour rollback (`up()` + `down()`)
- [ ] 🟡 P2 : Migration runner CLI (`pnpm --filter api-<app> db:migrate`) (1 jour)
- [ ] 🟡 P2 : Pre-deploy hook qui vérifie qu'aucune migration pending sur staging avant deploy prod (1 jour CI)

## 2. API versioning

- [ ] 🟠 P1 : Toutes les routes prefixées `/api/v1/` — pas de bare `/api/users` (1 jour refactor + redirect alias)
- [ ] 🟠 P1 : Deprecation policy 90 jours documentée — `Sunset:` header + warning logs (4h policy doc)
- [ ] 🟠 P1 : Changelog public des breaking changes API (1 jour init)
- [ ] 🟡 P2 : `Stripe-Version`-style header — client envoie `Ezstart-API-Version: 2026-04-01`, backend route vers la version (1 semaine)
- [ ] 🟡 P2 : Auto-generated migration guide via OpenAPI diff (3 jours)

## 3. Pagination, filtering, sorting

- [ ] 🔴 P0 : Pagination obligatoire sur TOUS les list endpoints — `?limit=50&cursor=...` ou `?page=1&pageSize=50` (déjà checklist data-protection)
- [ ] 🔴 P0 : Default limit 50, max 100 (configurable in api-core)
- [ ] 🟠 P1 : Filtering standardisé — `?filter[status]=active&filter[createdAt][$gte]=...` (Stripe pattern) (3 jours)
- [ ] 🟠 P1 : Sort standardisé — `?sort=-createdAt,name` (3 jours)
- [ ] 🟡 P2 : Cursor-based pagination (vs offset) pour les grosses tables (1 jour par endpoint)

## 4. Test mode / live mode separation (Stripe-pattern)

Mandatory pour tout SaaS qui manipule de la donnée user (auth-sdk, pay-sdk, futures). Pattern Stripe : test data + live data totalement isolés, pas de leak possible.

- [ ] 🔴 P0 : **Live data + test data totalement isolés** — soit DB collections séparées (`donations` vs `donations_test`), soit flag `isTestMode: boolean` filtré sur CHAQUE query (jamais oublier le filtre)
- [ ] 🔴 P0 : Test keys (`ez_pk_test_*`, `ez_sk_test_*`) ne peuvent QUE accéder test data — middleware `requireTestMode` ou filter automatique en base de la key utilisée
- [ ] 🔴 P0 : Live keys (`ez_pk_live_*`, `ez_sk_live_*`) ne voient PAS les test data — query DOIT filtrer `{ isTestMode: false }` par défaut quand auth via live key
- [ ] 🔴 P0 : Application a un flag `mode: 'test' | 'live'` (le mode est porté par la KEY utilisée, pas par l'Application elle-même — une même Application a 2 sets de keys + 2 sets de data)
- [ ] 🔴 P0 : Stripe test mode keys utilisées (`STRIPE_TEST_SECRET_KEY`) si la requête vient avec une test key — pay-sdk pattern obligatoire
- [ ] 🔴 P0 : Webhook events test → endpoint séparé OU header différenciant (`Stripe-Signature-Test:`) → handler dispatch vers test data store
- [ ] 🟠 P1 : Dashboard a un toggle "Live / Test" qui filtre TOUT (transactions, users, applications, audit logs) — visible badge "TEST MODE" en banner
- [ ] 🟠 P1 : Toggle persistant via cookie `ezstart_mode=test|live` côté dashboard (1 jour)
- [ ] 🟠 P1 : Test data flushable par admin (`POST /api/admin/test-data/flush`) — protégé NODE_ENV check + audit log (1 jour)
- [ ] 🟠 P1 : Test mode quotas illimitées vs live mode quotas billing (1 jour)
- [ ] 🟡 P2 : Test mode usage NON facturé (compteur séparé)
- [ ] 🟡 P2 : Test mode visible dans tous les emails system (`Subject: [TEST] You received a payment`)

```ts
// ✅ BON — middleware automatic mode filter
async function requireMode(req, res, next) {
  const apiKey = await getApiKeyFromRequest(req)
  req.mode = apiKey.env // 'test' | 'live' dérivé du prefix ez_pk_(test|live)_
  next()
}

// Query auto-scopée par le mode
const donations = await DonationModel.find({
  applicationId: req.applicationId,
  isTestMode: req.mode === 'test',
})

// ❌ INTERDIT — query oublie le filter mode → live key voit test data
const donations = await DonationModel.find({ applicationId: req.applicationId })
```

### 4.1 Anti-patterns INTERDITS — Test mode

- ❌ Une seule collection partagée sans flag `isTestMode` — leak garanti
- ❌ Le mode porté par l'Application (et non par la key) — un consumer ne peut pas tester sans casser sa prod
- ❌ Live key qui peut écrire dans test data (ou inverse) — pollue les datasets
- ❌ Webhook unique qui mix test + live events sans dispatch → race conditions billing
- ❌ Pas de banner visible "TEST MODE" dans le dashboard → user lose track et croit que c'est de la live data

## 5. Soft delete / hard delete

- [ ] 🟠 P1 : Soft delete par défaut sur les modèles user-facing (User, Application, Plan) — `deletedAt: Date | null` + scope `{ deletedAt: null }` par défaut (3 jours)
- [ ] 🟠 P1 : Hard delete possible mais explicite (admin action audit-loggée)
- [ ] 🟠 P1 : Hard delete de User déclenche cascade (déjà OK auth-sdk via account-deletion-form)
- [ ] 🟡 P2 : Restore from soft delete UI dans admin (1-2 jours)
- [ ] 🟡 P2 : Auto hard-delete soft-deleted > 90 days (job cron) (1 jour)

## 6. Backups

- [ ] 🔴 P0 : Backups automatiques quotidiens (M2+ Atlas mandatory pour prod, M0 = pas de backup) — déjà checklist data-protection
- [ ] 🔴 P0 : Backups testés (restore drill mensuel sur staging) — sinon backup non-prouvé = pas de backup (4h drill récurrent)
- [ ] 🟠 P1 : Point-in-time recovery (Atlas M10+ ou snapshot continuous) (paiement plan upgrade)
- [ ] 🟠 P1 : Off-site backup hebdomadaire (snapshot dump → S3/B2) si Atlas indisponible (3 jours setup)
- [ ] 🟡 P2 : Backup encryption (KMS) (1 jour)
- [ ] 🟡 P2 : RTO (Recovery Time Objective) défini < 4h, RPO (Recovery Point Objective) < 1h (doc + test)

## 7. Schema design

- [ ] 🔴 P0 : Indexes sur tous les champs de query fréquente (déjà checklist standard-saas-perf)
- [ ] 🔴 P0 : `bufferCommands: false` dans schemas (déjà mongodb.md)
- [ ] 🟠 P1 : Schema versioning (champ `schemaVersion: number` sur les docs longue durée — User, Application) (1 jour)
- [ ] 🟠 P1 : Required fields explicites + validators Zod côté API (déjà OK)
- [ ] 🟡 P2 : Documenté `<app>/api/src/models/INDEXES.md` listant tous les indexes + raison

## 8. Multi-tenancy isolation

- [ ] 🔴 P0 : Tenant scoping (déjà security checklist) — chaque query filtre par `applicationId`
- [ ] 🟠 P1 : Tenant data export — un Application peut exporter toutes ses data (compliance) (3 jours)
- [ ] 🟡 P2 : Tenant deletion cascade (3 jours)
- [ ] 🟡 P2 : Per-tenant quotas (max users, max API calls) (3-5 jours)
- [ ] 🟢 P3 : Per-tenant DB sharding si > 1M users (1 mois)

## 9. Replication / scaling

- [ ] 🟡 P2 : Read replicas pour analytics queries (Atlas M10+ supporte) (1 jour config)
- [ ] 🟡 P2 : Connection pooling tuning (`maxPoolSize`, `socketTimeoutMS`)
- [ ] 🟢 P3 : Multi-region replication (Atlas Global Cluster) si > 100K users distribués (3 jours)

## 10. Data integrity

- [ ] 🟠 P1 : Transactions pour les writes multi-doc (Mongoose `session.startTransaction()`) — ex: créer User + sa première Application (1 jour audit + fix)
- [ ] 🟠 P1 : Optimistic locking via `version` field sur les docs concurrents (Stripe Subscription pattern) (3 jours)
- [ ] 🟡 P2 : Eventual consistency assumptions documentées (1 jour doc)

## 11. Idempotency (cross-référence security)

- [ ] 🔴 P0 : Idempotency keys sur write endpoints — header `Idempotency-Key: <uuid>` (3 jours pattern api-core middleware)
- [ ] 🔴 P0 : Idempotency cache TTL 24h (Redis OU Mongo collection avec TTL index)

## 12. Audit grep commands

```bash
# Migrations directory
ls apps/<app>/api/src/migrations/ 2>/dev/null

# List endpoints sans pagination (heuristique)
grep -rnE "router\.get\([^,]+, async \(req, res\)" apps/<app>/api/src/routes/ | grep -v "limit\|cursor\|page"

# bufferCommands true (interdit)
grep -rn "bufferCommands: true" apps/ packages/

# Hard deletes sans NODE_ENV check
grep -rnE "\.deleteMany\(\{" apps/ packages/ --include="*.ts" | grep -v "NODE_ENV.*test\|test\|stories\|backup"

# Indexes documentés
ls apps/<app>/api/src/models/INDEXES.md 2>/dev/null
```

## 13. Comparaison modèles pro

| Service            | API versioning                | Backups              | Soft delete | Test mode        |
| ------------------ | ----------------------------- | -------------------- | ----------- | ---------------- |
| **Stripe**         | Date-based versions           | Continuous + PIT     | Yes (cust)  | Strict isolation |
| **Linear**         | GraphQL versionless           | Snapshots quotidiens | Yes         | N/A              |
| **Clerk**          | API key versioning            | Atlas auto           | Yes         | dev/prod keys    |
| **Atlassian**      | URL versioned `/wiki/api/v2/` | Continuous           | Yes         | Sandbox env      |
| **@ezstart cible** | URL `/api/v1/` (P1)           | M2+ Atlas (P0)       | Yes (P1)    | mode flag (P0)   |

## 14. Checklist par app avant launch

- [ ] Migrations runner installé + premier migration créée
- [ ] Backups Atlas activés (M2+ minimum)
- [ ] Restore drill réussi sur staging
- [ ] All endpoints paginated
- [ ] All routes under `/api/v1/`
- [ ] Indexes documentés
- [ ] Idempotency keys actifs sur les writes critiques
- [ ] Tenant isolation testée (cross-tenant access denied)

## Related

- `mongodb.md` — connectToMongo + factory pattern
- `data-protection.md` — production safety
- `standard-saas-security.md` — webhook idempotency, audit logs
- `standard-saas-perf.md` — indexes, slow query log
