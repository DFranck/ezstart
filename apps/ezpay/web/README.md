# EZPay Web

Dashboard et documentation pour le système de paiement universel EZPay.

## 🎯 Overview

EZPay Web fournit une interface utilisateur pour documenter et gérer le système EZPay. C'est une application Next.js simple qui explique comment utiliser EZPay dans vos projets.

## 🚀 Quick Start

### Development

```bash
# Depuis la racine du monorepo
pnpm --filter web-ezpay dev

# Ou via le script dédié
pnpm dev:pay
```

### Build

```bash
pnpm --filter web-ezpay build
```

## 🔧 Configuration

### Variables d'Environnement

Créer `.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:5040/api
NEXT_PUBLIC_WEB_URL=http://localhost:5045
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## 📄 Pages

### Home (`/`)

Page d'accueil avec :
- Vue d'ensemble d'EZPay
- Types de paiements supportés (Donations, Purchases, Subscriptions)
- Guide de démarrage rapide
- Exemples d'intégration

### Future Pages (à implémenter)

- `/docs` - Documentation complète de l'API
- `/dashboard` - Dashboard admin (stats, analytics)
- `/donate/:project` - Page de donation publique
- `/widget` - Widget embeddable pour sites externes

## 🎨 Stack Technique

- **Next.js 15** - App Router
- **React 19** - UI Library
- **@ezstart/pay-sdk** - Client SDK
- **@ezstart/ui** - UI Components
- **@ezstart/next-theme** - Theme provider
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

## 📂 Structure

```
apps/ezpay/web/
├── src/
│   └── app/
│       ├── layout.tsx         # Root layout with ThemeProvider
│       ├── page.tsx           # Home page
│       └── globals.css        # Global styles
├── .env.example               # Template variables
├── next.config.ts             # Next.js config
├── tailwind.config.js         # Tailwind config (shared)
└── package.json
```

## 🌐 URLs

**Development:**
- Web: http://localhost:5045

**Production:**
- Web: https://ezpay.vercel.app

## 🚀 Deployment (Vercel)

### Configuration Vercel

**Root Directory:** `apps/ezpay/web`

**Build Command:**
```bash
pnpm build
```
(utilise le package.json local qui build les dépendances)

**Install Command:**
```bash
pnpm install --frozen-lockfile
```

**Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://ezpay-api.onrender.com/api
NEXT_PUBLIC_WEB_URL=https://ezpay.vercel.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Important Vercel Settings

✅ **Include files outside root directory** - COCHÉ (obligatoire pour monorepo)

## 📖 Related Docs

- [EZPay SDK](../../../packages/pay-sdk/README.md)
- [EZPay API](../api/README.md)
- [CLAUDE.md - EZPay Section](../../../CLAUDE.md#ezpay---système-de-paiement-universel-⭐-nouveau)

## 🔧 Development Commands

```bash
# Dev mode
pnpm dev

# Build
pnpm build

# Start production
pnpm start

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## 📝 Features Roadmap

- ✅ **Home Page** - Documentation de base
- ⏳ **API Docs** - Documentation API complète
- ⏳ **Dashboard** - Stats et analytics
- ⏳ **Widget Generator** - Générateur de widget embeddable
- ⏳ **Public Donation Pages** - Pages publiques `/donate/:project`
- ⏳ **Testimonials Gallery** - Gallerie de tous les témoignages

## 📝 Notes

- Port **5045** (pattern 50x5 pour Web apps)
- Utilise le ThemeProvider pour dark/light mode
- Auto-configuration de l'API URL (dev/prod)
- Compatible avec le monorepo @ezstart
