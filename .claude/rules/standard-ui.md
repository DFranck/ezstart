# Standard UI — checklist packages/ui/ et SDK components

**Source de verite pour TOUS les composants UI dans `packages/ui/` et les couches `components/` des SDK.** Complementaire a `standard.md` (packages generaux) et `ui.md` (regles d'usage dans les apps). Chaque audit verifie ce checklist. Pas d'exception.

## Légende des priorités

- **🔴 P0 / MVP** — bloquant pour launch first paying customer
- **🟠 P1 / V1** — nécessaire dans les 3 mois post-launch
- **🟡 P2 / V2** — devient "vraiment pro"
- **🟢 P3 / V3+** — excellence long-terme
- **⚡ QW** — Quick Win, < 1 jour, annotation EN PLUS de P\_

Items sans annotation = **🔴 P0** (la base non-négociable des composants UI). Voir `standard.md` pour le pattern global.

Domaines transverses détaillés :

- [`standard-saas-a11y.md`](./standard-saas-a11y.md) — WCAG 2.1 AA + ARIA
- [`standard-saas-perf.md`](./standard-saas-perf.md) — RSC, bundle, images, fonts

---

## 1. Architecture

### 1.1 Agnosticisme (packages/ui/)

- [ ] 100% agnostique monorepo, publishable npm standalone
- [ ] Zero dependance sur `@ezstart/config`, `@ezstart/logger`, ou tout package monorepo-specific
- [ ] Seules peer deps autorisees : `react`, `react-dom`, `tailwindcss`, `class-variance-authority`
- [ ] Pas de fetch, pas d'appels API, pas de logique metier
- [ ] Pas de `useTranslations()` ni de textes hardcodes — les labels viennent des props

### 1.2 Pattern composant standard

- [ ] Variants via CVA (`class-variance-authority`)
- [ ] Props typees avec interface exportee (`ComponentProps`)
- [ ] `forwardRef` quand le composant wraps un element HTML interactif (Input, Button, etc.)
- [ ] `displayName` defini pour les composants forwardRef
- [ ] Un fichier = un composant (ou un groupe coherent : Card + CardHeader + CardContent + CardFooter)
- [ ] Export depuis `packages/ui/src/components/index.ts`

### 1.3 Design system

- [ ] Couleurs : UNIQUEMENT tokens semantiques (`bg-primary`, `text-foreground`, etc.) — JAMAIS hardcode
- [ ] Espacement : echelle Tailwind uniquement (`p-4`, `gap-6`, etc.)
- [ ] Typographie : via design system tokens ou variants composant
- [ ] Bordures/ombres : via design system ou utilitaires Tailwind avec couleurs semantiques
- [ ] Animations : via design system ou Tailwind animate
- [ ] Tokens definis dans `packages/ui/src/lib/design-system/`
- [ ] Styles partages dans `packages/ui/src/styles/`

---

## 2. Component Patterns

Deux patterns fondamentaux pour structurer les composants. Le choix est critique : utiliser le mauvais pattern degrade l'UX ou explose la complexite.

### 2.1 Compound Components — le consumer controle la STRUCTURE

**Usage** : layouts, containers, sections ou l'ordre et le contenu varient selon le contexte.

**Exemples** : `DashboardLayout`, `Card`, `Dialog`, `Tabs`, `Accordion`

**Pattern** : parent + enfants nommes, chacun exporte separement. Le consumer compose librement.

```tsx
// Compound: consumer controls structure
<DashboardLayout>
  <DashboardSidebar>
    <SidebarNav>...</SidebarNav>
  </DashboardSidebar>
  <DashboardMain>
    <DashboardHeader>...</DashboardHeader>
    <DashboardContent>...</DashboardContent>
  </DashboardMain>
</DashboardLayout>
```

### 2.2 Abstraction Components — la structure est FIXE et uniforme

**Usage** : composants ou le pattern doit etre identique partout dans l'app.

**Exemples** : `Modal` (fixed: header+body+footer), `PricingCard` (fixed: name+price+features+CTA), `AlertDialog`, `Toast`

**Pattern** : un seul composant avec props, structure imposee en interne. Le consumer fournit le contenu via props, ne peut pas reordonner.

```tsx
// Abstraction: structure enforced, consumer fills content
<Modal
  isOpen={open}
  onClose={close}
  title="Edit Profile"
  footer={<Button>Save</Button>}
>
  {body content}
</Modal>

<PricingCard
  name="Pro"
  price={49}
  period="month"
  features={['Feature 1', 'Feature 2']}
  cta="Upgrade"
  onSelect={handleSelect}
/>
```

### 2.3 Decision rule

| Question                           | Compound                    | Abstraction                            |
| ---------------------------------- | --------------------------- | -------------------------------------- |
| Can the consumer reorder sections? | Yes                         | No                                     |
| Must every instance look the same? | No                          | Yes                                    |
| Is it a layout/container?          | Usually                     | Rarely                                 |
| Is it a specific UI pattern?       | Rarely                      | Usually                                |
| Examples                           | DashboardLayout, Card, Tabs | Modal, PricingCard, AlertDialog, Toast |

### 2.4 Anti-patterns

- **Compound when structure should be fixed** — leads to inconsistent UI across the app (every dev invents their own modal layout)
- **Props-based when structure should be flexible** — leads to prop explosion (`sidebar={}`, `header={}`, `footer={}`, `leftPanel={}`, etc.)
- **Duplicating a compound as an abstraction** — `PricingCard` is an abstraction OF `Card`, not a copy. It imports `Card` internally and enforces structure via props.

### 2.5 SDK abstractions

SDK components (`auth-sdk/components/`, `pay-sdk/components/`) are typically **abstractions** built ON TOP of `packages/ui/` compound components :

- `DeveloperPortal` uses `Card`, `DataTable`, `Modal` internally
- `PricingPage` uses `Card` (as PricingCard abstraction) + grid layout
- `AuthAdminDashboard` uses `DataTable`, `Modal`, `Badge`

The SDK consumer just does `<PricingPage />` — zero knowledge of the internals. The structure is enforced by the SDK, the consumer only provides configuration props.

---

## 2bis. UX states — loading / empty / error / optimistic

Every async or list-rendering component MUST handle these 4 states explicitly. Skipping any = bad UX = lost trust.

### 2bis.1 Loading state

- [ ] 🔴 P0 : `<Skeleton>` mandatory pour tout composant async > 100ms quand le shape final EST connu (avoid layout shift + blank screen)
- [ ] 🔴 P0 : Skeleton shape match le layout final (pas un spinner générique au milieu)
- [ ] 🔴 P0 : **Full-page loading state = `<Spinner>` centré full-viewport, JAMAIS skeleton générique mal centré** — pour auth in progress, dashboard hydrating, plan fetching pour gate, etc. Pattern : `<Div className="fixed inset-0 z-40 flex items-center justify-center bg-background" role="status" aria-busy="true" aria-label={text}><Spinner variant="primary" size="lg" text={text} /></Div>`. Skeletons réservés aux cas où le shape final EST connu (data list avec rows count). (cf. `standard-sdk-dx.md` §11quinquies)
- [ ] 🟠 P1 : Loading announced to screen readers (`aria-busy="true"` + sr-only text) — cf. `standard-saas-a11y.md` §3
- [ ] 🟡 P2 : Progressive loading (header first, content streaming via Suspense) — cf. `standard-saas-perf.md` §1

### 2bis.2 Empty state

- [ ] 🔴 P0 : Pattern obligatoire pour les listes vides — illustration + message + CTA
- [ ] 🔴 P0 : CTA actionnable ("Create your first invoice", "Invite a teammate")
- [ ] 🟠 P1 : Différencier "vide à cause de filtre" vs "vide totalement" (clear filters CTA si filtres actifs)
- [ ] 🟡 P2 : Empty state illustrations cohérentes (1 set par app)

### 2bis.3 Error state

- [ ] 🔴 P0 : Error UI avec retry button — JAMAIS de white screen of death
- [ ] 🔴 P0 : Error message actionable (`"Email already taken — try /forgot-password"` au lieu de `"409 Conflict"`)
- [ ] 🔴 P0 : Toast feedback systématique sur action async qui fail (via sonner)
- [ ] 🟠 P1 : Error tracking (Sentry/Bugsnag) — cf. `standard-saas-observability.md` §1
- [ ] 🟠 P1 : Distinguer error-réseau (offline) vs error-server (500) vs error-client (validation)
- [ ] 🟡 P2 : Auto-retry exponential backoff sur les fetchs idempotent

### 2bis.4 Optimistic updates

- [ ] 🟠 P1 : Optimistic UI sur les write actions fréquentes (toggle favorite, like, archive) — instant feedback + rollback si fail (1-2 jours par feature)
- [ ] 🟠 P1 : Pattern via React Query `useMutation` avec `onMutate` / `onError` rollback
- [ ] 🟡 P2 : Undo pour delete (toast 5s avec "Undo" CTA) (1 jour par feature)
- [ ] 🟡 P2 : Pending state visible pendant la requête (opacity 0.5 + spinner overlay)

### 2bis.5 Feedback

- [ ] 🔴 P0 ⚡QW : Toast feedback sur TOUTE action async (success + error) (audit grep `useMutation` sans toast)
- [ ] 🟠 P1 : Confirmation modal sur les destructive actions (`<AlertDialog>`)
- [ ] 🟡 P2 : Cmd+K command palette pour power-users (1-2 jours)
- [ ] 🟡 P2 : Keyboard shortcuts visibles (tooltips + page `/keyboard-shortcuts`)

### 2bis.6 Anti-patterns

- ❌ Spinner full-page bloquant SUR UNE PAGE qui a un shape final connu (utiliser skeleton pour matcher le layout)
- ❌ Skeleton grid mal centré quand le shape final n'est PAS le grid attendu (3 cards skeleton → user voit 1 hero après load → flash) — utiliser full-viewport `<Spinner>`
- ❌ `<Spinner>` minuscule au milieu d'un container vide (perte de contexte, user pense que c'est cassé) — utiliser le full-viewport pattern
- ❌ White screen of death pendant la 1re seconde (no aria-busy, no spinner, no skeleton)
- ❌ Empty list silencieuse sans CTA (utilisateur perdu)
- ❌ Error swallowed (catch sans toast/log) — bug invisible en prod
- ❌ Optimistic sans rollback (UI ment quand le serveur fail)
- ❌ Toast spam (1 toast par item dans un batch — utiliser un seul toast résumé)

