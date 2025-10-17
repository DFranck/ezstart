# 🚀 Configuration Claude - @ezstart Monorepo

## 📚 Documentation Centralisée

**Voir [docs/README.md](./docs/README.md) pour la documentation complète et les audits.**

**Audits disponibles :**
- 🔒 [Security Audit](./docs/audits/SECURITY-AUDIT.md) - Authentication, secrets, CORS, vulnerabilities
- ⚡ [Performance Audit](./docs/audits/PERFORMANCE-AUDIT.md) - Bundle sizes, API times, optimization
- 🏗️ [Architecture Audit](./docs/audits/ARCHITECTURE-AUDIT.md) - Dependencies, structure, best practices
- ✨ [Code Quality Audit](./docs/audits/CODE-QUALITY-AUDIT.md) - TypeScript, ESLint, tests, documentation
- 📦 [Dependencies Audit](./docs/audits/DEPENDENCIES-AUDIT.md) - Outdated packages, vulnerabilities, licenses
- ♿ [Accessibility Audit](./docs/audits/ACCESSIBILITY-AUDIT.md) - WCAG compliance, keyboard nav, screen readers
- 🚀 [Infrastructure Audit](./docs/audits/INFRASTRUCTURE-AUDIT.md) - Railway/Vercel, monitoring, backups
- 🔌 [API Audit](./docs/audits/API-AUDIT.md) - OpenAPI, error handling, authentication
- 🔍 [SEO Audit](./docs/audits/SEO-AUDIT.md) - Meta tags, sitemaps, structured data
- 🌐 [Web Apps Audit](./docs/audits/WEB-APPS-AUDIT.md) - App configs, PWA, deployment

## 🎛️ Système de Monitoring Centralisé ⭐ NOUVEAU (17/10/2025)

**Architecture complète de monitoring et d'observabilité pour tout le monorepo.**

### Composants

- **📦 Package `@ezstart/monitoring`** - Types, utilities, health checker
- **🔌 API Monitoring** - Port 5080 (local) / Railway (prod)
- **📊 Dashboard** - Intégré dans EZStart web (`/monitoring`)

### Fonctionnalités

✅ **Health Checks automatiques** - Tous les APIs et web apps
✅ **Audit Tracking** - Scores, dates, status (auto-parsing des .md)
✅ **Deployment Monitoring** - Railway/Vercel, commits, build info
✅ **Database Health** - Connection, response time, storage
✅ **Git Tracking** - Uncommitted changes, unpushed commits, frequency
✅ **Overall Health Score** - 0-100 avec status (excellent/good/fair/poor)
✅ **Continuous Improvement** - Track amélioration continue avec métriques

### Quick Start

```bash
# Démarrer l'API de monitoring
cd apps/monitoring/api && pnpm dev

# Voir le dashboard
open http://localhost:5050/monitoring

# API endpoints
curl http://localhost:5080/api/health-checks  # Tous les services
curl http://localhost:5080/api/audits         # Tous les audits
curl http://localhost:5080/api/metrics        # Métriques globales
```

### Services Monitorés

- **5 APIs** : EZAuth, EZPay, EZBill, Tower Defense, GreenPulse
- **8 Web Apps** : EZStart, EZAuth, EZBill, EZPay, TD, FengShui, ASC-TCD, GreenPulse
- **5 Databases** : MongoDB pour chaque app
- **14 Audits** : Tracking automatique avec parsing des fichiers .md

**Documentation complète :** [AUDIT-GUIDE.md](./docs/AUDIT-GUIDE.md)

## 📋 GUIDE DE DÉMARRAGE POUR NOUVEAU CLAUDE

### État Actuel (12/10/2025 - 00h20)

**Monorepo 100% opérationnel avec :**

