# 🚀 Configuration Claude - @ezstart Monorepo

## 📋 GUIDE DE DÉMARRAGE POUR NOUVEAU CLAUDE

### État Actuel (12/09/2025 - 18h30)

**Monorepo 100% opérationnel avec :**
- ✅ Tous les services sur ports 50xx (voir tableau ci-dessous)
- ✅ Architecture .env standardisée (.env.example + .env.local)
- ✅ TypeScript centralisé avec un seul `tsc -b --watch`
- ✅ Configuration 100% partagée et optimisée

### Comment Démarrer une Session de Développement

#### Option 1: Mode Optimisé (RECOMMANDÉ)
```bash
# Terminal 1: Watcher TypeScript centralisé
pnpm dev:types  # Lance tsc -b --watch pour TOUT le monorepo

# Terminal 2: Tous les serveurs
pnpm dev  # Lance tous les services sans tsc --watch individuel
```
**Résultat:** ~10-15 processus Node.js au lieu de 50+

#### Option 2: Mode Simple
```bash
pnpm dev  # Lance tout (moins optimisé, plus de processus)
```

#### Option 3: Développement Ciblé
```bash
pnpm dev:billing  # EZ-Billing + EZAuth
pnpm dev:td       # Tower Defense + EZAuth
pnpm dev:ez       # EZStart seul
```

### Vérifier l'État des Services
```bash
pnpm dev:status  # Affiche l'état de tous les services avec leurs ports
```

### Ports et URLs des Services

| Service | Type | Port | URL | Status |
|---------|------|------|-----|--------|
| EZAuth | API | 5010 | http://localhost:5010 | ✅ Running |
| EZAuth | Web | 5015 | http://localhost:5015 | ✅ Running |
| EZ-Billing | API | 5020 | http://localhost:5020 | ✅ Running |
| EZ-Billing | Web | 5025 | http://localhost:5025 | ✅ Running |
| Tower Defense | API | 5030 | http://localhost:5030 | ✅ Running |
| Tower Defense | Web | 5035 | http://localhost:5035 | ✅ Running |
| EZStart | Web | 5045 | http://localhost:5045 | ✅ Running |
| ASC-TCD | Web | 5055 | http://localhost:5055 | ✅ Running |
| FengShui | Web | 5065 | http://localhost:5065 | ✅ Running |
| Green-Pulse | Web | 5075 | http://localhost:5075 | ✅ Running |

### Architecture .env Actuelle

```
📁 Chaque projet :
├── .env.example    ← Template avec placeholders (committé)
├── .env.local      ← Valeurs réelles (git-ignoré, chargé en priorité)
└── ❌ PAS de .env  ← Évite la confusion
```

**Important:** express-core charge `.env.local` en priorité, puis `.env` en fallback

### Processus Background Actuels

Si tu reprends une session avec des processus déjà en cours :
1. Vérifie avec `pnpm dev:status`
2. Si besoin, tue tous les Node.js et relance
3. Les IDs de processus background peuvent être vus avec BashOutput

### Points Critiques à Respecter

1. **JAMAIS** ajouter `tsc --watch` dans les scripts dev des packages
2. **TOUJOURS** utiliser `.env.local` pour les secrets (jamais `.env`)
3. **TOUJOURS** vérifier que `composite: true` est présent dans les tsconfig
4. **TOUJOURS** utiliser les ports 50xx (pattern: APIs 50x0, Web 50x5)
5. **TOUJOURS** utiliser les configs centralisées avant de créer du local

# Configuration Claude - @ezstart Monorepo

## Architecture et Bonnes Pratiques

### Principe de Base : Réutilisabilité Maximale

- **TOUJOURS** utiliser/créer des composants agnostiques au maximum
- **PRIORITÉ** aux packages partagés du monorepo avant toute création spécifique

### Bonnes Pratiques UI/UX

- **JAMAIS** utiliser des balises HTML natives (`<input>`, `<button>`, `<label>`)
- **TOUJOURS** utiliser les composants du package `@ezstart/ui/components` (Input, Button, Label, Card, etc.)
- **JAMAIS** utiliser des couleurs hardcodées (`bg-red-50`, `text-gray-600`)
- **TOUJOURS** utiliser des classes sémantiques (`bg-destructive/15`, `text-muted-foreground`, `text-primary`)
- **TOUJOURS** laisser les composants gérer leurs propres styles et couleurs

