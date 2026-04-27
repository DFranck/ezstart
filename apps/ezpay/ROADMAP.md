# EZPay Roadmap and Gap Analysis

Last updated: 2026-04-27

# Vision

EZPay = open-source self-hostable Stripe alternative with @ezstart/pay-sdk.

Status: Production-ready MVP publish-ready.

# Gap Analysis vs Stripe, Lemon Squeezy, Paddle

Current coverage: 60-70% core features.

Top Differentiators:

- Open-source MIT
- Self-hostable (zero SaaS lock-in)
- 3-layer SDK architecture
- Per-app Stripe Connect (unique marketplace pattern)
- Multi-tenant scoping via applicationId
- Provider abstraction (IPaymentProvider interface)
- Native ezauth integration
- Federated admin pattern

Critical Gaps (P4 - 4-5 weeks):

- Invoices native CRUD (create, list, PDF)
- Stripe Tax integration (auto VAT/sales tax)
- Metered billing (usage-based plans)
- Plan pricing tiers (graduated, volume, tiered)
- Dunning smart retry (QUICK WIN - 2-3d)
- Pause/resume subscriptions (QUICK WIN - 2d)

Modern Features (P5 - 3-4 weeks):

- License key generation
- Affiliate tracking
- Pre-paid credits/wallet
- Revenue analytics (MRR, ARR, churn)
- Email templates UI customizer

Enterprise (P6 - 4-6 weeks):

- Quotes API (PDF, accept, auto-invoice)
- White-label checkout
- SOC 2 Type II audit
- PayPal integration

Polish (P7 - 2-3 weeks):

- Native Customer Portal UI
- Stripe Connect white-label
- Admin bulk operations
- 20+ language localization

Top 10 Actions:

1. Invoices native CRUD
2. Stripe Tax integration
3. Metered billing
4. Plan pricing tiers
5. Quotes API
6. White-label checkout
7. Revenue analytics
8. Dunning (quick win)
9. Pause/resume (quick win)
10. Affiliate tracking

Quick Wins (8-10 days total):

- Dunning integration (2-3d)
- Pause/resume (2d)
- Coupon discount types (1-2d)
- Customer metadata flexible (1d)
- Downgrade discounts (1-2d)

Publish-Readiness: 100/100

- ezpay Web: 8/8 checks
- ezpay API: 8/8 checks
- @ezstart/pay-sdk: 10/10 npm ready

Next milestone: P4 gaps closure (invoices + tax + metered) unlock Enterprise tier in 8-12 weeks.
