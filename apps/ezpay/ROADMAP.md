# EZPay — Roadmap & Gap Analysis

**Last updated** : 2026-04-27
**Current status** : Production-ready SDK marketplace/billing wrapper, ~85% feature-complete for scope (vs DIY pattern). ezpay Web 8/8, ezpay API 8/8, `@ezstart/pay-sdk` 10/10 npm publish-ready.

---

## 🎯 Vision

EZPay = open-source pre-wired SDK + admin dashboard built **above Stripe Connect**, for developers who want to integrate marketplace + subscriptions + donations + purchases in **5 minutes** instead of **5 days** of direct Stripe code.

**Positioning** : drop-in marketplace SDK. Not a payment processor, not a Merchant of Record, not a billing platform competitor. ezpay sits **above** Stripe and lets devs ship a full marketplace with React components, multi-tenant scoping, and a federated admin dashboard — without writing a single Stripe webhook handler.

**Concretely** : `npm install @ezstart/pay-sdk` → `<SubscribeButton planId="..." />` → done. Stripe still cashes the money, ezpay just makes the integration trivial and consistent across all your apps.

---

## 🔍 Scope clarification

Critical to align expectations: ezpay is a **wrapper SDK**, not a billing platform. Stripe is and remains the source of truth for money operations.

### ✅ What ezpay does

- **Stripe abstraction** + provider interface (`IPaymentProvider`) ready for multi-provider (PayPal, etc.)
- **Drop-in React components** : `<SubscribeButton>`, `<DonateModal>`, `<PurchaseButton>`, `<PricingPage>`, `<BillingDashboard>`, `<PayAdminDashboard>`, `<CheckoutFlow>`, etc.
- **Dynamic plans CRUD** via ezpay dashboard (no hardcoded plans in app code)
- **Multi-tenant native** (per-Application scoping via `applicationId`)
- **Per-app Stripe Connect onboarding** (marketplace pattern — each tenant gets its own Stripe Connect Express account)
- **Federated admin dashboard** (`<PayAdminDashboard>` cross-origin embeddable in ezstart hub)
- **2-mode key system** based on Application ownership :
  - **Dogfood mode** (apps internes propriétaires, `Application.isPlatformOwned=true`) : zero fees, money flows direct to platform Stripe owner
  - **Connect mode** (standalone third-party tenants) : Stripe Connect Express → application fees flow back to platform
- **API keys per app** (publishable `ez_pk_*` + secret `ez_sk_*` following SaaS standard)
- **Webhook handling** (sync subscription/payment state from Stripe → MongoDB)
- **Trial periods, promo codes** (Stripe primitives exposed via SDK)
- **Cancel/refund** from admin dashboard
- **User dashboard** (subscriptions list, billing history, cancel button)
- **Customer Portal CTA** (deep-link to Stripe Customer Portal which handles invoices, payment methods, tax history, etc.)

### ❌ What ezpay does NOT do — by design (Stripe handles this natively)

- **Native invoice CRUD UI** → Stripe Customer Portal handles invoice display, download, payment retry
- **Custom tax calculation** → Stripe Tax handles VAT, sales tax, GST automatically
- **Custom dunning logic** → Stripe Smart Retry handles failed payment recovery
- **Quote generation / Invoicing API** → Stripe Invoicing product for B2B quotes
- **Native Merchant of Record / compliance** → Stripe is the MoR (PCI DSS, SCA, regional compliance)
- **Pricing tiers (graduated, volume, tiered)** → Stripe Price object supports this natively, ezpay just exposes it
- **Custom email receipts** → Stripe sends transactional emails (configurable in Stripe dashboard)

**Why this matters** : trying to reimplement these would mean competing with Stripe instead of leveraging it. Out of scope = out of scope. The point of ezpay is to make Stripe trivial to consume, not to replace it.

---

## 📊 Gap Analysis vs real competitors

ezpay competes against **the DIY Stripe integration pattern** and other open-source SDK wrappers — NOT against Stripe Billing, Lemon Squeezy, or Paddle (those are Merchant-of-Record platforms with a completely different scope).