---

## 3. Responsive (OBLIGATOIRE)

### 2.1 Regles

- [ ] TOUS les composants doivent etre responsive avec minimum 3 breakpoints : mobile / tablet / desktop
- [ ] Approche mobile-first : styles par defaut = mobile, `md:` pour tablet, `lg:` pour desktop
- [ ] Aucun composant ne peut etre desktop-only — le mobile DOIT fonctionner
- [ ] Breakpoints Tailwind : `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)

### 2.2 Patterns responsive

```tsx
// Mobile-first: default = mobile, md = tablet, lg = desktop
<div className="flex flex-col gap-2 md:flex-row md:gap-4 lg:gap-6">
  <aside className="w-full md:w-64 lg:w-80">...</aside>
  <main className="flex-1">...</main>
</div>
```

- [ ] Grid/flex layouts adaptent le nombre de colonnes par breakpoint
- [ ] Sidebar collapse en drawer/overlay sur mobile
- [ ] Navigation passe en bottom nav ou hamburger sur mobile
- [ ] Texte et espacement s'adaptent (`text-sm md:text-base lg:text-lg`)

---

## 4. Dark mode

- [ ] Chaque composant fonctionne en light ET dark mode
- [ ] Utiliser les couleurs semantiques (auto-switch via ThemeProvider)
- [ ] Tester avec `data-theme="dark"` / ThemeProvider
- [ ] Pas de prefixe `dark:` si les couleurs semantiques sont correctement utilisees
- [ ] Exception : `dark:` autorise pour des ajustements fins (opacite, ombre) qui ne sont pas couverts par les tokens

---

## 5. Composants layout (packages/ui/)

### 5.1 Layout hierarchy

Three levels, each with a distinct role. Never mix them.

| Level                | Composant                              | Role                                         | Contains                            |
| -------------------- | -------------------------------------- | -------------------------------------------- | ----------------------------------- |
| **Global shell**     | `AppLayout`                            | Header + Main + Footer, same on EVERY page   | `AppHeader`, `AppMain`, `AppFooter` |
| **Content layout**   | `DashboardLayout`                      | Sidebar + content, for dashboard/admin pages | Goes INSIDE `AppMain`               |
| **Content sections** | `LandingHeroSection`, `LandingSection` | Landing page content blocks                  | Go INSIDE `AppMain`                 |

**Rules:**

- The header and footer come from `AppLayout`, NEVER from individual pages
- `DashboardLayout` lives inside `AppMain` (it handles sidebar + content area)
- `LandingHeroSection` / `LandingSection` live inside `AppMain` (they handle content blocks)
- `ClientLayout` and `LandingLayout` (header/footer parts) are **deprecated** — use `AppLayout` instead

### 5.1b Legacy layouts (deprecated)

| Composant       | Usage                              | Replacement                                                 |
| --------------- | ---------------------------------- | ----------------------------------------------------------- |
| `ClientLayout`  | All-in-one props-based layout      | `AppLayout` compound system                                 |
| `LandingLayout` | Landing shell with header + footer | `AppLayout` compound system                                 |
| `LandingHeader` | Landing page header                | `AppHeader`                                                 |
| `LandingFooter` | Landing page footer                | `AppFooter` + `FooterColumn` + `FooterLink` + `FooterBrand` |

### 5.2 Regles layout

- [ ] Pure layout shells — ZERO logique metier, ZERO auth, ZERO appels API
- [ ] Acceptent `children` pour la composition
- [ ] Props de configuration (collapsed, onToggle, etc.) — pas d'etat global
- [ ] Slots nommes quand necessaire (`header`, `sidebar`, `footer` via props)

---

## 6. Separation des responsabilites — Quoi va OU

| Couche                       | Contenu                                                                             | Exemples                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/ui/`               | Layouts, typographie, forms, data display, feedback, navigation (visuel uniquement) | `Card`, `Button`, `Input`, `DashboardLayout`, `Modal`, `Badge`  |
| `auth-sdk/components/`       | Composants metier auth                                                              | `SignInForm`, `UserDashboard`, `AdminDashboard`, `UserSettings` |
| `pay-sdk/components/`        | Composants metier paiement                                                          | `PricingPage`, `CheckoutFlow`, `BillingDashboard`               |
| `ai-sdk/components/`         | Composants metier IA                                                                | `ChatPanel`, `PromptEditor`                                     |
| `apps/<app>/web/components/` | Composition UNIQUEMENT (import + render)                                            | Pages qui assemblent SDK + UI, zero composant custom            |

