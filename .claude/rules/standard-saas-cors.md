# Standard SaaS CORS — 3-tier origin policy

Source de vérité pour la config CORS de toute API @ezstart (ezauth, ezpay, futurs services). Aligné sur le pattern Stripe / Clerk / Supabase / Auth0. Complémentaire à `standard-saas.md` (checklist apps) et `standard-saas-keys.md` (publishable keys).

---

## 1. Principe fondamental

**Le CORS strict est justifié UNIQUEMENT quand l'endpoint manipule des cookies.** Tout le reste est `Access-Control-Allow-Origin: *`.

Pourquoi :

- **Publishable keys** (`ez_pk_*`) sont publics par design — pas de risque d'exfiltration, un attaquant ne peut faire que des opérations publiques (lire plans, valider key, init checkout)
- **Bearer tokens en header** (`Authorization: Bearer ...`) ne sont **pas** envoyés automatiquement par le navigateur cross-origin, donc pas de CSRF possible
- **Seuls les cookies** déclenchent des requêtes same-site authentifiées sans action utilisateur → c'est pour ça que CORS existe strictement

**Conséquence pratique** : un consumer externe (AcmeCorp, preview Vercel, localhost d'un dev tiers) doit pouvoir call `/api/keys/config` ou `/api/donations` **sans qu'on enregistre son domaine nulle part**. Sinon on n'est pas un SaaS scalable.

---

## 2. Classification des endpoints (3 tiers)

Chaque route d'API @ezstart tombe dans **exactement une** des 3 classes :

### Tier 1 — Public + publishable-key-auth

**Auth** : `?key=ez_pk_*` en query param (ou rien du tout)

**Exemples** : `GET /api/keys/config`, `GET /api/plans?applicationId=`, `GET /api/payments/donations?projectId=`, `GET /api/health`, `GET /api/applications/:id/public`

**CORS** : `Access-Control-Allow-Origin: *`, `credentials: false`

**Justification** : pas de cookies, pas de secrets, aucun risque CSRF.

### Tier 2 — Bearer-authenticated stateless

**Auth** : `Authorization: Bearer <accessToken>` en header (JWT court ~15 min)

**Exemples** : `POST /api/donations`, `POST /api/subscriptions`, `GET /api/users/me`, `PATCH /api/applications/:id/theme`, `POST /api/connect/onboard`

**CORS** : `Access-Control-Allow-Origin: *`, `credentials: false`, `Access-Control-Allow-Headers: Authorization, Content-Type, X-API-Key, X-EZStart-Signature`

**Justification** : le token JWT est explicitement envoyé par le code consumer (jamais automatiquement). Pas de CSRF.

### Tier 3 — Cookie-authenticated (strict)

**Auth** : `Cookie: session=<httpOnly>` — le navigateur envoie le cookie automatiquement, donc CSRF-sensible

**Exemples** : `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/auth/oauth/callback`, tout ce qui `Set-Cookie: session=`

**CORS** : `Access-Control-Allow-Origin: <origin exact réfléchi>`, `credentials: true`, allowlist strict

**Justification** : les cookies same-site sont réenvoyés automatiquement, donc strictement autoriser uniquement les origines connues (first-party : le domaine de l'auth app lui-même, et éventuellement des wildcards `*.vercel.app` pour preview staging si documenté).

---

## 3. Implémentation dans `@ezstart/api-core`

### 3.1 API ciblée

```ts
import { createEzstartServer } from '@ezstart/api-core'

createEzstartServer('ezauth', {
  // Tier 3 seulement — strict allowlist pour les routes cookies
  cookieAuthAllowlist: [
    'https://ezauth.ezstart.xyz',
    'https://ezauth-git-staging-ezstart.vercel.app',
    /^https:\/\/ezauth-[a-z0-9]+-ezstart\.vercel\.app$/, // preview deploys
    'http://localhost:6111',
  ],
  // Tier 3 routes path prefixes (tout le reste est Tier 1 ou 2)
  cookieAuthRoutes: ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout', '/api/auth/oauth'],
})
```

### 3.2 Defaults

- Toute route **non listée** dans `cookieAuthRoutes` → CORS permissif (`*`, credentials false)
- Toute route dans `cookieAuthRoutes` → CORS strict allowlist + credentials true
- Si `cookieAuthAllowlist` vide ou absent → refuser toute requête cross-origin sur les routes cookies (sécurité par défaut)

### 3.3 Implémentation (Express middleware)

Deux middlewares chaînés, appliqués **par route** (pas globalement) :

```ts
// 1. Middleware permissif sur tout
app.use(cors({ origin: '*', credentials: false, exposedHeaders: ['X-Request-Id'] }))

// 2. Middleware strict uniquement sur les routes cookie-auth (override le 1er)
for (const prefix of cookieAuthRoutes) {
  app.use(
    prefix,
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true) // same-origin or curl
        const allowed = cookieAuthAllowlist.some(entry =>
          typeof entry === 'string' ? entry === origin : entry.test(origin)
        )
        cb(allowed ? null : new Error('CORS blocked'), allowed)
      },
      credentials: true,
    })
  )
}
```

### 3.4 Anti-patterns interdits

- ❌ **CORS_ORIGINS env var pour consumers externes** — un nouveau client ne doit jamais avoir à demander qu'on ajoute son domaine
- ❌ **Allowlist unique pour toutes les routes** — force à enregistrer tous les consumers
- ❌ **`Access-Control-Allow-Origin: *` avec `credentials: true`** — invalide par spec, browsers le rejettent
- ❌ **Repli "si env vide, allow all"** sur les routes cookies — CSRF risk

---

## 4. Tests obligatoires (par API)

- [ ] `GET /api/keys/config?key=...` depuis `Origin: https://random-tiers-domain.com` → 200 + `Access-Control-Allow-Origin: *`
- [ ] `POST /api/donations` avec Bearer token depuis `Origin: https://random.com` → 200 + `ACAO: *`
- [ ] `POST /api/auth/login` depuis `Origin: https://random.com` → CORS rejected (403 ou preflight fail)
- [ ] `POST /api/auth/login` depuis origin dans allowlist → 200 + `ACAO: <origin>` + `Set-Cookie`
- [ ] Preflight `OPTIONS /api/keys/config` avec `Origin: https://random.com` → 204 + headers `*`

---

## 5. Migration depuis l'ancien pattern (allowlist unique)

Les APIs existantes (ezauth, ezpay, etc.) utilisent actuellement une allowlist CORS globale — **tout** les endpoints sont bloqués pour des origines non enregistrées, ce qui est incompatible avec un modèle SaaS où les consumers peuvent être sur n'importe quel domaine.

**Étapes migration** :

1. Refactor `createEzstartServer` dans `@ezstart/api-core` selon §3
2. Identifier les routes cookie-auth de chaque API (chercher `Set-Cookie` dans le code)
3. Remplacer le middleware CORS global par l'appel `createEzstartServer({ cookieAuthAllowlist, cookieAuthRoutes })`
4. Supprimer / vider les env vars `CORS_ORIGINS` pour les consumers externes sur Railway (garder juste les domaines first-party pour les cookie routes)
5. Redémarrer les APIs
6. Smoke test : curl d'une origine externe sur les 3 tiers → observe les headers

---

## 6. Comparaison modèles pro

| Service              | Bearer/Key endpoints                                                                  | Cookie endpoints                      |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------- |
| **Stripe**           | `api.stripe.com` → `ACAO: *`, `credentials: false`                                    | N/A (pas de cookie auth cross-origin) |
| **Clerk**            | `api.clerk.com` → `ACAO: *`, + validation origin-level via publishable key            | Dashboard strict                      |
| **Supabase**         | `*.supabase.co` → `ACAO: *`, `apikey` header                                          | N/A                                   |
| **Auth0**            | Per-tenant allowlist enregistré dans le dashboard (plus permissif que strict env var) | Idem                                  |
| **@ezstart** (cible) | Tier 1+2 → `ACAO: *`                                                                  | Tier 3 → allowlist strict             |

---

## 7. Check rapide API

```bash
# 1. Zéro env var CORS_ORIGINS pour consumers externes
grep -r "CORS_ORIGINS\|CORS_ALLOWED" apps/<app>/api/ packages/api-core/src/ --include="*.ts"

# 2. Tous les endpoints Tier 1/2 répondent avec ACAO: *
curl -I -H "Origin: https://random-xyz.com" http://localhost:<port>/api/keys/config?key=... \
  | grep -i "access-control-allow-origin"
# → doit contenir `*`

# 3. Les endpoints Tier 3 rejettent une origin non listée
curl -I -X OPTIONS -H "Origin: https://random-xyz.com" \
     -H "Access-Control-Request-Method: POST" \
     http://localhost:<port>/api/auth/login
# → doit renvoyer 403 OU un ACAO absent / différent

# 4. Les endpoints Tier 3 acceptent une origin listée
curl -I -X OPTIONS -H "Origin: https://ezauth.ezstart.xyz" \
     -H "Access-Control-Request-Method: POST" \
     http://localhost:<port>/api/auth/login
# → doit renvoyer ACAO: https://ezauth.ezstart.xyz + credentials true
```
