# EZPay — Roadmap & Gap Analysis

**Last updated** : 2026-04-27
**Current status** : Production-ready SDK marketplace/billing wrapper, ~85% feature-complete for scope (vs DIY pattern). ezpay Web 8/8, ezpay API 8/8, `@ezstart/pay-sdk` 10/10 npm publish-ready.

---

## 🎯 Vision

EZPay = open-source pre-wired SDK + admin dashboard built **above Stripe Connect**, for developers who want to integrate marketplace + subscriptions + donations + purchases in **5 minutes** instead of **5 days** of direct Stripe code.

**Positioning** : drop-in marketplace SDK. Not a payment processor, not a Merchant of Record, not a billing platform competitor. ezpay sits **above** Stripe and lets devs ship a full marketplace with React components, multi-tenant scoping, and a federated admin dashboard — without writing a single Stripe webhook handler.

**Concretely** : `npm install @ezstart/pay-sdk` → `<SubscribeButton planId="..." />` → done. Stripe still cashes the money, ezpay just makes the integration trivial and consistent across all your apps.

ezpay ships in **3 distinct deployment modes** (cf. section "The 3 ezpay modes" below) :

1. **Mode 1 — Dogfood** (privilège owner) : platform-owned apps use the platform's own Stripe account, zero fees
2. **Mode 2 — Standalone Cloud** (`ezpay.ezstart.xyz`) : dev signups onboard Stripe Connect onto MY platform, I take fees
3. **Mode 3 — Self-host** (open-source) : dev runs ezpay on their own infra, becomes their OWN platform, takes their own fees

This 3-mode model is the **same pattern as Vercel, Supabase, PostHog, Cal.com** : open-source for credibility + buzz, cloud-hosted for revenue, self-host as legitimate option for compliance/control.

---

## 🧩 The 3 ezpay modes

ezpay supports **three distinct deployment modes**, each with a clear audience, billing model, and Stripe configuration. Understanding which mode a user falls into is critical for support, pricing, and product positioning.

### Mode 1 — Dogfood (privilège platform owner)

```
Application.isPlatformOwned=true
└─ Stripe = compte direct du platform owner (pas Connect)
   └─ Encaissement 100%, 0 fees
      Use case : apps internes du platform owner (ezauth Pro, ezbill Pro, etc.)
      Audience : MOI (platform owner) uniquement — pas exposé publiquement
```

