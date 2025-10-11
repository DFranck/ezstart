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
pnpm dev:billing  # EZBill + EZAuth
pnpm dev:td       # Tower Defense + EZAuth
pnpm dev:ez       # EZStart seul
```

### Vérifier l'État des Services

```bash
pnpm dev:status  # Affiche l'état de tous les services avec leurs ports
```

### Ports et URLs des Services

| Service       | Type    | Port     | URL                       | Status         |
| ------------- | ------- | -------- | ------------------------- | -------------- |
| EZAuth        | API     | 5010     | http://localhost:5010     | ✅ Running     |
| EZAuth        | Web     | 5015     | http://localhost:5015     | ✅ Running     |
| EZBill        | API     | 5020     | http://localhost:5020     | ✅ Running     |
| EZBill        | Web     | 5025     | http://localhost:5025     | ✅ Running     |
| Tower Defense | API     | 5030     | http://localhost:5030     | ✅ Running     |
| Tower Defense | Web     | 5035     | http://localhost:5035     | ✅ Running     |
| **EZPay**     | **API** | **5040** | **http://localhost:5040** | **✅ Running** |
| **EZPay**     | **Web** | **5045** | **http://localhost:5045** | **✅ Running** |
| EZStart       | Web     | 5050     | http://localhost:5050     | ✅ Running     |
| ASC-TCD       | Web     | 5055     | http://localhost:5055     | ✅ Running     |
| FengShui      | Web     | 5065     | http://localhost:5065     | ✅ Running     |
| GreenPulse    | API     | 5070     | http://localhost:5070     | ✅ Running     |
| GreenPulse    | Web     | 5075     | http://localhost:5075     | ✅ Running     |

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
│   ├── ezbill/
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
- Types spécifiques EZBill → `apps/ezbill/types`
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
    "composite": true, // OBLIGATOIRE pour tsc -b
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

Toutes les apps web (`ezstart/web`, `ezauth/web`, `ezbill/web`, `fengshui/web`, `tower-defense/web`, `asc-tcd/web`) utilisent **exactement** la même configuration :

#### Configuration de Base :

- **Tailwind Config** : `tailwind.config.js` → `@ezstart/tailwind-config/base.js`
- **PostCSS Config** : `postcss.config.mjs` → `@ezstart/ui/postcss.config`
- **ESLint Config** : `eslint.config.js` → `@ezstart/eslint-config/next-js`
- **TypeScript Config** : `tsconfig.json` → `@ezstart/typescript-config/nextjs.json`
- **CSS Globals** : `@import "@ezstart/ui/globals.css"`
- **Scripts standardisés** : `lint`, `typecheck` (script `dev` géré par Turbo)

#### Providers et Infrastructure :

- **Theme Provider** : `"@ezstart/next-theme": "workspace:*"`
- **Auth Provider** : `"@ezstart/auth-sdk": "workspace:*"`
- **UI Components** : `"@ezstart/ui": "workspace:*"`

**Setup standard (apps sans i18n) :**

```tsx
import { ThemeProvider } from '@ezstart/next-theme'
import { AuthProvider } from '@ezstart/auth-sdk'

;<ThemeProvider>
  <AuthProvider appName="fengshui">{children}</AuthProvider>
</ThemeProvider>
```

**Setup avec i18n (ezstart uniquement) :**

```tsx
import { ThemeProvider } from '@ezstart/next-theme'
import { AuthProvider } from '@ezstart/auth-sdk'
import { NextIntlClientProvider } from 'next-intl'

;<NextIntlClientProvider messages={messages} locale={locale}>
  <ThemeProvider>
    <AuthProvider appName="ezstart">{children}</AuthProvider>
  </ThemeProvider>