### 6.1 Layout consistency rule

- ALL SaaS apps MUST use the same layout compounds (`LandingLayout`, `DashboardLayout`)
- NO custom layouts per app — variations come from theme tokens and variants, not new components
- If a layout doesn't fit, extend the existing compound (add variants), don't create a new one

### 6.2 Reuse hierarchy (mandatory order)

1. `packages/ui/` compounds -> for layout, visual structure
2. SDK components (`auth-sdk`, `pay-sdk`) -> for business UI
3. App web -> ONLY composition (import + arrange), ZERO custom components
4. If a component is needed in 2+ apps -> it MUST be in a package, not the app

### 6.3 Regles d'import (sens unique)

```
packages/ui/  <--  SDK components/  <--  app web/
                   (peut utiliser ui)      (peut utiliser SDK + ui)
```

- `packages/ui/` n'importe JAMAIS depuis un SDK ou une app
- SDK `components/` importe depuis `packages/ui/` et son propre `core/` + `react/`
- App web importe depuis SDK et `packages/ui/` — zero composant custom

---

## 7. `<Tag />` usage

- [ ] `<Tag />` (`Div`, `Span`, `P`, `H1`-`H6`, `Section`, `Main`, etc.) est pour la structure de page au niveau app uniquement
- [ ] `packages/ui/` ne depend PAS de Tag en interne — utilise du HTML semantique ou ses propres abstractions
- [ ] Les SDK components PEUVENT utiliser Tag pour le layout dans leur arbre composant
- [ ] Dans les apps : preferer Tag aux elements HTML natifs pour la structure

