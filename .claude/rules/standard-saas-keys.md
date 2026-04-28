# Standard SaaS Keys — API key naming and distribution

Source de vérité pour les clés API de tout service @ezstart (ezauth, ezpay, futurs services). Aligné sur le pattern Stripe / Clerk / GitHub / OpenAI avec vendor prefix pour désambiguïsation.

---

## 1. Naming convention — 4 segments, jamais plus

Format : `ez_<type>_<env>_<random-hex>`

| Prefix        | Usage                    | Exposable client ?    |
| ------------- | ------------------------ | --------------------- |
| `ez_pk_live_` | Publishable, production  | Oui, safe en frontend |
| `ez_pk_test_` | Publishable, sandbox/dev | Oui, safe en frontend |
| `ez_sk_live_` | Secret, production       | Non, server-only      |
| `ez_sk_test_` | Secret, sandbox/dev      | Non, server-only      |

**Interdit** :

- Mettre le scope ou l'app name dans le prefix (`ez_pk_admin_`, `ez_pk_ezauth_`, etc.)
- Plus de 4 segments avant le hex
- Prefix nu sans `ez_` (collision avec Stripe/Clerk)

**Pourquoi `ez_` ?** Stripe et Clerk utilisent `pk_live_` / `sk_live_` sans vendor prefix car ils sont dominants sur leur marché. @ezstart arrive après, donc on ajoute `ez_` pour éviter qu'une clé ezauth se confonde avec une clé Stripe dans un `.env` ou un log. Même logique que GitHub (`ghp_`, `ghs_`, etc.) ou OpenAI/Anthropic (`sk-ant-`).

---

## 2. Scope et ownership = metadata DB, PAS prefix

Le prefix identifie UNIQUEMENT le type et l'env. Le reste est en metadata sur le document DB :

```ts
// MongoDB ApiKey document
{
  prefix: 'ez_pk_live_a1b2c3',         // 18 chars pour display (prefix + 6 chars hex)
  hash: 'sha256:...',                   // full key hashée
  type: 'publishable' | 'secret',       // dérivé du prefix
  env: 'live' | 'test',                 // dérivé du prefix
  appName: 'ezauth' | 'ezpay' | ...,    // à quelle app la clé appartient
  scope: 'admin' | 'user' | 'readonly', // permissions
  createdBy: userId | 'system-seed',
  expiresAt?: Date,
  lastUsedAt?: Date,
  status: 'active' | 'revoked',
}
```

Stripe fait pareil : leur `rk_live_*` (restricted key) a les permissions en metadata, pas dans le prefix.

---

## 3. Dogfood — chaque app est un consumer SaaS

**Chaque app @ezstart consomme les SDK comme un dev externe le ferait** :

- `ezauth` lui-même a sa clé `ez_pk_live_<hex>` avec `appName='ezauth'` en metadata
- `ezpay` a sa clé `ez_pk_live_<hex>` avec `appName='ezpay'`
- `ezstart` a sa clé `ez_pk_live_<hex>` avec `appName='ezstart'`

**Pas de mode "first-party" spécial** : le `<AuthProvider>` a TOUJOURS besoin d'une `publishableKey`. Cohérence totale entre use case interne et use case externe.

---

## 4. Bootstrap — résoudre le chicken-and-egg

La première clé d'un nouvel environnement (dev / staging / prod) est créée par un seed script idempotent :

```bash
# Une seule fois par environnement
pnpm --filter api-ezauth seed:self-key

# Outputs : ez_pk_live_<hex>
# Metadata : { appName: 'ezauth', scope: 'admin', createdBy: 'system-seed' }
# À copier dans : apps/ezauth/web/.env.local → NEXT_PUBLIC_EZAUTH_KEY=ez_pk_live_<hex>
```

**Idempotence** : si une clé `createdBy='system-seed'` pour l'app existe déjà, le script ne fait rien.

**Pour les autres apps** (`ezpay`, `ezstart`, etc.) : le superadmin crée leur clé via le dashboard ezauth une fois, la copie dans leur `.env.local`.

