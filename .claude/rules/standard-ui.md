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

## 2. Responsive (OBLIGATOIRE)

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

## 3. Dark mode

- [ ] Chaque composant fonctionne en light ET dark mode
- [ ] Utiliser les couleurs semantiques (auto-switch via ThemeProvider)
- [ ] Tester avec `data-theme="dark"` / ThemeProvider
- [ ] Pas de prefixe `dark:` si les couleurs semantiques sont correctement utilisees
- [ ] Exception : `dark:` autorise pour des ajustements fins (opacite, ombre) qui ne sont pas couverts par les tokens

---

## 4. Composants layout (packages/ui/)

### 4.1 Layouts disponibles

| Composant         | Usage                                          | Mobile behavior                  |
| ----------------- | ---------------------------------------------- | -------------------------------- |
| `DashboardLayout` | Sidebar + header + main content                | Sidebar collapse en drawer       |
| `LandingLayout`   | Hero + sections + CTA + footer                 | Stack vertical, CTA plein width  |
| `SidebarNav`      | Navigation sidebar collapsible                 | Drawer overlay                   |
| `TopNav` / `Header` | Header responsive avec navigation            | Hamburger menu                   |
| `MobileNav`       | Bottom nav ou drawer pour mobile               | Visible uniquement sous `md:`    |

### 4.2 Regles layout

- [ ] Pure layout shells — ZERO logique metier, ZERO auth, ZERO appels API
- [ ] Acceptent `children` pour la composition
- [ ] Props de configuration (collapsed, onToggle, etc.) — pas d'etat global
- [ ] Slots nommes quand necessaire (`header`, `sidebar`, `footer` via props)

---

## 5. Separation des responsabilites — Quoi va OU

| Couche                     | Contenu                                                      | Exemples                                                    |
| -------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| `packages/ui/`             | Layouts, typographie, forms, data display, feedback, navigation (visuel uniquement) | `Card`, `Button`, `Input`, `DashboardLayout`, `Modal`, `Badge` |
| `auth-sdk/components/`     | Composants metier auth                                       | `SignInForm`, `UserDashboard`, `AdminDashboard`, `UserSettings` |
| `pay-sdk/components/`      | Composants metier paiement                                   | `PricingPage`, `CheckoutFlow`, `BillingDashboard`           |
| `ai-sdk/components/`       | Composants metier IA                                         | `ChatPanel`, `PromptEditor`                                 |
| `apps/<app>/web/components/` | Composition UNIQUEMENT (import + render)                   | Pages qui assemblent SDK + UI, zero composant custom        |

### 5.1 Regles d'import (sens unique)

```
packages/ui/  <--  SDK components/  <--  app web/
                   (peut utiliser ui)      (peut utiliser SDK + ui)
```

- `packages/ui/` n'importe JAMAIS depuis un SDK ou une app
- SDK `components/` importe depuis `packages/ui/` et son propre `core/` + `react/`
- App web importe depuis SDK et `packages/ui/` — zero composant custom

---

## 6. `<Tag />` usage

- [ ] `<Tag />` (`Div`, `Span`, `P`, `H1`-`H6`, `Section`, `Main`, etc.) est pour la structure de page au niveau app uniquement
- [ ] `packages/ui/` ne depend PAS de Tag en interne — utilise du HTML semantique ou ses propres abstractions
- [ ] Les SDK components PEUVENT utiliser Tag pour le layout dans leur arbre composant
- [ ] Dans les apps : preferer Tag aux elements HTML natifs pour la structure

---

## 7. Audit grep commands

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

## 8. Checklist audit rapide

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
