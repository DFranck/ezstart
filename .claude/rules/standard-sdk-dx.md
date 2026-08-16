# Standard SDK DX — Developer Experience for SDKs

Source de vérité DX pour tout SDK publishable npm @ezstart (auth-sdk, pay-sdk, ai-sdk, ui, futurs). Aligné sur Stripe / Clerk / Vercel SDK patterns. Complémentaire à `standard.md` (les 7 critères de base).

## Légende des priorités

- **🔴 P0 / MVP** — bloquant pour publish public npm (un dev doit pouvoir installer + démarrer en < 5 min)
- **🟠 P1 / V1** — nécessaire dans les 3 mois (changelog, migration guides, error UX)
- **🟡 P2 / V2** — devient "vraiment pro" (interactive docs, codegen)
- **🟢 P3 / V3+** — excellence (SDK polyglot, GraphQL codegen)
- **⚡ QW** — Quick Win, < 1 jour

---

## 1. Versioning / changelog

- [ ] 🔴 P0 : `CHANGELOG.md` mandatory (format Keep a Changelog) — chaque release documenté (1h init + workflow récurrent)
- [ ] 🔴 P0 : Semver strict — `breaking → major`, `feature → minor`, `fix → patch`. Aucun breaking sans major bump.
- [ ] 🟠 P1 : Changesets (`@changesets/cli`) automatise versioning + changelog (1 jour setup global monorepo)
- [ ] 🟠 P1 : Migration guide par breaking change — pattern `MIGRATION-v2.md` à la racine du package (workflow par release majeure)
- [ ] 🟡 P2 : Auto-generated release notes from changesets (config CI)
- [ ] 🟡 P2 : Deprecation warnings — `console.warn('[deprecated] X is removed in v3, use Y instead')` 2 versions avant suppression

## 2. Documentation

- [ ] 🔴 P0 : `README.md` structure standardisée (cf. `standard.md` section 6) — Install, Quickstart, API, Migration, Related
- [ ] 🔴 P0 : Quickstart < 5 minutes — un dev arrive, copy-paste, ça marche (test concret avec un dev externe)
- [ ] 🔴 P0 : `@example` JSDoc sur chaque export public (compilable, pas de pseudo-code)
- [ ] 🟠 P1 : Examples directory `packages/<sdk>/examples/<use-case>/` — code complet par cas d'usage (3-5 jours par SDK)
- [ ] 🟠 P1 : API reference auto-générée (TypeDoc OU JSDoc → markdown) (1 jour setup)
- [ ] 🟠 P1 : Quickstart 3 niveaux (components > hooks > core) si SDK avec split (cf. standard.md section 0bis)
- [ ] 🟡 P2 : Interactive docs (Mintlify / Nextra / VitePress) avec live code samples (1 semaine)
- [ ] 🟡 P2 : Video tutorial 3-5 min par SDK (Loom / YouTube) (1-2 jours par video)

## 3. TypeScript types

- [ ] 🔴 P0 : Types exportés explicitement — pas seulement inférés implicitement (audit `.d.ts` build output)
- [ ] 🔴 P0 : Public API surface typée à 100% — zero `any`, zero `unknown` non-justifié
- [ ] 🔴 P0 : Generic types pour les réponses (`<T>`) — ex: `apiQuery<User>(...)`
- [ ] 🟠 P1 : `tsdoc` syntax dans JSDoc (`@param`, `@returns`, `@throws`, `@example`)
- [ ] 🟡 P2 : Branded types pour les IDs (`UserId = string & { readonly __brand: 'UserId' }`) (3 jours par SDK)
- [ ] 🟡 P2 : Types runtime (Zod schema) co-located avec types compile-time (déjà OK partiel)

## 4. Error handling DX

- [ ] 🔴 P0 : Error class typée custom (`AuthError`, `PayError`, `AIError`) — extends Error avec `code`, `statusCode`, `details`
- [ ] 🟠 P1 ⚡QW : Error messages actionables — `"Email already taken — try /forgot-password"` au lieu de `"Conflict"` (audit + rewrite tous les error messages, 4-8h par SDK)
- [ ] 🟠 P1 : Error codes standardisés (`AUTH_INVALID_CREDENTIALS`, `PAY_CARD_DECLINED`) — devs peuvent switch dessus
- [ ] 🟠 P1 : `parseApiError(response)` utility documentée (déjà OK api-sdk)
- [ ] 🟡 P2 : Error link vers docs (`See https://docs.ezstart.xyz/errors/AUTH_INVALID_CREDENTIALS`)