</NextIntlClientProvider>
```

#### Avantages de l'Architecture :

- 🔐 **Auth centralisée** avec @ezstart/auth-sdk (SSO)
- 🎨 **Theme management** avec @ezstart/next-theme (dark/light mode)
- 🌍 **i18n support** avec next-intl (optionnel)
- ⚡ **SSR/SSG optimized** avec client/server boundaries Next.js
- 🏗️ **Architecture unifiée** pour toutes les apps web

### APIs - Configuration 100% Centralisée

Toutes les APIs (`ezauth/api`, `ezbill/api`, `tower-defense/api`) utilisent **exactement** la même configuration :

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
// Dans index.ts de chaque API (convention standard Node.js)
app.use('/api', routes)
app.get('/api/health', (_, res) => res.status(200).json({ status: 'ok' }))
```

**✅ CONVENTION OBLIGATOIRE : Point d'entrée `index.ts`**

Toutes les APIs utilisent **`src/index.ts`** comme point d'entrée :

- **Convention Node.js standard** : fichier par défaut
- **package.json** : `"main": "dist/index.js"`
- **Scripts** : `"dev": "tsx watch src/index.ts"`, `"start": "node dist/index.js"`
- **Cohérence** : toutes les APIs (EZAuth, EZBill, Tower Defense, EZPay) utilisent cette convention

**URLs finales :**

- EZAuth : `http://localhost:5010/api/auth/*`, `/api/health`
- EZBill : `http://localhost:5020/api/clients`, `/api/invoices`, `/api/health`
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
- `@ezstart/next-theme` - Theme provider (dark/light mode)
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

### Renaming Projects - Migration Scripts

**Historique des migrations :**

- **10/10/2025** : `ez-billing` → `ezbill` (commit 55bb447)

**Script de migration disponible :**

- `scripts/rename-ez-billing-to-ezbill.sh` - Script complet de migration

**Process de renaming d'un projet :**

1. Créer un script bash dans `scripts/` avec les étapes suivantes :
   - Utiliser `git mv` pour préserver l'historique git
   - Mettre à jour tous les `package.json` (name, dependencies)
   - Mettre à jour les imports TypeScript avec `sed` + `find`
   - Mettre à jour la documentation (CLAUDE.md, DEPLOY.md, README)
   - Mettre à jour les messages i18n si nécessaire
   - Nettoyer le cache (node_modules/.cache, .turbo)
   - Réinstaller les dépendances avec `pnpm install`
2. Tester la compilation avec `pnpm turbo build --filter=[new-name]`
3. Actions manuelles post-migration :
   - Renommer le projet sur Vercel/Railway
   - Mettre à jour Root Directory dans Vercel
   - Tester le déploiement
   - Commit avec message descriptif

## 🚀 DÉPLOIEMENT - Configuration Railway & Vercel ✅

**📄 Documentation complète : Voir [DEPLOY.md](./DEPLOY.md) à la racine du monorepo**

### Architecture de Déploiement

**Railway (Free Plan $1/mois) - APIs Critiques :**

- ✅ **EZAuth API** : https://ezauth.up.railway.app (private: ezauth.railway.internal)
- ✅ **EZPay API** : https://ezpay-api.up.railway.app (private: ezstart.railway.internal)

**Vercel (Free Tier) - Apps Web :**

- ✅ **EZStart** : https://ezstart-web.vercel.app
- ✅ **EZAuth** : https://ezauth.vercel.app
- ✅ **EZBill** : https://ezbill-web.vercel.app
- ✅ **EZPay** : https://ezpay-web.vercel.app
- ✅ **Tower Defense** : https://tower-defense-web.vercel.app
- ✅ **FengShui** : https://fengshui-web.vercel.app
- ✅ **ASC-TCD** : https://asc-tcd-web.vercel.app

### Pourquoi Railway pour EZAuth et EZPay ?

- ⚡ **0ms cold start** (critique pour SSO et paiements)
- 💰 **Usage ponctuel** (~$0.20-0.40/mois pour les deux)
- 🔒 **Toujours actif** (pas de sleep mode)
- 🎯 **Consommation faible** (authentification et paiements = pics courts)

### Configuration Railway - Build Optimisé

**EZAuth API :**

