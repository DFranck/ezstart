## 🎨 UI/UX - Règles Strictes

### 1. JAMAIS de HTML Natif

❌ **INTERDIT** - Balises HTML natives :

```tsx
<div className="bg-white p-4">
  <h1>Title</h1>
  <p>Description</p>
  <button onClick={...}>Click</button>
  <input type="text" />
</div>
```

✅ **OBLIGATOIRE** - Composants `@ezstart/ui` :

```tsx
import { Card, CardHeader, CardContent, H1, P, Button, Input } from '@ezstart/ui/components'

<Card variant="floating">
  <CardHeader>
    <H1 size="h2">Title</H1>
    <P>Description</P>
  </CardHeader>
  <CardContent>
    <Input placeholder="Enter text" />
    <Button onClick={...}>Click</Button>
  </CardContent>
</Card>
```

**Composants disponibles :**

- **Layout** : `Card`, `CardHeader`, `CardContent`, `CardFooter`, `Main`, `Header`, `Footer`
- **Typography** : `H1`-`H6`, `P`, `Label`, `Text`
- **Forms** : `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`
- **Navigation** : `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- **Feedback** : `Alert`, `Badge`, `Toast` (via sonner)
- **Utility** : `Icon`, `Separator`, `Skeleton`, `Avatar`

### 2. Couleurs Sémantiques UNIQUEMENT

❌ **INTERDIT** - Couleurs hardcodées :

```tsx
className = 'bg-gray-100 text-gray-900 border-gray-200'
className = 'bg-indigo-500 text-white hover:bg-indigo-600'
className = 'text-red-600 bg-red-50'
```

✅ **OBLIGATOIRE** - Classes sémantiques :

```tsx
className = 'bg-card text-foreground border'
className = 'bg-primary text-primary-foreground hover:bg-primary/90'
className = 'text-destructive bg-destructive/10'
```

**Palette sémantique complète :**

| Contexte        | Classes                                                                   |
| --------------- | ------------------------------------------------------------------------- |
| **Background**  | `bg-background`, `bg-card`, `bg-muted`, `bg-popover`, `bg-accent`         |
| **Text**        | `text-foreground`, `text-muted-foreground`, `text-card-foreground`        |
| **Primary**     | `bg-primary`, `text-primary`, `text-primary-foreground`, `border-primary` |
| **Destructive** | `bg-destructive`, `text-destructive`, `text-destructive-foreground`       |
| **Border**      | `border` (auto), `border-input`, `border-ring`                            |
| **Status**      | `bg-success`, `bg-warning`, `bg-error`, `bg-info`                         |

**Avantages :**

- ✅ Dark mode automatique
- ✅ Thèmes cohérents
- ✅ Maintenance simplifiée
- ✅ Accessibilité garantie

### 3. Props variants/size TOUJOURS

✅ **Utiliser les variants** quand disponibles :

```tsx
<Card variant="floating" />     // "default" | "floating" | "ghost" | "elevated" | "premium"
<Button variant="destructive" size="sm" /> // variant + size
<H2 size="h3" />                // Rendu h2 avec style h3
```

### 4. Modal > Dialog — TOUJOURS utiliser `<Modal>`

❌ **INTERDIT** — `<Dialog>` direct hors `packages/ui/` :

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@ezstart/ui/components'

;<Dialog open={isOpen} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>...</DialogTitle>
    </DialogHeader>
    {body}
    <DialogFooter>{actions}</DialogFooter>
  </DialogContent>
</Dialog>
```

✅ **OBLIGATOIRE** — `<Modal>` qui abstrait Dialog avec max-h, sticky header/footer, scroll, size variants :

```tsx
import { Modal } from '@ezstart/ui/components'

;<Modal
  isOpen={isOpen}
  onClose={() => setOpen(false)}
  size="xl" // 'sm' | 'default' | 'lg' | 'xl' | 'full'
  title="Edit Prompt"
  description="Optional subtitle"
  footer={
    <>
      <Button>Cancel</Button>
      <Button>Save</Button>
    </>
  }
  scrollBehavior="inside" // 'inside' (body scroll) | 'outside' (page scroll)
>
  {body}
</Modal>
```

**Pourquoi** :

- Modal gère automatiquement `max-h-[90dvh]`, sticky header/footer, body scrollable
- Évite les bugs de débordement viewport (form long sans scroll)
- API React-friendly (`isOpen`/`onClose` au lieu de `open`/`onOpenChange`)
- Cohérence UX entre toutes les modals du monorepo

**Mapping `max-w-*` → `size`** :
| Tailwind | Modal size |
| -------- | ---------- |
| `max-w-md` | `'sm'` |
| `max-w-lg` | `'default'` |
| `max-w-xl` | `'lg'` |
| `max-w-2xl` | `'xl'` |
| `max-w-4xl`+ | `'full'` |

