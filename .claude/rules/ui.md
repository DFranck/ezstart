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

### 4. i18n — TOUT texte user-facing traduit

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