```bash
# Build Command (OPTIMISÉ)
pnpm install --frozen-lockfile --shamefully-hoist && \
pnpm --filter @ezstart/express-core build && \
pnpm turbo build --filter=api-ezauth

# Start Command
cd apps/ezauth/api && node dist/index.js

# Healthcheck
/api/health
```

**EZPay API :**

```bash
# Build Command (OPTIMISÉ)
pnpm install --frozen-lockfile --shamefully-hoist && \
pnpm --filter @ezstart/express-core build && \
pnpm turbo build --filter=api-ezpay

# Start Command
cd apps/ezpay/api && node dist/index.js

# Healthcheck
/api/health
```

**⚠️ Notes importantes :**

- Seul `@ezstart/express-core` est nécessaire pour builder les APIs
- Les SDKs (`auth-sdk`, `pay-sdk`, `ui`) ne sont utilisés que côté web
- Ne pas inclure `@ezstart/ui` dans le build des APIs

### Configuration Vercel (Apps Web)

**Stratégie de déploiement :**

- ✅ **Root Directory** : `apps/[app]/web`
- ✅ **Include files outside root directory** : COCHÉ (obligatoire)
- ✅ **Build Command** : `pnpm build`

**Build Commands optimisés dans package.json :**

```json
"build": "pnpm --filter @ezstart/ui --filter @ezstart/auth-sdk --filter @ezstart/next-theme build && next build"
```

### Monitoring Railway

**Vérifier la consommation :**

```
Dashboard Railway → Settings → Usage
- CPU Usage
- Memory Usage
- Network (entrant/sortant)
```

**Estimation consommation :**

```
EZAuth API : ~$0.10-0.20/mois (auth ponctuelle)
EZPay API : ~$0.10-0.20/mois (paiements rares)
TOTAL : ~$0.20-0.40/mois
RESTE : $0.60-0.80 de marge ✅
```

### Bonnes Pratiques Déploiement

1. **Railway** : Seul `express-core` nécessaire pour builder les APIs
2. **Vercel** : Toujours cocher "Include files outside root directory"
3. **Monorepo** : Build les dépendances avant les apps (ordre important)
4. **Health Checks** : Tous les endpoints `/api/health` configurés
5. **Secrets** : Utiliser `.env.local` en dev, Railway/Vercel Variables en prod
6. **Monitoring** : Surveiller usage Railway pour rester sous $1/mois

### Variables d'Environnement Production

**EZAuth API (Railway) :**

```env
NODE_ENV=production
PORT=5010
MONGO_URL=mongodb+srv://...
JWT_SECRET=production-secret
ALLOWED_ORIGINS=https://ezauth.vercel.app,https://ezbill-web.vercel.app,...
```

**EZPay API (Railway) :**

```env
NODE_ENV=production
PORT=5040
MONGO_URL=mongodb+srv://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
WEB_URL=https://ezpay-web.vercel.app
```

**Apps Web (Vercel) :**

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://ezauth.railway.internal/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

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

- **APIs (50x0)** : EZAuth 5010, EZBill 5020, Tower Defense 5030
- **Web Apps (50x5)** : EZAuth 5015, EZBill 5025, Tower Defense 5035
- **Web Standalone** : EZStart 5045, ASC-TCD 5055, FengShui 5065

### Architecture .env Standardisée ✅ (Mise à jour 10/10/2025)

**Structure 3 fichiers par projet :**

```
📁 Chaque API (ezauth, ezpay) :
├── .env.example       ← Template (COMMITTÉ) - Placeholders + documentation
├── .env.local         ← Dev local (GITIGNORED) - Secrets réels développement
└── .env.production    ← Production (GITIGNORED) - Secrets réels Railway
```

**Workflow Environnements :**

**1. Développement Local :**

```bash
cp apps/ezauth/api/.env.example apps/ezauth/api/.env.local
# Remplir avec valeurs dev (MongoDB local, test Stripe, etc.)
# express-core charge .env.local en priorité
```

