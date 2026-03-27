# 📐 Development Rules - @ezstart Monorepo

**Rules obligatoires pour tous les développeurs (et Claude) travaillant sur le monorepo @ezstart.**

Last Updated: 2025-10-26 (Added CRITICAL database protection rules after data loss incident)

---

## 🚨 RÈGLES CRITIQUES - PROTECTION DES DONNÉES (2025-10-26)

**⚠️ INCIDENT:** Le 26/10/2025, des tests ont supprimé TOUTES les données de production MongoDB (users, clients, invoices). Ces règles DOIVENT être suivies pour éviter que ça se reproduise.

### ❌ INTERDICTIONS ABSOLUES

1. **JAMAIS lancer des tests sans `.env.test`**
   - Chaque API DOIT avoir un `.env.test` avec `MONGO_URL=mongodb://localhost:27017/[db]-test`
   - `vitest.config.ts` DOIT charger `.env.test` AVANT tout le reste
   - `NODE_ENV=test` DOIT être forcé dans vitest.config.ts

2. **JAMAIS utiliser `.env.local` avec production URL pour les tests**
   - `.env.local` est pour le développement LOCAL uniquement
   - Tests utilisent TOUJOURS `.env.test` + MongoMemoryServer

3. **JAMAIS lancer `pnpm test` sans vérifier l'environnement**
   ```bash
   # ❌ DANGEREUX
   pnpm test

   # ✅ SÉCURISÉ - Vérifier d'abord
   echo $NODE_ENV  # Doit être "test"
   cat .env.test   # Doit pointer vers localhost
   pnpm test
   ```

4. **JAMAIS utiliser `deleteMany({})` ou `drop()` sans protection**
   ```typescript
   // ❌ DANGEREUX - Peut supprimer la production !
   await Model.deleteMany({})

   // ✅ SÉCURISÉ - Vérifier l'environnement
   if (process.env.NODE_ENV !== 'test') {
     throw new Error('Cannot delete data outside test environment!')
   }
   await Model.deleteMany({})
   ```

### ✅ OBLIGATIONS ABSOLUES

1. **TOUJOURS avoir des environnements séparés**
   ```
   DEV:  mongodb://localhost:27017/[db]-dev
   TEST: MongoMemoryServer (en mémoire)
   PROD: mongodb+srv://...@cluster.mongodb.net/[db]
   ```

2. **TOUJOURS faire des backups hebdomadaires** (M0 gratuit = PAS de backups auto)
   ```bash
   # Chaque semaine (ou avant tests importants)
   ./scripts/backup-mongodb.sh
   ```

3. **TOUJOURS vérifier NODE_ENV dans les scripts destructifs**
   ```typescript
   if (process.env.NODE_ENV === 'production') {
     throw new Error('This script cannot run in production!')
   }
   ```

4. **TOUJOURS upgrader vers M2+ ($9/mois) si données critiques**
   - M0 = Pas de backups automatiques
   - M2+ = Snapshots automatiques + point-in-time recovery

### 📋 Checklist Avant Chaque Test

- [ ] `.env.test` existe et pointe vers localhost
- [ ] `vitest.config.ts` charge `.env.test`
- [ ] `NODE_ENV=test` est forcé
- [ ] `setupTestDatabase()` utilise MongoMemoryServer
- [ ] Backup récent disponible (< 7 jours)

### 🔧 Template Vitest Config Sécurisé

```typescript
import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'
import { resolve } from 'path'

// 🔒 CRITICAL: Load .env.test to prevent touching production
config({ path: resolve(__dirname, '.env.test') })

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test', // 🔒 Force test environment
    },
  },
})
```

---

## 🎯 Principe Fondamental : RÉUTILISABILITÉ MAXIMALE

**OBJECTIF :** Maximiser le partage de code, minimiser la duplication, créer des composants agnostiques.

### Agnosticité des Packages (CRITIQUE)

**Les packages dans `/packages/` DOIVENT être 100% agnostiques — JAMAIS de logique métier spécifique à un projet.**

