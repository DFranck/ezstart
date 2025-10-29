# Audit - packages/ui/src/hooks (27/10/2025)

## 📋 Vue d'Ensemble

**Répertoire audité :** `packages/ui/src/hooks/`
**Date d'audit :** 27 octobre 2025
**Nombre de fichiers :** 8 (index.ts + 7 hooks)

## 📊 Score Global : 70/100 ⚠️ GOOD (mais améliorable)

| Critère | Score | Détails |
|---------|-------|---------|
| **Architecture** | 60/100 | ⚠️ 1 hook project-specific (`useInvoicePDF`) |
| **Réutilisabilité** | 85/100 | ✅ 6/7 hooks génériques |
| **Documentation** | 50/100 | ❌ Manque JSDoc sur 6/7 hooks |
| **Type Safety** | 90/100 | ✅ TypeScript, quelques `any` à typer |
| **Best Practices** | 70/100 | ⚠️ Quelques problèmes (deps, types) |

**Score Moyen :** 70/100

## 📁 Structure Actuelle

```
packages/ui/src/hooks/
├── index.ts                 # Barrel exports
├── use-api-action.ts        # ✅ API error handling (generic)
├── use-click-outside.ts     # ✅ Click outside detector (generic)
├── use-device.ts            # ✅ Responsive device detection (generic)
├── use-generate-pdf.tsx     # ⚠️ PDF generation + INVOICE-SPECIFIC
├── use-in-view.ts           # ✅ Intersection Observer (generic)
├── use-on-scroll.ts         # ✅ Scroll position tracker (generic)
└── useThreadAPI.ts          # ✅ Thread/Chat API connector (generic)
```

## 🔍 Analyse Détaillée

### 1. use-api-action.ts - API Error Handler ✅ GÉNÉRIQUE

**Score :** 75/100

**Utilisé dans :**
- Probablement plusieurs apps (à vérifier usage)

**Fonctionnalité :**
```typescript
const { exec, error, setError } = useApiAction()

const data = await exec<Invoice>(() => fetch('/api/invoices'))
// Auto toast.error() + state management
```

**Points Forts :**
- ✅ 100% générique - Aucune logique project-specific
- ✅ Error handling centralisé
- ✅ Toast integration (sonner)
- ✅ Type-safe avec generic `<T>`
- ✅ Inline types (pas de dépendance @ezstart/types)

**Points Faibles :**
- ❌ **Manque JSDoc** - Pas de documentation
- ⚠️ **Type `any`** - `fn: () => Promise<{ status: number; data: any }>`
- ⚠️ **Pas de loading state** - Devrait retourner `loading: boolean`

**Recommandation :**
```typescript
/**
 * Hook for executing API calls with automatic error handling and toast notifications.
 *
 * @returns Object with exec function, error state, and setError
 *
 * @example
 * const { exec, error, loading } = useApiAction()
 *
 * const invoice = await exec<Invoice>(async () => {
 *   const res = await fetch('/api/invoices/1')
 *   return { status: res.status, data: await res.json() }
 * })
 */
export function useApiAction() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // ← Add loading state

  async function exec<T>(
    fn: () => Promise<{ status: number; data: T | ApiError }> // ← Better typing
  ): Promise<T | null> {
    setLoading(true); // ← Track loading
    // ...
  }

  return { exec, error, setError, loading }; // ← Return loading
}
```

---

### 2. use-click-outside.ts - Click Outside Detector ✅ GÉNÉRIQUE

**Score :** 85/100

**Utilisé dans :**
- Modals, dropdowns, popovers (à confirmer usage)

**Fonctionnalité :**
```typescript
const ref = useRef<HTMLDivElement>(null)
useClickOutside(ref, () => setOpen(false))
```

**Points Forts :**
- ✅ 100% générique
- ✅ Type-safe avec generic `<T extends HTMLElement>`
- ✅ Cleanup proper (removeEventListener)
- ✅ Support touch events

**Points Faibles :**
- ❌ **Manque JSDoc**
- ⚠️ **Deps potentiel** - `onClickOutside` devrait être dans deps array (mais peut causer re-renders)

