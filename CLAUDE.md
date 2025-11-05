# 🚀 Configuration Claude - @ezstart Monorepo

**Bienvenue dans le monorepo @ezstart !**

Ce fichier contient les informations essentielles pour démarrer rapidement. Pour l'historique complet et les détails techniques, voir [docs/CLAUDE-ARCHIVE.md](./docs/CLAUDE-ARCHIVE.md).

---

## 📚 Documentation Essentielle

**Navigation :**

- 🚀 **[docs/00-START-HERE.md](./docs/00-START-HERE.md)** - ⭐⭐⭐ Guide navigation complet
- 📐 **[DEV-RULES.md](./DEV-RULES.md)** - ⭐ Règles de développement obligatoires
- 📊 [docs/README.md](./docs/README.md) - Dashboard des audits (Score: 84.8/100)
- 🚀 [DEPLOY.md](./DEPLOY.md) - Guide de déploiement (Railway/Vercel/Oracle)

**Pour agents IA :**

- ⚡ [docs/ai-agents/QUICK-REF.md](./docs/ai-agents/QUICK-REF.md) - Référence rapide (5 min)
- 🤖 [docs/ai-agents/CYCLE.md](./docs/ai-agents/CYCLE.md) - Cycle d'amélioration (15 min)
- 🎯 [docs/ai-agents/EXAMPLES.md](./docs/ai-agents/EXAMPLES.md) - Exemples concrets (20 min)

**Documentation détaillée :**

- 🗂️ [docs/reference/CLAUDE-ARCHIVE.md](./docs/reference/CLAUDE-ARCHIVE.md) - Historique complet (4600+ lignes)
- 🎯 [docs/reference/ROADMAP.md](./docs/reference/ROADMAP.md) - Roadmap vers 100/100
- 📄 [docs/reference/AUDIT-SUMMARY.md](./docs/reference/AUDIT-SUMMARY.md) - Résumé des audits

---

## 🎯 Score Global : 94.9/100 ⭐⭐⭐⭐⭐ EXCELLENT

### Scores par Catégorie

| Catégorie         | Score   | Status       |
| ----------------- | ------- | ------------ |
| **API**           | 100/100 | ✅ Excellent |
| **Tests**         | 100/100 | ✅ Excellent |
| **TypeCheck**     | 100/100 | ✅ Excellent |
| **Databases**     | 100/100 | ✅ Excellent |
| **Architecture**  | 95/100  | ✅ Excellent |
| **Accessibility** | 95/100  | ✅ Excellent |
| **Documentation** | 95/100  | ✅ Excellent |
| **Mobile UX**     | 93/100  | ✅ Excellent |
| **UX**            | 87/100  | ✅ Very Good |
| **Performance**   | 82/100  | ✅ Very Good |

**Audits disponibles :** [docs/audits/](./docs/audits/) (18 fichiers - 17 complets + 1 en cours)

**Dernière mise à jour :** 5 Novembre 2025
- 📱 **Mobile UX:** 85→93/100 (+8 points) 🎉 - Toutes les phases terminées !
  - Design System complet + 17 composants
  - Safe-area support universel (iPhone notch)
- 🎨 **UX:** 70→87/100 (+17 points) - Skeleton loaders + Error boundaries
  - 7 skeleton variants (shimmer animation)
  - Universal error boundaries (8 apps)
- 🎯 **9 audits ≥90/100** (50% excellence rate)

---

## ⚡ Quick Start

### Démarrage Rapide

```bash
# Installer les dépendances
pnpm install

# Mode Optimisé (RECOMMANDÉ)
pnpm dev:types  # Terminal 1: TypeScript centralisé
pnpm dev        # Terminal 2: Tous les serveurs

# Mode Ciblé
pnpm dev:ez     # EZStart + Monitoring + APIs
pnpm dev:bill   # EZBill + EZAuth
pnpm dev:td     # Tower Defense + EZAuth
pnpm dev:gp     # GreenPulse + EZAuth

# Vérifier l'état
pnpm dev:status
```

### Ports des Services