## 5. Quickstart UX

- [ ] 🔴 P0 : `npm install @ezstart/<sdk>` — un seul package suffit (pas de 5 sub-packages requis)
- [ ] 🔴 P0 : Default config sensible — un dev qui copy-paste a un setup fonctionnel sans tweaks
- [ ] 🔴 P0 : ENV variables documentées avec exemples (cf. `env.md`)
- [ ] 🟠 P1 : CLI scaffold (`npx create-ezstart-app`) génère un projet starter (1-2 semaines)
- [ ] 🟡 P2 : Stack-specific quickstarts (Next.js / Remix / SvelteKit / vanilla) (3 jours par stack)

## 6. API design

- [ ] 🔴 P0 : Naming consistent — `getUser`, `listUsers`, `createUser`, `updateUser`, `deleteUser` (REST verbs) ou query/mutate (GraphQL)
- [ ] 🔴 P0 : Async-first — toutes les méthodes I/O retournent `Promise`
- [ ] 🔴 P0 : `AbortSignal` supporté sur toutes les méthodes async (cancel mid-request) — déjà OK api-sdk
- [ ] 🟠 P1 : Builder pattern pour les configs complexes (`new EzAuthClient().withApp().withAuth().build()`) si > 5 options
- [ ] 🟠 P1 : Method chaining quand pertinent
- [ ] 🟡 P2 : Async iterators pour les listes paginées (`for await (const user of client.users.list())`) (1 semaine par SDK)

## 7. Testing / quality

- [ ] 🔴 P0 : Vitest + couverture documentée par domain (déjà standard.md section 5)
- [ ] 🔴 P0 : Build passe sur Node 18 + 20 + 22 (tester en CI)
- [ ] 🔴 P0 : Tree-shaking validé (`sideEffects: false` + import named seulement)
- [ ] 🟠 P1 : Bundle size badge dans README (bundlephobia)
- [ ] 🟠 P1 : E2E test du SDK via une app consumer (déjà OK partiel)
- [ ] 🟡 P2 : Contract tests SDK (consumer-driven via Pact) (1-2 semaines)
- [ ] 🟢 P3 : Mutation testing (Stryker) (3-5 jours)

## 8. SDK split layers (cf. standard.md section 0bis)

Pour les SDK consumer-facing avec UI :