- ✅ `packages/ocr-sdk` : capture, preprocessing, Tesseract wrapper, zones, masks → **réutilisable par n'importe quelle app**
- ❌ `packages/ocr-sdk` : parser Summoners War, rune efficiency, SET_STAT_TIERS → **spécifique game-analyzer, va dans `apps/game-analyzer/`**
- ✅ `packages/ui` : DataTable, Chart, Button → **composants génériques**
- ❌ `packages/ui` : RuneCard, GearCard → **spécifique game-analyzer**

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

| Type de Code | Destination | Raison |
|--------------|-------------|--------|
| Validation email | `packages/utils` | Utilisé partout |
| Type `User` | `packages/types` | Entité commune |
| CORS config | `packages/config` | Infrastructure globale |
| Card component | `packages/ui` | UI réutilisable |
| Type `Invoice` | `apps/ezbill/types` | Spécifique EZBill mais partagé web+api |
| Calculate invoice total | `apps/ezbill/utils` | Logic partagée web+api |
| Invoice form component | `apps/ezbill/web/components` | UI spécifique frontend |
| Invoice CRUD routes | `apps/ezbill/api/routes` | Backend uniquement |

---

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
className="bg-gray-100 text-gray-900 border-gray-200"
className="bg-indigo-500 text-white hover:bg-indigo-600"
className="text-red-600 bg-red-50"
```

✅ **OBLIGATOIRE** - Classes sémantiques :
```tsx
className="bg-card text-foreground border"
className="bg-primary text-primary-foreground hover:bg-primary/90"
className="text-destructive bg-destructive/10"
```

**Palette sémantique complète :**

| Contexte | Classes |
|----------|---------|
| **Background** | `bg-background`, `bg-card`, `bg-muted`, `bg-popover`, `bg-accent` |
| **Text** | `text-foreground`, `text-muted-foreground`, `text-card-foreground` |
| **Primary** | `bg-primary`, `text-primary`, `text-primary-foreground`, `border-primary` |
| **Destructive** | `bg-destructive`, `text-destructive`, `text-destructive-foreground` |
| **Border** | `border` (auto), `border-input`, `border-ring` |
| **Status** | `bg-success`, `bg-warning`, `bg-error`, `bg-info` |

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

---

## 🎨 Theme Management - Dark/Light Mode

### Configuration Obligatoire

**TOUJOURS** utiliser `@ezstart/next-theme` pour dark/light mode :

```tsx
// app/layout.tsx
import { ThemeProvider } from '@ezstart/next-theme'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning> {/* ⚠️ PAS de className ici! */}
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
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

---

## 🗄️ Data Fetching - React Query (TanStack Query)

### Quand Utiliser React Query ?

✅ **OUI - Utiliser React Query pour :**
- Apps avec beaucoup de fetching (conversations, messages, listes)
- Besoin de cache pour éviter refetch inutiles
- Optimistic updates pour UX fluide
- Pagination, infinite scroll

❌ **NON - Pas nécessaire pour :**
- Fetch simples (1-2 endpoints)
- Pages statiques (SSG)
- Données rarement changées

### Setup Standard

```tsx
// components/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,      // 5 min fresh
        gcTime: 10 * 60 * 1000,         // 10 min cache
        retry: 1,                        // 1 retry
        refetchOnWindowFocus: false,     // No refetch on focus
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  )
}
```

### Best Practices

```typescript
// ✅ BON - Queries pour reads, Mutations pour writes
const { data } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
const mutation = useMutation({ mutationFn: createUser })

// ❌ MAUVAIS - Fetch manuel
const users = await fetch('/api/users')

// ✅ BON - QueryKeys cohérents
['conversations']              // Liste
['conversation', id]           // Item spécifique

// ❌ MAUVAIS - QueryKeys inconsistants
['convs'], ['conversation'], ['chat'] // Duplication cache

// ✅ BON - enabled flag pour queries conditionnelles
useQuery({ queryKey: ['user', id], queryFn: fetchUser, enabled: !!id })
```