- ✅ Tous les services sur ports 50xx (voir tableau ci-dessous)
- ✅ Architecture .env standardisée (.env.example + .env.local)
- ✅ TypeScript centralisé avec un seul `tsc -b --watch`
- ✅ Configuration 100% partagée et optimisée
- ✅ **Tower Defense optimisé** : Architecture partagée avec 15 mobs + 15 towers (voir [Tower Defense Architecture](#tower-defense---architecture-optimisée))

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
pnpm dev:bill  # EZBill + EZAuth
pnpm dev:td    # Tower Defense + EZAuth
pnpm dev:ez    # EZStart + Monitoring + ALL APIs (nécessaire pour dashboard monitoring)
pnpm dev:fs    # FengShui + EZAuth + EZPay
pnpm dev:gp    # GreenPulse + EZAuth
pnpm dev:pay   # EZPay seul
pnpm dev:asc   # ASC-TCD seul
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
| **Monitoring**| **API** | **5080** | **http://localhost:5080** | **⭐ NEW**     |

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

#### Composants UI (PRIORITÉ ABSOLUE)

- **JAMAIS** utiliser des balises HTML natives (`<div>`, `<button>`, `<input>`, `<label>`, `<h1>`, `<p>`)
- **TOUJOURS** utiliser les composants du package `@ezstart/ui/components` en premier

**Exemples de composants à utiliser :**

```tsx
// ❌ JAMAIS faire ça
<div className="bg-white rounded-lg shadow p-6">
  <h2>Title</h2>
  <p>Description</p>
  <button onClick={...}>Click</button>
</div>

// ✅ TOUJOURS faire ça
<Card variant="floating">
  <CardHeader>
    <H2 size="h3">Title</H2>
    <P>Description</P>
  </CardHeader>
  <CardContent>
    <Button onClick={...}>Click</Button>
  </CardContent>
</Card>
```

**Liste des composants disponibles :**

- **Layout** : `Card`, `CardHeader`, `CardContent`, `CardFooter`, `Main`, `Header`, `Footer`
- **Typography** : `H1`, `H2`, `H3`, `H4`, `H5`, `H6`, `P`, `Label`
- **Form** : `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`
- **Navigation** : `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- **Feedback** : `Alert`, `Badge`, `Toast` (via sonner)
- **Utility** : `Icon`, `Separator`, `Skeleton`

#### Couleurs Sémantiques (OBLIGATOIRE)

- **JAMAIS** utiliser des couleurs hardcodées (`bg-red-50`, `text-gray-600`, `border-blue-500`)
- **TOUJOURS** utiliser des classes sémantiques qui s'adaptent au dark mode

**Classes sémantiques :**

```tsx
// ❌ Couleurs hardcodées
className = 'bg-gray-100 text-gray-900 border-gray-200'

// ✅ Classes sémantiques
className = 'bg-card text-foreground border'

// ❌ Couleurs de marque hardcodées
className = 'bg-indigo-500 text-white'

// ✅ Classes de marque sémantiques
className = 'bg-primary text-primary-foreground'
```

**Palette sémantique complète :**

- **Background** : `bg-background`, `bg-card`, `bg-muted`, `bg-popover`
- **Text** : `text-foreground`, `text-muted-foreground`, `text-card-foreground`
- **Primary** : `bg-primary`, `text-primary`, `text-primary-foreground`
- **Destructive** : `bg-destructive`, `text-destructive`, `text-destructive-foreground`
- **Border** : `border` (utilise la couleur border par défaut)
- **Accent** : `bg-accent`, `text-accent-foreground`

#### Props des Composants

- **TOUJOURS** utiliser les props `variant` et `size` quand disponibles
- **TOUJOURS** laisser les composants gérer leurs propres styles

```tsx
// ✅ Utiliser les variants
<Card variant="floating" />     // ou "default", "ghost", "elevated", "premium"
<Button variant="destructive" /> // ou "default", "outline", "ghost", "link"
<H2 size="h3" />                // Rendu h2 avec style h3

// ✅ Utiliser les sizes
<Button size="sm" />            // ou "default", "lg", "icon"
<Icon className="w-4 h-4" />   // Tailles cohérentes
```

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

- `@ezstart/config` - **URLs, domaines et configuration CORS centralisés** ⭐ NOUVEAU
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
- `@ezstart/pay-sdk` - SDK de paiement centralisé

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
- ✅ **EZBill** : https://ezstart-ezbill.vercel.app
- ✅ **EZPay** : https://ezstart-ezpay.vercel.app
- ✅ **Tower Defense** : https://tower-defense-web.vercel.app
- ✅ **FengShui** : https://ezfengshui.vercel.app
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

**⚠️ Notes importantes (Mis à jour 16/10/2025) :**

- **OBLIGATOIRE** : Ajouter `--filter @ezstart/config build` AVANT le build des APIs
- `@ezstart/express-core` dépend de `@ezstart/config` pour CORS auto-configuration
- Les SDKs (`auth-sdk`, `pay-sdk`, `ui`) ne sont utilisés que côté web
- Ne pas inclure `@ezstart/ui` dans le build des APIs

**Build Command Railway CORRIGÉ :**

```bash
# EZAuth API (avec config + express-core)
pnpm install --frozen-lockfile --shamefully-hoist && \
pnpm --filter @ezstart/config --filter @ezstart/express-core build && \
pnpm turbo build --filter=api-ezauth

# EZPay API (avec config + express-core)
pnpm install --frozen-lockfile --shamefully-hoist && \
pnpm --filter @ezstart/config --filter @ezstart/express-core build && \
pnpm turbo build --filter=api-ezpay
```

### Configuration Vercel (Apps Web)

**Stratégie de déploiement :**

- ✅ **Root Directory** : `apps/[app]/web`
- ✅ **Include files outside root directory** : COCHÉ (obligatoire)
- ✅ **Build Command** : `pnpm build`
- ✅ **vercel.json** : Configuration obligatoire dans chaque app web

**Configuration vercel.json standardisée :**

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "env": {
    "NODE_ENV": "production"
  },
  "functions": {
    "src/app/**/*": {
      "maxDuration": 30
    }
  }
}
```

**⚠️ OBLIGATOIRE :** Toutes les apps web DOIVENT avoir un `vercel.json` avec `outputDirectory: ".next"` pour éviter l'erreur "No Output Directory named 'public' found".

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
ALLOWED_ORIGINS=https://ezauth.vercel.app,https://ezstart-ezbill.vercel.app,...
```

**EZPay API (Railway) :**

```env
NODE_ENV=production
PORT=5040
MONGO_URL=mongodb+srv://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
WEB_URL=https://ezstart-ezpay.vercel.app
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

### Script kill:ports - Intelligent Port Management ✅ (Créé 17/10/2025)

**Script dynamique qui utilise `@ezstart/config` comme source of truth pour les ports.**

**Commande :**
```bash
pnpm kill:ports
```

**Features :**
- ✅ **Lecture dynamique des ports** depuis `@ezstart/config/urls.ts`
- ✅ **Évite de tuer des ports externes** au monorepo @ezstart
- ✅ **2 modes** : Kill ports @ezstart uniquement OU kill tous les Node.js (nuclear)
- ✅ **Fallback automatique** si erreur de lecture du config (hardcoded ports)
- ✅ **Affichage détaillé** : Ports trouvés, processus tués, status final

**Architecture :**
- `scripts/get-ezstart-ports.mjs` - Script Node.js qui lit `@ezstart/config` et retourne un JSON array de ports
- `scripts/kill-ports.ps1` - Script PowerShell qui appelle le script Node.js et tue les processus sur ces ports

**Avantages :**
- **Single source of truth** : Ajout d'une nouvelle app → ports détectés automatiquement
- **Sécurité** : Ne tue jamais un port utilisé par un projet externe
- **Maintenance** : Plus besoin de mettre à jour manuellement la liste des ports dans le script

**Exemple d'output :**
```
Fetching @ezstart ports from config...
Found 14 @ezstart ports: 5010, 5015, 5020, 5025, 5030, 5035, 5040, 5045, 5050, 5055, 5065, 5070, 5075, 5080

Options:
1. Kill only @ezstart ports (from config)
2. Kill ALL Node.js processes (nuclear option)
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

## 🎮 Tower Defense - Optimisations de Performance (11/10/2025)

### 📦 Package @tower-defense/config - Constantes Centralisées

**Nouveau fichier : `performance.ts`**

Toutes les "magic numbers" ont été extraites dans un fichier centralisé pour faciliter la maintenance et l'optimisation :

```typescript
// @tower-defense/config/src/performance.ts
export const TICK_INTERVAL_MS = 250 // 4 ticks/sec
export const MOB_SPEED_MULTIPLIER = 0.05
export const MAX_MOB_SPEED = 10
export const WAYPOINT_THRESHOLD = 1.5
export const SEPARATION_FORCE = 0.08
export const SPATIAL_GRID_CELL_SIZE = 2
export const PROJECTILE_DURATION_RATIO = 0.8
export const SLOW_TICK_THRESHOLD_MS = 200
// ... et beaucoup d'autres
```

**Avantages :**

- ✅ Single source of truth pour toutes les valeurs de gameplay
- ✅ Modification globale en changeant une seule constante
- ✅ Documentation inline de chaque valeur
- ✅ Type-safety avec TypeScript
- ✅ Partagé automatiquement entre API et Web

### 📊 Monitoring de Performance

#### Backend (Ticker Engine)

**Performance monitoring automatique dans `tickerEngine.ts` :**

```typescript
// Warn si tick processing > 200ms
if (tickDuration > SLOW_TICK_THRESHOLD_MS) {
  console.warn(`⚠️ [Ticker] Slow tick #${tick}: ${tickDuration}ms`)
}

// Stats périodiques toutes les 10 secondes
if (tick % 40 === 0) {
  console.log(`📊 [Ticker] Stats: ${players.length}p, ${mobs.length}m, ${tickDuration}ms`)
}
```

**Métriques surveillées :**

- Durée de traitement de chaque tick
- Nombre de joueurs/mobs par partie
- Warnings automatiques si dégradation

#### Frontend (Canvas Rendering)

**Performance monitoring automatique dans `MultiPlayerCanvas.tsx` :**

```typescript
// FPS counter
if (fps < 30) {
  console.warn(`⚠️ [Canvas] Low FPS: ${fps} (${mobs.length} mobs, ${towers.length} towers)`)
}

// Frame time monitoring
if (frameTime > 16) {
  // 60 FPS = 16ms/frame
  console.warn(`⚠️ [Canvas] Slow frame: ${frameTime}ms`)
}
```

**Métriques surveillées :**

- FPS en temps réel
- Durée de rendu de chaque frame
- Nombre de mobs/towers affichés
- Warnings automatiques si lag

### 🧪 Load Testing (8+ Joueurs)

**Nouveau script : `apps/tower-defense/api/src/tests/load-test.ts`**

Script complet de test de charge pour valider les performances avec 8+ joueurs simultanés.

**Usage :**

```bash
# Test standard (8 joueurs, 60s)
cd apps/tower-defense/api
pnpm test:load

# Test intensif (16 joueurs)
pnpm test:load:16

# Test de stress (20 joueurs, 2 minutes)
pnpm test:load:stress

# Custom
NUM_PLAYERS=12 TEST_DURATION_MS=90000 pnpm test:load
```

**Métriques mesurées :**

- Total Actions (towers placed, mobs spawned)
- Average Latency
- Error Rate
- Actions/second
- Stats par joueur

**Documentation complète :** `apps/tower-defense/api/LOAD-TESTING.md`

### 🔧 Fixes de Synchronisation

#### Désynchronisation Projectiles (CRITIQUE)

**Problème :**

```typescript
// ❌ AVANT : Hardcodé, désynchronisé du ticker
const PROJECTILE_DURATION = 200 // Ticker = 250ms !
```

**Solution :**

```typescript
// ✅ APRÈS : Synchronisé avec le ticker
const PROJECTILE_DURATION = TICK_INTERVAL_MS * PROJECTILE_DURATION_RATIO
// 250ms * 0.8 = 200ms (cohérent et configurable)
```

**Impact :** Animation des projectiles parfaitement synchronisée avec le ticker serveur.

### 📈 Résultats des Optimisations

**Performance Backend :**

- ✅ Tick processing : ~5-15ms (objectif < 200ms)
- ✅ CPU usage : ~5-10% pour 4 joueurs
- ✅ Support : 100+ mobs simultanés sans lag
- ✅ Spatial Grid : Collision O(n²) → O(n)

**Performance Frontend :**

- ✅ FPS constant : 60 FPS
- ✅ Interpolation fluide : 250ms ticker → 16ms frames
- ✅ Pas de memory leaks détectés
- ✅ Canvas rendering optimisé avec RAF

**Load Test Results (8 joueurs) :**

- ✅ Duration : ~61s
- ✅ Total Actions : ~150-200
- ✅ Avg Latency : ~50-100ms
- ✅ Error Rate : <5%
- ✅ Actions/second : ~2.5-3.5

### 🎯 Bonnes Pratiques Établies

#### 1. Constantes Centralisées

```typescript
// ✅ TOUJOURS importer depuis @tower-defense/config
import { TICK_INTERVAL_MS, MOB_SPEED_MULTIPLIER } from '@tower-defense/config'

// ❌ JAMAIS hardcoder les valeurs
const speed = rawSpeed * 0.05 // NON !
```

#### 2. Monitoring Automatique

```typescript
// ✅ TOUJOURS monitorer les performances critiques
if (tickDuration > SLOW_TICK_THRESHOLD_MS) {
  console.warn(`Slow tick: ${tickDuration}ms`)
}
```

#### 3. Load Testing Régulier

```bash
# ✅ TOUJOURS tester avant un déploiement majeur
pnpm test:load:stress
# Vérifier Error Rate < 10% et Latency < 200ms
```

#### 4. Synchronisation Ticker/Frontend

```typescript
// ✅ TOUJOURS utiliser les mêmes constantes partout
// Backend
tickIntervalMs: TICK_INTERVAL_MS

// Frontend
const t = Math.min(elapsed / TICK_INTERVAL_MS, 1)
```

### 📚 Documentation Ajoutée

- ✅ **LOAD-TESTING.md** : Guide complet du load testing
- ✅ **performance.ts** : Documentation inline de toutes les constantes
- ✅ **Logs de monitoring** : Warnings automatiques dans la console

### 🏆 Score de Performance Final

**Tower Defense : 92/100** ⭐⭐⭐⭐⭐

- Architecture exemplaire
- Optimisations O(n²) → O(n)
- Monitoring automatique
- Load testing intégré
- 0 erreur TypeScript
- Production-ready

## Tower Defense - Architecture Optimisée

### 🎮 Vue d'Ensemble (Mise à jour 12/10/2025)

**Architecture 100% Partagée avec Single Source of Truth**

Tower Defense utilise maintenant une architecture avancée où **frontend et backend partagent exactement les mêmes définitions** d'entités via le monorepo.

###Architecture des Packages

```
apps/tower-defense/
├── types/                    # Types TypeScript + Définitions Entités
│   └── src/
│       ├── entityTypes.ts    # ⭐ 15 Mobs + 15 Towers (SINGLE SOURCE OF TRUTH)
│       ├── mobType.ts        # Zod schema MobType
│       ├── towerType.ts      # Zod schema TowerType
│       └── ...
├── config/                   # Configuration gameplay
│   └── src/
│       ├── balance.ts        # Constantes d'équilibrage
│       ├── effects.ts        # Effets disponibles
│       ├── targeting.ts      # Stratégies de ciblage
│       └── ...
├── api/                      # Backend Express + Socket.IO
│   └── src/
│       ├── managers/         # GameManager, EntityManager
│       ├── systems/          # ECS (MovementSystem, TowerSystem)
│       └── services/
│           └── entityRegistry.ts  # Seed depuis @tower-defense/types
├── web/                      # Frontend Next.js
│   └── src/
│       └── components/
│           ├── TowerShop.tsx      # Import depuis @tower-defense/types
│           └── MobShop.tsx        # Import depuis @tower-defense/types
└── utils/                    # Utilitaires partagés
```

### 🏗️ Architecture Partagée (Nouveau 12/10/2025)

#### Problème Résolu : Dépendance Cyclique

**Avant :**

```
@tower-defense/types ← @tower-defense/config ← @tower-defense/types ❌
```

**Après :**

```
@tower-defense/types → @tower-defense/config ✅
```

**Solution :** Les définitions d'entités (`entityTypes.ts`) sont dans `types` au lieu de `config`.

#### Single Source of Truth

```typescript
// apps/tower-defense/types/src/entityTypes.ts
export const ENTITY_MOB_TYPES: MobType[] = [
  {
    _id: 'mob-basic-slime',
    name: 'Basic Slime',
    elementalType: 'normal',
    hp: 30,
    speed: 5,
    damage: 1,
    // ...
  },
  // ... 14 autres mobs
]

export const ENTITY_TOWER_TYPES: TowerType[] = [
  {
    _id: 'tower-basic-archer',
    name: 'Archer Tower',
    elementalType: 'normal',
    damage: 2,
    range: 5,
    // ...
  },
  // ... 14 autres towers
]
```

#### Backend : EntityRegistry

```typescript
// apps/tower-defense/api/src/services/entityRegistry.ts
import { ENTITY_MOB_TYPES, ENTITY_TOWER_TYPES } from '@tower-defense/types'

export async function seedEntityTypes(): Promise<void> {
  ENTITY_MOB_TYPES.forEach(mobType => {
    entityRegistry.registerMobType(mobType)
  })

  ENTITY_TOWER_TYPES.forEach(towerType => {
    entityRegistry.registerTowerType(towerType)
  })

  // ✅ Seeded 15 mob types and 15 tower types
}
```

#### Frontend : TowerShop & MobShop

```typescript
// apps/tower-defense/web/src/app/[locale]/game/components/TowerShop.tsx
import { ENTITY_TOWER_TYPES } from '@tower-defense/types'

const getAvailableTowersForTier = (tier: number): TowerType[] => {
  return ENTITY_TOWER_TYPES.filter(tower => {
    const price = calculateTowerPrice(tower)
    return isTowerAllowedAtTier(tower, tier, price)
  })
}
```

### ✅ Avantages de l'Architecture

1. **Type Safety** : Frontend et backend utilisent exactement les mêmes types TypeScript
2. **Pas d'API Call** : Pas besoin de `GET /api/entity-types` au runtime
3. **Build-time Validation** : Si tu changes un type, erreur TypeScript immédiate partout
4. **Monorepo Power** : Les workspace dependencies permettent ce partage transparent
5. **Pas de Duplication** : Une seule définition pour tout

### 📦 Entités Disponibles

#### 15 Mob Types :

- **Normal** : Basic Slime, Armored Knight, Flying Bat
- **Fire** : Fire Imp, Lava Golem, Phoenix
- **Water** : Water Sprite, Ice Giant, Frost Dragon
- **Grass** : Vine Walker, Treant, Poison Bee
- **Electric** : Spark Wisp, Thunder Titan, Lightning Hawk

#### 15 Tower Types :

- **Normal** : Archer Tower (single), Sniper Tower (long range), Cannon Tower (splash)
- **Fire** : Flame Thrower (burn), Inferno Tower (AoE burn), Phoenix Nest (dual-type)
- **Water** : Ice Shard (slow), Blizzard Tower (AoE slow), Tidal Wave (hybrid)
- **Grass** : Vine Snare (fast), Nature Guardian (2x2), Overgrowth (hybrid)
- **Electric** : Tesla Coil (stun), Lightning Storm (chain), Thunderforge (powerful)

### 🚀 Optimisations Backend

#### GameManager (In-Memory)

```typescript
class GameManager {
  private games = new Map<string, GameInstance>() // O(1) lookup

  createGame(hostId: string, gameId?: string): GameInstance {
    const game: GameInstance = {
      id: gameId || new Types.ObjectId().toString(),
      players: new Map(),
      mobs: new SpatialGrid<ActiveMob>(5),
      towers: new SpatialGrid<TowerWithPosition>(5),
      tick: 0,
      phase: 'waiting',
    }
    this.games.set(game.id, game)
    return game
  }
}
```

#### EntityManager (Type Lookup)

```typescript
class EntityManager {
  createMob(typeId: string, playerId: string, position: Position): ActiveMob {
    const mobType = entityRegistry.getMobType(typeId)
    if (!mobType) throw new Error(`MobType ${typeId} not found`)

    return {
      id: new Types.ObjectId().toString(),
      typeId: mobType._id,
      hp: mobType.hp,
      playerId,
      position,
      // ...
    }
  }

  createTower(typeId: string, playerId: string, position: Position): TowerWithPosition {
    const towerType = entityRegistry.getTowerType(typeId)
    if (!towerType) throw new Error(`TowerType ${typeId} not found`)

    return {
      id: new Types.ObjectId().toString(),
      typeId: towerType._id,
      playerId,
      position,
      // ...
    }
  }
}
```

### 🎯 Comment Tester

```bash
# 1. Redémarrer VS Code (pour tuer anciens processus Node.js)
# 2. Lancer Tower Defense
pnpm dev:td

# 3. Ouvrir le jeu
open http://localhost:5035

# 4. Créer une nouvelle game
# 5. Vérifier les shops : tu verras "Archer Tower", "Sniper Tower", "Fire Imp", etc.
#    au lieu de noms aléatoires générés par mockTowers/mockMobs
```

### 📝 Fichiers Importants

- [apps/tower-defense/types/src/entityTypes.ts](apps/tower-defense/types/src/entityTypes.ts) - **Source unique** des 30 entités
- [apps/tower-defense/api/src/services/entityRegistry.ts](apps/tower-defense/api/src/services/entityRegistry.ts:9) - Backend seed
- [apps/tower-defense/api/src/managers/GameManager.ts](apps/tower-defense/api/src/managers/GameManager.ts) - Gestion in-memory
- [apps/tower-defense/api/src/managers/EntityManager.ts](apps/tower-defense/api/src/managers/EntityManager.ts) - Factory entities
- [apps/tower-defense/web/src/app/[locale]/game/components/TowerShop.tsx](apps/tower-defense/web/src/app/[locale]/game/components/TowerShop.tsx:7) - Frontend towers
- [apps/tower-defense/web/src/app/[locale]/game/components/MobShop.tsx](apps/tower-defense/web/src/app/[locale]/game/components/MobShop.tsx:9) - Frontend mobs

### 🐛 Troubleshooting

**ERR_CONNECTION_REFUSED sur localhost:5035**

- Problème : Anciens processus Node.js persistent en arrière-plan
- Solution : Redémarrer VS Code ou tuer manuellement tous les processus `node.exe` dans Task Manager

**API seed seulement 3 types au lieu de 15**

- Problème : Ancienne version du code qui tourne
- Solution : Redémarrer tous les serveurs pour charger la nouvelle version

**Dépendance cyclique Turbo**

- Problème : `types` ← `config` ← `types`
- Solution : Déjà résolue ! `entityTypes.ts` est dans `types`, pas `config`

### 🔄 Prochaines Étapes

1. **Ajouter sprites/images** pour chaque tower/mob
2. **Balancing** : Ajuster HP/damage/prix selon tests
3. **Tests de charge** : Voir limite de towers/mobs
4. **Wave System** : Vagues automatiques de mobs
5. **Multiplayer complet** : Combat P2P avec vrais mobs

## 📊 Système de Monitoring - Dashboard Centralisé ⭐ NOUVEAU (Créé 17/10/2025)

**Architecture complète de monitoring pour tout le monorepo @ezstart**

### Vue d'Ensemble

Le système de monitoring offre une vue centralisée de la santé et des performances de tous les services, APIs, audits et déploiements du monorepo.

### Architecture

**Monitoring API** - `apps/monitoring/api` (Port 5080)
- MongoDB: `ezstart-monitoring`
- Health checks de tous les services (13 services)
- Tracking des audits (14 types d'audits)
- Monitoring des déploiements Railway/Vercel
- Métriques agrégées

**Monitoring Dashboard** - Intégré dans EZStart Web
- URL: http://localhost:5045/en/monitoring
- Lien dans navigation EZStart
- 4 composants réutilisables: ServiceCard, AuditCard, HealthScore, MetricsOverview

**Package @ezstart/monitoring** - Types et utilitaires partagés
- Types: HealthCheckResult, AuditType, MonitoringMetrics
- Collectors: HealthChecker avec retry et uptime tracking
- Utils: calculateOverallHealthScore, getOverallHealthStatus

### Endpoints API

```bash
GET /api/health-checks              # Tous les services
GET /api/health-checks/:serviceId   # Service spécifique
GET /api/audits                     # Tous les audits
GET /api/audits/:type               # Audit spécifique
GET /api/deployments                # Tous les déploiements
GET /api/metrics                    # Métriques agrégées
GET /api/health                     # Health check API
GET /docs                           # Swagger documentation
```

### Services Monitorés

**13 Services (5 APIs + 8 Web Apps):**
- APIs: EZAuth (5010), EZPay (5040), EZBill (5020), Tower Defense (5030), GreenPulse (5070)
- Web: EZStart (5045), EZAuth (5015), EZBill (5025), EZPay (5045), Tower Defense (5035), FengShui (5065), ASC-TCD (5055), GreenPulse (5075)

**14 Types d'Audits:**
- Security, Performance, Architecture, Code Quality
- Dependencies, Accessibility, Infrastructure, API
- SEO, Web Apps, Testing, UX, i18n, Monitoring

### Dashboard Features

**Overall Health Score (0-100)**
- Calcul basé sur: Services (30%), Audits (30%), Deployments (20%), Databases (20%)
- Status: excellent (90+), good (70+), fair (50+), poor (30+), critical (<30)
- Barre de progression et comparaison avec target (90)

**Metrics Overview**
- Services Health: X/Y operational avec pourcentage
- Audits Complete: X/Y coverage
- Active Deployments: Railway + Vercel
- Avg Response Time: Last 24 hours

**Services Tabs**
- APIs: Carte par service avec status, response time, uptime, avg response
- Web Apps: Même structure que APIs
- Badge coloré: green (healthy), red (unhealthy)

**Audits Tabs**
- Carte par audit avec emoji, nom, description
- Score /100 avec couleur dynamique (green 90+, yellow 70+, red <70)
- Status: complete, partial, not-audited
- Date de dernière mise à jour

### Configuration

**Variables d'environnement (Monitoring API):**
```env
NODE_ENV=development
PORT=5080
MONGO_URL=mongodb+srv://...
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CHECK_RETRIES=3
```

**CORS:** Auto-configuré via `@ezstart/config` pour toutes les 8 web apps

### Usage

```bash
# Démarrer EZStart avec toutes les APIs (nécessaire pour monitoring)
pnpm dev:ez

# Accéder au dashboard
open http://localhost:5045/en/monitoring

# API directe
curl http://localhost:5080/api/health-checks
curl http://localhost:5080/api/audits
curl http://localhost:5080/api/metrics
```

### Fix Dashboard Fetch - Next.js SSR (17/10/2025)

**Problème**: Next.js SSR ne pouvait pas fetch depuis monitoring API malgré que l'API fonctionnait avec curl.

**Cause**: `getApiUrl('monitoring')` retournait le mauvais environnement en mode dev Next.js.

**Solution Appliquée** ([page.tsx:9-11](apps/ezstart/web/src/app/[locale]/monitoring/page.tsx#L9-L11)):

```typescript
// Force local URL in development
const MONITORING_API_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5080'
  : getApiUrl('monitoring')
```

**Logging Amélioré** - Debugging des fetch failures:

```typescript
async function getHealthChecks() {
  try {
    console.log('[Monitoring] Fetching health checks from:', MONITORING_API_URL)
    const res = await fetch(`${MONITORING_API_URL}/api/health-checks`, {
      cache: 'no-store',
    })
    console.log('[Monitoring] Health checks response status:', res.status)
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`)
    return res.json()
  } catch (error) {
    console.error('[Monitoring] Error fetching health checks:', error)
    if (error instanceof Error) {
      console.error('[Monitoring] Error details:', error.message, error.cause)
    }
    return { services: [] }
  }
}
```

**Améliorations du Logging**:
- ✅ Logs de l'URL exacte utilisée
- ✅ Logs du status HTTP de la réponse
- ✅ Logs détaillés d'erreur avec message et cause
- ✅ Messages d'erreur enrichis avec status codes

**Résultat**: Dashboard peut maintenant fetch correctement avec logs détaillés pour debugging.

### Prochaines Étapes

1. ✅ Dashboard opérationnel avec fetch fixes
2. ⏳ Créer les fichiers d'audit markdown avec scores réels
3. ⏳ Configurer health checks périodiques (cron job)
4. ⏳ Ajouter alertes (email/Slack) quand service tombe
5. ⏳ Graphiques de tendance pour métriques historiques
6. ⏳ Export de rapports (PDF/Excel)

### Fichiers Importants

- `apps/monitoring/api/` - API de monitoring
- `apps/ezstart/web/src/app/[locale]/monitoring/` - Dashboard
- `packages/monitoring/` - Types et collectors
- `apps/monitoring/api/README.md` - Documentation API complète

## @ezstart/config - Configuration Centralisée des URLs et CORS ✅

**Créé le 16/10/2025 - Single source of truth pour tous les URLs et environnements**

### Problème Résolu

**Avant :**
- URLs dispersées dans 50+ fichiers (.env.local, code hardcodé)
- CORS origins dupliqués partout
- Désynchronisation entre environnements
- Confusion entre domaines Vercel/Railway/custom

**Après :**
- Toutes les URLs dans `packages/config/src/urls.ts`
- Détection automatique d'environnement (local/dev/prod)
- Configuration CORS générée automatiquement
- Pattern cohérent pour tous les domaines

### Usage

#### Web App - Obtenir URL de l'API
```typescript
import { getApiUrl } from '@ezstart/config'

const API_URL = getApiUrl('ezpay')
// Local: http://localhost:5040
// Prod: https://ezpay-api.up.railway.app
```

#### API - Configuration CORS
```typescript
import { createCorsConfig } from '@ezstart/config/cors'
import cors from 'cors'

// ✅ Inclut automatiquement toutes les apps qui appellent cette API
app.use(cors(createCorsConfig('ezauth')))
```

#### SEO - Domaine de production
```typescript
import { getWebUrl } from '@ezstart/config'

const domain = getWebUrl('ezpay', 'production')
// https://ezpay.ezstart.xyz
```

### Mapping Complet des URLs

| App | Web Local | API Local | Web Prod | API Prod |
|-----|-----------|-----------|----------|----------|
| EZStart | :5050 | - | www.ezstart.xyz | - |
| EZAuth | :5015 | :5010 | ezauth.ezstart.xyz | ezauth-api.up.railway.app |
| EZBill | :5025 | :5020 | ezbill.ezstart.xyz | ezbill-api.up.railway.app |
| EZPay | :5045 | :5040 | ezpay.ezstart.xyz | ezpay-api.up.railway.app |
| FengShui | :5065 | - | ezfengshui.ezstart.xyz | - |
| Tower Defense | :5035 | :5030 | tower-defense.ezstart.xyz | tower-defense-api.up.railway.app |
| ASC-TCD | :5055 | - | www.asc-tcd.com | - |
| GreenPulse | :5075 | :5070 | www.ai-greenpulse.com | green-pulse-api.up.railway.app |

### Pattern des Domaines

**Vercel (Web):**
- Dev: `[app].vercel.app` (auto Vercel)
- Prod: `[app].ezstart.xyz` OU domaine custom

**Railway (API):**
- Prod: `[app]-api.up.railway.app`

**Local:**
- Web: `localhost:50X5` (apps avec 5)
- API: `localhost:50X0` (APIs avec 0)

### Règles CORS Automatiques

- **EZAuth API** → Appelé par TOUTES les apps (SSO)
- **EZPay API** → Appelé par apps avec paiements (EZPay, Tower Defense, EZBill)
- **EZBill API** → Appelé uniquement par EZBill web
- **Tower Defense API** → Appelé uniquement par Tower Defense web
- **GreenPulse API** → Appelé uniquement par GreenPulse web

### Migration des Apps ✅ COMPLÉTÉE (16/10/2025)

**Status :** Toutes les apps et APIs du monorepo utilisent maintenant `@ezstart/config` !

**Apps migrées :**
- ✅ **EZAuth API** - CORS auto-configuré
- ✅ **EZPay API** - CORS auto-configuré
- ✅ **EZBill API** - CORS auto-configuré
- ✅ **Tower Defense API** - CORS auto-configuré + Socket.IO
- ✅ **GreenPulse API** - CORS auto-configuré
- ✅ **Tower Defense Web** - getApiUrl('tower-defense') pour Socket.IO
- ✅ **SDKs** - auth-sdk et pay-sdk utilisent déjà @ezstart/config
- ✅ **@ezstart/ui** - get-api-url.ts marqué deprecated avec warning

**Guide complet :** [docs/MIGRATION-CONFIG.md](./docs/MIGRATION-CONFIG.md)

**Changements appliqués :**
1. ✅ Ajouté `"@ezstart/config": "workspace:*"` à tous les package.json
2. ✅ Remplacé hardcoded CORS origins par `createCorsConfig(appName)`
3. ✅ Remplacé `process.env.NEXT_PUBLIC_API_URL` par `getApiUrl(appName)`
4. ✅ Mis à jour tous les `.env.example` avec notes de migration
5. ✅ Installé les dépendances avec `pnpm install`

**Notes importantes :**
- Les URLs peuvent maintenant rester dans `.env.local` pour override en dev
- CORS origins ne sont plus nécessaires dans `.env` des APIs
- Un seul changement dans `packages/config/src/urls.ts` → Tous les projets updated

### 🔧 Fix Critique - createApp() Pattern (16/10/2025)

**Problème découvert :** Erreur TypeScript sur Railway lors du build des APIs.

**Erreur :**
```
error TS2559: Type '{ origin: ..., credentials: ... }' has no properties
in common with type 'CreateAppOptions'.
```

**Cause :** Utilisation incorrecte de `createApp(createCorsConfig('ezauth'))` au lieu de passer l'option `apiApp`.

**Solution :**

```typescript
// ❌ INCORRECT (causait l'erreur Railway)
import { createCorsConfig } from '@ezstart/config/cors'
const app = createApp(createCorsConfig('ezauth'))

// ❌ INCORRECT (spread ne fonctionne pas)
const app = createApp({
  rawBodyRoutes: ['/api/webhooks/stripe'],
  ...createCorsConfig('ezpay'),
})

// ✅ CORRECT - Option 1: Auto-CORS (RECOMMANDÉ)
const app = createApp({ apiApp: 'ezauth' })

// ✅ CORRECT - Option 2: Avec rawBodyRoutes
const app = createApp({
  rawBodyRoutes: ['/api/webhooks/stripe'],
  apiApp: 'ezpay',
})

// ✅ CORRECT - Option 3: CORS manuel
const app = createApp({
  corsOrigins: ['https://custom-domain.com'],
})
```

**Interface CreateAppOptions :**

```typescript
export interface CreateAppOptions {
  rawBodyRoutes?: string[];
  apiApp?: AppName;        // Auto-detect CORS from @ezstart/config
  corsOrigins?: string[];  // Manual CORS origins
}
```

**Fichiers corrigés :**
- ✅ apps/ezauth/api/src/index.ts
- ✅ apps/ezpay/api/src/index.ts (avec rawBodyRoutes)
- ✅ apps/ezbill/api/src/index.ts
- ✅ apps/tower-defense/api/src/index.ts
- ✅ apps/green-pulse/api/src/index.ts

**Dépendances ajoutées :**
- ✅ `@ezstart/config` dans tous les package.json (8 web apps + 5 APIs)
- ✅ `pnpm install` exécuté pour installer les dépendances
- ✅ TypeCheck validé sur toutes les APIs

### Mettre à Jour un Domaine

```typescript
// packages/config/src/urls.ts
export const URLS = {
  'ezpay': {
    web: {
      production: 'https://nouveau-domaine.com'
    }
  }
}
```

Rebuild le package → Toutes les apps se mettent à jour automatiquement ! ✅

### Documentation

- **README complet :** [packages/config/README.md](./packages/config/README.md)
- **Guide migration :** [docs/MIGRATION-CONFIG.md](./docs/MIGRATION-CONFIG.md)
- **API Reference :** Types TypeScript avec JSDoc


## 🎯 Port Management - Single Source of Truth (17/10/2025)

**Migration complète : Tous les ports sont maintenant auto-détectés depuis `@ezstart/config`**

### Problème Résolu

**Avant :**
- Ports hardcodés dans 50+ endroits (package.json, .env, scripts)
- Duplication entre CLAUDE.md, monitoring, APIs, web apps
- Conflits de ports (EZStart vs EZPay sur 5045)
- `PORT=` obligatoire dans tous les `.env.local`

**Après :**
- ✅ **Un seul endroit** : `packages/config/src/urls.ts`
- ✅ **0 duplication** : Toutes les apps lisent depuis config
- ✅ **0 .env nécessaire** : Ports auto-détectés
- ✅ **Type-safe** : TypeScript valide les noms d'apps

### Architecture Complète

#### 1. Config Centralisée - getPort()

```typescript
// packages/config/src/urls.ts
export function getPort(app: AppName, type: 'web' | 'api' = 'web'): number {
  const url = type === 'api' ? URLS[app].api?.local : URLS[app].web.local
  if (!url) throw new Error(`No ${type} URL defined for app: ${app}`)
  return parseInt(new URL(url).port, 10)
}
```

#### 2. APIs - Utilisation de getApiPort()

Toutes les APIs (6/6) utilisent `getApiPort(appName)` :
- ✅ EZAuth: `getApiPort('ezauth')` → 5010
- ✅ EZPay: `getApiPort('ezpay')` → 5040  
- ✅ EZBill: `getApiPort('ezbill')` → 5020
- ✅ Tower Defense: `getApiPort('tower-defense')` → 5030
- ✅ GreenPulse: `getApiPort('green-pulse')` → 5070
- ✅ Monitoring: `getApiPort('monitoring')` → 5080

#### 3. Web Apps - Script Universel

Toutes les web apps (8/8) utilisent `packages/config/bin/dev-server.js` :

```json
"scripts": {
  "dev": "node ../../../packages/config/bin/dev-server.js"
}
```

Le script auto-détecte le nom de l'app et récupère le port depuis config.

#### 4. Monitoring - Auto-Configuration

```typescript
// packages/monitoring/src/types/health.ts
import { URLS } from '@ezstart/config'

export const MONITORED_SERVICES = {
  'ezauth-api': {
    localUrl: `${URLS.ezauth.api?.local}/api/health`,
    port: new URL(URLS.ezauth.api!.local).port,
  }
  // ... auto-généré pour tous
}
```

### Nettoyage Effectué

**Supprimé :**
- ❌ `PORT=` dans tous les `.env.example` (6 APIs)
- ❌ Ports hardcodés dans `package.json` (8 web apps)
- ❌ Scripts `dev-with-port.js` personnalisés (2 apps)

**Ajouté :**
- ✅ Commentaire : `# PORT is auto-detected from @ezstart/config`
- ✅ Script universel : `packages/config/bin/dev-server.js`

### Usage

```bash
# Aucun .env nécessaire !
pnpm dev:ez     # Tous les ports auto-détectés

# Ajouter un nouveau service
# 1. Ajouter dans packages/config/src/urls.ts
# 2. Utiliser getApiPort('new-app') ou dev-server.js
# C'est tout ! ✅
```

### Avantages

1. ✅ **Single Source of Truth** : Un seul fichier
2. ✅ **Type Safety** : TypeScript valide
3. ✅ **Auto-Sync** : Monitoring se met à jour automatiquement
4. ✅ **Moins de Config** : Plus besoin de .env pour ports
5. ✅ **DX Améliorée** : Juste fonctionne™