| Catégorie                        | Direct Stripe DIY | Outseta             | Reflow               | Wasp (billing) | ezpay (today)            |
| -------------------------------- | ----------------- | ------------------- | -------------------- | -------------- | ------------------------ |
| **Setup time (marketplace)**     | 🔴 ~5 days        | 🟡 ~1 day (no-code) | 🟡 ~1 day            | 🟡 ~1 day      | 🟢 ~5 minutes            |
| **Drop-in React components**     | ❌                | 🟡 Embed widgets    | 🟡 Limited           | 🟡 Templates   | 🟢 16+ components        |
| **React hooks layer**            | ❌                | ❌                  | ❌                   | ❌             | 🟢 16+ hooks             |
| **Dynamic plans CRUD UI**        | ❌ (hardcode)     | 🟢 Yes              | 🟢 Yes               | 🔴 Hardcode    | 🟢 Yes (admin dashboard) |
| **Multi-tenant native**          | ❌                | ❌ (single account) | ❌                   | ❌             | 🟢 per-Application       |
| **Marketplace (Stripe Connect)** | 🔴 Build yourself | ❌                  | ❌                   | ❌             | 🟢 per-app onboarding    |
| **Federated admin dashboard**    | ❌                | ❌                  | ❌                   | ❌             | 🟢 cross-origin embed    |
| **Open-source MIT**              | N/A               | ❌ (closed SaaS)    | ❌ (closed)          | 🟢 MIT         | 🟢 MIT                   |
| **Self-hostable**                | N/A               | ❌                  | ❌                   | 🟢             | 🟢                       |
| **Provider abstraction**         | ❌ (Stripe-only)  | ❌ (Stripe-only)    | 🟡 (Stripe + custom) | ❌ (Stripe)    | 🟢 (interface ready)     |
| **Webhook handler built-in**     | ❌ (you write it) | 🟢                  | 🟢                   | 🟢             | 🟢                       |
| **Donations support**            | ❌                | ❌                  | 🟢                   | ❌             | 🟢 (`<DonateModal>`)     |
| **One-time purchases**           | 🟡 Manual         | 🟡 Limited          | 🟢                   | 🟡             | 🟢 (`<PurchaseButton>`)  |
| **Trial periods**                | 🟡 Manual config  | 🟢                  | 🟢                   | 🟢             | 🟢                       |
| **Promo codes**                  | 🟡 Manual         | 🟢                  | 🟢                   | 🟡             | 🟢                       |
| **2-mode dogfood/connect**       | ❌                | ❌                  | ❌                   | ❌             | 🟢 unique                |
| **Customer Portal integration**  | 🟡 Manual         | 🟢                  | 🟡                   | 🟡             | 🟢                       |
| **Revenue analytics dashboard**  | 🔴 Stripe only    | 🟢                  | 🟢                   | ❌             | 🟡 basics, P4 target     |
| **License keys (digital goods)** | ❌                | ❌                  | 🟢                   | ❌             | 🔴 P4 target             |
| **Affiliate tracking**           | ❌                | 🟢                  | 🟡                   | ❌             | 🔴 P4 target             |
| **Multi-provider (PayPal etc.)** | 🔴 Rebuild all    | ❌                  | 🟡                   | ❌             | 🔴 P5 target             |
| **i18n / localization**          | 🔴 Build it       | 🟡                  | 🟢                   | 🔴             | 🟡 EN/FR, P7 expand      |

**Coverage summary** :

- vs Direct Stripe DIY → **ezpay wins on time-to-market** (5min vs 5j) and consistency across multi-app portfolios
- vs Outseta / Reflow → ezpay wins on **open-source + self-hostable + multi-tenant + marketplace pattern** (those are single-tenant SaaS billing tools)
- vs Wasp → ezpay wins on **dedicated SDK depth + dynamic plans + federated admin** (Wasp is a full-stack starter, not a billing-focused SDK)

**Where ezpay loses** (acceptable trade-off for scope) :