---

## 🏗️ TypeScript - Architecture et Configuration

### 1. Compilation Centralisée avec `tsc -b`

**UN SEUL processus TypeScript pour TOUT le monorepo.**

✅ **Configuration obligatoire :**
- `tsc -b --watch` à la racine uniquement
- `composite: true` dans TOUS les tsconfig
- References vers packages dépendants

❌ **JAMAIS :**
- `tsc --watch` dans les scripts dev des packages
- Duplication de processus TypeScript
- Compilation indépendante

**Scripts optimisés (root package.json) :**
```json
{
  "dev:types": "tsc -b --watch",
  "dev": "turbo dev --concurrency 50"
}
```

**Résultat :** 1 processus TypeScript au lieu de 22+

### 2. Configs TypeScript Centralisées

**TOUJOURS** utiliser `@ezstart/typescript-config` :

```json
{
  "extends": "@ezstart/typescript-config/[variante].json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

**Variantes disponibles :**
- `base.json` - Configuration de base (packages simples)
- `api.json` - Configuration API (Express)
- `nextjs.json` - Configuration Next.js
- `library.json` - Configuration bibliothèque générique
- `react-library.json` - Configuration React library
- `types.json` - Configuration types uniquement

### 3. Target Uniforme

✅ **ES2022** pour TOUT le monorepo (Node.js LTS 20.18.x)

---

## 🔧 Configuration Centralisée

### Principe : JAMAIS de Config Locale Sans Raison

**Ordre de priorité STRICT :**

1. ✅ **Vérifier config centralisée existante**
   - `@ezstart/typescript-config` (6 variantes)
   - `@ezstart/eslint-config` (3 variantes)
   - `@ezstart/tailwind-config`
   - `@ezstart/next-config`
   - `@ezstart/config` (URLs, ports, CORS)

2. ✅ **Créer config centralisée si réutilisable**
   - Utilisé par 2+ projets → package centralisé
   - Pattern commun → variante dans package existant

3. ⚠️ **Config locale EN DERNIER RECOURS**
   - Vraiment spécifique au projet
   - Documenté dans README du projet

### Packages de Configuration

| Package | Usage | Variantes |
|---------|-------|-----------|
| `@ezstart/config` | URLs, ports, CORS | Env-aware (local/dev/prod) |
| `@ezstart/typescript-config` | TypeScript | 6 variantes (base, api, nextjs, library, react-library, types) |
| `@ezstart/eslint-config` | ESLint | 3 variantes (base, next-js, react-internal) |
| `@ezstart/tailwind-config` | Tailwind CSS | base.js |
| `@ezstart/next-config` | Next.js | Config partagée |
| `@ezstart/ui` | PostCSS, CSS globals | postcss.config, globals.css |
| `@ezstart/express-core` | Express + MongoDB | Infrastructure API |
| `@ezstart/next-theme` | Theme provider | Dark/light mode |

### Propagation Automatique

✨ **Toute modification dans un package de config se propage automatiquement à TOUS les projets.**

**Exemple :**
1. Modifier règle ESLint dans `@ezstart/eslint-config`
2. Rebuild le package (`pnpm --filter @ezstart/eslint-config build`)
3. Tous les projets ont la nouvelle règle instantanément ✅

---

## 🌍 URLs, Ports et Environnements

### Single Source of Truth : @ezstart/config

**TOUJOURS** utiliser `@ezstart/config` pour URLs et ports :

```typescript
import { getApiUrl, getWebUrl, getApiPort } from '@ezstart/config'

// Web app - obtenir URL API
const API_URL = getApiUrl('ezpay')
// Dev: http://localhost:5040
// Prod: https://ezpay-api.up.railway.app

// API - obtenir port
const PORT = getApiPort('ezauth') // 5010