- **Use case** : apps internes propriétaires du platform owner (ezauth Pro, ezbill Pro, green-pulse Pro, etc.)
- **Stripe setup** : compte Stripe direct du platform owner, pas de Connect
- **Money flow** : 100% au platform owner, zero ezpay fees (c'est ses propres apps)
- **Audience** : platform owner uniquement, pas exposé publiquement
- **Visible où** : docs internes monorepo seulement (jamais sur la landing publique)

### Mode 2 — Standalone Cloud "Connect on YOUR platform"

```
Dev signup sur ezpay.ezstart.xyz (cloud-hosted par moi)
└─ Onboard Stripe Connect Express vers MON compte platform
   └─ Je prends fees (selon tier, 1.5% à 5%)
      Dev encaisse 95-98.5%
      Audience : indies, startups, devs qui veulent zero infra + zero compliance
```

- **Use case** : dev tiers qui veut une marketplace/billing prêt-à-l'emploi sans gérer d'infra
- **Stripe setup** : Stripe Connect Express, MON compte = platform, dev = connected account
- **Money flow** : dev encaisse 95-98.5% selon tier, je prends 1.5%-5% en application fees
- **Audience principale** : indie hackers, startups, MVP builders, devs qui veulent du time-to-market
- **Hosted at** : `ezpay.ezstart.xyz` (paid SaaS par moi)
- **C'est le revenue model principal**

### Mode 3 — Self-host "Become YOUR own platform"

```
Dev self-host ezpay backend (Docker / Railway / VPS)
└─ Configure SON propre Stripe Connect (devient SA propre platform)
   └─ Onboard SES propres merchants Connect
      LUI prend SES propres fees
      Moi : 0 dépendance, 0 revenue (mais marketing gratuit + crédibilité)
      Audience : marketplace builders sérieux, compliance in-house, gros volume
```

- **Use case** : dev ou société qui veut être SA propre payment platform (pas dépendre de la mienne)
- **Stripe setup** : son propre compte Stripe Connect, sa propre API, sa propre infra
- **Money flow** : 100% chez lui, ezpay n'intervient pas dans le money flow
- **Audience principale** : marketplace builders avec gros volume, compliance team in-house, devs allergiques au vendor lock-in
- **Hosted où** : sur SON infra (Docker, Railway, VPS, K8s)
- **Revenue pour moi** : zero direct, mais énorme marketing gratuit (talks de conf, tutos, GitHub stars, articles "how I built my marketplace with ezpay")

### Récap tableau

| Mode              | Hosted where        | Stripe account                | Application fees to me | Audience principale                   | Revenue model                                        |
| ----------------- | ------------------- | ----------------------------- | ---------------------- | ------------------------------------- | ---------------------------------------------------- |
| **1 — Dogfood**   | Mon infra (privé)   | Mon compte Stripe direct      | N/A (mes propres apps) | Moi uniquement                        | Aucun (mes propres apps)                             |
| **2 — Cloud**     | `ezpay.ezstart.xyz` | Mon Stripe Connect (platform) | 1.5%-5% selon tier     | Indies, startups, MVP                 | Subscriptions ($0/$19/$99/custom) + transaction fees |
| **3 — Self-host** | Infra du dev        | SON propre Stripe Connect     | 0%                     | Marketplace pros, compliance in-house | Indirect (marketing, crédibilité, contributors)      |

---

## 💰 Pricing model proposal

Tarification du **Mode 2 — Cloud**. Mode 1 (dogfood) et Mode 3 (self-host) sont gratuits par construction.

| Tier                   | Pour qui                           | Prix mensuel | Transaction fees     | Inclus                                                             |
| ---------------------- | ---------------------------------- | ------------ | -------------------- | ------------------------------------------------------------------ |
| **Free**               | Hobby, MVP, < 100 tx/mois          | $0           | 5%                   | Marketplace SDK, dashboards, 1 app, support communautaire (GitHub) |
| **Pro**                | Startup, < 10k tx/mois             | $19/mo       | 2.5%                 | + multi-app, analytics, email support, custom domain               |
| **Business**           | SaaS scale, < 100k tx/mois         | $99/mo       | 1.5%                 | + SLA 99.9%, priority support, white-label dashboard, audit logs   |
| **Enterprise**         | Marketplace volume, > 100k tx/mois | $custom      | 0.5%-1%              | + dedicated infra, SLA 99.99%, contracted support, on-prem option  |
| **Self-host (Mode 3)** | DIY, devops OK                     | $0           | 0% to platform owner | Tout l'open-source, infra et fees gérés par le dev lui-même        |

### Justification de la grille

- **Free tier généreux** (5% fees, no monthly) : crucial pour driver l'adoption et permettre aux indies de shipper sans CB → conversion vers Pro quand ça marche
- **Pro à $19/mo** : sweet spot pour startup qui fait $1k-10k MRR (les fees passent de 5% à 2.5%, ça paye le tier dès $760 de tx/mois)
- **Business à $99/mo** : pour SaaS qui font $10k+ MRR, fees à 1.5% (compétitif vs Stripe Billing direct)
- **Enterprise** : custom (contrats, dedicated infra, compliance specifics)
- **Self-host gratuit** : c'est l'OSS, pas négociable — le revenue model n'est pas le code, c'est le hosted

### Comparaison concurrents (transaction fees du tier Pro à titre indicatif)

| Service               | Tier équivalent Pro | Monthly                                           | Transaction fee |
| --------------------- | ------------------- | ------------------------------------------------- | --------------- |
| **ezpay Pro**         | $19/mo              | 2.5% (above Stripe direct fees)                   |
| Outseta               | $39/mo (Starter)    | 0% (Stripe fees only)                             |
| Lemon Squeezy         | $0/mo               | 5% + $0.50/tx (MoR, includes tax)                 |
| Paddle                | $0/mo               | 5% + $0.50/tx (MoR, includes tax)                 |
| Stripe Billing direct | $0/mo               | 0.5% on recurring (mais devs galèrent à intégrer) |

**Positioning** : ezpay = "DX premium pour devs qui veulent shipper en 5min", PAS un MoR — donc fees plus bas que Lemon/Paddle mais on ajoute un layer DX/multi-tenant que Stripe direct n'a pas.

---

## 🌐 Why 3 modes (not 2) — industry pattern

Le modèle 3-modes (Open-source self-host + Cloud paid + Dogfood owner) est **le pattern dominant des SaaS dev-tools modernes**. Pas une invention ezpay.

### Exemples du pattern

| Service            | Open-source self-host                  | Cloud paid                              | Dogfood/owner                     |
| ------------------ | -------------------------------------- | --------------------------------------- | --------------------------------- |
| **Vercel**         | Next.js OSS (deploy anywhere)          | Vercel cloud (paid tiers)               | Vercel uses Vercel for vercel.com |
| **Supabase**       | `supabase/supabase` (Docker self-host) | supabase.com (Free/Pro/Team/Enterprise) | Supabase team uses Supabase cloud |
| **PostHog**        | `posthog/posthog` (self-host)          | PostHog cloud (Free + usage-based)      | PostHog uses PostHog cloud        |
| **Cal.com**        | `calcom/cal.com` (self-host)           | cal.com paid tiers                      | Cal team uses cal.com cloud       |
| **n8n**            | `n8n-io/n8n` (self-host)               | n8n cloud (Starter/Pro)                 | n8n team uses cloud               |
| **Plausible**      | `plausible/analytics` (self-host)      | plausible.io paid tiers                 | Plausible uses plausible.io       |
| **ezpay (target)** | `ezstart/ezpay` (self-host Mode 3)     | ezpay.ezstart.xyz (Mode 2 paid)         | Platform owner apps (Mode 1)      |

### Pourquoi ça fonctionne (et pourquoi ne PAS choisir 2 modes seulement)

- **Open-source code (Mode 3 self-host) = crédibilité + buzz GitHub** — sans ça, les devs sérieux ne te prennent pas au sérieux. C'est le "trust signal" #1 pour un SaaS dev-tools.
- **Cloud-hosted (Mode 2) = paid tiers** — c'est LA source de revenue récurrent. La grosse majorité des devs (95%+) prennent le cloud parce qu'ils veulent shipper, pas devops.
- **99% des devs prennent cloud (DX), 1% self-host (compliance/full control)** — la statistique est implacable, vérifiée chez tous les acteurs ci-dessus
- **Self-host users = marketing gratuit** — talks de conf ("how we built X with ezpay"), tutos YouTube, blog posts, exemples GitHub. Ils sont l'oxygène marketing.
- **Sans Mode 3 (self-host) = "encore un SaaS proprio"** → pas de buzz, pas de devs OSS contributors, pas de credibilité long-terme
- **Sans Mode 2 (cloud) = pas de revenue récurrent** → projet OSS sans business model viable
- **Sans Mode 1 (dogfood) = "ils n'utilisent pas leur propre produit"** → red flag énorme pour les acheteurs B2B

### Conclusion

**3 modes = stratégie complète et battle-tested.** 2 modes (cloud + dogfood, sans self-host) = on coupe le canal "credibilité OSS" et on perd les devs sérieux. 2 modes (cloud + self-host, sans dogfood) = on perd le proof-by-usage. Garder les 3 est non-négociable pour une stratégie SaaS dev-tools moderne.

---

## 🎯 Strategic recommendation

Approche commerciale + marketing recommandée pour la suite :

### Marketing principal — Mode 2 (Cloud, paid)

- **Landing publique** (`ezpay.ezstart.xyz`) push fortement le cloud signup
- **CTA principal** : "Start free, no credit card" → onboard Stripe Connect Express en 5min
- **Pricing page** met en avant les tiers Free/Pro/Business avec comparison vs concurrents
- **Cible** : 95% des visiteurs convertissent ici, c'est le revenue récurrent

### Mention Mode 3 (Self-host) comme option légitime

- **Section "Self-host"** sur la landing avec lien vers le repo GitHub + Docker compose
- **Docs `/docs/self-host`** avec guide complet (Docker, Railway, K8s)
- **Positionnement** : "open-source, self-hostable for marketplace builders who need full control"
- **Cible** : 1-5% des visiteurs, mais énorme marketing indirect (GitHub stars, talks, contributors)
- **Pas de FUD** : ne JAMAIS suggérer que self-host est "moins bien" — c'est une option légitime, pas un downgrade

### Mode 1 (Dogfood) — privilège owner, mentionné dans docs internes

- **JAMAIS sur la landing publique** (ça brouille le messaging et crée jalousie)
- **Mentionné uniquement** dans `apps/ezpay/README.md` + `BACKLOG.md` interne
- **Justification publique** (si demandée) : "internal apps owned by the platform — same SDK, just no application fees because we own both sides"

### Cloud value proposition — pourquoi le dev choisit Mode 2 vs Mode 3

C'est **LE** message clé sur la landing. Pourquoi un dev paie pour le cloud alors que le code est OSS ?

| Cloud (Mode 2)                                    | Self-host (Mode 3)                         |
| ------------------------------------------------- | ------------------------------------------ |
| ✅ Auto-updates (security patches, features)      | ❌ Tu maintiens, tu patches                |
| ✅ Monitoring + alerting inclus                   | ❌ Tu setup ton stack monitoring           |
| ✅ SLA contractuel (99.9% Pro, 99.99% Enterprise) | ❌ Ton uptime, ton problème                |
| ✅ Support email/Slack                            | ❌ GitHub issues + communauté              |
| ✅ Compliance (SOC2, GDPR, PCI scope minimal)     | ❌ Tu gères ta propre compliance           |
| ✅ Auto-scaling infra                             | ❌ Tu scales ton K8s                       |
| ✅ Backups managés                                | ❌ Tu setup tes backups                    |
| ✅ 5min setup, zero devops                        | ❌ Setup Docker + DB + Stripe + monitoring |
| 💰 $19-99/mo + fees                               | 💰 $0 mais coût infra + dev time           |

**Take-away** : le cloud paid est rentable pour 95% des devs parce que **leur temps vaut plus que $19-99/mo**. Self-host devient rentable seulement pour les gros volumes (>$10k/mo MRR avec compliance team in-house).

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
- **3-mode key system** based on deployment + Application ownership (cf. dedicated section below) :
  - **Mode 1 — Dogfood** (`Application.isPlatformOwned=true`) : zero fees, money flows direct to platform Stripe owner
  - **Mode 2 — Standalone Cloud** : Stripe Connect Express onto MY platform → application fees flow back to platform owner (me)
  - **Mode 3 — Self-host** : dev runs ezpay on own infra, configures own Stripe Connect → becomes their own platform, takes own fees
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
2. ✅ **Self-hostable for marketplace builders (Mode 3)** — KILLER FEATURE : devs deviennent leur PROPRE platform Stripe Connect, prennent leurs PROPRES fees, zéro dépendance à ezpay cloud. Pattern Vercel/Supabase/PostHog. Unique vs tous les concurrents Stripe wrapper closed-source.
3. ✅ **3-mode deployment model** (Dogfood / Cloud / Self-host) — couvre tous les use cases de l'indie au marketplace builder enterprise. Cf. section "The 3 ezpay modes".
4. ✅ **Multi-tenant native** (per-Application scoping — unique vs Outseta/Reflow single-tenant)
5. ✅ **Marketplace pattern via Stripe Connect** (per-app Express onboarding — unique vs SDK wrappers single-account)
6. ✅ **Federated admin** (`<PayAdminDashboard>` cross-origin embed in ezstart hub — unique pattern)
7. ✅ **3-layer SDK** (`core/react/components` modulaire — choisir son niveau d'intégration)
8. ✅ **Dynamic plans CRUD** (dashboard, pas hardcoded — vs Wasp hardcode)
9. ✅ **Intégration auth-sdk native** (SSO avec ezauth pour user identity sans config)
10. ✅ **Drop-in marketplace SDK** (5min vs 5j DIY — la value-prop principale)
11. ✅ **Provider abstraction** (`IPaymentProvider` interface — non Stripe-locked à long terme)

---

## 🎯 Stratégie marketing par phase

Marketing différencié pour **Mode 2 (Cloud paid)** vs **Mode 3 (Self-host OSS)** — chaque mode parle à une audience distincte avec un message ciblé.

### Mode 2 — Cloud (`ezpay.ezstart.xyz`) — message principal, drive revenue

| Phase            | Marketing positioning                                                      | Cible                                     |
| ---------------- | -------------------------------------------------------------------------- | ----------------------------------------- |
| **Today**        | "Stripe marketplace + subscriptions ready in 5min, $0 to start"            | Indies, MVP builders, startup early-stage |
| **Post-Phase 4** | "Marketplace + analytics + license keys — paid cloud, $19/mo Pro tier"     | Digital goods sellers, SaaS marketplaces  |
| **Post-Phase 5** | "Multi-provider cloud billing (Stripe + PayPal) — never locked in"         | Devs voulant éviter Stripe lock-in        |
| **Post-Phase 6** | "Production-grade marketplace cloud with full self-service (pause/refund)" | Mid-market SaaS, marketplace pros         |

### Mode 3 — Self-host (GitHub OSS) — message secondaire, drive credibility

| Phase            | Marketing positioning                                                            | Cible                                          |
| ---------------- | -------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Today**        | "Open-source MIT, self-hostable Stripe Connect SDK with React drop-ins"          | OSS devs, GitHub crowd, "Show HN" audience     |
| **Post-Phase 4** | "Self-host your own marketplace platform — full control, your fees, your Stripe" | Marketplace builders sérieux, compliance teams |
| **Post-Phase 5** | "Self-hostable multi-provider billing — Docker compose up, you're a platform"    | DevOps-savvy founders, agencies                |
| **Post-Phase 6** | "Production-ready self-hosted marketplace — used by [N] companies in production" | Enterprise builders, regulated industries      |

### Mode 1 — Dogfood — pas de marketing public

Mentionné uniquement dans docs internes (`apps/ezpay/README.md`). Mention publique éventuelle : "we use ezpay ourselves for our own apps" (proof-by-usage trust signal).

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