---

## 8. Audit grep commands

```bash
# Couleurs hardcodees (interdit dans packages/ui/)
grep -rnE "bg-gray|bg-red|bg-blue|text-gray|text-red" packages/ui/src/ --include="*.tsx"

# HTML natif dans composants UI (minimiser)
grep -rnE "<div |<span |<button " packages/ui/src/components/ --include="*.tsx"

# Non-responsive (manque breakpoints dans layouts)
grep -L "md:" packages/ui/src/components/layout/ --include="*.tsx"

# Imports @ezstart/* dans UI (interdit sauf ui internals)
grep -rnE "@ezstart/(config|logger|api|auth|pay)" packages/ui/src/

# Console.log (interdit)
grep -rnE "console\.(log|warn|error)" packages/ui/src/ --include="*.tsx" --include="*.ts"

# Textes hardcodes dans UI (interdit — tout doit venir des props)
grep -rnE ">[A-Z][a-z]+( [a-z]+){2,}</" packages/ui/src/components/ --include="*.tsx"

# Composants sans forwardRef (verifier les interactifs)
grep -L "forwardRef" packages/ui/src/components/input.tsx packages/ui/src/components/button.tsx packages/ui/src/components/textarea.tsx

# Dark mode : prefixes dark: sans raison (devrait utiliser tokens semantiques)
grep -rnE "dark:" packages/ui/src/components/ --include="*.tsx" | grep -v "// allowed"
```