// SEO - domaine production
const domain = getWebUrl('ezpay', 'production')
// https://ezpay.ezstart.xyz
```

### Pattern des Ports (50xx)

| Pattern | Usage | Exemples |
|---------|-------|----------|
| `50X0` | APIs | EZAuth 5010, EZBill 5020, TD 5030, EZPay 5040 |
| `50X5` | Web Apps | EZAuth 5015, EZBill 5025, TD 5035, EZPay 5045 |
| `5000` | EZStart API | Port fixe |
| `5050` | EZStart (hub) | Port fixe |

### CORS Automatique

**APIs : JAMAIS hardcoder les CORS origins**

```typescript
// ❌ MAUVAIS
app.use(cors({
  origin: ['http://localhost:5015', 'http://localhost:5025', ...],
  credentials: true
}))

// ✅ BON
import { createApp } from '@ezstart/express-core'
const app = createApp({ apiApp: 'ezauth' })
// CORS auto-configuré avec TOUTES les apps qui appellent ezauth
```

---

## 🗄️ MongoDB - Connexion Centralisée

### Single Source of Truth : connectToMongo()

**TOUJOURS** utiliser `connectToMongo(dbName)` depuis `@ezstart/express-core` :

```typescript
// ❌ MAUVAIS
import mongoose from 'mongoose'
mongoose.connect(process.env.MONGO_URL)
const MyModel = mongoose.model('MyModel', schema)

// ✅ BON
import { connectToMongo } from '@ezstart/express-core'
import { Schema } from 'mongoose'

// Factory function pour model
export async function getMyModel() {
  const mongoose = await connectToMongo('database-name')
  return mongoose.models.MyModel || mongoose.model('MyModel', schema)
}

// Usage
const MyModel = await getMyModel()
const doc = await MyModel.findOne({ ... })
```

### Règles Obligatoires

1. ✅ **Factory Functions** pour tous les models
   - Exporter `async function getModelName()` au lieu du model directement
   - Attacher model à la connexion partagée via `connectToMongo()`

2. ✅ **Wait for Ready** avant schedulers/cron jobs
   ```typescript
   connectToMongo('database-name')
     .then(() => startServer(...))
     .then(() => scheduler.start()) // Après MongoDB ready
   ```

3. ✅ **bufferCommands: false** dans schemas
   ```typescript
   const schema = new Schema({...}, { bufferCommands: false })
   ```

4. ✅ **Node.js LTS** (20.18.x) pour production
   ```json
   "engines": { "node": "20.18.x" }
   ```

### TypeScript Workaround

Ajouter `// @ts-expect-error` avant les appels Mongoose si type inference échoue :

```typescript
// @ts-expect-error - Mongoose type inference issue with factory pattern
const user = await AuthUserModel.findOne({ email })
```

---

## 🔌 APIs - Standards Express

### 1. Infrastructure Express-Core

**TOUJOURS** utiliser `@ezstart/express-core` :

```typescript
import {
  createApp,
  createRateLimiter,
  connectToMongo,
  startServer,
  getApiPort,
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
} from '@ezstart/express-core'

const PORT = getApiPort('ezauth')
const app = createApp({ apiApp: 'ezauth' }) // CORS auto + dotenv

// ✅ Rate limiting protection (OBLIGATOIRE)
app.use(createRateLimiter())

// Routes
const registry = new OpenAPIRegistry()
const router = Router()
const docRouter = createRouterWithDoc(registry, router)

app.use('/api/auth', router)
app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

// Démarrage
connectToMongo('ezauth')
  .then(() => startServer(app, {
    routes: router,
    registries: [registry],
    serviceName: 'EZAuth',
    port: PORT,
  }))
  .catch(err => {
    console.error('❌ Failed to start API', err)
    process.exit(1)
  })
```

### 1.5 Rate Limiting OBLIGATOIRE

**⚠️ TOUTES les APIs DOIVENT avoir du rate limiting** pour se protéger contre les abus et attaques DDoS.

✅ **Standard (100 req/15min per IP)** :
```typescript
import { createRateLimiter } from '@ezstart/express-core'

// Applique rate limiting sur toutes les routes (sauf /api/health)
app.use(createRateLimiter())
```