**Recommandation :**
```typescript
/**
 * Detects clicks outside a referenced element and triggers a callback.
 *
 * Useful for closing modals, dropdowns, and popovers when clicking outside.
 *
 * @param ref - React ref to the element to monitor
 * @param onClickOutside - Callback triggered when clicking outside
 *
 * @example
 * const modalRef = useRef<HTMLDivElement>(null)
 * useClickOutside(modalRef, () => setIsOpen(false))
 *
 * return <div ref={modalRef}>Modal content</div>
 */
export function useClickOutside<T extends HTMLElement>(...) { ... }
```

**Alternative avec useCallback :**
```typescript
// User code
const handleClose = useCallback(() => setOpen(false), [])
useClickOutside(ref, handleClose)
```

---

### 3. use-device.ts - Responsive Device Detection ✅ GÉNÉRIQUE

**Score :** 90/100

**Utilisé dans :**
- Responsive layouts (à confirmer usage)

**Fonctionnalité :**
```typescript
const { isMobile, isTablet, isDesktop, width, type } = useDevice()

if (isMobile) return <MobileNav />
```

**Points Forts :**
- ✅ 100% générique
- ✅ Type-safe avec `DeviceType`
- ✅ Breakpoints standards (768, 1024)
- ✅ SSR-safe avec `isReady` flag
- ✅ Window resize listener

**Points Faibles :**
- ❌ **Manque JSDoc**
- ⚠️ **Hardcoded breakpoints** - Devrait accepter custom breakpoints

**Recommandation :**
```typescript
/**
 * Detects the current device type based on window width.
 *
 * Uses standard breakpoints: mobile (<768px), tablet (768-1024px), desktop (>1024px).
 *
 * @returns Device type, boolean flags, width, and SSR-ready state
 *
 * @example
 * const { isMobile, isTablet, isDesktop, width } = useDevice()
 *
 * if (isMobile) return <MobileLayout />
 * if (isTablet) return <TabletLayout />
 * return <DesktopLayout />
 *
 * @example
 * // Wait for hydration before rendering
 * const { isReady, isMobile } = useDevice()
 * if (!isReady) return <Skeleton />
 */
export function useDevice(): { ... } { ... }
```

---

### 4. use-generate-pdf.tsx - PDF Generation ⚠️ MIXED (Générique + EZBill)

**Score :** 55/100

**Utilisé dans :**
- ✅ apps/ezbill/web/components/PreviewPdfModal.tsx

**Problème :** **VIOLATION SRP - 2 hooks en 1 fichier**

**Hook 1: `useGeneratePDF` - ✅ GÉNÉRIQUE (85/100)**
```typescript
const { generatePDF, downloadPDF, isGenerating, error } = useGeneratePDF({
  filename: 'document.pdf',
  onSuccess: () => console.log('Success'),
})
```

**Points Forts :**
- ✅ 100% générique - Peut générer n'importe quel PDF
- ✅ Type-safe avec interfaces
- ✅ Error handling
- ✅ Loading state
- ✅ Callbacks (onSuccess, onError)

**Hook 2: `useInvoicePDF` - ❌ PROJECT-SPECIFIC (20/100)**
```typescript
// ❌ CRITIQUE: Hook spécifique EZBill dans packages/ui !
export function useInvoicePDF() {
  const { downloadPDF, isGenerating, error } = useGeneratePDF({
    onSuccess: () => console.log('PDF generated successfully'),
    onError: (error) => console.error('PDF generation failed:', error),
  })

  const downloadInvoicePDF = async (
    component: React.ReactElement<DocumentProps>,
    documentNumber: string
  ) => {
    const filename = `invoice-${documentNumber}.pdf` // ← Invoice-specific!
    await downloadPDF(component, filename)
  }

  return { downloadInvoicePDF, isGenerating, error }
}
```

**Problèmes :**
- ❌ **Violation hiérarchie** - Code EZBill-specific dans packages/ui
- ❌ **Duplication future** - Si EZPay veut `useReceiptPDF`, on fait quoi ?
- ❌ **Manque JSDoc** sur les 2 hooks

**Solution Recommandée :**