- No no-code dashboard for non-technical users (Outseta/Reflow target marketing teams)
- No native CRM (Outseta bundles billing + CRM)
- No Merchant of Record (Lemon/Paddle handle compliance — but that's not the scope)

---

## 📦 État actuel des features (inventaire ce qui existe)

### API endpoints (production)

- ✅ `POST /api/subscriptions/subscribe` — subscribe to plan (returns Stripe checkout session)
- ✅ `POST /api/subscriptions/cancel` — cancel subscription (admin or self)
- ✅ `GET /api/subscriptions` — list user subscriptions
- ✅ `POST /api/donations` — one-shot donation (Stripe checkout)
- ✅ `GET /api/payments/donations` — donations list per project
- ✅ `POST /api/purchases` — one-time purchase (digital goods, courses, etc.)
- ✅ `GET /api/purchases` — purchase history
- ✅ `GET /api/plans` — list plans for an Application (public endpoint)
- ✅ `POST /api/plans` — admin create plan
- ✅ `PATCH /api/plans/:id` — admin update plan
- ✅ `DELETE /api/plans/:id` — admin delete plan
- ✅ `POST /api/connect/onboard` — start Stripe Connect Express onboarding for an Application
- ✅ `GET /api/connect/status` — onboarding status check
- ✅ `POST /api/refunds` — admin issue refund
- ✅ `POST /api/webhooks/stripe` — Stripe webhook handler (event sync)
- ✅ `GET /api/keys/config` — public endpoint for SDK init (returns app theme + plans summary)
- ✅ `POST /api/customer-portal` — Customer Portal session deep-link

### SDK components (16+)

- ✅ `<PayProvider>` — root context provider
- ✅ `<SubscribeButton>` — drop-in subscribe CTA
- ✅ `<DonateModal>` — donation modal with amount selector
- ✅ `<PurchaseButton>` — one-time purchase CTA
- ✅ `<PricingPage>` — full pricing grid (auto-fetches plans)
- ✅ `<PricingCard>` — single plan card
- ✅ `<BillingDashboard>` — user-facing subscriptions + history + cancel
- ✅ `<PayAdminDashboard>` — federated admin (subscriptions, donations, plans, refunds tabs)
- ✅ `<CheckoutFlow>` — guided checkout
- ✅ `<ConnectOnboardingButton>` — Stripe Connect onboarding CTA
- ✅ `<CustomerPortalButton>` — Customer Portal deep-link CTA
- ✅ `<SubscriptionStatusBadge>` — status pill
- ✅ `<RefundModal>` — admin refund flow
- ✅ `<PlanFormModal>` — admin plan CRUD modal
- ✅ `<DonationsTable>` — admin donations DataTable
- ✅ `<PurchasesTable>` — admin purchases DataTable

### SDK hooks (16+)

- ✅ `usePayProvider` — context access
- ✅ `useSubscribe` / `useCancel` / `useSubscriptions`
- ✅ `useDonate` / `useDonations`
- ✅ `usePurchase` / `usePurchases`
- ✅ `usePlans` / `useCreatePlan` / `useUpdatePlan` / `useDeletePlan`
- ✅ `useConnectOnboard` / `useConnectStatus`
- ✅ `useRefund`
- ✅ `useCustomerPortal`
- ✅ `useKeysConfig` (SDK init)

### Provider abstraction

- ✅ `IPaymentProvider` interface (subscribe / charge / refund / webhook / portal)
- ✅ `StripeProvider` (production implementation)
- ✅ `ConsoleProvider` (test/dev — logs to console, no real charges)
- 🟡 `PayPalProvider` — interface ready, not implemented (P5)

---

## 🚀 Roadmap par phases

### Phase 4 — Polish Marketplace + Analytics (~2-3 semaines)

Cible : combler les manques observés sur les vrais use cases marketplace (analytics, license keys, affiliates) et étendre les wrappers Stripe existants.

| Feature                                                                               | Impact      | Effort    | Quick win | Phase |
| ------------------------------------------------------------------------------------- | ----------- | --------- | --------- | ----- |
| **Revenue analytics dashboard** (MRR, churn, top customers, cohorts) for fed. admin   | 🔴 Critical | L (1 sem) | ❌        | P4    |
| **Affiliate tracking** (referral codes, attribution, payout report)                   | 🟠 High     | L (4-5j)  | ❌        | P4    |
| **License keys management** (digital goods sale → auto-generated key, deliver, list)  | 🟠 High     | L (1 sem) | ❌        | P4    |
| **Webhook events emit to consumer apps** (`pay-sdk` re-emit hooks → consumer webhook) | 🟡 Medium   | M (3j)    | ⚠️        | P4    |
| **Stripe metered billing wrapper** (just expose existing Stripe usage records API)    | 🟡 Medium   | S (2j)    | ✅ YES    | P4    |

### Phase 5 — Multi-Provider (~3-4 semaines)

Cible : valider l'abstraction `IPaymentProvider` en ajoutant un vrai second provider (PayPal). Prouve que ezpay n'est pas Stripe-locked.

| Feature                                                                    | Impact    | Effort     | Quick win | Phase |
| -------------------------------------------------------------------------- | --------- | ---------- | --------- | ----- |
| **PayPal provider implementation** (subscribe + charge + refund + webhook) | 🟠 High   | XL (3 sem) | ❌        | P5    |
| **Provider abstraction extension** (test/console provider improvements)    | 🟡 Medium | M (3j)     | ⚠️        | P5    |
| **Documentation multi-provider switch** (config flags, fallback logic)     | 🟡 Medium | S (2j)     | ✅ YES    | P5    |

### Phase 6 — Marketplace Pro (~2-3 semaines)

Cible : self-service complet côté user (refund, pause, plan switch) + bulk operations admin.

| Feature                                                                                 | Impact    | Effort   | Quick win | Phase |
| --------------------------------------------------------------------------------------- | --------- | -------- | --------- | ----- |
| **Coupon system étendu** (% off, $ off, free trial extension, BOGO patterns)            | 🟠 High   | M (3j)   | ⚠️        | P6    |
| **Refund self-service côté user** (request flow + admin approval queue, pas just admin) | 🟠 High   | S (1j)   | ✅ YES    | P6    |
| **Subscription pause/resume** (Stripe le supporte nativement, juste expose via SDK)     | 🟠 High   | S (2j)   | ✅ YES    | P6    |
| **Plan switching avec proration preview UI** (show invoice diff before confirm)         | 🟡 Medium | M (3j)   | ⚠️        | P6    |
| **Bulk operations admin** (refund batch, suspend batch, export CSV)                     | 🟡 Medium | S (1-2j) | ✅ YES    | P6    |

### Phase 7 — DX Polish (~1-2 semaines)

Cible : polish documentation + DX pour rivaliser avec les SDK Stripe officiels en termes d'onboarding.

| Feature                                                                             | Impact    | Effort | Quick win | Phase |
| ----------------------------------------------------------------------------------- | --------- | ------ | --------- | ----- |
| **README pay-sdk étendu** (3 quickstarts : marketplace / subscriptions / donations) | 🟠 High   | M (2j) | ✅ YES    | P7    |
| **Webhook events documentation** (event catalog + consumer integration guide)       | 🟡 Medium | S (1j) | ✅ YES    | P7    |
| **Stripe Connect onboarding tutorial** (full step-by-step blog + video)             | 🟡 Medium | M (2j) | ⚠️        | P7    |
| **Localization 5+ langues checkout** (EN/FR/ES/DE/PT minimum)                       | 🟡 Medium | M (3j) | ⚠️        | P7    |
| **Error messages localizables** (texts prop pattern partout)                        | 🟢 Low    | S (1j) | ✅ YES    | P7    |
| **Sandbox/test mode toggle UI** (dashboard switch live ↔ test keys)                 | 🟢 Low    | M (2j) | ⚠️        | P7    |

---

## 📋 Top 10 actions priorisées (impact + quick wins first)

| #   | Feature                            | Impact      | Effort | Quick win | Phase |
| --- | ---------------------------------- | ----------- | ------ | --------- | ----- |
| 1   | **Revenue analytics dashboard**    | 🔴 Critical | L      | ❌        | P4    |
| 2   | **Subscription pause/resume**      | 🟠 High     | S      | ✅        | P6    |
| 3   | **Bulk operations admin**          | 🟡 Medium   | S      | ✅        | P6    |
| 4   | **Refund self-service côté user**  | 🟠 High     | S      | ✅        | P6    |
| 5   | **Stripe metered billing wrapper** | 🟡 Medium   | S      | ✅        | P4    |
| 6   | **README pay-sdk étendu (3 QS)**   | 🟠 High     | M      | ✅        | P7    |
| 7   | **License keys management**        | 🟠 High     | L      | ❌        | P4    |
| 8   | **Affiliate tracking**             | 🟠 High     | L      | ❌        | P4    |
| 9   | **PayPal provider**                | 🟠 High     | XL     | ❌        | P5    |
| 10  | **Webhook events documentation**   | 🟡 Medium   | S      | ✅        | P7    |

---

## 💎 Quick wins (high ROI, low effort) — à faire dès qu'on revient

- ✅ **Subscription pause/resume** (2j → unlock subscription mgmt feature parity with Stripe Customer Portal)
- ✅ **Bulk operations admin** (1-2j → admin productivity boost on refund/suspend campaigns)
- ✅ **Refund self-service** (1j → reduce admin support load, user empowerment)

**Total quick wins** : ~4-5 jours pour 3 features impactantes côté user/admin.

---

## 🏗️ Big rocks (high impact, big effort) — planifier sprints dédiés

- ⛏️ **Revenue analytics dashboard** (1 sem) → unlock fed. admin true value (cross-tenant MRR/churn vue platform-wide)
- ⛏️ **PayPal provider** (3 sem) → prouve provider abstraction, élargit reach hors-Stripe
- ⛏️ **License keys system** (1 sem) → unlock digital goods marketplace use case (vs Reflow)

---

## 🔄 Différenciateurs durables ezpay (à preserve dans toute évolution)

ezpay ne doit JAMAIS perdre ces avantages :

1. ✅ **Open-source MIT** (vs Stripe closed, vs Outseta/Reflow closed)
2. ✅ **Self-hostable** (déploiement sur infra du client, zero vendor lock-in)
3. ✅ **Multi-tenant native** (per-Application scoping — unique vs Outseta/Reflow single-tenant)
4. ✅ **Marketplace pattern via Stripe Connect** (per-app Express onboarding — unique vs SDK wrappers single-account)
5. ✅ **2-mode key system** (dogfood vs Connect — zero-fees pour apps internes propriétaires, fees vers platform pour tiers standalone)
6. ✅ **Federated admin** (`<PayAdminDashboard>` cross-origin embed in ezstart hub — unique pattern)
7. ✅ **3-layer SDK** (`core/react/components` modulaire — choisir son niveau d'intégration)
8. ✅ **Dynamic plans CRUD** (dashboard, pas hardcoded — vs Wasp hardcode)
9. ✅ **Intégration auth-sdk native** (SSO avec ezauth pour user identity sans config)
10. ✅ **Drop-in marketplace SDK** (5min vs 5j DIY — la value-prop principale)
11. ✅ **Provider abstraction** (`IPaymentProvider` interface — non Stripe-locked à long terme)

---

## 🎯 Stratégie marketing par phase

| Phase            | Marketing positioning                                                    | Cible                                      |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| **Today**        | "Open-source Stripe SDK wrapper, marketplace-ready in 5min"              | Indie devs, startups, Stripe Connect users |
| **Post-Phase 4** | "Marketplace + analytics + license keys — open-source SDK"               | Digital goods sellers, SaaS marketplaces   |
| **Post-Phase 5** | "Multi-provider open-source billing SDK (Stripe + PayPal)"               | Devs voulant éviter Stripe lock-in         |
| **Post-Phase 6** | "Production-ready marketplace SDK with full self-service (pause/refund)" | Mid-market SaaS, marketplace pros          |

---

## 📚 Références

- [Stripe Connect](https://stripe.com/connect) — la base sur laquelle ezpay est construit
- [Stripe Customer Portal](https://stripe.com/customer-portal) — gère invoices/payment methods (out of ezpay scope)
- [Stripe Tax](https://stripe.com/tax) — gère VAT/sales tax (out of ezpay scope)
- [Outseta](https://www.outseta.com/) — concurrent SaaS billing wrapper (closed-source)
- [Reflow](https://reflowhq.com/) — concurrent subscription SaaS toolkit (closed-source)
- [Wasp](https://wasp-lang.dev/) — full-stack starter avec billing wired (open-source)
- `packages/pay-sdk/README.md` — Documentation SDK npm consumer
- `BACKLOG.md` (root) — backlog monorepo global
- `apps/ezauth/ROADMAP.md` — roadmap sister-product (ezauth compete with Clerk, ezpay does NOT compete with Stripe Billing)

---

## 🛠️ Comment contribuer à cette roadmap

Pour ajouter/réorganiser une feature :

1. Vérifier que la feature est **dans le scope** ezpay (cf. section "Scope clarification") — si Stripe le fait nativement, c'est out-of-scope
2. Ajouter ligne dans la phase concernée avec Impact / Effort / Quick win
3. Si Quick win → considérer pour le prochain sprint
4. Mettre à jour le tableau "Top 10 actions" si l'impact change le ranking
5. Tagger les features done avec ✅ + lien commit/PR
6. **NE PAS** ajouter de feature qui réimplémenterait du Stripe natif (Tax, Invoicing, Smart Retry, etc.) — point sur Stripe à la place