✅ **Strict pour endpoints sensibles (5 req/min)** :
```typescript
import { createStrictRateLimiter } from '@ezstart/express-core'

// Auth endpoints
app.post('/api/auth/login', createStrictRateLimiter(), loginHandler)
app.post('/api/auth/logout', createStrictRateLimiter(), logoutHandler)
```

✅ **Très strict pour création de compte (3 req/hour)** :
```typescript
import { createVeryStrictRateLimiter } from '@ezstart/express-core'

// Account creation
app.post('/api/auth/register', createVeryStrictRateLimiter(), registerHandler)
app.post('/api/auth/reset-password', createVeryStrictRateLimiter(), resetHandler)
```

**Configuration automatique :**
- Retourne 429 avec `Retry-After` header
- Headers standards : `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`
- Skip automatique de `/api/health`
- Format d'erreur standardisé :
  ```json
  {
    "error": {
      "message": "Too many requests from this IP, please try again later.",
      "code": "RATE_LIMIT_EXCEEDED",
      "retryAfter": 900
    }
  }
  ```

### 2. Action-Based Routing OBLIGATOIRE

✅ **Organisation des routes par action** (1 fichier = 1 action) :

```
src/routes/
├── {feature}/
│   ├── {action}.ts         # createUser.ts, listUsers.ts, etc.
│   └── index.ts            # Feature router
└── index.ts                # Main router
```

**Naming convention:**
- `create{Entity}.ts` - POST action
- `list{Entities}.ts` - GET collection
- `get{Entity}ById.ts` - GET single
- `update{Entity}.ts` - PATCH/PUT action
- `delete{Entity}.ts` - DELETE action
- `{action}With{Modifier}.ts` - Special actions (generateFormWithAI.ts)

**Example: Conversations feature**
```
routes/conversations/
├── createConversation.ts      # POST /conversations
├── listConversations.ts       # GET /conversations
├── getConversationById.ts     # GET /conversations/:id
├── updateConversation.ts      # PATCH /conversations/:id
├── deleteConversation.ts      # DELETE /conversations/:id
└── index.ts                   # Exports router
```

**Single action file:**
```typescript
// createConversation.ts
import { Router } from '@ezstart/express-core'
import { createConversationController } from '../../controllers/conversations/createConversation.js'

export const createConversationRouter = Router()
createConversationRouter.post('/', createConversationController)
```

**Feature index:**
```typescript
// conversations/index.ts
import { Router } from '@ezstart/express-core'
import { createConversationRouter } from './createConversation.js'
import { listConversationsRouter } from './listConversations.js'

export const conversationsRouter = Router()
conversationsRouter
  .use('/', createConversationRouter)
  .use('/', listConversationsRouter)
```

**Benefits:**
- ✅ One file = One action (clear responsibility)
- ✅ Easy to find (`getConversationById.ts`)
- ✅ No merge conflicts
- ✅ Easy to test individually
- ✅ Clear git history

**See:** [apps/green-pulse/api/docs/ROUTING-PATTERN.md](./apps/green-pulse/api/docs/ROUTING-PATTERN.md)

### 3. Préfixe /api OBLIGATOIRE

✅ **Toutes les routes DOIVENT commencer par `/api`** :

```typescript
app.use('/api/auth', authRoutes)
app.use('/api/clients', clientRoutes)
app.get('/api/health', healthCheck)
```

**Raisons :**
- Séparation claire API vs assets/web
- Proxying nginx/reverse proxy simplifié
- Convention universelle (Next.js, Express)
- Règles CORS/auth plus simples

### 4. Point d'Entrée index.ts

✅ **Convention Node.js standard** :

```
apps/[app]/api/
├── src/
│   ├── index.ts        # ✅ Point d'entrée obligatoire
│   ├── routes/
│   ├── services/
│   └── models/
└── package.json
```

**package.json :**
```json
{
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js"
  }
}
```

### 4. OpenAPI/Swagger Automatique

✅ **Toutes les APIs DOIVENT avoir de la doc OpenAPI** :