**Exceptions légitimes** : usage interne dans `packages/ui/` (ex: `welcome-modal.tsx`, `command.tsx`, `alert-dialog.tsx`). Lint pre-commit bloque les imports `Dialog*` direct hors UI kit.

### 5. Badge > custom span/div badge

❌ **INTERDIT** — `<span>`/`<div>`/`<Span>`/`<Div>` avec classes badge-like :

```tsx
<span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs">
  {label}
</span>
<Span className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
  {tag}
</Span>
```

✅ **OBLIGATOIRE** — `<Badge>` from `@ezstart/ui/components` :

```tsx
import { Badge } from '@ezstart/ui/components'

<Badge variant="default">{label}</Badge>
<Badge variant="outline" size="xs" className="text-muted-foreground">{tag}</Badge>
```

**Variants disponibles** : `default`, `secondary`, `primary`, `destructive`, `outline`, `success`, `warning`, `info`, `purple`, `cyan`, `indigo`, `pink`.
**Sizes** : `xs`, `sm`, `default`, `lg`, `xl` + variantes `circle` (`circleSize: sm|md|lg|xl`).
**Extras** : prop `dot` pour indicateur, prop `pulse` pour animation real-time.

**Exceptions légitimes** : couleurs custom non-prévues par les variants → utiliser `<Badge>` + `style`/`className` override pour la couleur uniquement, sans réinventer le pill.

Lint pre-commit (rule #8) bloque les patterns `inline-flex + rounded-(full|md|sm) + px-*` ou `rounded-full + px-* + text-(xs|sm|[10/11/12]px)` hors UI kit.

### 6. Button > custom inline link/button

❌ **INTERDIT** — `<a>`, `<button>` natif ou tag custom avec styles button :

```tsx
<a href={url} className="inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
  {label}
</a>
<button className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
  {label}
</button>
```

✅ **OBLIGATOIRE** — `<Button>` (avec `asChild` pour wrapper un Link/a) :

```tsx
import { Button } from '@ezstart/ui/components'

<Button variant="default" className="w-full gap-2">{label}</Button>

<Button asChild variant="default">
  <Link href={url}>{label}</Link>
</Button>
```

Lint pre-commit (rule #9) bloque les patterns `inline-flex + rounded-(md|lg|full) + px-* py-* + bg-(primary|secondary|destructive)` hors UI kit.

### 7. i18n — TOUT texte user-facing traduit

**TOUTE string visible par l'utilisateur DOIT passer par `next-intl`.**

❌ **INTERDIT** :

```tsx
toast.success('Invoice created successfully')
<Button>Submit</Button>
<H1>Dashboard</H1>
placeholder="Search..."
```

✅ **OBLIGATOIRE** :

```tsx
const t = useTranslations('invoice')
toast.success(t('created'))
<Button>{t('submit')}</Button>
<H1>{t('dashboard')}</H1>
placeholder={t('searchPlaceholder')}
```

**Exceptions** :

- Code API (messages d'erreur serveur) — anglais OK
- Logs (`logger.debug/info/warn/error`) — anglais OK
- Identifiants techniques, URLs, class names
- Pages dev/playground (showcase, demo)

---

## 🎨 Theme Management - Dark/Light Mode

### Configuration Obligatoire

**TOUJOURS** utiliser `@ezstart/next-theme` pour dark/light mode :

```tsx
// app/layout.tsx
import { ThemeProvider } from '@ezstart/next-theme'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {' '}
      {/* ⚠️ PAS de className ici! */}
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
```

### ❌ ERREURS FRÉQUENTES À ÉVITER

```tsx
// ❌ MAUVAIS : className override le script bloquant
<html lang="en" suppressHydrationWarning className="">

// ❌ MAUVAIS : Mounted guard casse le script bloquant
if (!mounted) return <div suppressHydrationWarning>{children}</div>

// ✅ BON : Laisser next-themes gérer tout seul
<html lang="en" suppressHydrationWarning>
```

### Règles Critiques

- ✅ `defaultTheme: 'system'` - Respecte le thème OS par défaut
- ✅ `enableSystem: true` - Permet la détection du système
- ✅ `disableTransitionOnChange: true` - Évite l'animation flash
- ✅ `suppressHydrationWarning` sur `<html>` - Évite les warnings React
- ❌ **JAMAIS** de `className` sur `<html>` - Casse le script bloquant
- ❌ **JAMAIS** de mounted guard - next-themes a déjà un script bloquant

**Pourquoi ça fonctionne :** `next-themes` injecte un script bloquant qui s'exécute AVANT l'hydration React pour éviter le flash light → dark.
