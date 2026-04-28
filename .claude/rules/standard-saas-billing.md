# Standard SaaS Billing — Pricing, plans, payments, invoicing

Source de vérité billing pour @ezstart/pay-sdk + apps qui le consomment. Aligné sur Stripe Billing best practices + EU PSD2/SCA. Complémentaire à `standard-saas-keys.md`.

## Légende des priorités

- **🔴 P0 / MVP** — bloquant pour first paying customer
- **🟠 P1 / V1** — nécessaire dans les 3 mois (dunning, proration)
- **🟡 P2 / V2** — devient "vraiment pro" (multi-currency, tax compliance)
- **🟢 P3 / V3+** — excellence (revenue recognition, analytics)
- **⚡ QW** — Quick Win, < 1 jour

---

## 1. Plans / pricing

- [ ] 🔴 P0 : Plans dynamiques depuis EZPay DB (jamais hardcodés dans `apps/<app>/web`) — pattern `<PricingPage />` du pay-sdk auto-fetch (déjà OK partiel — vérifier toutes apps)
- [ ] 🔴 P0 : Plan Free + au moins 1 paid plan défini en EZPay
- [ ] 🟠 P1 : Trial period configurable par plan (7/14/30 jours) (1 jour)
- [ ] 🟠 P1 : Grace period après trial expiré (3-7 jours avec UI banner) (1 jour)
- [ ] 🟡 P2 : Multi-currency pricing — afficher en EUR/USD/GBP selon geo (3 jours)
- [ ] 🟡 P2 : Annual vs Monthly toggle avec discount (déjà OK partiel)
- [ ] 🟡 P2 : Volume discounts / tiered pricing (5 jours)

## 2. Checkout

- [ ] 🔴 P0 : Stripe Checkout via pay-sdk `<CheckoutFlow />` ou Stripe-hosted
- [ ] 🔴 P0 : SCA (Strong Customer Authentication) compliance EU — Stripe Checkout le gère natif (vérifier que `payment_method_types: ['card']` fonctionne avec 3DS challenge)
- [ ] 🔴 P0 : Test cards documentés (4242... pour test, 4000 0027 6000 3184 pour 3DS) (1h doc)
- [ ] 🟠 P1 : Apple Pay / Google Pay enabled (config Stripe + 1h test)
- [ ] 🟡 P2 : Embedded checkout (vs redirect) si UX premium (3 jours)

## 3. Subscriptions

- [ ] 🔴 P0 : Subscription lifecycle handled — created, active, past_due, canceled, trialing (déjà OK pay-sdk)
- [ ] 🔴 P0 : Webhook handlers pour TOUS les events Stripe (`customer.subscription.*`, `invoice.*`, `payment_intent.*`) — déjà OK
- [ ] 🟠 P1 : Proration on plan change (upgrade prorated immédiat, downgrade fin de période) — Stripe le fait, vérifier UI confirme (1 jour)
- [ ] 🟠 P1 : Cancel at period end (vs immediate) — UI choice (1 jour)
- [ ] 🟠 P1 : Pause subscription feature (3 jours)
- [ ] 🟡 P2 : Subscription schedules (changement automatique de plan dans X jours) (3 jours)

## 4. Payment failures / dunning

- [ ] 🔴 P0 : Past-due banner UI quand subscription `past_due` — bloquer features premium (1 jour)
- [ ] 🟠 P1 : Dunning emails — Stripe Smart Retries activé (config dashboard) + custom emails template (3 jours)
- [ ] 🟠 P1 : Update payment method UI (Stripe Customer Portal OU custom) (1-2 jours)
- [ ] 🟠 P1 : Auto-cancel après 4 retries failed (config Stripe + handler webhook)
- [ ] 🟡 P2 : Pre-dunning (email avant card expiry, +30 days) (1 jour)

## 5. Invoices

- [ ] 🔴 P0 : Invoice générée auto par Stripe à chaque cycle
- [ ] 🟠 P1 : Invoice PDF téléchargeable depuis dashboard user — pattern `invoice-history-card` existant à généraliser (2 jours)
- [ ] 🟠 P1 : Invoice email envoyé au customer (Stripe le fait via dashboard config)
- [ ] 🟡 P2 : Custom invoice branding (logo + colors via Stripe) (1 jour config)
- [ ] 🟡 P2 : Invoice numbering custom (vs Stripe default `INV-XXXX`) (3 jours)
- [ ] 🟡 P2 : Pro forma / draft invoices (1 jour)

## 6. Tax handling

- [ ] 🔴 P0 (EU customers) : Stripe Tax activé — TVA UE auto-calculée + collectée + déclarée via OSS (One-Stop Shop) (1 jour setup + accounting alignment)
- [ ] 🔴 P0 (US customers) : Stripe Tax activé — sales tax par état (1 jour setup)
- [ ] 🟠 P1 : VAT ID input pour B2B EU (validation VIES via Stripe) — exonère TVA si valide (1 jour)
- [ ] 🟠 P1 : Tax invoice ID legal mention (mandatory FR/EU) (1 jour template)
- [ ] 🟡 P2 : Multi-jurisdiction tax (UK post-Brexit, AUS GST, etc.) (3 jours par juridiction)