```typescript
import { createRoute, z } from '@hono/zod-openapi'

const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email(),
            password: z.string().min(8),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: z.object({
            token: z.string(),
          }),
        },
      },
    },
  },
})

registry.registerPath(loginRoute)
```

**Accès doc :** `http://localhost:50XX/docs` (Swagger UI automatique)

---

## 🌐 Web Apps - Standards Next.js

### 1. Architecture Provider

**Setup standard (TOUTES les apps utilisent i18n + [locale] routing) :**

```tsx
// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { ThemeProvider } from '@ezstart/next-theme'
import { AuthProvider } from '@ezstart/auth-sdk'
import { ErrorBoundary } from '@ezstart/ui/components'
import { Toaster } from 'sonner'

export default async function LocaleLayout({ children, params }: { children: ReactNode, params: { locale: string } }) {
  const messages = await getMessages()

  return (
    <html lang={params.locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages} locale={params.locale}>
          <ErrorBoundary>
            <ThemeProvider>
              <AuthProvider appName="myapp" authMode="httpOnly">
                {children}
              </AuthProvider>
            </ThemeProvider>
          </ErrorBoundary>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  )
}
```

**Ajout QueryProvider (apps data-heavy uniquement : EZBill, GreenPulse, EZStart) :**

```tsx
// Wrapper autour de ThemeProvider + AuthProvider
<QueryProvider>
  <ThemeProvider>
    <AuthProvider appName="ezbill" authMode="httpOnly">
      {children}
    </AuthProvider>
  </ThemeProvider>
</QueryProvider>
```

### 2. Configuration Centralisée

**TOUTES les apps DOIVENT utiliser :**

- ✅ `tailwind.config.js` → `@ezstart/tailwind-config/base.js`
- ✅ `postcss.config.mjs` → `@ezstart/ui/postcss.config`
- ✅ `eslint.config.js` → `@ezstart/eslint-config/next-js`
- ✅ `tsconfig.json` → `@ezstart/typescript-config/nextjs.json`
- ✅ CSS globals : `@import "@ezstart/ui/globals.css"`

### 3. Scripts Standardisés

```json
{
  "scripts": {
    "dev": "node ../../../packages/config/bin/dev-server.js",
    "build": "pnpm --filter @ezstart/ui --filter @ezstart/auth-sdk build && next build",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

### 4. Vercel Deployment

**vercel.json obligatoire :**

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs"
}
```

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

---

## 🔐 Environnements et Secrets

### 1. Architecture .env Standardisée

**3 fichiers par projet :**

```
apps/[app]/api/
├── .env.example       # ✅ Template (COMMITTÉ)
├── .env.local         # ✅ Dev local (GITIGNORED)
└── .env.production    # ✅ Production (GITIGNORED)
```

**Workflow :**

1. **Développement** : Copier `.env.example` → `.env.local` et remplir
2. **Production** : Copier variables dans Railway/Vercel Dashboard
3. **Template** : TOUJOURS à jour avec toutes les variables

### 2. Règles Critiques

- ✅ `.env.example` → Template SANS secrets (committé)
- ✅ `.env.local` → Dev avec secrets réels (gitignored)
- ✅ `.env.production` → Production avec secrets réels (gitignored)
- ❌ `.env` → NE PLUS UTILISER (confusion)
- ✅ express-core charge `.env.local` en priorité

### 3. Variables PORT Obsolètes

❌ **Plus besoin de `PORT=` dans `.env.local`**

Les ports sont auto-détectés depuis `@ezstart/config` :

```typescript
// APIs
const PORT = getApiPort('ezauth') // 5010

// Web apps (via dev-server.js)
// Détection automatique du nom d'app → port
```

---

## 🚀 Déploiement

### Railway (APIs)

**Build Command Standard :**

```bash
pnpm install --frozen-lockfile --shamefully-hoist && \
pnpm --filter @ezstart/config --filter @ezstart/express-core build && \
pnpm turbo build --filter=api-[appname]
```

**Start Command :**

