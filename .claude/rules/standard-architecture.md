# Standard architecture — 3-tier platform model

Source de vérité pour le placement de toute feature dans le monorepo @ezstart. Aligné sur les patterns SaaS pro (Stripe, Clerk, Auth0, Vercel, Linear). Complémentaire à `standard-saas.md` (checklist app) et `standard-saas-keys.md` / `standard-saas-cors.md` / `standard-saas-theme.md` (policies transverses).

---

## 1. Les 3 tiers

```
┌────────────────────────────────────────────────────────────┐
│  Tier 3 — Platform hub (cross-cutting meta-features)       │
│  ezstart : ia-sdk gateway, monitoring, federated admin,    │
│  docs, status, audit logs cross-tenant                     │
└────────────────────────┬───────────────────────────────────┘
                         │ federates admin from ↓
                         │ shares platform JWT
        ┌────────────────┴──────────────────────────┐
        │ Tier 1 — Per-app SaaS services           │
        │ ezauth  (auth)          ezpay  (payments) │
        │ Clerk/Auth0 pattern     Stripe pattern    │
        │ per-Application DB scoping + publishable  │
        │ keys  (externally consumable)             │
        └───────┬──────────────────┬────────────────┘
                │ ez_pk_live_...   │
                ▼                  ▼
        ┌────────────────────────────────────────────┐
        │ Tier 2 — Consumer apps                     │
        │ ezbill, green-pulse, fengshui, asc-tcd,    │
        │ gacha-analyzer, ezstart (dogfood itself    │
        │ as a consumer), + third-party external     │
        │ customers                                  │
        └────────────────────────────────────────────┘
```

### Tier 1 — SaaS services

**Apps** : `ezauth` (api 6110 / web 6111), `ezpay` (api 6130 / web 6131)

**Ce qui doit y vivre** :

- Fonctionnalités per-Application (scoping DB via `applicationId`)
- Publishable keys, SDK public, webhooks, docs d'intégration
- Dashboard par-owner (gestion de son Application, ses plans, ses clés, son theme)

**Ce qui ne DOIT PAS y vivre** :

- Features cross-tenant (analytics globales, status page platform) → Tier 3
- Business logic d'un consumer spécifique (invoice templates d'ezbill) → Tier 2

**Critère de succès** : un dev tiers externe DOIT pouvoir signup, créer son Application, consommer via SDK, et avoir la MÊME UX que les apps internes — avec zéro connaissance du monorepo.

### Tier 2 — Consumer apps

**Apps** : tous les sites/produits qui consomment ezauth + ezpay — interne (ezbill, green-pulse, fengshui, asc-tcd, gacha-analyzer, ezstart en tant que consumer) ou externe (clients tiers).

**Pattern** :

- Utilise `@ezstart/auth-sdk` + `@ezstart/pay-sdk` via publishable key (`NEXT_PUBLIC_EZAUTH_KEY`)
- Zéro coupling aux SaaS services beyond le public SDK surface
- Peut avoir sa propre DB, son propre API, ses propres specifics business logic

**Dogfood** : les consumer apps internes (propriétaires via `Application.isPlatformOwned=true`) bypass billing/fees mais suivent le même flow de consommation → preuve que le SaaS est production-grade.

### Tier 3 — Platform hub

**App** : `ezstart` (api 6100 / web 6101)

**Ce qui doit y vivre** — tout ce qui est **cross-cutting**, ne scale pas avec le nombre de consumers, ou dépasse le scope per-Application :

| Feature                                                                                                      | Pourquoi ici (pas en Tier 1)                                                                       |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `@ezstart/ai-sdk` gateway multi-provider (Anthropic, Gemini, OpenAI)                                         | Pas per-Application — platform-billed. Les consumers consomment via une façade hostée par ezstart. |
| Monitoring / status page / health aggregation                                                                | Cross-tenant par nature.                                                                           |
| Federated admin dashboard (`<AuthAdminDashboard>` + `<PayAdminDashboard>` + `<MonitoringDashboard>` en tabs) | Aggrège les 3 SaaS via SDK components + JWT superadmin partagé. Ne peut vivre nulle part ailleurs. |
| Documentation portal (quickstart, guides, API refs)                                                          | Meta, non-tenant.                                                                                  |
| Public status page                                                                                           | Cross-tenant.                                                                                      |
| Platform-wide audit logs (actions superadmin, cross-app events)                                              | Cross-tenant.                                                                                      |
| User portfolio landing (la hero "Franck Dufournet")                                                          | Business owner identity — pas per-Application.                                                     |

**Ce qui ne DOIT PAS y vivre** :

- Business logic per-Application → Tier 1
- Features d'un consumer spécifique → Tier 2
- Composants UI génériques → `packages/ui`
- SDKs publishable → `packages/<sdk>`

---

## 2. Decision tree — où placer une nouvelle feature ?