## 7. Refunds / disputes

- [ ] 🔴 P0 : Refund possible depuis admin dashboard (full + partial) (1-2 jours pattern + UI)
- [ ] 🟠 P1 : Refund auto-trigger sur cancellation in trial period (1 jour)
- [ ] 🟠 P1 : Dispute (chargeback) handling — webhook `charge.dispute.created` → notify admin + freeze account (3 jours)
- [ ] 🟡 P2 : Dispute evidence submission UI (1 semaine)

## 8. Connect (multi-vendor / marketplace)

Ne s'applique que si le SaaS est marketplace (consumer apps qui prennent paiements pour leurs propres customers via @ezstart/pay-sdk).

- [ ] 🟠 P1 : Stripe Connect Express onboarding (déjà OK partiel — voir BACKLOG EZP-CONNECT-001)
- [ ] 🟠 P1 : Application fee % configurable par Application (déjà OK partiel)
- [ ] 🟠 P1 : Payouts schedule par Connected Account (config Stripe)
- [ ] 🟡 P2 : Payout dashboard UI pour Connected Accounts (3 jours)

## 9. Quotas / metering (si usage-based)

- [ ] 🟠 P1 : Usage events trackés (API calls, tokens AI, storage) — Stripe Metered Billing OU custom counter dans EZPay (3-5 jours)
- [ ] 🟠 P1 : Quota threshold alerts (80%, 100%) — email user + soft block (3 jours)
- [ ] 🟠 P1 : Overage billing (hard block OU charge per unit) (3 jours)
- [ ] 🟡 P2 : Real-time usage dashboard (3 jours)

## 10. Reporting

- [ ] 🟠 P1 : MRR (Monthly Recurring Revenue) dashboard admin (Stripe expose via API) (1-2 jours)
- [ ] 🟠 P1 : Churn rate tracking (1 jour)
- [ ] 🟠 P1 : Revenue per Application (multi-tenant) (2 jours)
- [ ] 🟡 P2 : Cohort retention analysis (5 jours)
- [ ] 🟡 P2 : LTV / CAC ratio (3 jours)
- [ ] 🟢 P3 : Revenue recognition compliance (ASC 606 / IFRS 15) (1 mois)

## 11. Compliance

- [ ] 🔴 P0 : PCI-DSS — Stripe gère, JAMAIS stocker card data côté @ezstart (audit code)
- [ ] 🔴 P0 (EU) : PSD2 / SCA — Stripe Checkout le gère, vérifier 3DS challenge fonctionne en test
- [ ] 🟠 P1 : Refund policy publique (page `/refund-policy`) (1h)
- [ ] 🟠 P1 : Subscription terms in Terms of Service (1h legal)
- [ ] 🟡 P2 : Auto-renewal disclosure law US (CCRR — California, etc.) (1 jour)

## 12. Audit grep commands

```bash
# Hardcoded plans (interdit, doit venir de pay-sdk)
grep -rnE "(name:|plan:).*'(Free|Pro|Business|Enterprise)'" apps/ --include="*.tsx" --include="*.ts" | grep -v "test\|stories\|seed"

# Stripe webhook handlers exhaustifs
grep -rn "case 'customer.subscription" apps/ezpay/api/src/

# Card data NEVER stored
grep -rnE "card\.?(number|cvc|cvv|exp)" apps/ packages/ --include="*.ts"

# Test mode key détection
grep -rn "ez_pk_test_\|ez_sk_test_" apps/

# Pay-sdk PricingPage usage (vs hardcoded pricing card)
grep -rn "PricingPage\|<PricingCard" apps/<app>/web/src/
```

## 13. Comparaison modèles pro

| Feature               | Stripe            | Paddle             | LemonSqueezy | @ezstart cible         |
| --------------------- | ----------------- | ------------------ | ------------ | ---------------------- |
| Tax handling          | Stripe Tax (paid) | Merchant of Record | MoR included | Stripe Tax (P0)        |
| Dunning               | Smart Retries     | Built-in           | Built-in     | Smart Retries (P0)     |
| Multi-currency        | All major         | All major          | USD/EUR/GBP  | EUR/USD (P1)           |
| Customer Portal       | Hosted            | Hosted             | Hosted       | pay-sdk component (P0) |
| Connect / Marketplace | Yes               | No (single seller) | No           | EZP-CONNECT (P1)       |

## 14. Checklist par app avant first paying customer

- [ ] Plans dynamiques (pas de hardcode)
- [ ] Stripe Checkout fonctionne (test card)
- [ ] 3DS challenge fonctionne (4000 0027 6000 3184)
- [ ] Webhook handlers tous les events critiques
- [ ] Past-due UI testée
- [ ] Update payment method UI
- [ ] Invoice PDF téléchargeable
- [ ] Refund testé depuis admin
- [ ] Tax (EU/US) configuré
- [ ] Refund policy + Terms publiés

## Related

- `standard-saas-keys.md` — API keys (`ez_pk_test_*` separates test data)
- `standard-saas-data.md` — test mode isolation
- `standard-saas.md` §5.4 — pricing UI checklist