---

## 9. Checklist audit rapide

Avant chaque commit touchant `packages/ui/` ou un SDK `components/` :

- [ ] Agnostique : zero `@ezstart/*` dans `packages/ui/src/`
- [ ] Responsive : mobile + tablet + desktop testes
- [ ] Dark mode : light + dark fonctionnels
- [ ] Couleurs : zero hardcode, uniquement tokens semantiques
- [ ] Variants : CVA utilise, props typees
- [ ] Separation : pas de logique metier dans `packages/ui/`
- [ ] Exports : composant exporte depuis l'index
- [ ] forwardRef : sur les composants interactifs
- [ ] Taille : fichier < 400 lignes, composant < 300 lignes (cf. `standard.md` section 3)
- [ ] Tout `@deprecated` JSDoc a un runtime warning matching (cf. section 10)

---

## 10. Deprecation convention — `@deprecated` JSDoc DOIT avoir un runtime warning matching

**Regle dure** : un marqueur `@deprecated` JSDoc seul ne suffit pas. L'IDE le surface mais le dev qui utilise l'API ne le voit pas a runtime. Chaque API deprecated DOIT egalement emettre un warning au moment ou elle est consommee (mount component, prop usage), de-duplique par session, **visible en console dans tous les envs (dev + staging + prod)** + **toast en dev/staging seulement** (jamais de toast en prod, c'est UX noise pour l'utilisateur final).

**Pourquoi le warn console reste actif en prod** : une fois un error tracker branche (Sentry, Better Stack, Datadog, ...), ce hook capture les `console.warn` et surface les usages deprecated en prod sans qu'on ait a deployer un changement de comportement. Un no-op en prod = silence radio = on perd le signal dans l'environnement qui compte le plus.

### 10.1 Helpers fournis

- `warnDeprecation(name, replacement?, { toast? })` — exporte par `@ezstart/logger` (browser entry). De-duplique par `name` via un `Set` module-scoped. **`console.warn` toujours emis** (dev + staging + prod) avec prefix `[DEPRECATED]`. **`options.toast` invoque uniquement si `NODE_ENV !== 'production'`** (= dev + staging) pour eviter d'afficher un toast actionnable-par-l-operateur a un end user en prod. Le caller wires son toast (ex: `sonner`) — c'est safe de toujours le wirer, le helper gate l'invocation interne.
- `useDeprecationWarning(name, replacement?)` — hook React (`@ezstart/ui/hooks`). Wraps `warnDeprecation` avec un `useEffect` au mount, pre-cable sonner (`toast.warning` avec id stable + description + duration 8s). Necessite `'use client'`. Meme contrat de gating que le helper bas-niveau (warn console toujours, toast dev/staging only).
- `warnDeprecation(name, replacement?)` — version server (`@ezstart/logger/server`). Memes regles : warn Pino toujours emis (incl. prod) pour visibilite log sink / Sentry. Pas de notion de toast.

