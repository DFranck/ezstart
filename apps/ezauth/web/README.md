# web-ezauth

Next.js web frontend for the EZAuth SaaS service (Tier 1 — auth identity).

Production: https://ezauth.ezstart.xyz
Port (dev): 6111

## Content-Security-Policy — Soak phase (2026-04-29 → 2026-05-13)

### Status: Report-Only baseline shipped

The `vercel.json` ships a `Content-Security-Policy-Report-Only` header. Browsers will **report** CSP violations to the console (and to a future report endpoint) but **NOT block** any resource. This is the deliberate soak phase, designed to surface false positives before enforcement.

### Why Report-Only first

Switching directly to `Content-Security-Policy` (enforce mode) without observation risks breaking:

- Next.js dev tools (inline scripts injected by HMR/devtools)
- Stripe Checkout / 3DS challenges (iframes + cross-origin scripts)
- Future analytics / Cloudflare Turnstile captcha
- Inline event handlers in legacy or third-party widgets

Report-Only mode lets us observe real-world violations across dev, preview, and production deployments before enforcement.

### Where to find violation reports

- **Browser console**: `Content Security Policy Report Only: <directive> ... was blocked`
- **Vercel logs**: `vercel logs web-ezauth` (errors include CSP reports if `report-uri` configured)
- **Future**: dedicated report-uri endpoint (`POST /api/csp-report`) — see `AUTH-V1-CSP-ENFORCE` backlog item

### Soak phase deadline

**2026-05-13** (2 weeks from baseline ship date 2026-04-29).

After the deadline:

1. Review collected violation reports
2. Add legitimate sources to the policy (e.g., new analytics endpoint)
3. Switch header key from `Content-Security-Policy-Report-Only` → `Content-Security-Policy` (enforce mode)
4. Tracked under backlog item `AUTH-V1-CSP-ENFORCE` (P1, ~1 day)

### Long-term hardening — nonce-based CSP

The current baseline uses `'unsafe-inline'` and `'unsafe-eval'` in `script-src` to avoid breaking Next.js inline scripts and dev tools. This is acceptable for the soak phase but is **not** the production-grade target.

The V2 of this policy (tracked under `AUTH-V1-CSP-NONCES`, P2, ~3 days) will:

1. Generate a per-request nonce in `middleware.ts`
2. Inject the nonce into `script-src 'nonce-<value>'` (drops `'unsafe-inline'` + `'unsafe-eval'`)
3. Pass the nonce to Next.js via the `Next.js` nonce mechanism (`<Script nonce={...} />`)
4. Apply the same pattern to other apps (`ezpay`, `ezstart`, etc.) once stable in `web-ezauth`

This requires a middleware refactor and is intentionally out of scope for the baseline soak phase.

### Current policy (Report-Only)

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
font-src 'self' data:;
connect-src 'self' https://*.ezstart.xyz https://api.stripe.com http://localhost:6110 ws://localhost:* wss://*.ezstart.xyz;
frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
```

### Directive rationale

| Directive         | Why                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `default-src`     | `'self'` — strict default, all other directives override                                                                                        |
| `script-src`      | `'unsafe-inline' 'unsafe-eval'` (soak only) + Stripe.js + Cloudflare Turnstile (future captcha)                                                 |
| `style-src`       | `'unsafe-inline'` required by Tailwind / styled-components / next/font runtime                                                                  |
| `img-src`         | `data: https: blob:` — any HTTPS image, data URIs (icons), blob URLs (uploads preview)                                                          |
| `font-src`        | `data:` for inlined webfonts via `next/font`                                                                                                    |
| `connect-src`     | API origins: `*.ezstart.xyz` (prod), `localhost:6110` (dev API), `ws://localhost:*` (HMR), `wss://*.ezstart.xyz` (future websocket), Stripe API |
| `frame-src`       | Stripe Checkout/3DS iframes + Cloudflare Turnstile challenge iframe                                                                             |
| `frame-ancestors` | `'none'` — strict anti-clickjacking (more restrictive than `X-Frame-Options: SAMEORIGIN`)                                                       |
| `base-uri`        | `'self'` — prevent `<base>` injection attacks                                                                                                   |
| `form-action`     | `'self'` — prevent form hijacking to external origins                                                                                           |
| `object-src`      | `'none'` — block plugins (Flash, Java, etc.)                                                                                                    |

## Related

- `.claude/rules/standard-saas-security.md` §1 — HTTP security headers checklist
- `BACKLOG.md` — `AUTH-V1-CSP`, `AUTH-V1-CSP-ENFORCE`, `AUTH-V1-CSP-NONCES`
