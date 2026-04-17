# E2E Tests

## Dev Environment (localhost)
- **EZAuth API**: http://localhost:6110
- **EZAuth Web**: http://localhost:6111
- **EZPay API**: http://localhost:6130
- **EZPay Web**: http://localhost:6131
- **EZStart API**: http://localhost:6100
- **EZStart Web**: http://localhost:6101
- **User**: test-global@ezstart.dev / TestGlobal123! (superadmin)

---

## EZAuth Web (localhost:6111)

### Auth Flows
- [x] T01 — Login page renders (form, Google OAuth, dark mode) — OK — 2026-04-18
- [ ] T02 — Login with credentials → redirect to dashboard — FAIL: "No authorization code found" on /auth/callback — 2026-04-18
- [x] T03 — Register page renders (all fields, promo code) — OK — 2026-04-18
- [x] T04 — Forgot password page renders + submit — OK — 2026-04-18
- [ ] T05 — Logout → no layout flash — NOT TESTED (blocked by T02)
- [ ] T06 — Settings page — NOT TESTED (blocked by T02)

### Admin Dashboard
- [ ] T07 — Admin dashboard renders — NOT TESTED (blocked by T02)
- [ ] T08 — Search users — NOT TESTED
- [ ] T09 — Edit user modal — NOT TESTED
- [ ] T10 — Delete user — NOT TESTED

### Developer Portal
- [ ] T11 — Developer portal renders — NOT TESTED (blocked by T02)
- [ ] T12 — Create API key — NOT TESTED
- [ ] T13 — Revoke API key — NOT TESTED
- [ ] T14 — Billing page — NOT TESTED

### SaaS Product (standard-saas.md section 5)
- [ ] T15 — Homepage/landing exists — FAIL: no homepage, goes straight to /login — 2026-04-18
- [ ] T16 — i18n: all text translated — FAIL: `auth.callback.backToHome` raw key — 2026-04-18
- [ ] T17 — Dark mode toggle — PARTIAL: works on login/register, can't test post-login
- [ ] T18 — Mobile responsive — NOT TESTED

---

## EZPay Web (localhost:6131)

### Landing & Auth
- [x] T20 — Landing page renders (cards, SDK docs, dark mode) — OK — 2026-04-18
- [ ] T21 — Login via SSO → callback — FAIL: code in URL but "No authorization code found" — 2026-04-18

### Developer Portal
- [ ] T22 — Developer portal renders — NOT TESTED (blocked by T21)
- [ ] T23 — Platform plans display — NOT TESTED
- [ ] T24 — Admin dashboard — NOT TESTED

### SaaS Product
- [ ] T25 — i18n — NOT TESTED
- [ ] T26 — Dark mode — PARTIAL: landing OK
- [ ] T27 — Mobile responsive — NOT TESTED

---

## Cross-App SSO
- [ ] T30 — EZPay → EZAuth → callback → logged in — FAIL: callback fails — 2026-04-18
- [ ] T31 — Auto-SSO (already logged in) — NOT TESTED

---

## Blocking Issues (step 6 → back to step 2)

### BLOCKER-1: Auth callback fails on both ezauth and ezpay
- **Symptom**: After login, redirect to `/auth/callback?code=xxx` shows "No authorization code found"
- **Observed**: The code IS in the URL but the callback page doesn't read it
- **Impact**: Blocks ALL post-login tests (T02, T05-T14, T21-T24, T30-T31)
- **Root cause**: Likely the auth-sdk refactor changed how the callback page reads the code. The `AuthCallbackPage` component was moved from `src/auth-callback-page.tsx` to `src/components/AuthCallbackPage.tsx`. Import paths may be broken, or the component doesn't read `searchParams.code` correctly after the provider refactor.

### BLOCKER-2: No homepage for ezauth web
- **Symptom**: http://localhost:6111 redirects to /login directly
- **Impact**: standard-saas.md section 5.1 not met
- **Fix needed**: Create a landing page for ezauth (value prop, pricing preview, login CTA)

### MINOR: i18n raw keys
- **Symptom**: `auth.callback.backToHome` displayed as raw key
- **Impact**: Cosmetic but indicates missing translation keys

---

## Staging Results (2026-04-17) — Previous session

- [x] T01s — Login staging — OK (3 cycles)
- [x] T02s — Admin dashboard staging — OK
- [x] T07s — Developer Portal staging — OK (i18n keys raw)
- [x] T12s — EZPay landing staging — OK
- [x] T13s — SSO EZPay→EZAuth staging — OK
- [x] T14s — Developer Connect staging — OK
- [x] T17s — GreenPulse chat staging — OK
- [x] T18s — Conversation sidebar staging — OK (2 cycles)