| Service           | Type | Port | URL                   |
| ----------------- | ---- | ---- | --------------------- |
| **EZStart**       | API  | 5000 | http://localhost:5000 |
| **EZAuth**        | API  | 5010 | http://localhost:5010 |
| **EZBill**        | API  | 5020 | http://localhost:5020 |
| **EZPay**         | API  | 5040 | http://localhost:5040 |
| **Tower Defense** | API  | 5030 | http://localhost:5030 |
| **GreenPulse**    | API  | 5070 | http://localhost:5070 |
| **EZStart**       | Web  | 5005 | http://localhost:5005 |
| **EZAuth**        | Web  | 5015 | http://localhost:5015 |
| **EZBill**        | Web  | 5025 | http://localhost:5025 |
| **EZPay**         | Web  | 5045 | http://localhost:5045 |
| **Tower Defense** | Web  | 5035 | http://localhost:5035 |
| **FengShui**      | Web  | 5065 | http://localhost:5065 |
| **ASC-TCD**       | Web  | 5055 | http://localhost:5055 |
| **GreenPulse**    | Web  | 5075 | http://localhost:5075 |

---

## 📦 Architecture Monorepo

### Structure

```
@ezstart/
├── packages/              # Packages partagés
│   ├── types/            # Types TypeScript
│   ├── config/           # Configuration centralisée
│   ├── ui/               # Composants UI
│   ├── auth-sdk/         # SDK authentification
│   ├── pay-sdk/          # SDK paiement
│   ├── express-core/     # Infrastructure API
│   ├── test-utils/       # Infrastructure tests
│   └── ...
│
├── apps/                  # Applications
│   ├── ezstart/          # Landing Page + Monitoring API
│   ├── ezauth/           # SSO Authentication
│   ├── ezpay/            # Payment System
│   ├── ezbill/           # Invoicing
│   ├── tower-defense/    # Game
│   ├── green-pulse/      # AI Forms
│   ├── fengshui/         # Feng Shui Analysis
│   └── asc-tcd/          # Association Website
│
└── docs/                  # Documentation
    ├── audits/           # 16 audits détaillés
    └── ...
```

### Hiérarchie des Packages

**1. `packages/`** - Pour code réutilisable entre projets
**2. `apps/[project]/[shared]`** - Pour code partagé web/api d'un projet
**3. `apps/[project]/web|api`** - Pour code spécifique à une couche

---

## 🎨 Règles UI/UX

### Composants UI (PRIORITÉ ABSOLUE)

❌ **JAMAIS** utiliser HTML natif (`<div>`, `<button>`, `<input>`, `<h1>`)
✅ **TOUJOURS** utiliser composants `@ezstart/ui`

```tsx
// ❌ JAMAIS
<div className="bg-white rounded-lg">
  <h2>Title</h2>
  <button>Click</button>
</div>

// ✅ TOUJOURS
<Card variant="floating">
  <CardHeader>
    <H2>Title</H2>
  </CardHeader>
  <CardContent>
    <Button>Click</Button>
  </CardContent>
</Card>
```

### Couleurs Sémantiques (OBLIGATOIRE)

❌ **JAMAIS** hardcoder couleurs (`bg-red-50`, `text-gray-600`)
✅ **TOUJOURS** utiliser classes sémantiques

```tsx
// ❌ Hardcodé
className = 'bg-gray-100 text-gray-900'

// ✅ Sémantique
className = 'bg-card text-foreground'
```

**Palette sémantique :**

- Background: `bg-background`, `bg-card`, `bg-muted`
- Text: `text-foreground`, `text-muted-foreground`
- Primary: `bg-primary`, `text-primary-foreground`
- Border: `border`

### Architecture UI en 3 Layers (IMPORTANT)

Le package `@ezstart/ui` suit une **architecture en 3 couches** pour flexibilité maximale:

```
Layer 3: Business Components
├─ PasswordInput (Input + validation)
├─ BackButton (Button + navigation)
└─ LocaleSwitcher (Dropdown + i18n)
         ↓ composent
Layer 2: High-Level Components
├─ Modal (Dialog avec defaults)
├─ Dropdown (Select simplifié)
└─ Hero (Section + media)
         ↓ utilisent
Layer 1: Primitives & Base
├─ Dialog, Select (Radix wrappers)
└─ Button, Input, Card...
```

**Quand utiliser chaque layer:**

- **Layer 1:** Cas complexes avec layouts customs
- **Layer 2:** 90% des cas standards
- **Layer 3:** Patterns métier spécifiques

**Pourquoi ne PAS merger les composants:**