### 10.2 Pattern : composant entier deprecated (component-level)

Wrapper qui call le hook au debut du body, puis re-render le canonical avec les memes props.

```tsx
'use client'

import { useDeprecationWarning } from '../../hooks/use-deprecation-warning'
// ... import du canonical ...

export const Canonical = ...  // l'API stable

/**
 * @deprecated Use `Canonical` from @ezstart/ui/components instead.
 */
function DeprecatedDefaultCanonical(props: CanonicalProps) {
  useDeprecationWarning('Canonical default export', 'named export `Canonical` from @ezstart/ui/components')
  return <Canonical {...props} />
}

DeprecatedDefaultCanonical.displayName = 'DeprecatedDefaultCanonical'
export default DeprecatedDefaultCanonical
```

Exemples actifs : `Badge`, `Checkbox`, `Input`, `Dropdown`, `Modal` default exports + tous les `Landing*` legacy compound parts (`LandingHeader`, `LandingFooter`, etc.) + `ClientLayout`.

### 10.3 Pattern : prop ou valeur litterale deprecated (prop-level)

Pas le hook (qui fire au mount independamment). On utilise `warnDeprecation` direct dans un `useEffect` conditionne a la presence du prop / au match de la valeur.

```tsx
'use client'

import { useEffect } from 'react'
import { warnDeprecation } from '@ezstart/logger'
import { toast } from 'sonner'

export function DataTable({ tableSize, density, ...rest }: DataTableProps) {
  // Surface deprecation warning when consumer passes the legacy prop.
  useEffect(() => {
    if (tableSize !== undefined) {
      warnDeprecation('DataTable.tableSize', 'density prop', {
        toast: msg => toast.warning(msg),
      })
    }
  }, [tableSize])

  const resolvedDensity = density ?? tableSize ?? 'default'
  // ...
}
```

Pour une **valeur litterale deprecated** (ex: `size='md'` quand `'default'` est canonical) :

```tsx
useEffect(() => {
  if (sizeProp === ('md' as ModalSize)) {
    warnDeprecation("Modal size='md'", "size='default'", { toast: msg => toast.warning(msg) })
  }
}, [sizeProp])
```

Exemples actifs : `DataTable.tableSize`, `Modal size='md'`, `Spinner size='md'` + `textSize`, `Hero.alignment`, `SkeletonText.spacing`, `CTA.bgColor`, `CommandGroup.headingVariant`.

### 10.4 Pattern SDK : pas de couplage `@ezstart/logger` direct

Les SDK consumer-facing (`auth-sdk`, `pay-sdk`, ...) suivent leur propre pattern interne (`logger` silent-by-default importe depuis `internal-logger.ts` dans `auth-sdk`, `usePayLogger()` dans `pay-sdk`) pour ne pas coupler le bundle SDK a `@ezstart/logger` qui est `peerDependenciesMeta.optional` ou pas import en runtime.

```tsx
// pay-sdk component
import { usePayLogger } from '../react/pay-provider.js'

export function DonationCard({ appName, applicationId, ...props }: DonationCardProps) {
  const log = usePayLogger()

  if (appName && !applicationId && typeof window !== 'undefined') {
    log.warn('[pay-sdk] DonationCard `appName` prop is deprecated, use `applicationId` instead.')
  }
  // ...
}
```

Le consumer qui veut voir ces warnings wires un logger via `<PayProvider logger={...} />` / `<AuthProvider logger={...} />` qui peut router vers Sentry, console, toast, etc.

### 10.5 Cas particuliers