- [ ] 🔴 P0 : `core/` agnostique React (peut être consumé en Vue/Svelte/vanilla)
- [ ] 🔴 P0 : `react/` — Provider + hooks
- [ ] 🔴 P0 : `components/` — UI drop-in (peer dep `@ezstart/ui`)
- [ ] 🔴 P0 : 3 entry points dans `package.json` exports (`.`, `./core`, `./components`)
- [ ] 🔴 P0 : Imports unidirectionnels (`core` → `react` → `components`, jamais l'inverse)

## 9. SDK text props (i18n-agnostic)

- [ ] 🔴 P0 : Tout texte user-facing dans un component SDK est props-driven avec defaults English
- [ ] 🔴 P0 : Pas de `useTranslations()` ni dépendance i18n dans les SDK
- [ ] 🟠 P1 : Texts grouped par feature (`signInTexts`, `pricingTexts`, `dashboardTexts`) — types exportés
- [ ] 🟠 P1 : Default English exports (`defaultSignInTexts`) consumable comme starting point

## 10. SDK distribution

- [ ] 🔴 P0 : `package.json` publishable (cf. standard.md section 4 — tous les champs requis)
- [ ] 🔴 P0 : `npm publish --access public` (ou `--access restricted` si payant)
- [ ] 🔴 P0 : Repository GitHub public (ou repo dédié si SDK séparé)
- [ ] 🟠 P1 : GitHub Actions auto-publish on tag (`v*.*.*` → npm publish + GitHub Release)
- [ ] 🟠 P1 : npm provenance (`--provenance` flag, supply chain attestation) (1h)
- [ ] 🟡 P2 : Multiple registries (npm public + GitHub Packages mirror) (1 jour)

## 11. Discoverability

- [ ] 🔴 P0 : `keywords` dans package.json incluent domaine + framework (`auth`, `nextjs`, `react`, `oauth`)
- [ ] 🟠 P1 : npm README rendu correctement (badges, screenshots si UI SDK)
- [ ] 🟠 P1 : `@ezstart/<sdk>` linked depuis ezstart.xyz site
- [ ] 🟡 P2 : Article de lancement (Hacker News / dev.to / Vercel blog si partenariat)
- [ ] 🟡 P2 : SDK comparison vs concurrents (Clerk/Auth0/Supabase) sur landing

## 11bis. Defensive programming (cross-tab, SSR, HMR resilience)

Tout SDK qui touche à des browser APIs cross-instance (BroadcastChannel, localStorage, IndexedDB, WebSocket, ServiceWorker, MessageChannel) DOIT être défensif. HMR + StrictMode unmount + multi-tab chaos peuvent casser les channels ou les handles sous nos pieds.

### 11bis.1 BroadcastChannel — wrap + flag

- [ ] 🔴 P0 : Tout `channel.postMessage(...)` wrappé en `try/catch` avec un flag `channelOpen` qui passe à `false` au premier `InvalidStateError` (HMR / StrictMode unmount peuvent fermer le channel sous nos pieds).
- [ ] 🔴 P0 : `channel.close()` appelé dans le cleanup du Provider (`useEffect` return)
- [ ] 🟠 P1 : Logger.warn (jamais throw) sur le premier échec → l'app continue à fonctionner même si la cross-tab sync est cassée

```ts
// ✅ BON — packages/auth-sdk/src/react/store.ts
let authChannel: BroadcastChannel | null = null
let channelOpen = false

if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    authChannel = new BroadcastChannel('ezstart-auth')
    channelOpen = true
  } catch {
    // SSR / unsupported browser — silent
  }
}

function broadcast(event: AuthBroadcastEvent) {
  if (!channelOpen || !authChannel) return
  try {
    authChannel.postMessage(event)
  } catch {
    // HMR or StrictMode unmount closed the channel under our feet
    channelOpen = false
  }
}

// ❌ INTERDIT — throw en HMR
authChannel.postMessage(event) // InvalidStateError after HMR reload
```

### 11bis.2 Anti-patterns INTERDITS — defensive programming

- ❌ `channel.postMessage(...)` direct sans try/catch
- ❌ `localStorage.setItem(...)` sans try/catch (Safari private mode throws)
- ❌ `WebSocket.send(...)` sans check `readyState === OPEN`
- ❌ Singleton handle créé au top-level d'un module sans cleanup (memory leak HMR)
- ❌ Provider qui assume que `useEffect` cleanup s'exécute (StrictMode double-mount)

### 11bis.3 Audit grep

```bash
# postMessage sans try/catch
grep -rn "postMessage" packages/ apps/ --include="*.ts" --include="*.tsx" | grep -v "// allowed\|test"

# localStorage sans try/catch (heuristique)
grep -rnE "localStorage\.(setItem|getItem|removeItem)\(" packages/ --include="*.ts" --include="*.tsx" | grep -v "try\|test"
```

---

## 11ter. Auth lifecycle SDK — Logout flow obligatoire

Tout SDK auth (auth-sdk, futurs auth wrappers) DOIT chaîner ces 8 étapes dans son `logout()` / handler. Skipper une étape = bug invisible (cross-tab desync, cache stale, redirect manquant, etc.).

- [ ] 🔴 P0 : Étape 1 — POST `/api/auth/logout` (server revoke refresh token + clear cookies httpOnly + audit log)
- [ ] 🔴 P0 : Étape 2 — Reset Zustand / context store local (`isAuthenticated: false`, `user: null`)
- [ ] 🔴 P0 : Étape 3 — Reset persist localStorage (`localStorage.removeItem('ezauth-store')`)
- [ ] 🔴 P0 : Étape 4 — Cross-tab BroadcastChannel notification (`{ type: 'LOGOUT' }`)
- [ ] 🔴 P0 : Étape 5 — Run consumer `onLogout` hook (clear React Query cache, etc.) — exposé via Provider config
- [ ] 🔴 P0 : Étape 6 — Toast confirmation (`signOutSuccess` text via `texts` prop, EN default)
- [ ] 🔴 P0 : Étape 7 — Hard redirect to `/` (ou `redirectAfterLogout` configurable via Provider) — `window.location.assign()` PAS `router.push()` (force fresh state)
- [ ] 🔴 P0 : Étape 8 — UserMenu (et autres CTAs) affiche état loading pendant le flow (`isLoggingOut: true` exposé par le store)

**Server-side** (cf. `standard-saas-security.md` §2) :

- [ ] 🔴 P0 : Endpoint `/api/auth/logout` rate-limited (preset `strict`)
- [ ] 🔴 P0 : CSRF-protected (cookie auth = SameSite + same-origin check)
- [ ] 🔴 P0 : Refresh token revoke + cookie clear (Set-Cookie expired)
- [ ] 🔴 P0 : Audit log (`{ action: 'logout', userId, ip, userAgent, timestamp }`)

```ts
// ✅ BON — packages/auth-sdk/src/react/store.ts logout action
async function logout() {
  set({ isLoggingOut: true })
  try {
    await client.logout() // 1. server revoke
  } catch {
    // ignore — local cleanup must proceed
  }
  set({
    // 2. reset store
    user: null,
    isAuthenticated: false,
    isLoggingOut: false,
  })
  localStorage.removeItem('ezauth-store') // 3. clear persist
  broadcast({ type: 'LOGOUT' }) // 4. cross-tab
  config.onLogout?.() // 5. consumer hook
  toast.success(texts.signOutSuccess) // 6. toast
  window.location.assign(config.redirectAfterLogout ?? '/') // 7. hard redirect
}
```

### 11ter.1 Anti-patterns INTERDITS — Logout

- ❌ `router.push('/')` au lieu de `window.location.assign('/')` → state reste en mémoire React, bug
- ❌ Skip étape 4 (broadcast) → tabs restent loggées après logout dans une autre tab
- ❌ Skip étape 5 (consumer hook) → React Query cache garde les data privées
- ❌ Skip étape 1 (server) → refresh token reste valide, attacker peut re-login
- ❌ `await client.logout()` sans try/catch → si server fail, le local stay logged-in (UI ment)

---

## 11quater. Auth login redirect — same-origin SDK default

Tout SDK auth (`<SignInForm>`, `<RegisterForm>`, équivalents) DOIT résoudre `redirectUri` lui-même selon priorité :

- [ ] 🔴 P0 : Priorité 1 — `redirectUri` prop explicite (caller knows best)
- [ ] 🔴 P0 : Priorité 2 — `?redirect_uri=` URL search param (cross-app SSO arrival)
- [ ] 🔴 P0 : Priorité 3 — Same-origin default → `${origin}/{locale}/dashboard`
- [ ] 🔴 P0 : Cross-origin call → exchange code via `/api/auth/callback` (consumer-side route nécessaire)
- [ ] 🔴 P0 : Same-origin call → SDK exchange le code lui-même via `handleCallback()` AVANT navigation (zero bounce)

```tsx
// ✅ BON — packages/auth-sdk/src/components/SignInForm.tsx
function resolveRedirectUri(props: SignInFormProps): string {
  // 1. Explicit prop wins
  if (props.redirectUri) return props.redirectUri

  // 2. URL param (cross-app SSO)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get('redirect_uri')
    if (fromUrl) return fromUrl
  }

  // 3. Same-origin default — SDK provides the canonical default
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const locale = props.locale ?? 'en'
  return `${origin}/${locale}/dashboard`
}
```

### 11quater.1 Anti-patterns INTERDITS — Login redirect

- ❌ Consumer (LoginClient.tsx) qui calcule lui-même un défaut → drift garanti entre apps
- ❌ Hardcode `redirectUri="/dashboard"` sans locale → 307 redirect inutile
- ❌ Force le bounce par `/auth/callback` quand same-origin → flash + 1 round-trip inutile
- ❌ SDK qui throw si `redirectUri` non fourni → mauvais DX, le SDK doit fournir le défaut

---

## 11quinquies. Loading state SDK — full-viewport Spinner pattern

Quand un composant SDK est en loading state full-page (auth in progress, dashboard hydrating, plan fetching pour gate, etc.) :

- [ ] 🔴 P0 : `<Div className="fixed inset-0 z-40 flex items-center justify-center bg-background" aria-busy="true" role="status" aria-label={text}>` — full viewport, accessible
- [ ] 🔴 P0 : Inner = `<Spinner variant="primary" size="lg" text={text} />` (jamais skeleton générique mal centré)
- [ ] 🔴 P0 : Skeletons réservés aux cas où le shape final EST connu (data list avec rows count) — sinon spinner
- [ ] 🟠 P1 : Texte traductible via prop `loadingText` (defaut English, override via `texts.loading`)
- [ ] 🟠 P1 : Composant exporté depuis `@ezstart/<sdk>/components` pour réutilisation (`<RequireAuthLoader>`, `<DashboardSkeleton>`, etc.)

```tsx
// ✅ BON — packages/auth-sdk/src/components/RequireAuthLoader.tsx
import { Div, Spinner } from '@ezstart/ui/components'

export function RequireAuthLoader({ text = 'Authenticating…' }: { text?: string }) {
  return (
    <Div
      className="fixed inset-0 z-40 flex items-center justify-center bg-background"
      role="status"
      aria-busy="true"
      aria-label={text}
    >
      <Spinner variant="primary" size="lg" text={text} />
    </Div>
  )
}

// ❌ INTERDIT — skeleton grid mal centré quand le shape est inconnu
;<Div className="grid grid-cols-3 gap-4">
  <Skeleton className="h-32" />
  <Skeleton className="h-32" />
  <Skeleton className="h-32" />
</Div>
```

### 11quinquies.1 Anti-patterns INTERDITS — Loading

- ❌ Skeleton grid quand le shape final n'est pas le grid attendu (3 cards skeleton → user voit 1 hero après load → flash)
- ❌ `<Spinner>` minuscule au milieu d'un container vide (perte de contexte, user pense que c'est cassé)
- ❌ White screen of death pendant la 1re seconde (no aria-busy, no spinner, no skeleton)
- ❌ Loading state qui occupe l'écran > 3s sans progress hint (utiliser `<Progress>` ou message explicatif)