```
Nouvelle feature X
│
├─ Scope : une record par tenant-app (applicationId) ?
│   └─ OUI → Tier 1 (choose service based on domain)
│       ├─ Identity/session/users   → ezauth
│       ├─ Money/billing/plans      → ezpay
│       └─ Other per-app domain     → new Tier-1 service (rarely needed)
│
├─ Scope : logique métier spécifique à UN consumer app ?
│   └─ OUI → Tier 2 (dans le repo dir du consumer)
│
├─ Scope : meta/cross-tenant/platform-wide ?
│   └─ OUI → Tier 3 (ezstart hub)
│
├─ Scope : primitive réutilisable (UI, hook, validator, SDK) ?
│   └─ OUI → packages/<nom> (jamais une app)
│
└─ Aucun des critères clair → STOP, demande clarification user avant d'implémenter
```

**Règle d'or** : si la feature scale avec le nombre de tenants (consumers) → Tier 1. Si elle est indépendante du nombre de tenants → Tier 3. Si elle ne sert qu'un consumer précis → Tier 2.

---

## 3. Mutual dependency Tier 1 (documenté pour pas casser le cycle)

- **ezauth dépend de ezpay** : les plans ezauth (Pro / Enterprise) sont créés et facturés via ezpay
- **ezpay dépend de ezauth** : les devs signin + manage leurs pay keys via ezauth

Ce cycle est **intentionnel** et documenté — chaque produit dogfoode l'autre. Ne pas tenter de "nettoyer" cette dépendance.

---

## 4. Priorités SaaS-pro (quand on audit / refactor)

Ordre d'importance pour "est-ce que c'est production-grade SaaS" :

1. **Tier 1 (ezauth + ezpay)** — 100% externally-consumable. Doit passer :
   - [`standard-saas.md`](./standard-saas.md) checklist complete (API + Web + Infra + Features + Product completeness)
   - [`standard-saas-keys.md`](./standard-saas-keys.md) naming `ez_pk_*` / `ez_sk_*`
   - [`standard-saas-cors.md`](./standard-saas-cors.md) 3-tier origin policy
   - [`standard-saas-theme.md`](./standard-saas-theme.md) primary-only white-label (section §2 de standard-saas.md §5.2)
   - Dogfood testable : une app interne DOIT pouvoir utiliser le SaaS via le SDK public, sans code monorepo-spécifique
2. **Tier 2 consumer apps** — doivent consommer Tier 1 en mode externally-as-if. Ne pas importer de packages privés/monorepo-spécifiques côté client.
3. **Tier 3 platform hub (ezstart)** — doit rester thin. Aggrège via SDK components (federated pattern), ne réimplémente pas.

---

## 5. Anti-patterns (STOP si tu tombes sur l'un)

- ❌ **Feature per-Application dans ezstart** (ex: gérer les plans d'un consumer dans ezstart → doit être en ezpay dashboard)
- ❌ **Feature cross-tenant dans ezauth** (ex: status page de TOUTES les apps dans ezauth → doit être ezstart)
- ❌ **Import monorepo-privé côté consumer app** (ex: ezbill importe `@ezstart/api-core` — interdit, c'est une dépendance de SaaS, pas de consumer)
- ❌ **Dogfood via API privée** (ex: ezstart/web appelle direct une route non-publiée de ezauth — doit passer par le SDK public comme tout le monde)
- ❌ **Logique dupliquée entre ezauth et ezstart** (ex: un endpoint "/users/me" dans les deux → signale mauvais tier placement)

---

## 6. Références externes (modèles pros pour benchmark)

- **Stripe** : `api.stripe.com` = Tier 1 payments service, `dashboard.stripe.com` = Tier 1 self-owned dashboard. Pas de Tier 3 séparé (ils sont un single-product SaaS).
- **Clerk** : `api.clerk.com` = Tier 1 auth service, `dashboard.clerk.com` = Tier 1 dashboard. Même structure.
- **Auth0** : `<tenant>.auth0.com` = Tier 1 per-tenant + management API. Leur "support portal" est un Tier 3 séparé.
- **Vercel** : `vercel.com/dashboard` = Tier 3 hub qui fédère deployments, domains, analytics, AI SDK gateway, Marketplace. Chaque intégration (Stripe Marketplace, etc.) = Tier 1 consommé via API.
- **Linear** : `linear.app` = Tier 3 hub, leur SDK (Linear API) = Tier 1 équivalent pour intégrations tierces.

Le modèle @ezstart = **Stripe + Clerk-like Tier 1 services** + **Vercel-like Tier 3 hub**. Pattern hybride, rare mais scalable.

---

## 7. Checklist avant de toucher au code

- [ ] La feature est classée dans un tier (1, 2, ou 3) via le decision tree §2
- [ ] Si Tier 1 : vérifie qu'elle respecte `standard-saas.md` + keys/cors/theme policies
- [ ] Si Tier 2 : vérifie qu'elle ne fuit aucun import monorepo-privé (grep `@ezstart/api-core`, `@ezstart/config` dans le consumer src)
- [ ] Si Tier 3 : vérifie qu'elle utilise les SDK components (`<AuthAdminDashboard>`, etc.) et NE dupplique pas de logique Tier 1
- [ ] Pas de placement ambigu : si un agent n'est pas sûr du tier, demander avant d'implémenter
