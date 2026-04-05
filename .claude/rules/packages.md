## 🎯 Principe Fondamental : RÉUTILISABILITÉ MAXIMALE

**OBJECTIF :** Maximiser le partage de code, minimiser la duplication, créer des composants agnostiques.

### Patterns Standards Obligatoires (CRITIQUE)

**Chaque app DOIT suivre ces patterns. Source de vérité : ezbill / green-pulse / gacha-analyzer.**

| Pattern           | Standard                                                  | Interdit                           |
| ----------------- | --------------------------------------------------------- | ---------------------------------- |
| **API calls**     | `callApi` wrapper dans `src/config/api.ts` avec `appName` | `fetch()` direct, `axios`          |
| **Data fetching** | React Query (`useQuery`, `useMutation`) avec `queryKey`   | `useState` + `useEffect` + `fetch` |
| **Logging**       | `@ezstart/logger` (`logger.debug/info/warn/error`)        | `console.log/warn/error`           |
| **Feedback**      | `sonner` toast (`toast.success/error`)                    | `alert()`, `window.confirm`        |
| **Components**    | `@ezstart/ui/components` + `Tag` pour HTML                | Composants custom, HTML brut       |
| **Styles**        | CSS variables theme (OKLCH)                               | Couleurs Tailwind hardcodées       |
| **Réponses API**  | `{ success, data, meta }`                                 | Objets bruts, formats custom       |

**Exception** : les apps minimales (ezauth login forms, ezpay landing, asc-tcd statique) peuvent déroger si justifié.

### Pagination + React Query (CRITIQUE)

**TOUTE API GET liste DOIT avoir de la pagination. TOUT fetch frontend DOIT utiliser React Query.**

- ✅ API : chaque endpoint liste a `limit` (default 20) + `offset`, retourne `{ data, meta: { total, limit, offset } }`
- ✅ Frontend : React Query `useQuery` avec page/limit dans la queryKey pour le cache automatique
- ❌ JAMAIS charger toutes les données d'un coup (pas de `limit=200` ou unlimited)
- ✅ Pagination UI : "X-Y sur Z" + boutons Précédent/Suivant ou infinite scroll

### Agnosticité des Packages (CRITIQUE)

**Les packages dans `/packages/` DOIVENT être 100% agnostiques — JAMAIS de logique métier spécifique à un projet.**

- ✅ `packages/ocr-sdk` : capture, preprocessing, Tesseract wrapper, zones, masks → **réutilisable par n'importe quelle app**
- ❌ `packages/ocr-sdk` : parser Summoners War, rune efficiency, SET_STAT_TIERS → **spécifique gacha-analyzer, va dans `apps/gacha-analyzer/`**
- ✅ `packages/ui` : DataTable, Chart, Button → **composants génériques**
- ❌ `packages/ui` : RuneCard, GearCard → **spécifique gacha-analyzer**

**Règle** : Si un autre projet pourrait consommer le package tel quel SANS modification, c'est bien un package. Si le code mentionne des concepts métier d'un projet spécifique (rune, invoice, user role, etc.), il va dans l'app.

**Conséquence** : Les packages exposent des **interfaces génériques** (`Parser`, `Analyzer`, `Engine`) que chaque app implémente avec sa logique métier.

### Hiérarchie des Packages (CRITIQUE)

**Avant de créer QUOI QUE CE SOIT, suivre cet ordre STRICT :**

1. ✅ **Vérifier si existe déjà dans `packages/`**
   - Types communs → `packages/types`
   - Utils génériques → `packages/utils`
   - Config partagée → `packages/config`
   - UI components → `packages/ui`
   - Infrastructure API → `packages/express-core`

2. ✅ **Vérifier si peut être généralisé pour `packages/`**
   - Si utilisé par 2+ projets → DOIT être dans `packages/`
   - Si potentiellement réutilisable → DEVRAIT être dans `packages/`

3. ✅ **Si spécifique au projet : vérifier si partageable entre web/api**
   - Types projet → `apps/[project]/types` (partagé web+api)
   - Utils projet → `apps/[project]/utils` (partagé web+api)
   - Config projet → `apps/[project]/config` (partagé web+api)

4. ⚠️ **EN DERNIER RECOURS : créer dans la couche spécifique**
   - Vraiment spécifique au frontend → `apps/[project]/web/`
   - Vraiment spécifique au backend → `apps/[project]/api/`

### Structure Monorepo Canonique

```
@ezstart/
├── packages/              # 🌍 GLOBAL - Partagé entre TOUS les projets
│   ├── types/            # Types TypeScript communs
│   ├── utils/            # Utilitaires génériques
│   ├── config/           # Config URLs, ports, CORS
│   ├── ui/               # Composants UI réutilisables
│   ├── express-core/     # Infrastructure Express + MongoDB
│   ├── auth-sdk/         # SDK d'authentification (SSO)
│   ├── pay-sdk/          # SDK de paiement
│   ├── monitoring/       # Types & collectors monitoring
│   └── ...
├── apps/
│   ├── ezbill/
│   │   ├── types/        # 🎯 PROJECT - Partagé web+api du projet
│   │   ├── utils/        # 🎯 PROJECT - Partagé web+api du projet
│   │   ├── config/       # 🎯 PROJECT - Partagé web+api du projet
│   │   ├── web/          # 🔒 LAYER - Spécifique frontend uniquement
│   │   └── api/          # 🔒 LAYER - Spécifique backend uniquement
```

### Exemples Concrets

| Type de Code            | Destination                  | Raison                                 |
| ----------------------- | ---------------------------- | -------------------------------------- |
| Validation email        | `packages/utils`             | Utilisé partout                        |
| Type `User`             | `packages/types`             | Entité commune                         |
| CORS config             | `packages/config`            | Infrastructure globale                 |
| Card component          | `packages/ui`                | UI réutilisable                        |
| Type `Invoice`          | `apps/ezbill/types`          | Spécifique EZBill mais partagé web+api |
| Calculate invoice total | `apps/ezbill/utils`          | Logic partagée web+api                 |
| Invoice form component  | `apps/ezbill/web/components` | UI spécifique frontend                 |
| Invoice CRUD routes     | `apps/ezbill/api/routes`     | Backend uniquement                     |

---

## 📦 Packages - Bonnes Pratiques

### 1. README Obligatoire

**TOUJOURS** maintenir README à jour pour TOUS les packages dans `/packages/` :

✅ **README doit inclure :**

- Overview et description claire
- Installation et configuration
- Exemples d'usage avec code
- API Reference (pour packages complexes)
- Applications qui utilisent le package
- Related packages et liens utiles

⚠️ **Mettre à jour README AVANT de commiter**

### 2. Structure Standard

```
packages/my-package/
├── src/
│   ├── index.ts          # Exports publics
│   ├── types.ts
│   └── utils.ts
├── dist/                 # Build output (gitignored)
├── package.json
├── tsconfig.json
└── README.md             # ✅ OBLIGATOIRE
```

### 3. package.json Standard

```json
{
  "name": "@ezstart/my-package",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "@ezstart/types": "workspace:*"
  }
}
```

### 4. Exports Propres

```typescript
// src/index.ts
export { type MyType } from './types'
export { myFunction } from './utils'

// ❌ JAMAIS exporter tout
export * from './internal' // NON
```