---

## 11sexies. SSR companion `getServer<X>()` mandatory

Tout composant SDK qui fetch des données runtime (api keys, audit log, plans, applications, user settings, etc.) DOIT avoir un helper companion `getServer<X>()` exporté depuis `@ezstart/<sdk>/server` qui prend `cookieHeader` + `apiUrl` et retourne le state initial. Le composant accepte `initial<X>` prop pour bootstrap SSR.

- [ ] 🔴 P0 : `packages/<sdk>/src/server/get-server-<x>.ts` exporté depuis `./server` entry point
- [ ] 🔴 P0 : Top du fichier = `import 'server-only'` (Next.js bloque l'import client-side)
- [ ] 🔴 P0 : Signature standard : `getServer<X>({ apiUrl, cookieHeader }): Promise<<X>State | null>`
- [ ] 🔴 P0 : Le composant client accepte `initial<X>` prop, hydrate le store/context au mount, fetch en revalidate post-hydration uniquement
- [ ] 🔴 P0 : `package.json` exports inclut `./server` entry point (3 entry points : `.`, `./core`, `./server`, `./components`)
- [ ] 🟠 P1 ⚡QW : Pattern documenté dans le README quickstart "Quickstart — Next.js SSR"

```ts
// ✅ BON — packages/auth-sdk/src/server/get-server-auth.ts
import 'server-only'
import { createAuthClient } from '../core/auth-client.js'
import type { AuthUser } from '../core/types.js'

export async function getServerAuth(opts: {
  apiUrl: string
  cookieHeader?: string
}): Promise<AuthUser | null> {
  if (!opts.cookieHeader) return null
  const client = createAuthClient({ apiUrl: opts.apiUrl })
  try {
    return await client.getMe({ headers: { cookie: opts.cookieHeader } })
  } catch {
    return null
  }
}
```

```tsx
// ✅ BON — apps/<app>/web/src/app/[locale]/layout.tsx
import { getServerAuth } from '@ezstart/auth-sdk/server'

export default async function LocaleLayout({ children }) {
  const cookieHeader = (await headers()).get('cookie') ?? undefined
  const initialUser = await getServerAuth({
    apiUrl: process.env.NEXT_PUBLIC_EZAUTH_API_URL!,
    cookieHeader,
  })
  return <AuthProvider initialUser={initialUser}>{children}</AuthProvider>
}
```

### 11sexies.1 Anti-patterns INTERDITS — SSR companion

- ❌ `useEffect(() => fetch(...))` comme source primaire dans un SDK component → flash garanti
- ❌ SDK qui n'expose pas de `/server` entry point → consumer doit re-implémenter à la main
- ❌ `getServer<X>()` qui jette au lieu de retourner `null` → casse le SSR si l'API est down
- ❌ `getServer<X>()` qui retourne du React (au lieu d'un state initial typé)
- ❌ Manque `import 'server-only'` au top → un consumer peut accidentellement importer client-side et leak le cookie

---

## 12. Audit grep commands

```bash
# Changelog présent et formatté
test -f packages/<sdk>/CHANGELOG.md && head -20 packages/<sdk>/CHANGELOG.md

# Examples directory
ls packages/<sdk>/examples/ 2>/dev/null

# any/unknown leak in public types
grep -rnE "\bany\b|: unknown" packages/<sdk>/dist/index.d.ts 2>/dev/null

# Tree-shaking marker
grep "\"sideEffects\":" packages/<sdk>/package.json

# Custom Error class
grep -rn "class.*Error extends Error" packages/<sdk>/src/

# Default texts exported (i18n agnostic)
grep -rn "defaultTexts\|defaultSignInTexts\|defaultPricingTexts" packages/<sdk>/src/

# Hardcoded user-facing strings (should be props)
grep -rnE ">[A-Z][a-z]+( [a-z]+){2,}</" packages/<sdk>/src/components/ --include="*.tsx" | grep -v "// allowed"

# postMessage sans try/catch (BroadcastChannel défensif §11bis)
grep -rn "postMessage" packages/<sdk>/src/ --include="*.ts" --include="*.tsx" | grep -v "// allowed\|test"

# SDK server entry point exists (§11sexies)
ls packages/<sdk>/src/server/ 2>/dev/null && grep "\"./server\"" packages/<sdk>/package.json

# `import 'server-only'` au top de chaque fichier server/ (§11sexies)
grep -L "server-only" packages/<sdk>/src/server/*.ts 2>/dev/null

# Logout flow steps (§11ter) — UserMenu doit appeler les 8 étapes
grep -rn "logout\|signOut" packages/<sdk>/src/react/ --include="*.ts" --include="*.tsx"
```

## 13. Comparaison modèles pro

| SDK                | Quickstart time | Changelog         | Error UX                 | Bundle size   |
| ------------------ | --------------- | ----------------- | ------------------------ | ------------- |
| **Stripe.js**      | < 3 min         | Versioned + dates | Error codes + docs link  | ~20KB         |
| **Clerk Next**     | < 5 min         | Auto changesets   | Code + actionable msg    | ~50KB         |
| **Supabase**       | < 3 min         | GitHub Releases   | PostgrestError typed     | ~40KB         |
| **Vercel AI**      | < 5 min         | npm + blog post   | Provider-specific        | ~15KB         |
| **@ezstart cible** | < 5 min         | Changesets (P1)   | Custom Error + code (P0) | < 50KB target |

## 14. Checklist par SDK avant first npm publish

- [ ] README quickstart testé par dev externe
- [ ] CHANGELOG initial créé
- [ ] All public API typed
- [ ] Custom Error class typed
- [ ] Examples directory avec 1-2 use cases
- [ ] Tree-shaking validé
- [ ] Build pass Node 18+20+22
- [ ] npm publish dry-run ok
- [ ] Bundle size mesuré et documenté

## Related

- `standard.md` — les 7 critères package
- `standard-ui.md` — packages/ui specifics
- `standard-saas-keys.md` — API key conventions consumed by SDKs
- `env.md` — ENV variables for SDKs