**Option 1: Déplacer `useInvoicePDF` vers apps/ezbill/web/hooks** ⭐ RECOMMANDÉ
```typescript
// packages/ui/src/hooks/use-generate-pdf.tsx
// Garder SEULEMENT useGeneratePDF (générique)

// apps/ezbill/web/src/hooks/useInvoicePDF.ts ← NOUVEAU
import { useGeneratePDF } from '@ezstart/ui/hooks'

export function useInvoicePDF() {
  const { downloadPDF, isGenerating, error } = useGeneratePDF()

  const downloadInvoicePDF = async (
    component: React.ReactElement,
    documentNumber: string
  ) => {
    await downloadPDF(component, `invoice-${documentNumber}.pdf`)
  }

  return { downloadInvoicePDF, isGenerating, error }
}
```

**Option 2: Créer un factory pattern générique**
```typescript
// packages/ui/src/hooks/use-generate-pdf.tsx
export function createDocumentPDFHook(prefix: string) {
  return function useDocumentPDF() {
    const { downloadPDF, isGenerating, error } = useGeneratePDF()

    const downloadDocumentPDF = async (
      component: React.ReactElement,
      documentNumber: string
    ) => {
      await downloadPDF(component, `${prefix}-${documentNumber}.pdf`)
    }

    return { downloadDocumentPDF, isGenerating, error }
  }
}

// apps/ezbill/web/hooks/useInvoicePDF.ts
export const useInvoicePDF = createDocumentPDFHook('invoice')

// apps/ezpay/web/hooks/useReceiptPDF.ts
export const useReceiptPDF = createDocumentPDFHook('receipt')
```

---

### 5. use-in-view.ts - Intersection Observer ✅ GÉNÉRIQUE

**Score :** 90/100

**Utilisé dans :**
- Lazy loading, animations, infinite scroll (à confirmer usage)

**Fonctionnalité :**
```typescript
const ref = useRef<HTMLDivElement>(null)
const inView = useInView(ref, { threshold: 0.5, once: true })

return <div ref={ref} className={inView ? 'animate-in' : ''} />
```

**Points Forts :**
- ✅ 100% générique
- ✅ Type-safe avec `UseInViewOptions`
- ✅ SSR-safe (`typeof window === 'undefined'`)
- ✅ Cleanup proper (observer.unobserve)
- ✅ Support `once` flag (performance)

**Points Faibles :**
- ❌ **Manque JSDoc**

**Recommandation :**
```typescript
/**
 * Detects when an element enters/exits the viewport using Intersection Observer.
 *
 * @param ref - React ref to the element to observe
 * @param options - Intersection Observer options
 * @param options.root - Root element for intersection (default: viewport)
 * @param options.rootMargin - Margin around root (default: '0px')
 * @param options.threshold - Percentage of visibility to trigger (default: 0)
 * @param options.once - Only trigger once (performance optimization)
 *
 * @returns Boolean indicating if element is in view
 *
 * @example
 * // Lazy load images
 * const imgRef = useRef<HTMLImageElement>(null)
 * const inView = useInView(imgRef, { threshold: 0.1, once: true })
 *
 * return <img ref={imgRef} src={inView ? actualSrc : placeholder} />
 *
 * @example
 * // Scroll animations
 * const inView = useInView(ref, { threshold: 0.5 })
 * return <div className={inView ? 'animate-fade-in' : ''} />
 */
export function useInView(...) { ... }
```

---

### 6. use-on-scroll.ts - Scroll Position Tracker ✅ GÉNÉRIQUE

**Score :** 85/100

**Utilisé dans :**
- Sticky headers, scroll progress, infinite scroll (à confirmer usage)

**Fonctionnalité :**
```typescript
const scrollY = useOnScroll(100) // Throttle 100ms

const showHeader = scrollY > 200
```

**Points Forts :**
- ✅ 100% générique
- ✅ Throttling intégré (performance)
- ✅ SSR-safe
- ✅ Cleanup proper (clearTimeout)

**Points Faibles :**
- ❌ **Manque JSDoc**
- ⚠️ **Throttling basique** - Pourrait utiliser `requestAnimationFrame`

**Recommandation :**
```typescript
/**
 * Tracks window scroll position with throttling for performance.
 *
 * @param throttleMs - Milliseconds to throttle scroll events (default: 100)
 * @returns Current scroll Y position in pixels
 *
 * @example
 * // Show/hide header based on scroll
 * const scrollY = useOnScroll(100)
 * const showHeader = scrollY > 200
 *
 * @example
 * // Scroll progress indicator
 * const scrollY = useOnScroll(50)
 * const progress = (scrollY / document.body.scrollHeight) * 100
 */
export function useOnScroll(throttleMs = 100): number { ... }
```