- **`'use client'` requis pour `useDeprecationWarning`** — le hook utilise `useEffect`. Si le fichier ne l'a pas et qu'il s'agit d'un Server Component, NE PAS ajouter `'use client'` au fichier entier (casse RSC). Plutot extraire le wrapper deprecated dans son propre fichier `'use client'` ou utiliser le pattern prop-level avec `typeof window !== 'undefined'` guard.
- **Type aliases purs** (ex: `/** @deprecated */ export type Foo = Bar`) ne peuvent pas avoir de warning runtime — l'import d'un type est zero-runtime. Skipper, le JSDoc IDE suffit.
- **De-duplication** : `warnDeprecation` dedupe par `name`. Choisir un `name` stable et descriptif (`'Modal default export'` plutot que `'Modal'` qui collide avec un eventuel warning sur le composant nomme).

### 10.6 Checklist quand on deprecate quelque chose

- [ ] (1) Ajouter le marqueur `@deprecated <message + migration path>` JSDoc sur la cible (component / prop / valeur litterale)
- [ ] (2) Ajouter le runtime warning matching (component-level via `useDeprecationWarning`, prop-level via `warnDeprecation` + `useEffect` conditionne)
- [ ] (3) Documenter le migration path dans le JSDoc (replacement nomme + lien vers doc / autre composant)
- [ ] (4) Garder la backcompat — la cible deprecated doit continuer de fonctionner identiquement, le warning est non-breaking
- [ ] (5) Choisir un `name` unique et descriptif pour le warning (suffix `' default export'` / `'.<propName>'` / `" <value>='<x>'"`)

### 10.7 Audit grep command

```bash
# Lister tous les `@deprecated` markers et verifier qu'un warning matching existe
grep -rn "@deprecated" packages/ui/src/components/ packages/auth-sdk/src/components/ packages/pay-sdk/src/components/ \
  --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v ".test."

# Pour chaque match, verifier qu'il existe un appel `useDeprecationWarning` ou `warnDeprecation` dans le meme fichier
```

> **Future enforcement** : ESLint rule custom `@ezstart/ezstart/deprecation-runtime-warning` — flagger les `@deprecated` JSDoc sans `useDeprecationWarning` / `warnDeprecation` matching dans le meme fichier (cf. `BACKLOG.md` STD-DEPRECATION-001).

### 10.8 Server-side deprecation (API routes)

Le pattern de runtime warning côté browser (cf. §10.3 prop-level / §10.4 component-level) ne couvre pas les routes API deprecated. Pour les endpoints HTTP, utiliser le middleware `deprecatedRoute()` de `@ezstart/api-core` :

```ts
import { deprecatedRoute } from '@ezstart/api-core'
import { logger } from '@ezstart/logger/server'

router.get(
  '/v1/users',
  deprecatedRoute({
    replacement: 'GET /api/v2/users',
    sunset: '2026-12-01',
    link: 'https://docs.ezstart.xyz/migration/v2',
    logger,
  }),
  listUsersV1
)
```

Le middleware :

- Set HTTP headers RFC 8594 (`Sunset`, `Deprecation: true`, `Warning: 299`, `Link: rel=sunset`)
- Log structured warn (`{ deprecated, replacement, sunset, ip, userAgent }`) via le `logger` injecté — Pino par défaut quand on passe `@ezstart/logger/server`, no-op silent quand aucun logger n'est fourni (api-core core reste agnostique)
- Visible dans error tracking (Sentry/Better Stack) une fois activé
- Le client SDK pourra (à terme) consommer automatiquement les headers `Deprecation`/`Warning` de la response et surfacer un toast (suivi `API-SDK-DEPRECATION-WARNING-001` dans BACKLOG)

**Checklist quand on deprecate une route API** :

- [ ] (1) `@deprecated` JSDoc sur le handler avec migration path
- [ ] (2) `deprecatedRoute({ replacement, sunset, link, logger })` middleware appliqué
- [ ] (3) Documenté dans le CHANGELOG du service (avec sunset date)
- [ ] (4) Migration guide en place avant la sunset date
- [ ] (5) Sunset = minimum 90 jours dans le futur (cf. `standard-saas-data.md` §2 deprecation policy)

**Audit grep** :

```bash
# Routes deprecated tracked via middleware
grep -rn "deprecatedRoute(" apps/*/api/src/routes/ packages/api-core/src/

# JSDoc @deprecated sur des handlers sans middleware matching
grep -rn "@deprecated" apps/*/api/src/routes/ --include="*.ts" | grep -v "deprecatedRoute"
```
