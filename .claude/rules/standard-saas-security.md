# Standard SaaS Security — Security checklist

Source de vérité security pour toute app SaaS @ezstart. Aligné sur OWASP Top 10, Stripe / Clerk / Auth0 patterns. Complémentaire à `standard-saas-cors.md` (CORS) et `standard-saas-keys.md` (API keys).

## Légende des priorités

- **🔴 P0 / MVP** — bloquant pour launch first paying customer (any vuln = breach + lawsuit risk)
- **🟠 P1 / V1** — nécessaire dans les 3 mois post-launch (compliance + scaling)
- **🟡 P2 / V2** — devient "vraiment pro" (defense in depth)
- **🟢 P3 / V3+** — excellence long-terme (red team, bug bounty)
- **⚡ QW** — Quick Win, < 1 jour, annotation EN PLUS de P\_

---

## 1. HTTP security headers

- [ ] 🔴 P0 ⚡QW : `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (5min — vercel.json) — soumettre à hstspreload.org après 6 mois
- [ ] 🔴 P0 ⚡QW : `X-Content-Type-Options: nosniff` (5min — vercel.json)
- [ ] 🔴 P0 ⚡QW : `X-Frame-Options: DENY` ou `SAMEORIGIN` (anti-clickjacking) (5min — vercel.json)
- [ ] 🔴 P0 ⚡QW : `Referrer-Policy: strict-origin-when-cross-origin` (5min — vercel.json)
- [ ] 🟠 P1 : `Content-Security-Policy` strict — script-src 'self', style-src 'self' 'unsafe-inline' (Tailwind), connect-src whitelist API + Stripe + Sentry (1-2 jours pour calibrer + tester)
- [ ] 🟠 P1 : `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")` (30min)
- [ ] 🟡 P2 ⚡QW : `Cross-Origin-Embedder-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` (1h — vercel.json)

**Implementation pattern** : ces headers vont dans `vercel.json` (web apps) et dans `helmet()` middleware côté API (api-core déjà OK).

## 2. Authentication