---

### 7. useThreadAPI.ts - Thread/Chat API Connector ✅ GÉNÉRIQUE

**Score :** 80/100

**Utilisé dans :**
- ✅ apps/green-pulse/web/components/lia/ThreadProvider.tsx

**Fonctionnalité :**
```typescript
const thread = useThreadAPI({
  endpoint: '/api/chat',
  formatRequest: (message) => ({ message, extract_esg: false }),
  formatResponse: (data) => data.response,
})

thread.sendMessage('Hello AI')
```

**Points Forts :**
- ✅ 100% générique - Agnostique de l'API backend
- ✅ **Excellente JSDoc** (seul hook documenté !)
- ✅ Type-safe avec interfaces
- ✅ Config flexible (formatRequest, formatResponse)
- ✅ Features riches (edit, resend, clear, load)
- ✅ Loading + error states

**Points Faibles :**
- ⚠️ **Type `any`** - `component: any` devrait être `React.ReactElement`
- ⚠️ **`enableStreaming` unused** - Config définie mais pas implémentée
- ⚠️ **Deps exhaustive** - `useCallback` deps array peut être optimisé

**Recommandation :**

**1. Typer `component` correctement :**
```typescript
sendMessage: (message: string, files?: File[]) => Promise<void>;
// Au lieu de: component: any
```

**2. Implémenter ou retirer `enableStreaming` :**
```typescript
// Option 1: Retirer si pas utilisé
export type ThreadAPIConfig = {
  endpoint: string;
  // enableStreaming?: boolean; ← REMOVE
}

// Option 2: Implémenter streaming
if (enableStreaming) {
  const reader = response.body?.getReader()
  // Stream chunks...
}
```

**3. Optimiser deps array :**
```typescript
// Memoize config pour éviter re-renders
const configRef = useRef(config)
useEffect(() => { configRef.current = config }, [config])
```

---

## 🎯 Conformité aux Règles CLAUDE.md

### ⚠️ Hiérarchie des Packages - PARTIELLEMENT RESPECTÉE

