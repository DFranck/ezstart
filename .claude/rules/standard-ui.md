# Standard UI — checklist packages/ui/ et SDK components

**Source de verite pour TOUS les composants UI dans `packages/ui/` et les couches `components/` des SDK.** Complementaire a `standard.md` (packages generaux) et `ui.md` (regles d'usage dans les apps). Chaque audit verifie ce checklist. Pas d'exception.

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

| Question | Compound | Abstraction |
|----------|----------|-------------|
| Can the consumer reorder sections? | Yes | No |
| Must every instance look the same? | No | Yes |
| Is it a layout/container? | Usually | Rarely |
| Is it a specific UI pattern? | Rarely | Usually |
| Examples | DashboardLayout, Card, Tabs | Modal, PricingCard, AlertDialog, Toast |

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

| Level | Composant | Role | Contains |
|-------|-----------|------|----------|
| **Global shell** | `AppLayout` | Header + Main + Footer, same on EVERY page | `AppHeader`, `AppMain`, `AppFooter` |
| **Content layout** | `DashboardLayout` | Sidebar + content, for dashboard/admin pages | Goes INSIDE `AppMain` |
| **Content sections** | `LandingHeroSection`, `LandingSection` | Landing page content blocks | Go INSIDE `AppMain` |

**Rules:**
- The header and footer come from `AppLayout`, NEVER from individual pages
- `DashboardLayout` lives inside `AppMain` (it handles sidebar + content area)
- `LandingHeroSection` / `LandingSection` live inside `AppMain` (they handle content blocks)
- `ClientLayout` and `LandingLayout` (header/footer parts) are **deprecated** — use `AppLayout` instead

### 5.1b Legacy layouts (deprecated)

| Composant         | Usage                                          | Replacement |
| ----------------- | ---------------------------------------------- | ----------- |
| `ClientLayout`    | All-in-one props-based layout                  | `AppLayout` compound system |
| `LandingLayout`   | Landing shell with header + footer             | `AppLayout` compound system |
| `LandingHeader`   | Landing page header                            | `AppHeader` |
| `LandingFooter`   | Landing page footer                            | `AppFooter` + `FooterColumn` + `FooterLink` + `FooterBrand` |

### 5.2 Regles layout

- [ ] Pure layout shells — ZERO logique metier, ZERO auth, ZERO appels API
- [ ] Acceptent `children` pour la composition
- [ ] Props de configuration (collapsed, onToggle, etc.) — pas d'etat global
- [ ] Slots nommes quand necessaire (`header`, `sidebar`, `footer` via props)

---

## 6. Separation des responsabilites — Quoi va OU

| Couche                     | Contenu                                                      | Exemples                                                    |
| -------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| `packages/ui/`             | Layouts, typographie, forms, data display, feedback, navigation (visuel uniquement) | `Card`, `Button`, `Input`, `DashboardLayout`, `Modal`, `Badge` |
| `auth-sdk/components/`     | Composants metier auth                                       | `SignInForm`, `UserDashboard`, `AdminDashboard`, `UserSettings` |
| `pay-sdk/components/`      | Composants metier paiement                                   | `PricingPage`, `CheckoutFlow`, `BillingDashboard`           |
| `ai-sdk/components/`       | Composants metier IA                                         | `ChatPanel`, `PromptEditor`                                 |
| `apps/<app>/web/components/` | Composition UNIQUEMENT (import + render)                   | Pages qui assemblent SDK + UI, zero composant custom        |

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