**2. Production Railway :**

```bash
# NE PAS commiter .env.production
# Copier chaque variable dans Railway Dashboard → Settings → Variables
# Référence: .env.production contient toutes les variables nécessaires
```

**3. Template (.env.example) :**

```bash
# TOUJOURS à jour avec toutes les variables
# OBLIGATOIRE de mettre à jour après ajout de nouvelles variables
# Committé pour documenter la config nécessaire
```

**Règles Importantes :**

1. ✅ `.env.example` → Template SANS secrets (committé)
2. ✅ `.env.local` → Dev avec secrets réels (gitignored)
3. ✅ `.env.production` → Production avec secrets réels (gitignored)
4. ❌ `.env` → NE PLUS UTILISER (supprimé pour éviter confusion)
5. ✅ express-core charge `.env.local` en priorité, puis `.env` en fallback

**Configuration .gitignore :**

```
.env
.env.local
.env.*.local
.env.production
!.env.example
```

## EZAuth - Système d'Authentification Centralisé

### Architecture

- **Service API** : `apps/ezauth/api` - Service standalone sur port 8001
- **Client SDK** : `packages/auth-sdk` - Package réutilisable avec React hooks
- **Base de données** : MongoDB partagée avec collections séparées (`auth_users`, `auth_codes`)

### Flow OAuth2

1. **Redirect** → EZAuth service (`/login?app=ezbill&redirect_uri=...`)
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
  appName: 'ezbill', // ou 'tower-defense'
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

## EZPay - Système de Paiement Universel ⭐ NOUVEAU

### Architecture

- **Service API** : `apps/ezpay/api` - Service standalone sur port 5040
- **Service Web** : `apps/ezpay/web` - Dashboard et documentation sur port 5045
- **Client SDK** : `packages/pay-sdk` - Package réutilisable avec React hooks et composants
- **Base de données** : MongoDB partagée avec collection `payments`

### Cas d'Usage

EZPay gère **TOUS** les types de paiements du monorepo :

| Type              | Description                    | Exemple               |
| ----------------- | ------------------------------ | --------------------- |
| **Donations**     | Dons avec testimonials publics | Support Tower Defense |
| **Purchases**     | Achats in-app                  | Gems, powerups, items |
| **Subscriptions** | Abonnements récurrents         | Premium Tower Defense |
| **Invoices**      | Facturation clients            | Intégration EZBill    |

### Avantages Architecture Centralisée

✅ **Une seule config Stripe** pour tout le monorepo
✅ **Webhooks centralisés** (pas 5 endpoints différents)
✅ **Dashboard unifié** (tous les paiements visibles)
✅ **Composants réutilisables** (donations, achats, abonnements)
✅ **Link EZAuth** (historique paiements par user)
✅ **Stats globales** (revenus, trending projects)

### Intégration dans les Apps

```typescript
// 1. Ajouter dépendance
"@ezstart/pay-sdk": "workspace:*"

// 2. Setup client
import { createPayClient, PayProvider } from '@ezstart/pay-sdk'

const payClient = createPayClient({
  appName: 'tower-defense'
})

// 3. Provider
<PayProvider client={payClient}>
  <App />
</PayProvider>

// 4. Utiliser composants
import { DonateModal, DonationWall, BuyButton } from '@ezstart/pay-sdk'

// Donations avec testimonials
<DonateModal projectId="tower-defense" projectName="Tower Defense" />
<DonationWall projectId="tower-defense" limit={9} />

// Achats in-app
<BuyButton
  projectId="tower-defense"
  productId="gems-100"
  productName="100 Gems"
  amount={4.99}
  onSuccess={(payment) => addGems(100)}
/>
```

### Endpoints API