### Structure Monorepo

```
@ezstart/
├── packages/           # Packages partagés entre tous les projets
│   ├── types/         # Types TypeScript communs
│   ├── utils/         # Utilitaires partagés
│   ├── config/        # Configurations communes
│   └── ...
├── apps/
│   ├── ez-billing/
│   │   ├── web/       # Frontend Next.js
│   │   ├── api/       # Backend API
│   │   ├── types/     # Types spécifiques au projet (mais partagés web/api)
│   │   ├── utils/     # Utils spécifiques au projet (mais partagés web/api)
│   │   ├── config/    # Config spécifique au projet (mais partagée web/api)
│   │   └── ...
│   └── tower-defense/
│       ├── web/
│       ├── api/
│       ├── types/     # Types spécifiques TD mais partagés web/api
│       ├── utils/
│       ├── config/
│       └── ...
```

### Règles de Développement

#### 1. Hiérarchie des Packages

1. **packages/** - Pour tout ce qui peut être réutilisé entre projets
2. **apps/[project]/[shared]** - Pour ce qui est spécifique au projet mais partagé entre web/api
3. **apps/[project]/web|api** - Seulement pour ce qui est vraiment spécifique à une couche

#### 2. Avant de Créer Quoi Que Ce Soit

- Vérifier si existe dans `packages/`
- Vérifier si peut être généralisé pour `packages/`
- Si spécifique au projet : vérifier si partageable entre web/api
- Créer dans la couche la plus haute possible

#### 3. Exemples Concrets

- Types d'entités → `packages/types` ou `apps/[project]/types`
- Utilitaires de validation → `packages/utils`
- Configs API communes → `packages/config`
- Types spécifiques EZ-Billing → `apps/ez-billing/types`
- Composants UI réutilisables → `packages/ui` (si existe)

## 🚀 MONOREPO ULTRA-OPTIMISÉ - Architecture et Principes

### Principe Fondamental : Partage et Centralisation Maximum

**OBJECTIF :** Un monorepo avec le MAXIMUM de partage possible, MINIMUM de duplication, et MINIMUM de processus.

### Architecture TypeScript Optimisée

#### 1. Compilation Centralisée avec `tsc -b`

**Configuration obligatoire :**
- ✅ **UN SEUL** `tsc -b --watch` à la racine pour TOUT le monorepo
- ✅ **tsconfig.json root** avec `references` vers tous les packages/apps
- ✅ **`composite: true`** dans TOUS les tsconfig des packages
- ❌ **JAMAIS** de `tsc --watch` dans les scripts dev des packages

**Scripts optimisés :**
```json
// package.json root
"dev:types": "tsc -b --watch",        // UN SEUL processus TypeScript
"dev": "turbo dev --concurrency 50",   // Sans les tsc --watch
"dev:optimized": "concurrently \"pnpm dev:types\" \"turbo dev\""
```

**Avantages :**
- 1 processus TypeScript au lieu de 22+
- Compilation intelligente des dépendances
- Recompilation automatique en cascade

#### 2. Hiérarchie des Configurations

**Toujours vérifier et utiliser dans cet ordre :**
1. Config centralisée dans `@ezstart/typescript-config`
2. Config centralisée dans `@ezstart/eslint-config` 
3. Config centralisée dans `@ezstart/tailwind-config`
4. Créer une nouvelle config partagée si nécessaire
5. En dernier recours seulement : config locale

**Packages de configuration :**
- `typescript-config` : 6 variantes (base, api, nextjs, library, react-library, types)
- `eslint-config` : 3 variantes (base, next-js, react-internal)
- `tailwind-config` : Config Tailwind partagée
- `next-config` : Config Next.js partagée

#### 3. Règles de Development

**À vérifier systématiquement :**
- ✅ Tous les packages utilisent une config TypeScript centralisée
- ✅ `composite: true` présent dans tous les tsconfig
- ✅ Target uniforme : ES2022 pour tout le monorepo
- ✅ Pas de duplication de dépendances (vérifier pnpm-lock.yaml)
- ✅ Scripts dev sans `tsc --watch` (géré au root)

**Structure tsconfig.json pour packages :**
```json
{
  "extends": "@ezstart/typescript-config/[variante].json",
  "compilerOptions": {
    "composite": true,  // OBLIGATOIRE pour tsc -b
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

## Configuration Standardisée - Maximum de Réutilisabilité ✅

### ⚡ CONTRÔLE QUALITÉ GLOBAL

- **TypeCheck** : `pnpm typecheck` - ✅ **18/18 packages** vérifiés (couverture complète)
- **Lint** : `pnpm lint` - ✅ **17/17 packages** avec code vérifié (couverture complète)
- **Centralisation** : ✅ **100% des apps/packages** utilisent les configs centralisées
- **Structure packages** : ✅ **95/100** conformité aux critères CLAUDE.md (exemplaire)
- **Warnings supprimés** : ✅ Règles ennuyeuses désactivées tout en gardant les importantes

### 📦 CONFORMITÉ STRUCTURE PACKAGES

- **Hiérarchie respectée** : ✅ packages/ pour réutilisable, apps/[project]/ pour spécifique
- **Réutilisabilité maximale** : ✅ Composants agnostiques, infrastructure partagée
- **Bonnes pratiques UI** : ✅ Radix UI, classes sémantiques, pas de HTML natif
- **Configuration centralisée** : ✅ Toutes les apps partagent les mêmes configs
- **Architecture cohérente** : ✅ Dépendances workspace:\* correctes

### Apps Web - Configuration 100% Centralisée

Toutes les apps web (`ezstart/web`, `ezauth/web`, `ez-billing/web`, `fengshui/web`, `tower-defense/web`, `asc-tcd/web`) utilisent **exactement** la même configuration :

#### Configuration de Base :

- **Tailwind Config** : `tailwind.config.js` → `@ezstart/tailwind-config/base.js`
- **PostCSS Config** : `postcss.config.mjs` → `@ezstart/ui/postcss.config`
- **ESLint Config** : `eslint.config.js` → `@ezstart/eslint-config/next-js`
- **TypeScript Config** : `tsconfig.json` → `@ezstart/typescript-config/nextjs.json`
- **CSS Globals** : `@import "@ezstart/ui/globals.css"`
- **Scripts standardisés** : `lint`, `typecheck` (script `dev` géré par Turbo)

#### Providers et Infrastructure :

- **Web Core** : `"@ezstart/next-core": "workspace:*"`
- **UI Components** : `"@ezstart/ui": "workspace:*"`
- **WebProviders** : Pour apps avec i18n (ezstart)
  ```tsx
  import { WebProviders } from '@ezstart/next-core/providers'
  <WebProviders messages={messages} locale={locale} timeZone={timeZone} appName="ezstart">
  ```
- **SimpleWebProviders** : Pour apps sans i18n (ezauth, ez-billing, fengshui, tower-defense)
  ```tsx
  import { SimpleWebProviders } from '@ezstart/next-core/providers'
  <SimpleWebProviders appName="fengshui">
  ```

#### Avantages de @ezstart/next-core :

- 🔐 **Auth centralisée** avec @ezstart/auth-sdk
- 🎨 **Theme management** avec next-themes
- 🌍 **i18n support** avec next-intl (si nécessaire)
- ⚡ **SSR/SSG optimized** avec client/server boundaries
- 🏗️ **Architecture unifiée** pour toutes les apps web

### APIs - Configuration 100% Centralisée

Toutes les APIs (`ezauth/api`, `ez-billing/api`, `tower-defense/api`) utilisent **exactement** la même configuration :

- **ESLint Config** : `eslint.config.js` → `@ezstart/eslint-config/base`
- **TypeScript Config** : `tsconfig.json` → `@ezstart/typescript-config/api.json`
- **Base commune** : `@ezstart/express-core` pour infrastructure partagée
- **Structure standardisée** : `outDir: "dist"`, `rootDir: "src"`, types harmonisés
- **Scripts standardisés** : `lint`, `typecheck`, `dev`, `build`

#### Bonnes Pratiques APIs - Préfixes Standardisés

**✅ OBLIGATOIRE : Utiliser le préfixe `/api`**

Toutes les APIs du monorepo DOIVENT utiliser le préfixe `/api` pour :
- **Séparation claire** : distinction routes API vs assets/web
- **Proxying** : facilite la configuration nginx/reverse proxy
- **Standards** : convention universelle (Next.js, Express, etc.)
- **Sécurité** : règles CORS/auth plus simples à appliquer

**Structure API standardisée :**
```typescript
// Dans server.ts de chaque API
app.use('/api', routes)
app.get('/api/health', (_, res) => res.status(200).json({ status: 'ok' }))
```

**URLs finales :**
- EZAuth : `http://localhost:5010/api/auth/*`, `/api/health`
- EZ-Billing : `http://localhost:5020/api/clients`, `/api/invoices`, `/api/health`
- Tower Defense : `http://localhost:5030/api/*`, `/api/health`

**✅ RESPECT DU PATTERN :**
- `NEXT_PUBLIC_API_URL=http://localhost:50XX/api` dans les `.env.local`
- Endpoints expose via `callApi('/clients')` → `GET /api/clients`

### Packages - Configuration 100% Centralisée

Tous les packages utilisent les configurations centralisées selon leur type :

#### Packages React (UI/Web-Core)

- **ESLint Config** : `eslint.config.js` → `@ezstart/eslint-config/react-internal`
- **TypeScript Config** : `tsconfig.json` → `@ezstart/typescript-config/react-library.json` ou `base.json`

#### Packages TypeScript (Auth-SDK, API-Core, Types)

- **TypeScript Config uniquement** : `tsconfig.json` → `@ezstart/typescript-config/base.json`
- **Pas d'ESLint** : Packages simples de types/config n'ont pas besoin de lint

### Packages Centralisés de Configuration

- `@ezstart/tailwind-config` - Configs Tailwind partagées
- `@ezstart/eslint-config` - Règles ESLint partagées avec 3 variantes :
  - `base.js` - Configuration de base (APIs, packages simples)
  - `next-js.js` - Configuration Next.js (apps web)
  - `react-internal.js` - Configuration React (packages internes)
- `@ezstart/typescript-config` - Configs TypeScript partagées avec 6 variantes :
  - `base.json` - Configuration de base
  - `api.json` - Configuration API
  - `nextjs.json` - Configuration Next.js
  - `library.json` - Configuration bibliothèque
  - `react-library.json` - Configuration React library
  - `types.json` - Configuration types
- `@ezstart/next-config` - Configs Next.js partagées
- `@ezstart/ui` - Composants, styles et configs CSS/PostCSS
- `@ezstart/next-core` - Infrastructure web partagée (providers, auth, themes)
- `@ezstart/express-core` - Infrastructure API partagée
- `@ezstart/auth-sdk` - SDK d'authentification centralisé

### Propagation Automatique des Changements

✨ **Toute modification** dans les packages centralisés se propage **automatiquement** à tous les projets. Une seule source de vérité pour l'ensemble du monorepo !

### Commandes Importantes

- Build : `pnpm build`
- TypeCheck : `pnpm typecheck`
- Lint : `pnpm lint`
- Tests : vérifier dans chaque projet (pas de standard défini)

### Documentation README - Règles Obligatoires

- **TOUJOURS** maintenir les README des packages à jour après chaque modification
- **OBLIGATOIRE** pour tous les packages dans `/packages/` car utilisés par plusieurs apps
- **README doit inclure** :
  - Overview et description claire du package
  - Installation et configuration
  - Exemples d'usage avec code
  - API Reference pour les packages complexes
  - Applications qui utilisent le package
  - Related packages et liens utiles
- **Mettre à jour README AVANT** de commiter les changements du package
- **Ajouter cette tâche** aux modifications de packages dans TodoWrite

### Git Commits - Règles Obligatoires

- **TOUJOURS** commiter après chaque modification importante
- **TOUJOURS** documenter les changements de manière détaillée dans le message
- **TOUJOURS** mettre à jour CLAUDE.md pour mémoriser les nouvelles pratiques/règles
- **TOUJOURS** mettre à jour README des packages avant commit
- **NE JAMAIS** ajouter les lignes suivantes dans les commits :
  - `🤖 Generated with [Claude Code](https://claude.ai/code)`
  - `Co-Authored-By: Claude <noreply@anthropic.com>`
- **Messages de commit** : descriptifs, professionnels, avec contexte et impact
- **Structure recommandée** :

  ```
  type: brief description

  - Detailed changes list
  - Technical modifications
  - Documentation updates
  - Impact/results
  ```

## 🚀 DÉPLOIEMENT - Configuration Vercel & Render ✅

### Configuration Vercel (Apps Web) - 100% Opérationnel

**Stratégie de déploiement :**
- ✅ **Root Directory** : `apps/[app]/web` (cible le sous-dossier du monorepo)
- ✅ **Include files outside root directory** : COCHÉ (obligatoire pour monorepo)
- ✅ **Build Command** : `pnpm build` (utilise le package.json local)

**Build Commands optimisés dans package.json :**
```json
// Toutes les apps web ont cette structure optimisée
"build": "pnpm --filter @ezstart/ui --filter @ezstart/auth-sdk --filter @ezstart/next-theme build && next build"
```

**Apps Web déployées sur Vercel :**
- **EZStart** : https://ezstart-web.vercel.app
- **EZAuth** : https://ezauth-web.vercel.app
- **EZ-Billing** : https://ez-billing-web.vercel.app
- **Tower Defense** : https://tower-defense-web.vercel.app
- **FengShui** : https://fengshui-web.vercel.app
- **ASC-TCD** : https://asc-tcd-web.vercel.app

### Configuration Render (APIs) - 100% Opérationnel

**Stratégie de déploiement :**
- ✅ **Repository** : https://github.com/DFranck/ezstart (racine du monorepo)
- ✅ **Build Command** : `pnpm install --frozen-lockfile --shamefully-hoist && pnpm turbo build --filter=api-[name]`
- ✅ **Start Command** : `cd apps/[app]/api && node dist/[file].js`

**Build Commands par API :**
```bash
# EZAuth API
Build: pnpm install --frozen-lockfile --shamefully-hoist && pnpm turbo build --filter=api-ezauth
Start: cd apps/ezauth/api && node dist/index.js

# EZ-Billing API
Build: pnpm install --frozen-lockfile --shamefully-hoist && pnpm turbo build --filter=api-ez-billing
Start: cd apps/ez-billing/api && node dist/server.js

# Tower Defense API
Build: pnpm install --frozen-lockfile --shamefully-hoist && pnpm turbo build --filter=api-tower-defense
Start: cd apps/tower-defense/api && node dist/server.js
```

**Variables d'environnement Render :**
- `NODE_ENV=production`
- `PORT=10000`
- Health Check: `/api/health`

### Build Filters Render (Optimisation) ✅

**Pour éviter les rebuilds inutiles, configurer :**

**EZAuth API - Included Paths :**
```
apps/ezauth/api/**
packages/express-core/**
packages/types/**
packages/ui/**
```

**EZ-Billing API - Included Paths :**
```
apps/ez-billing/api/**
packages/express-core/**
packages/types/**
```

**Tower Defense API - Included Paths :**
```
apps/tower-defense/api/**
packages/express-core/**
packages/types/**
```

**Ignored Paths (pour toutes les APIs) :**
```
apps/ezstart/**
apps/fengshui/**
apps/asc-tcd/**
packages/ui/** (sauf EZAuth)
packages/auth-sdk/** (sauf si utilisé)
```

### Bonnes Pratiques Déploiement

1. **Vercel** : Toujours cocher "Include files outside root directory"
2. **Render** : Utiliser les Build Filters pour optimiser les déploiements
3. **Monorepo** : Build les dépendances avant les apps (ordre important)
4. **Health Checks** : Tous les endpoints `/api/health` configurés
5. **Variables d'env** : Production settings appliquées

### Notes Techniques

- Monorepo utilise pnpm workspaces
- TypeScript avec configurations partagées
- Architecture microservices avec packages partagés
- Déploiements Vercel et Render 100% opérationnels

### Gestion des Processus Background

- **TOUJOURS** tuer les processus background après utilisation avec `KillBash`
- **NE JAMAIS** laisser des serveurs de développement tourner en arrière-plan
- **PROBLÈME FRÉQUENT** : Les processus Node.js persistent même après `KillBash`, causant l'incrémentation des ports
- **SOLUTION** : Utiliser Ctrl+C dans le terminal ou redémarrer VS Code pour tuer tous les processus Node.js
- Utiliser `run_in_background: true` avec parcimonie et toujours nettoyer après
- Vérifier avec `BashOutput` avant de tuer le processus
- Exemple correct :
  ```
  1. Bash avec run_in_background: true
  2. BashOutput pour vérifier l'état
  3. KillBash pour terminer proprement
  ```

## Configuration des Ports et .env - NOUVELLE ARCHITECTURE ✅

### Système de Ports Standardisé (Implémenté le 12/09/2025)

**Pattern 50xx :**
- **APIs (50x0)** : EZAuth 5010, EZ-Billing 5020, Tower Defense 5030
- **Web Apps (50x5)** : EZAuth 5015, EZ-Billing 5025, Tower Defense 5035
- **Web Standalone** : EZStart 5045, ASC-TCD 5055, FengShui 5065

### Architecture .env Standardisée

**Structure par projet :**
```
📁 Chaque projet :
├── .env.example    ← Template committé avec placeholders
├── .env.local      ← Valeurs réelles (ignoré par git)
└── ❌ PAS de .env  ← Supprimé pour éviter confusion
```

**Changements effectués :**
1. ✅ Suppression des ports hardcodés dans `express-core`
2. ✅ Migration de tous les `.env` vers `.env.local`
3. ✅ Création de `.env.example` pour tous les projets
4. ✅ Mise à jour `.gitignore` pour permettre `.env.example`
5. ✅ Suppression des variables `NEXT_PUBLIC_EZAUTH_*` (auto-config dans auth-sdk)
6. ✅ Mise à jour `auth-sdk/client.ts` avec nouveaux ports (5010/5015)
7. ✅ Correction `express-core/index.ts` : suppression export `API_PORTS`

**État actuel (après kill node.exe) :**
- Monorepo prêt avec nouveaux ports
- Lancer avec `pnpm dev` utilisera les ports 50xx
- Tous les fichiers .env.local doivent avoir les bons ports
- Script `dev-status.ps1` mis à jour avec nouveaux ports

**À faire au prochain démarrage :**
1. Vérifier que tous les .env.local ont les bons ports (50xx)
2. Lancer `pnpm dev` pour démarrer avec nouveaux ports
3. Tester avec `pnpm dev:status` pour confirmer

## EZAuth - Système d'Authentification Centralisé

### Architecture

- **Service API** : `apps/ezauth/api` - Service standalone sur port 8001
- **Client SDK** : `packages/auth-sdk` - Package réutilisable avec React hooks
- **Base de données** : MongoDB partagée avec collections séparées (`auth_users`, `auth_codes`)

### Flow OAuth2

1. **Redirect** → EZAuth service (`/login?app=ez-billing&redirect_uri=...`)
2. **Auth** → Utilisateur se connecte/enregistre
3. **Callback** → Retour avec code d'autorisation (`/auth/callback?code=...`)
4. **Exchange** → Code → JWT token (7 jours)
5. **SSO** → Token valide sur toutes les apps

### Intégration dans les Apps

```tsx
// 1. Ajouter dépendance
"@ezstart/auth-sdk": "workspace:*"

// 2. Setup client
import { AuthProvider, AuthClient } from '@ezstart/auth-sdk'
const authClient = new AuthClient({
  baseURL: 'http://localhost:8001/api/auth',
  appName: 'ez-billing', // ou 'tower-defense'
  redirectUri: 'http://localhost:3000/auth/callback'
})

// 3. Provider
<AuthProvider client={authClient}>
  <App />
</AuthProvider>

// 4. Hooks
import { useAuth, useUser } from '@ezstart/auth-sdk'
const { user, isAuthenticated, login, logout } = useAuth()
```

### Endpoints API

- `GET /health` - Health check
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/token` - Échange code → token
- `GET /api/auth/me` - Info utilisateur (protégé)
- `POST /api/auth/verify` - Validation token

### Migration depuis système actuel

1. **Remplacer** AuthProvider actuel par EZAuth
2. **Créer** page `/auth/callback` dans chaque app
3. **Single Sign-On** automatique entre toutes les apps

## APIs - Standardisation Express-Core ✅

### Configuration 100% Centralisée avec @ezstart/express-core

Toutes les APIs (`ezauth/api`, `ez-billing/api`, `tower-defense/api`) utilisent **exactement** la même infrastructure standardisée :

#### Infrastructure Unifiée :

- **App Bootstrap** : `createApp()` - Express app avec CORS, JSON parsing, dotenv automatique
- **MongoDB Connection** : `connectToMongo('database-name')` - Connexion standardisée
- **Server Startup** : `startServer(app, { routes, registries, serviceName, port })` - Démarrage avec OpenAPI
- **Port Management** : `getApiPort('EZAUTH|EZ_BILLING|TOWER_DEFENSE')` - Configuration centralisée
- **Router Export** : `Router` depuis express-core - Plus d'import express direct
- **Validation** : `validateParams()`, `validateQuery()` - Middlewares partagés

#### Exemple d'API Standardisée :

```typescript
import {
  createApp,
  connectToMongo,
  startServer,
  getApiPort,
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
} from '@ezstart/express-core'

const PORT = getApiPort('EZAUTH') // 8081 avec fallback process.env.PORT
const app = createApp() // CORS + JSON + dotenv automatique

// Routes avec OpenAPI
const registry = new OpenAPIRegistry()
const router = Router() // Router centralisé
const docRouter = createRouterWithDoc(registry, router)

app.use('/api/auth', router)
app.get('/api/health', (_, res) => res.json({ status: 'ok' }))

// Démarrage avec connexion MongoDB
connectToMongo('ezauth')
  .then(() =>
    startServer(app, {
      routes: router,
      registries: [registry],
      serviceName: 'EZAuth',
      port: PORT,
    })
  )
  .catch(err => {
    console.error('❌ Failed to start API', err)
    process.exit(1)
  })
```

#### Ports Standardisés :

- **ezauth** : Port 8081 (`getApiPort('EZAUTH')`)
- **ez-billing** : Port 4101 (`getApiPort('EZ_BILLING')`)
- **tower-defense** : Port 4201 (`getApiPort('TOWER_DEFENSE')`)

#### Bonnes Pratiques APIs :

✅ **TOUJOURS** utiliser `createApp()` au lieu de `express()`  
✅ **TOUJOURS** utiliser `Router` depuis express-core  
✅ **JAMAIS** importer `express` directement  
✅ **JAMAIS** faire `dotenv.config()` manuellement  
✅ **TOUJOURS** utiliser `getApiPort()` pour les ports  
✅ **TOUJOURS** utiliser `connectToMongo()` pour MongoDB  
✅ **TOUJOURS** utiliser `startServer()` avec OpenAPI

#### Validation Tests :

- ✅ **TypeCheck** : `pnpm typecheck` - Toutes les APIs sans erreur
- ✅ **Build** : `pnpm --filter "api-*" build` - Compilation réussie
- ✅ **Startup** : Connexion MongoDB + serveur opérationnel
- ✅ **Lint** : Warnings acceptables, aucune erreur bloquante

### Configuration Express-Core Package :

- **config/ports.ts** : Configuration centralisée des ports
- **infra/createApp.ts** : Bootstrap Express avec CORS automatique
- **infra/connectToMongo.ts** : Connexion MongoDB standardisée
- **infra/startServer.ts** : Démarrage serveur + OpenAPI
- **middlewares/** : Validation params/query partagée
- **openapi/** : Documentation automatique avec Zod