```bash
cd apps/[appname]/api && node dist/index.js
```

**Healthcheck :**

```
/api/health
```

### Vercel (Web Apps)

**Configuration Vercel Dashboard :**
- ✅ Root Directory : `apps/[app]/web`
- ✅ Include files outside root directory : COCHÉ
- ✅ Build Command : `pnpm build`
- ✅ Framework : Next.js

**vercel.json obligatoire :**

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install --frozen-lockfile"
}
```

---

## 📝 Git et Documentation

### 1. Commits - Structure Recommandée

```
type: brief description

- Detailed changes list
- Technical modifications
- Documentation updates
- Impact/results
```

**Types :** `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`

### 2. Règles de Commit

✅ **TOUJOURS :**
- Commiter après chaque modification importante
- Documenter les changements de manière détaillée
- Mettre à jour CLAUDE.md pour nouvelles pratiques/règles
- Mettre à jour README des packages avant commit

❌ **JAMAIS :**
- Ajouter "Generated with Claude Code"
- Ajouter "Co-Authored-By: Claude"

### 3. Validation Pré-Commit OBLIGATOIRE

**AVANT chaque commit, vérifier :**

```bash
# OBLIGATOIRE — si ça fail, NE PAS commiter
pnpm typecheck
```

- ✅ `pnpm typecheck` DOIT passer avec 0 erreurs avant tout commit
- ✅ `pnpm test` si des API/packages ont été modifiés
- ✅ Vérifier qu'aucun secret n'est dans les fichiers stagés (.env, credentials, tokens)
- ❌ **JAMAIS** commiter si typecheck échoue — corriger d'abord
- ❌ **JAMAIS** push si le build risque de fail sur Railway/Vercel

### 4. Documentation README

⚠️ **CRITIQUE pour packages** :

Après TOUTE modification de package dans `/packages/` :
1. ✅ Mettre à jour README.md du package
2. ✅ Ajouter exemples d'usage si nouvelle feature
3. ✅ Documenter breaking changes
4. ✅ Lister apps qui utilisent le package

---

## 🧪 Tests et Qualité

### Commandes de Vérification

```bash
# TypeCheck complet (18/18 packages)
pnpm typecheck

# Lint complet (17/17 packages avec code)
pnpm lint

# Build complet
pnpm build

# Vérifier un package spécifique
pnpm --filter @ezstart/[package] typecheck
pnpm --filter @ezstart/[package] lint
pnpm --filter @ezstart/[package] build
```

### Standards de Qualité

✅ **Avant chaque commit :**
- TypeCheck sans erreurs
- Lint warnings acceptables (pas de blockers)
- Build réussi pour packages modifiés

✅ **Avant chaque push :**
- Tous les packages buildent
- Documentation à jour
- Tests passent (si applicable)

---

## 🎯 Checklist Création Nouveau Package

Quand tu crées un nouveau package dans `/packages/` :

- [ ] Vérifier si peut être ajouté à package existant
- [ ] Créer structure standard (src/, dist/, package.json, tsconfig.json)
- [ ] Utiliser config centralisée (@ezstart/typescript-config)
- [ ] Créer README.md complet avec exemples
- [ ] Ajouter exports propres dans src/index.ts
- [ ] Builder et vérifier TypeCheck
- [ ] Tester import dans une app
- [ ] Commiter avec message descriptif
- [ ] Mettre à jour CLAUDE.md si nouvelle pratique

---

## 🎯 Checklist Création Nouvelle App

Quand tu crées une nouvelle app dans `/apps/` :

- [ ] Vérifier structure : web/, api/, types/, utils/, config/
- [ ] APIs : Utiliser @ezstart/express-core + connectToMongo(dbName)
- [ ] Web : Utiliser configs centralisées (tailwind, eslint, tsconfig)
- [ ] Ajouter port dans packages/config/src/urls.ts
- [ ] Setup providers (ThemeProvider, AuthProvider)
- [ ] Créer .env.example avec toutes les variables
- [ ] Créer vercel.json (web) ou configurer Railway (api)
- [ ] Ajouter scripts standard (dev, build, lint, typecheck)
- [ ] Tester build local
- [ ] Commiter et pusher
- [ ] Déployer et vérifier production

---

## 🔧 Troubleshooting Fréquent

### Port Already in Use

**Problème :** Anciens processus Node.js persistent.

**Solution :**
```bash
# Killer tous les ports @ezstart
pnpm kill:ports