- ✅ PasswordInput = composition d'Input (pattern correct)
- ✅ Modal ≠ Dialog (niveaux d'abstraction différents)
- ✅ Suit les standards industrie (shadcn/ui, Radix UI)

**Documentation complète:** [packages/ui/README.md](./packages/ui/README.md)

---

## 🏗️ Configuration Centralisée

### TypeScript

Tous les projets utilisent `@ezstart/typescript-config`

**Variantes disponibles :**

- `base.json` - Configuration de base
- `api.json` - APIs Express
- `nextjs.json` - Apps Next.js
- `react-library.json` - Packages React
- `types.json` - Packages types

### ESLint & Tailwind

- **ESLint:** `@ezstart/eslint-config`
- **Tailwind:** `@ezstart/tailwind-config`
- **URLs/CORS:** `@ezstart/config`

---

## 🗄️ MongoDB - Connexion Centralisée

### Pattern Standard

```typescript
import { connectToMongo, startServer, createApp } from '@ezstart/express-core'

const app = createApp({ apiApp: 'ezauth' })

connectToMongo('database-name')
  .then(() => startServer(app, { routes, registries, serviceName, port }))
  .catch(err => {
    console.error('❌ Failed to start API', err)
    process.exit(1)
  })
```

### Models avec Factory Functions

```typescript
import { connectToMongo } from '@ezstart/express-core'
import { Schema } from 'mongoose'

const userSchema = new Schema({...}, { bufferCommands: false })

export async function getUserModel() {
  const mongoose = await connectToMongo('database-name')
  return mongoose.models.User || mongoose.model('User', userSchema)
}
```

**Documentation complète :** [packages/express-core/MONGODB-ARCHITECTURE.md](./packages/express-core/MONGODB-ARCHITECTURE.md)

---

## 🧪 Tests

### Running Tests

```bash
# Tous les tests
pnpm test

# API spécifique
pnpm --filter api-ezauth test

# Avec coverage
pnpm test -- --coverage
```

### Protection Database (CRITIQUE)

Tous les APIs utilisent `createVitestConfig({ dbName })`

```typescript
// apps/[api]/vitest.config.ts
import { createVitestConfig } from '@ezstart/test-utils'

export default createVitestConfig({
  dbName: 'ezauth', // Database name pour isolation
})
```

**Triple protection :**

1. ✅ `NODE_ENV=test` forcé
2. ✅ `MONGO_URL` fallback localhost (JAMAIS production)
3. ✅ `.env.test` optionnel chargé automatiquement

**Documentation complète :** [docs/TESTING.md](./docs/TESTING.md)

---

## 🚀 Déploiement

### Plateformes

**Oracle Cloud Free Tier (TOUTES les APIs - GRATUIT) :**

- EZAuth API - https://ezauth-api.up.railway.app
- EZPay API - https://ezpay-api.up.railway.app
- EZBill API - https://ezbill-api.up.railway.app
- Tower Defense API -
- GreenPulse API - https://greenpulse-api.up.railway.app
- EZStart API - https://ezstart-api.up.railway.app

**Ressources :** 1x VM ARM (4 cores, 24GB RAM, 200GB storage) - GRATUIT À VIE

**Vercel (Web Apps) :**

- EZStart - https://www.ezstart.xyz
- Toutes les autres apps

### Infrastructure as Code

Fichiers de configuration :

- [docker-compose.yml](./docker-compose.yml) - Orchestration Docker (6 APIs)
- [nginx/nginx.conf](./nginx/nginx.conf) - Reverse proxy et SSL
- [.env.oracle.example](./.env.oracle.example) - Template variables Oracle
- `apps/*/api/Dockerfile` - Dockerfiles multi-stage optimisés
- `scripts/oracle-*.sh` - Scripts de gestion Oracle Cloud
- `apps/*/web/vercel.json` - Configuration Vercel

**Anciennes configs (deprecated) :**

- [railway.toml](./railway.toml) - Configuration Railway (ancien)
- [render.yaml](./render.yaml) - Configuration Render (ancien)

**Documentation complète :**

- [docs/ORACLE-CLOUD-DEPLOY.md](./docs/ORACLE-CLOUD-DEPLOY.md) - Guide Oracle complet
- [DEPLOY.md](./DEPLOY.md) - Vue d'ensemble déploiement
- [docs/CI-CD-SETUP.md](./docs/CI-CD-SETUP.md) - Infrastructure as Code

---

## 📝 Git Commits - Règles

✅ **TOUJOURS** commiter après modifications importantes
✅ **TOUJOURS** documenter les changements
✅ **TOUJOURS** mettre à jour CLAUDE.md si nouvelles pratiques
✅ **TOUJOURS** mettre à jour README des packages modifiés

❌ **JAMAIS** ajouter ces lignes :

```
🤖 Generated with [Claude Code](...)
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Structure Recommandée

```
type: brief description

- Detailed changes list
- Technical modifications
- Impact/results
```

---

## 🔧 Troubleshooting

### ERR_CONNECTION_REFUSED

**Cause :** Anciens processus Node.js persistent
**Solution :** Redémarrer VS Code ou `pnpm kill:ports`

### TypeScript Errors

```bash
pnpm build
pnpm typecheck
```

### MongoDB Connection Failed

**Cause :** MONGO_URL incorrecte ou MongoDB pas démarré
**Solution :** Vérifier `.env.local` ou démarrer MongoDB local

---

## 📚 Documentation Complète

### Core Docs

- **[DEV-RULES.md](./DEV-RULES.md)** - Règles de développement
- **[DEPLOY.md](./DEPLOY.md)** - Guide de déploiement
- **[docs/README.md](./docs/README.md)** - Dashboard des audits
- **[docs/CLAUDE-ARCHIVE.md](./docs/CLAUDE-ARCHIVE.md)** - Historique complet (4600+ lignes)

### Guides Techniques

- [docs/TESTING.md](./docs/TESTING.md) - Stratégie de tests
- [docs/ROADMAP.md](./docs/ROADMAP.md) - Roadmap Phase 3
- [docs/CI-CD-SETUP.md](./docs/CI-CD-SETUP.md) - Infrastructure as Code
- [packages/express-core/MONGODB-ARCHITECTURE.md](./packages/express-core/MONGODB-ARCHITECTURE.md) - MongoDB

### Audits Détaillés

**16 audits disponibles :** [docs/audits/](./docs/audits/)

- Security, Performance, Architecture, Code Quality
- Dependencies, Accessibility, Infrastructure, API
- SEO, Web Apps, Testing, UX, i18n, Monitoring

### Guides par App

- **Tower Defense:** [apps/tower-defense/docs/GAMEPLAY.md](./apps/tower-defense/docs/GAMEPLAY.md)
- **GreenPulse:** [apps/green-pulse/FORMS.md](./apps/green-pulse/FORMS.md)
- **Auth SDK:** [packages/auth-sdk/HTTPONLY-MIGRATION.md](./packages/auth-sdk/HTTPONLY-MIGRATION.md)

---

## 🎯 Prochaines Étapes - Phase 3

**Objectif :** Excellence (95 → 100/100)

**Focus sur 5 domaines :**

1. **UX Excellence** (70 → 90) - Loading states, error handling, mobile UX
2. **Performance** (75 → 90) - Bundle optimization, images WebP/AVIF
3. **Accessibility** (76 → 95) - ARIA attributes, keyboard navigation
4. **API & Monitoring** (80 → 95) - OpenAPI complete, rate limiting, alerting
5. **Monitoring Dashboard** (80 → 95) - Trending graphs, email alerts

**Durée estimée :** 3 semaines (60 heures)

**Documentation complète :** [docs/ROADMAP.md](./docs/ROADMAP.md)

---

## 💡 Bonnes Pratiques

### Avant de Créer du Code

1. ✅ Vérifier si existe dans `packages/`
2. ✅ Vérifier si peut être généralisé
3. ✅ Créer dans la couche la plus haute possible

### Hiérarchie de Vérification

1. `packages/` - Réutilisable entre projets
2. `apps/[project]/[shared]` - Partagé web/api du projet
3. `apps/[project]/web|api` - Spécifique à une couche

### Configuration Centralisée

1. ✅ Toujours utiliser `@ezstart/typescript-config`
2. ✅ Toujours utiliser `@ezstart/eslint-config`
3. ✅ Toujours utiliser `@ezstart/tailwind-config`
4. ✅ Toujours utiliser `@ezstart/config` pour URLs/CORS
5. ✅ Toujours utiliser `@ezstart/ui` pour composants

### Architecture .env

```
Chaque projet :
├── .env.example    ← Template (committé)
├── .env.local      ← Secrets dev (gitignored)
└── .env.production ← Secrets prod (gitignored)
```

---

**Pour toute question, consulter [DEV-RULES.md](./DEV-RULES.md) ou [docs/CLAUDE-ARCHIVE.md](./docs/CLAUDE-ARCHIVE.md)**