---

## 5. Environment variables convention

```env
# OK — Publishable (safe client-side, NEXT_PUBLIC_*)
NEXT_PUBLIC_EZAUTH_KEY=ez_pk_live_<hex>
NEXT_PUBLIC_EZPAY_KEY=ez_pk_live_<hex>

# OK — Secret (server-only, jamais NEXT_PUBLIC_*)
EZAUTH_SECRET_KEY=ez_sk_live_<hex>
EZPAY_SECRET_KEY=ez_sk_live_<hex>

# INTERDIT — secret exposé côté client
NEXT_PUBLIC_EZAUTH_SECRET=...
NEXT_PUBLIC_EZAUTH_SK=...
```

**Lint rule** (à ajouter dans `@ezstart/eslint-plugin-ezstart`) : bloque les env vars matchant `NEXT_PUBLIC_*SECRET*` ou `NEXT_PUBLIC_*_sk_*`.

---

## 6. Migration depuis `ezk_*` (legacy)

Les anciennes clés utilisaient `ezk_test_`, `ezk_live_`, `ezk_admin_` avec le scope dans le prefix (mauvais pattern).

**Stratégie de migration** :

- **Écriture** : toujours `ez_pk_*` ou `ez_sk_*` avec type/scope en metadata
- **Lecture** : accepter aussi `ezk_test_`, `ezk_live_`, `ezk_admin_` pendant 90 jours (backwards compat)
- **Warning** : logué à chaque usage d'une clé `ezk_*` via `logger.warn` : `"Legacy ezk_* key detected, please rotate to ez_pk_/ez_sk_ by 2026-07-21"`
- **Deadline** : 2026-07-21 → suppression du support `ezk_*` dans `api-key.ts`

---

## 7. Test mode keys — data isolation (Stripe-pattern)

Les test keys (`ez_pk_test_*`, `ez_sk_test_*`) ne sont PAS juste un prefix différent — elles activent un mode complet d'isolation des données. Pattern obligatoire pour tout SaaS qui touche aux user data.

- [ ] 🔴 P0 : Test keys et live keys du MÊME consumer ont leurs propres data sets isolés (pas de leak possible test ↔ live)
- [ ] 🔴 P0 : Middleware API extrait le `env` (live/test) du prefix de la key et l'attache à `req.mode`
- [ ] 🔴 P0 : TOUTES les queries DB sont scopées par `isTestMode: req.mode === 'test'` (filter automatique en base)
- [ ] 🔴 P0 : Stripe pay-sdk : si la key est test → utiliser `STRIPE_TEST_SECRET_KEY` (sinon `STRIPE_SECRET_KEY` live)
- [ ] 🔴 P0 : Webhook handlers test/live dispatch séparé (header `Stripe-Signature-Test` ou endpoint `/api/webhooks/stripe-test`)
- [ ] 🟠 P1 : Dashboard toggle "Live / Test" persistant via cookie, banner visible "TEST MODE"
- [ ] 🟠 P1 : Quotas illimitées en test, billing désactivé sur test data
- [ ] 🟠 P1 : Test data flushable par admin (audit-logged)

(cf. `standard-saas-data.md` §4 pour le pattern complet)

---

## 8. Checklist audit

Avant merge d'un PR touchant les clés API :

- [ ] Tous les nouveaux prefixes suivent `ez_(pk|sk)_(live|test)_`
- [ ] Pas de `scope`, `appName`, `admin` dans le prefix
- [ ] Clés secret jamais exposées en `NEXT_PUBLIC_*`
- [ ] Backwards compat `ezk_*` fonctionne en lecture (tests)
- [ ] Warning loggé sur usage legacy
- [ ] README du service mis à jour avec le nouveau format
- [ ] `.env.example` du service mis à jour
- [ ] Seed script idempotent (tests)
- [ ] Test mode isolation testée (live key ne peut PAS read/write test data, ni inverse)