**Règle :**
> 1. **packages/** - Pour tout ce qui peut être réutilisé entre projets

**Analyse :**
- ✅ 6/7 hooks sont génériques → CORRECT
- ❌ 1/7 hook est project-specific (`useInvoicePDF`) → **VIOLATION**

**Verdict :** 85/100 - Un hook doit être déplacé vers apps/ezbill

### ✅ Single Responsibility Principle - RESPECTÉE

**Analyse :**
- ✅ Chaque hook a une responsabilité claire
- ✅ Pas de code dupliqué
- ⚠️ `use-generate-pdf.tsx` contient 2 hooks (mais acceptable car liés)

**Verdict :** 90/100 - SRP globalement respecté

---

## 📈 Comparaison avec styles/ et lib/

| Critère | styles/ (AVANT) | styles/ (APRÈS) | lib/ | hooks/ |
|---------|-----------------|-----------------|------|--------|
| **Score Global** | 55/100 | 88/100 | 100/100 | **70/100** |
| **SRP** | ❌ 55/100 | ✅ 88/100 | ✅ 100/100 | ⚠️ 60/100 |
| **Code project-specific** | ❌ 223 lines | ✅ 0 lines | ✅ 0 lines | ❌ ~20 lines |
| **Documentation** | ⚠️ 70/100 | ✅ 90/100 | ✅ 100/100 | ❌ 50/100 |

**Conclusion :** `hooks/` nécessite des améliorations similaires à `styles/` (avant refonte).

---

## 🚀 Recommandations (par Priorité)

### 1. ⚠️ CRITIQUE - Déplacer `useInvoicePDF` vers apps/ezbill

**Impact :** +25 points Architecture (60 → 85)

**Actions :**
1. Créer `apps/ezbill/web/src/hooks/useInvoicePDF.ts`
2. Copier le code de `useInvoicePDF` depuis packages/ui
3. Importer `useGeneratePDF` depuis `@ezstart/ui/hooks`
4. Supprimer `useInvoicePDF` de packages/ui/src/hooks/use-generate-pdf.tsx
5. Update export dans packages/ui/src/hooks/index.ts

**Temps estimé :** 15 minutes

### 2. ⚠️ HAUTE - Ajouter JSDoc sur tous les hooks

**Impact :** +40 points Documentation (50 → 90)

**Hooks à documenter :**
- ✅ useThreadAPI (déjà fait)
- ❌ useApiAction
- ❌ useClickOutside
- ❌ useDevice
- ❌ useGeneratePDF
- ❌ useInView
- ❌ useOnScroll

**Temps estimé :** 1 heure

### 3. ⚠️ MOYENNE - Améliorer types (`any` → types stricts)

**Impact :** +10 points Type Safety (90 → 100)

**Fichiers à modifier :**
- `use-api-action.ts` - `data: any` → `data: T | ApiError`
- `use-generate-pdf.tsx` - `component: any` → `component: React.ReactElement`
- `useThreadAPI.ts` - `data: any` → types stricts

**Temps estimé :** 30 minutes

### 4. ⚠️ BASSE - Créer README.md

**Impact :** +5 points Documentation (90 → 95)

**Contenu :**
- Overview de chaque hook
- Examples d'usage
- Best practices
- Usage stats

**Temps estimé :** 1 heure

### 5. ⚠️ BASSE - Ajouter loading state à useApiAction

**Impact :** +5 points Best Practices (70 → 75)

**Changement :**
```typescript
export function useApiAction() {
  const [loading, setLoading] = useState(false)
  // ...
  return { exec, error, setError, loading }
}
```

**Temps estimé :** 10 minutes

---

## 📊 Score Final et Actions

### Score Actuel : 70/100 ⚠️ GOOD

| Critère | Score | Action Prioritaire |
|---------|-------|-------------------|
| Architecture | 60/100 | ⚠️ **CRITIQUE** - Déplacer useInvoicePDF |
| Réutilisabilité | 85/100 | ✅ Aucune action urgente |
| Documentation | 50/100 | ⚠️ **HAUTE** - Ajouter JSDoc |
| Type Safety | 90/100 | ⚠️ **MOYENNE** - Éliminer `any` |
| Best Practices | 70/100 | ⚠️ **BASSE** - Loading states |

### Score Potentiel avec Améliorations : 95/100 ⭐⭐⭐⭐⭐

**Roadmap Améliorations :**

**Phase 1 (Critique - 2h) :**
1. Déplacer `useInvoicePDF` → apps/ezbill (15min)
2. Ajouter JSDoc sur 6 hooks (1h)
3. Améliorer types `any` (30min)
4. Validation builds (15min)

**Phase 2 (Nice-to-have - 1.5h) :**
5. Créer README.md (1h)
6. Ajouter loading state à useApiAction (10min)
7. Optimiser deps arrays (20min)

**Temps Total :** 3.5 heures → Score 70 → 95 (+25 points)

---

## ✅ Conclusion

**Le répertoire `packages/ui/src/hooks/` est en GOOD état (70/100) mais nécessite des améliorations.**

**Points Forts :**
- ✅ 6/7 hooks génériques et réutilisables
- ✅ Type-safe avec TypeScript
- ✅ Code propre et minimal
- ✅ 1 hook excellemment documenté (useThreadAPI)

**Points d'Amélioration Critiques :**
- ❌ 1 hook project-specific (useInvoicePDF) → Déplacer vers apps/ezbill
- ❌ Manque JSDoc sur 6/7 hooks
- ⚠️ Types `any` à remplacer

**Recommandation Globale :**
Contrairement à `lib/` (95 → 100) qui nécessitait seulement documentation, `hooks/` nécessite :
1. **Refactoring architectural** (déplacer useInvoicePDF)
2. **Documentation complète** (JSDoc)
3. **Amélioration types** (éliminer `any`)

**Priorité :** ⚠️ MOYENNE-HAUTE (après audit `components/` complet)

---

## 📚 Références

- **React Hooks Best Practices** : https://react.dev/learn/reusing-logic-with-custom-hooks
- **TypeScript Generics** : https://www.typescriptlang.org/docs/handbook/2/generics.html
- **JSDoc TypeScript** : https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html
- **Intersection Observer API** : https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