- [ ] 🔴 P0 : Email verification gate avant ops privilégiées (changer mot de passe, créer API key, upgrade plan) (1 jour)
- [ ] 🔴 P0 : Brute force protection — lockout après 5 login fails / 15min + CAPTCHA Turnstile/hCaptcha au-delà (1-2 jours)
- [ ] 🔴 P0 : Password strength enforcement — zxcvbn score >= 3, min 12 chars, pas dans HaveIBeenPwned (Pwned Passwords k-anonymity API) (1 jour)
- [ ] 🔴 P0 : Session cookies httpOnly + Secure + SameSite=Lax (default ezauth, vérifier qu'aucune app ne désactive)
- [ ] 🔴 P0 : Logout invalide TOUS les refresh tokens (déjà OK ezauth — vérifier que la révocation se propage)
- [ ] 🔴 P0 : **Logout pro flow obligatoire** côté SDK client — server revoke + reset store + reset persist + cross-tab broadcast + consumer onLogout hook + toast + hard redirect (`window.location.assign`, PAS `router.push`) + UserMenu loading state. 8 étapes, aucune skip. Server endpoint `/api/auth/logout` rate-limited (preset `strict`), CSRF-protected, audit-logged. (cf. `standard-sdk-dx.md` §11ter)
- [ ] 🟠 P1 : Refresh token rotation — chaque refresh émet un nouveau refresh + invalide l'ancien (anti replay) (3 jours)
- [ ] 🟠 P1 : 2FA TOTP (RFC 6238) optionnel pour users (3-5 jours dev + UI)
- [ ] 🔴 P0 : 2FA mandatory pour admin / superadmin roles (1 jour)
- [ ] 🟠 P1 : Session management UI — list devices/IPs, revoke per-device (3 jours)
- [ ] 🟡 P2 : OAuth state nonce signed (CSRF protection) — déjà OK ezauth via signed state
- [ ] 🟡 P2 : Account recovery via secondary email + recovery codes (5 jours)

## 3. Authorization

- [ ] 🔴 P0 : RBAC enforced server-side sur TOUTES les routes — jamais de check client-only (audit grep)
- [ ] 🔴 P0 : Tenant isolation — chaque query DB filtre par `applicationId` (audit feature par feature)
- [ ] 🔴 P0 : IDOR protection — un user ne peut JAMAIS accéder à `/api/users/:id` d'un autre user (test E2E + audit)
- [ ] 🟠 P1 : Audit logs sur sensitive actions (login, role change, key creation, plan change, account deletion) (1-2 jours — audit-log component existe déjà)
- [ ] 🟡 P2 : Permission scopes par API key (read:users, write:invoices, etc.) (5 jours)

## 4. Input validation / output encoding

- [ ] 🔴 P0 : Zod validation sur TOUS les body/params/query — jamais `req.body` brut (déjà checklist `standard-saas.md`)
- [ ] 🔴 P0 : XSS prevention — React échappe par défaut, jamais `dangerouslySetInnerHTML` sans `DOMPurify.sanitize()` (audit grep)
- [ ] 🔴 P0 : SQL/NoSQL injection — Mongoose query builder, jamais de string concat dans une query (audit grep)
- [ ] 🔴 P0 : SSRF prevention — fetch externe via `fetchExternal()` qui valide les URLs (audit grep `fetch(`)
- [ ] 🟠 P1 : File upload — type allowlist + size limit + scan (ClamAV ou équivalent) si feature exists (3 jours)
- [ ] 🟡 P2 : Open redirect protection — valider tous les `redirect_uri` against allowlist par Application (1 jour)

## 5. Secrets management

- [ ] 🔴 P0 ⚡QW : Audit eslint — zéro `NEXT_PUBLIC_*SECRET*` ni `NEXT_PUBLIC_*_sk_*` (déjà rule existante, activer error level) (5min)
- [ ] 🔴 P0 ⚡QW : `.env*` gitignored (vérifier .gitignore) (5min)
- [ ] 🔴 P0 : Pre-commit hook git-secrets ou trufflehog (1h setup)
- [ ] 🔴 P0 : Rotation keys / secrets policy — JWT_SECRET tous les 6 mois, API keys provider tous les 12 mois (doc dans BACKLOG)
- [ ] 🟠 P1 : Secrets stored in Vercel/Railway env (jamais committés), encrypted at rest
- [ ] 🟡 P2 : Vault dédié (Doppler / Infisical) si > 5 envs / > 50 secrets (1 semaine setup)

## 6. Webhooks

- [ ] 🔴 P0 : HMAC signature verification standardisée — pattern `verifyWebhookSignature(payload, signature, secret)` réutilisable dans tous les SDK (audit pay-sdk pattern existant + extraire) (1-2 jours)
- [ ] 🔴 P0 : Timing-safe comparison (`crypto.timingSafeEqual`) — JAMAIS `===` sur signatures
- [ ] 🔴 P0 : Replay protection — timestamp dans le payload, rejet si > 5 min old (1 jour)
- [ ] 🟠 P1 : Idempotency keys sur write endpoints (POST /api/donations, POST /api/subscriptions) — clé envoyée par client, dédup côté serveur (2 jours)
- [ ] 🟡 P2 : Webhook retry policy — exponential backoff + dead-letter queue après N échecs (3 jours)

## 7. Rate limiting / abuse

- [ ] 🔴 P0 : Rate limiting global sur toutes les routes (preset `standard` minimum, déjà OK api-core)
- [ ] 🔴 P0 : Rate limiting strict sur auth routes (login, register, forgot-password) — preset `strict` (déjà OK ezauth)
- [ ] 🟠 P1 : Rate limiting per-API-key (pas juste per-IP) — base pour les quotas billing (3 jours)
- [ ] 🟠 P1 : Geo-blocking optionnel (CIS, etc.) si compliance requise (1 jour Cloudflare)
- [ ] 🟡 P2 : Bot detection — Cloudflare Turnstile sur signup / form public (1 jour)

## 8. Privacy / GDPR

- [ ] 🔴 P0 : Privacy policy + Terms of service publiés (placeholder OK launch, mais URLs doivent exister)
- [ ] 🔴 P0 : Data export — user peut télécharger toutes ses données (JSON) depuis Settings (3-5 jours par app, mais auth-sdk fournit déjà account-deletion component, pattern à étendre)
- [ ] 🔴 P0 : Account deletion — hard delete + cascade sur toutes les apps (déjà OK auth-sdk via account-deletion-form)
- [ ] 🟠 P1 : Cookie consent banner si visiteurs EU (Cookiebot ou custom — bloquer analytics tant que pas accept) (1-2 jours)
- [ ] 🟠 P1 : DPA (Data Processing Agreement) avec Stripe, MongoDB Atlas, Vercel, Railway (1 jour admin)
- [ ] 🟡 P2 : Subprocessor list publique (page `/legal/subprocessors`) (30min)
- [ ] 🟡 P2 : SOC2 Type 1 (12 mois — audit Vanta/Drata) — pas P1 sauf si enterprise customers
- [ ] 🟢 P3 : SOC2 Type 2, ISO 27001 (24 mois)

## 9. Logging / forensics

- [ ] 🔴 P0 : Pas de PII dans les logs (passwords, tokens, API keys) — audit grep + redaction config (Pino existe pour ça)
- [ ] 🔴 P0 : Log retention 30 jours minimum (Railway/Vercel default)
- [ ] 🟠 P1 : Logs immutables (append-only) — Datadog / Logtail / Better Stack (1 jour setup)
- [ ] 🟠 P1 : Audit log des admin actions persistant en DB (déjà OK via audit-log-card existing component)
- [ ] 🟡 P2 : Tamper-evident logs (hash chain) si compliance HIPAA / SOC2

## 10. Disclosure / response

- [ ] 🟠 P1 ⚡QW : `/security` page publique avec contact PGP (1h)
- [ ] 🟠 P1 : `security.txt` à la racine (RFC 9116) (15min)
- [ ] 🟠 P1 : Incident response runbook — qui alerte qui en cas de breach (4h doc)
- [ ] 🟡 P2 : Bug bounty program (HackerOne / Bugcrowd) — start invite-only (1 semaine setup)

## 11. Audit grep commands

```bash
# Headers de sécurité dans vercel.json
cat apps/<app>/web/vercel.json | grep -E "Strict-Transport|X-Frame|X-Content|Referrer-Policy|Content-Security"

# Secrets exposés
grep -rnE "NEXT_PUBLIC_.*SECRET|NEXT_PUBLIC_.*_sk_" apps/

# dangerouslySetInnerHTML sans DOMPurify
grep -rn "dangerouslySetInnerHTML" apps/ packages/ | grep -v "DOMPurify\|sanitize"

# Fetch externe non-encadré
grep -rnE "\bfetch\(" apps/ packages/ | grep -v "fetchExternal\|apiCall\|@/test\|node_modules"

# Timing-safe compare
grep -rnE "(signature|hmac|hash)\s*===" packages/ apps/ --include="*.ts" | grep -v "node_modules\|test"

# String concat dans Mongoose query (suspicious)
grep -rnE "find\(\{.*\$\{" apps/ --include="*.ts"

# Auth middleware coverage
grep -rnE "router\.(get|post|put|patch|delete)\(" apps/<app>/api/src/routes/ | grep -v "authMiddleware\|verifyToken\|publicRoute"

# Logout endpoint exists + rate-limited + audit-logged
grep -rn "logout" apps/<app>/api/src/routes/auth/ --include="*.ts"

# router.push instead of window.location.assign on logout (interdit — soft state stays)
grep -rn "router\.push.*'/'" packages/<sdk>/src/ --include="*.ts" --include="*.tsx" | grep -i "logout\|signout"
```

## 12. Comparaison modèles pro

| Service            | Auth pattern                          | 2FA mandatory       | Audit logs    | Bug bounty         |
| ------------------ | ------------------------------------- | ------------------- | ------------- | ------------------ |
| **Stripe**         | API key + OAuth + dashboard JWT       | Admin yes           | Full + SIEM   | HackerOne $500-25K |
| **Clerk**          | JWT + session + multi-factor          | Optional + WebAuthn | Full + export | HackerOne          |
| **Auth0**          | OAuth + OIDC + JWT + adaptive MFA     | Per-tenant config   | Full + export | HackerOne          |
| **@ezstart cible** | JWT httpOnly + refresh rotation + 2FA | Admin P0 / user P1  | Audit-log P1  | P2 invite-only     |

## 13. Checklist par app avant launch

- [ ] Tous les headers HTTP (P0) en place dans vercel.json
- [ ] Brute force protection active (lockout + captcha)
- [ ] Email verification gate testé
- [ ] 2FA admin testé
- [ ] HMAC webhook verified (test replay attack)
- [ ] CSP testé en production sans erreurs console
- [ ] Privacy policy + Terms publiés
- [ ] Data export + account deletion testés E2E
- [ ] `/security` page + security.txt en place
- [ ] Pre-commit secret scanning actif

## Related

- `standard-saas-keys.md` — API keys naming
- `standard-saas-cors.md` — CORS 3-tier
- `standard-saas-observability.md` — error tracking + alerting
- `data-protection.md` — production data safety
