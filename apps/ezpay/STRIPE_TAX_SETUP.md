# Stripe Tax setup (EU mandatory)

> **Status** : one-time operator action required before EZPay can collect a single EU
> payment. The pay-sdk + EZPay API ship Stripe Tax wired ON by default; this guide
> covers the Stripe Dashboard side that lives outside the codebase.

## Why

EU customers require automatic VAT calculation + collection per the EU VAT
regime (OSS — One-Stop Shop). Without Stripe Tax, payments to EU customers
violate tax law and are non-compliant with TVA / VAT MOSS regulations. US
customers similarly require sales tax per state.

The `@ezstart/pay-sdk` Stripe provider wires three Checkout flags whenever
`automaticTax: true` is passed:

- `automatic_tax: { enabled: true }` — Stripe Tax computes VAT/sales tax based
  on the customer's billing/shipping address.
- `tax_id_collection: { enabled: true }` — Stripe Checkout collects the
  customer's VAT ID and validates it against VIES (VAT Information Exchange
  System). Valid B2B VAT ID → reverse-charge exemption applied automatically.
- `customer_update: { shipping: 'auto', address: 'auto' }` — Stripe requires
  this whenever `automatic_tax` is on and a `Customer` already exists, so the
  collected address syncs back to the Customer for accurate tax recomputation
  on subsequent invoices.

In EZPay (`apps/ezpay/api`) the flag defaults to ON across donations,
purchases, and subscriptions. Set `STRIPE_AUTOMATIC_TAX=false` to opt out per
environment (e.g. for merchants who handle tax externally — rare).

## One-time Stripe Dashboard setup

### 1. Activate Stripe Tax

1. Go to <https://dashboard.stripe.com/settings/tax>.
2. Click **Get started** → **Automatic tax**.
3. Add your business address (the country you are tax-registered in).
4. Add tax registrations:
   - **EU sellers** — register for **OSS (One-Stop Shop)** at
     <https://www.impots.gouv.fr/oss-one-stop-shop> (FR) or your local
     equivalent. Once OSS is active, Stripe collects VAT for all EU
     destination countries automatically and you file a single quarterly
     return.
   - **US sellers** — register for sales tax in each US state where you have
     economic nexus. Stripe Tax can monitor nexus thresholds for you.
   - **UK sellers** — register for VAT separately (post-Brexit, UK is no
     longer in OSS).
5. Test with `4242 4242 4242 4242` from a test card with an EU billing
   address — the Checkout session should now show a VAT line in the
   breakdown.

### 2. Set per-product tax codes

Each Stripe Product needs a `tax_code` so Stripe knows which VAT/sales tax
rate to apply.

1. Go to **Products** → select a product → **Tax behavior**.
2. Pick the closest tax code:
   - `txcd_10000000` — General services (use this for SaaS subscriptions).
   - `txcd_10103000` — Software as a Service (more specific).
   - `txcd_10403000` — Donations (charitable, often tax-exempt).
   - `txcd_99999999` — General — Tangible Goods.
3. Repeat for every product (or set a default tax code at the account level
   in **Settings → Tax → Default tax behavior**).

Full reference: <https://docs.stripe.com/tax/tax-codes>.

### 3. Configure invoice template legal mentions

EU B2B invoices (where the customer's VAT ID is valid → reverse-charge
exemption) MUST carry a specific legal mention.

1. Go to **Settings → Invoice template**.
2. Enable **Show tax breakdown** (HT / VAT / TTC).
3. In **Custom fields** or **Footer**, add (for FR/EU):

   > Facture d'auto-liquidation TVA — Article 196 CE Directive 2006/112/CE

   Stripe shows this footer on invoices where the reverse-charge applies.

4. Confirm your **business VAT ID** is set in **Settings → Business details**
   so it appears on every invoice header.
5. Test: trigger a checkout from a test EU B2B customer (with a valid test
   VAT ID per <https://docs.stripe.com/tax/tax-ids>) → download the invoice
   PDF → verify the breakdown + footer.

### 4. Set the env var (optional, default ON)

In `apps/ezpay/api/.env.local` (and your Railway production secrets):

```env
# Default: omit OR any value other than "false" → automatic_tax ON.
# Uncomment ONLY if your merchant handles tax externally.
# STRIPE_AUTOMATIC_TAX=false
```

## What ships in code already

| Layer                                        | Behavior                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `@ezstart/pay-sdk` (StripeProvider)          | Sets `automatic_tax`, `tax_id_collection`, `customer_update` when consumer passes `automaticTax: true`. |
| `apps/ezpay/api/routes/donations/create`     | Wires `automaticTax = process.env.STRIPE_AUTOMATIC_TAX !== 'false'`.                                    |
| `apps/ezpay/api/routes/purchases/create`     | Same.                                                                                                   |
| `apps/ezpay/api/routes/subscriptions/create` | Same.                                                                                                   |
| `STRIPE_AUTOMATIC_TAX=false`                 | Disables the three flags for that environment (per-app, not per-Application).                           |

## Troubleshooting

- **"You cannot use `automatic_tax` without first activating Stripe Tax"** —
  step 1 above is incomplete. Activate it in the Stripe Dashboard.
- **No VAT line in Checkout** — confirm the customer's billing country is in
  your tax registration list (step 1.4) AND the product has a `tax_code`
  (step 2).
- **VAT applied to a B2B customer who should be exempt** — the customer's VAT
  ID is invalid per VIES, OR the customer didn't enter a VAT ID at all.
  Stripe Checkout shows a "Are you buying for a business?" prompt; if the
  user skips it, no exemption is applied.
- **Need per-tenant tax control** — out of scope for this iteration. Add a
  per-`Application` `taxBehavior` field if/when needed and wire it into the
  route handlers in `apps/ezpay/api/src/routes/{donations,purchases,subscriptions}/create.ts`.

## Related

- [`packages/pay-sdk/src/core/providers/stripe.ts`](../../packages/pay-sdk/src/core/providers/stripe.ts) — provider source.
- [`packages/pay-sdk/src/core/providers/types.ts`](../../packages/pay-sdk/src/core/providers/types.ts) — `automaticTax` JSDoc.
- [`packages/pay-sdk/src/__tests__/providers/stripe.test.ts`](../../packages/pay-sdk/src/__tests__/providers/stripe.test.ts) — coverage.
- [`apps/ezpay/api/.env.example`](./api/.env.example) — env var reference.
- `.claude/rules/standard-saas-billing.md` §6 — Tax handling checklist.