```
POST   /api/donate              - Créer une donation
GET    /api/donations           - Liste donations (testimonials)
GET    /api/donations/stats     - Statistiques donations

POST   /api/purchase            - Créer un achat
GET    /api/purchases           - Liste achats utilisateur

POST   /api/subscribe           - Créer abonnement
GET    /api/subscriptions       - Liste abonnements utilisateur
POST   /api/subscriptions/:id/cancel - Annuler abonnement

POST   /api/webhooks/stripe     - Webhooks Stripe (confirmations)
POST   /api/webhooks/paypal     - Webhooks PayPal (optionnel)

GET    /api/payments/:id        - Détails paiement
GET    /api/health              - Health check
```

### Base de Données - Model Payment

```typescript
{
  // Project
  projectId: 'tower-defense',
  projectName: 'Tower Defense',

  // Type & Amount
  type: 'donation' | 'purchase' | 'subscription' | 'invoice',
  amount: 9.99,
  currency: 'USD',

  // Customer (link EZAuth)
  userId?: string,              // EZAuth user ID
  customerName?: string,
  customerEmail?: string,
  isAnonymous: false,

  // Payment Provider
  provider: 'stripe' | 'paypal',
  paymentId: 'cs_test_...',
  paymentMethod: 'card',
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled',

  // Metadata (flexible par type)
  metadata: {
    // Donations
    message?: 'Great game!',
    isPublic?: true,

    // Purchases
    productId?: 'gems-100',
    productName?: '100 Gems',
    quantity?: 1,

    // Subscriptions
    subscriptionId?: 'sub_...',
    planId?: 'premium-monthly',
    interval?: 'month' | 'year',

    // Invoices
    invoiceId?: 'INV-001',
  },

  createdAt: Date,
  completedAt?: Date
}
```

### Composants Disponibles

**Donations :**

- `<DonateButton />` - Bouton simple
- `<DonateModal />` - Modal complet avec montants prédéfinis
- `<DonationWall />` - Mur de testimonials publics

**Purchases :**

- `<BuyButton />` - Bouton d'achat avec callback
- `<ProductCard />` - Carte produit réutilisable
- `<CheckoutFlow />` - Flow complet de checkout

**Subscriptions :**

- `<SubscribeButton />` - Bouton d'abonnement
- `<PricingTable />` - Table de pricing avec plans
- `<SubscriptionManager />` - Gestion abonnements utilisateur

**Partagés :**

- `<PaymentHistory />` - Historique paiements utilisateur
- `<PaymentStatus />` - Statut d'un paiement

### Hooks Disponibles

```typescript
// Hook principal
const { createDonation, createPurchase, createSubscription } = usePay()

// Hook spécialisé donations
const { donations, isLoading, reload } = useDonations({
  projectId: 'tower-defense',
  limit: 10,
})
```

### Configuration Stripe

**Variables d'environnement API :**

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
WEB_URL=http://localhost:5045
```

**Variables d'environnement Web :**

```env
NEXT_PUBLIC_API_URL=http://localhost:5040/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Webhooks Stripe

EZPay gère automatiquement les webhooks Stripe pour :

- ✅ `checkout.session.completed` → Status `completed`
- ✅ `checkout.session.expired` → Status `cancelled`
- ✅ `charge.refunded` → Status `refunded`
- ✅ `customer.subscription.*` → Gestion abonnements

**Endpoint webhook :** `https://ezpay-api.onrender.com/api/webhooks/stripe`

### Utilisation Externe (Hors Monorepo)

**Option 1: Package NPM** (futur)

```bash
npm install @ezstart/pay-sdk
```

**Option 2: Widget Embeddable**

```html
<script src="https://ezpay.vercel.app/widget.js"></script>
<div id="ezpay-widget" data-project="my-project"></div>
```

**Option 3: Lien Direct**

```
https://ezpay.vercel.app/donate?project=tower-defense&amount=10
```

## APIs - Standardisation Express-Core ✅

### Configuration 100% Centralisée avec @ezstart/express-core

Toutes les APIs (`ezauth/api`, `ezbill/api`, `tower-defense/api`) utilisent **exactement** la même infrastructure standardisée :

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
- **ezbill** : Port 4101 (`getApiPort('EZ_BILLING')`)
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