# Ou redémarrer VS Code
```

### TypeScript Errors après Ajout Package

**Problème :** Types non trouvés après ajout workspace dependency.

**Solution :**
```bash
# Reinstaller dépendances
pnpm install

# Rebuild le package
pnpm --filter @ezstart/[package] build

# Relancer TypeScript watcher
pnpm dev:types
```

### CORS Errors en Dev

**Problème :** API rejette requests du frontend.

**Solution :**
```typescript
// Vérifier createApp avec apiApp
const app = createApp({ apiApp: 'ezauth' })

// Vérifier getApiUrl dans web app
const API_URL = getApiUrl('ezauth') // Pas hardcodé
```

### MongoDB Connection Timeout

**Problème :** `bufferCommands` timeout ou multiple connections.

**Solution :**
```typescript
// Utiliser connectToMongo() au lieu de mongoose.connect()
import { connectToMongo } from '@ezstart/express-core'

// Factory functions pour models
export async function getMyModel() {
  const mongoose = await connectToMongo('database-name')
  return mongoose.models.MyModel || mongoose.model('MyModel', schema)
}
```

---

## 📁 Scripts — Organisation Stricte

### Structure Obligatoire

```
scripts/
├── generators/          # Créent du code/des projets (réutilisables)
│   ├── create-api.js
│   ├── create-app.js
│   ├── create-web-app.js
│   └── generate-specialist-agents.js
├── tools/               # Utilitaires dev (réutilisables)
│   ├── kill-ports.ps1
│   ├── dev-status.ps1
│   ├── backup-mongodb.sh
│   ├── convert-images-webp.js
│   └── optimize-images.js
└── monitoring/          # Health checks & audits
    ├── check-all-services.sh
    └── generate-audit-report.sh
```

### Règles

- ✅ **TOUJOURS** placer les scripts dans le bon sous-dossier de `scripts/`
- ✅ **Scripts réutilisables** → `scripts/generators/` ou `scripts/tools/`
- ✅ **Scripts temporaires/one-shot** → les exécuter et les supprimer immédiatement, JAMAIS les commiter
- ❌ **JAMAIS** de scripts à la racine du monorepo (sauf configs: eslint, prettier, turbo)
- ❌ **JAMAIS** de dossier `tmp/` ou `src/` à la racine
- ❌ **JAMAIS** de fichiers `*.backup` dans le repo
- ❌ **JAMAIS** de scripts de test one-shot (test-*.js, fix-*.js, etc.) — utiliser les tests Vitest

---

## 📚 Ressources

### Documentation Interne

- [CLAUDE.md](./CLAUDE.md) - Configuration complète du monorepo
- [DEPLOY.md](./DEPLOY.md) - Guide de déploiement
- [docs/README.md](./docs/README.md) - Dashboard des audits
- [docs/AUDIT-SUMMARY.md](./docs/AUDIT-SUMMARY.md) - Executive summary

### Guides Packages

- [packages/config/README.md](./packages/config/README.md) - URLs, ports, CORS
- [packages/express-core/README.md](./packages/express-core/README.md) - Infrastructure API
- [packages/ui/README.md](./packages/ui/README.md) - Composants UI
- [packages/auth-sdk/README.md](./packages/auth-sdk/README.md) - SDK authentification
- [packages/pay-sdk/README.md](./packages/pay-sdk/README.md) - SDK paiement

### Audits (16/16 Complete)

Voir [docs/README.md](./docs/README.md) pour la liste complète des audits.

---

**Last Updated:** 2025-10-21
**Version:** 1.0.0
**Maintainer:** @ezstart team
