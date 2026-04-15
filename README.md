# 🚀 EZStart Monorepo

**Modern full-stack monorepo** - Build and launch applications faster with shared infrastructure and best practices.

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Monorepo](https://img.shields.io/badge/Monorepo-pnpm%20workspaces-orange)](https://pnpm.io/)
[![Apps](https://img.shields.io/badge/Apps-7%20web%20%2B%206%20API-blueviolet)](#-applications)

Live audit scores are tracked in [`docs/audits.json`](./docs/audits.json) and surfaced in the EZStart monitoring dashboard.

---

## ⚡ Quick Start

```bash
# Install dependencies
pnpm install

# Start all services (recommended for first time)
pnpm dev

# Or start specific apps
pnpm dev:ez      # EZStart + Monitoring + All APIs
pnpm dev:bill    # EZBill + EZAuth
pnpm dev:fs      # FengShui + EZAuth + EZPay

# Check service status
pnpm dev:status
```

### Development URLs

| Service        | Web                   | API                   |
| -------------- | --------------------- | --------------------- |
| **EZStart**    | http://localhost:6101 | http://localhost:6100 |
| **EZAuth**     | http://localhost:6111 | http://localhost:6110 |
| **EZBill**     | http://localhost:6121 | http://localhost:6120 |
| **EZPay**      | http://localhost:6131 | http://localhost:6130 |
| **FengShui**   | http://localhost:6151 | -                     |
| **ASC-TCD**    | http://localhost:6141 | -                     |
| **GreenPulse** | http://localhost:6161 | http://localhost:6160 |

---

## 🎯 Applications

### Web Applications (7)

#### 🏠 EZStart

**Main Hub & Dashboard** - Central platform for accessing all EZStart applications.

- **Tech**: Next.js 15, i18n (next-intl), PWA
- **Features**: Multilingual, monitoring dashboard, app launcher
- **Status**: ✅ Production ready

#### 🔐 EZAuth

**Centralized Authentication** - SSO authentication service for all apps.

- **Tech**: OAuth2, JWT, MongoDB
- **Features**: Single sign-on, user management, secure tokens
- **Status**: ✅ Production ready

#### 💼 EZBill

**Invoicing & Billing** - Simple billing management for businesses.

- **Tech**: Next.js, React Query, MongoDB
- **Features**: Clients, invoices, payments tracking
- **Status**: ✅ Production ready

#### 💳 EZPay

**Universal Payment System** - Centralized payment handling for all apps.

- **Tech**: Stripe, webhooks, MongoDB
- **Features**: Donations, purchases, subscriptions
- **Status**: ✅ Production ready

#### 🧭 FengShui Bagua

**Feng Shui Analysis** - Interactive Feng Shui compass with floor plan import.

- **Tech**: Next.js, Canvas, i18n
- **Features**: Bagua wheel, floor plans, orientation analysis
- **Status**: ✅ Production ready

#### 🏃 ASC-TCD

**Sports Association Website** - Website for sports and cultural activities.

- **Tech**: Next.js, i18n
- **Features**: Event management, member portal
- **Status**: ✅ Production ready

#### 🌱 Green Pulse

**AI Sustainability Assistant** - Track and improve environmental impact.

- **Tech**: Next.js, React Query, AI integration
- **Features**: Carbon tracking, recommendations, analytics
- **Status**: ✅ Production ready

### API Services (5)

- **EZAuth API** (6110) - Authentication service
- **EZBill API** (6120) - Billing backend
- **EZPay API** (6130) - Payment processing
- **GreenPulse API** (6160) - AI sustainability backend
- **EZStart API** (6100) - Health checks and metrics

---

## 🏗️ Architecture

### Monorepo Structure

```
@ezstart/
├── apps/                    # Applications (7 web + 5 API)
│   ├── ezstart/web         # Main hub (Next.js)
│   ├── ezauth/             # Authentication (Next.js + API)
│   ├── ezbill/             # Billing (Next.js + API)
│   ├── ezpay/              # Payments (Next.js + API)
│   ├── fengshui/web        # Feng Shui (Next.js)
│   ├── asc-tcd/web         # Sports association (Next.js)
│   ├── green-pulse/        # Sustainability (Next.js + API)
│   └── monitoring/api      # Monitoring service
│
├── packages/               # Shared packages (16)
│   ├── ui/                # UI components & design system
│   ├── auth-sdk/          # Authentication client
│   ├── pay-sdk/           # Payment client
│   ├── express-core/      # API infrastructure
│   ├── config/            # URLs & environment config
│   ├── seo-config/        # SEO utilities (metadata, JSON-LD)
│   ├── logger/            # Pino structured logging
│   ├── next-theme/        # Dark/light mode
│   ├── monitoring/        # Health checks & metrics
│   └── [11 more...]       # Config, types, utils
│
└── docs/                  # Audit data + long-form audit reports
    ├── audits.json        # Live audit scores (consumed by monitoring)
    └── audits/            # Long-form audit reports (when produced)
```

### Key Features

✅ **100% TypeScript** - Full type safety across all apps
✅ **Centralized Configuration** - Single source of truth
✅ **Shared Components** - Reusable UI library
✅ **SSO Authentication** - EZAuth for all apps
✅ **Universal Payments** - EZPay for all transactions
✅ **Structured Logging** - Pino with automatic instrumentation
✅ **SEO Optimized** - Open Graph, JSON-LD, sitemaps
✅ **Health Monitoring** - Automated checks for all services

---

## 🛠️ Development

### Quality Control

```bash
# TypeScript check (18/18 packages)
pnpm typecheck

# ESLint check (17/17 packages)
pnpm lint

# Build all apps
pnpm build

# Build specific app
pnpm --filter ezbill-web build
```

### Port Management

All services use the **61xx** pattern:

- **APIs**: 6100, 6110, 6120, 6130, 6160, 6170 (ending in 0)
- **Web Apps**: 6101, 6111, 6121, 6131, 6141, 6151, 6161, 6171 (ending in 1)

Auto-detected from `@ezstart/config` - no manual configuration needed!

### Environment Variables

Each app has:

- `.env.example` - Template with placeholders (committed)
- `.env.local` - Your local secrets (gitignored)
- `.env.production` - Production secrets (gitignored)

All URLs and ports are auto-configured via `@ezstart/config`.

---

## 📚 Documentation

### Root docs

| File                                 | Purpose                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Conventions, workflow, how to add a UI/feature/endpoint                                 |
| [CLAUDE.md](./CLAUDE.md)             | Manager pipeline (8 steps), agents, dev servers                                         |
| [DEV-RULES.md](./DEV-RULES.md)       | Index of all rule files in `.claude/rules/` (mandatory)                                 |
| [BACKLOG.md](./BACKLOG.md)           | Single source of truth for active backlog (done items archived in `BACKLOG-HISTORY.md`) |
| [DEPLOY.md](./DEPLOY.md)             | Railway (APIs) + Vercel (web) deployment guide                                          |
| [SECRETS.md](./SECRETS.md)           | `.env` architecture, `secrets-loader`, shared vs app-specific                           |
| [GENERATORS.md](./GENERATORS.md)     | Zero-maintenance code generation pipeline                                               |

### Audits

Audit scores live in [`docs/audits.json`](./docs/audits.json) (consumed by the monitoring dashboard).
Long-form audit reports (when produced) are stored in [`docs/audits/`](./docs/audits/).

### Package Documentation

Browse [packages/](./packages/) — each package has its own README with installation, API reference, and usage examples.

---

## 🚢 Deployment

### Production URLs

| App        | Domain                     | Platform     |
| ---------- | -------------------------- | ------------ |
| EZStart    | ezstart-web.vercel.app     | Vercel       |
| EZAuth     | ezauth.vercel.app          | Vercel (Web) |
| EZAuth API | ezauth.up.railway.app      | Railway      |
| EZBill     | ezstart-ezbill.vercel.app  | Vercel       |
| EZPay      | ezstart-ezpay.vercel.app   | Vercel       |
| EZPay API  | ezpay-api.up.railway.app   | Railway      |
| FengShui   | ezfengshui.vercel.app      | Vercel       |
| ASC-TCD    | asc-tcd-web.vercel.app     | Vercel       |
| GreenPulse | green-pulse-web.vercel.app | Vercel       |

**See [DEPLOY.md](./DEPLOY.md) for complete deployment instructions.**

---

## 🤝 Contributing

### Before You Start

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) — full contributor guide
2. Read [DEV-RULES.md](./DEV-RULES.md) — index of mandatory rules
3. Read [CLAUDE.md](./CLAUDE.md) — pipeline & agent workflow

### Development Workflow

1. Always use centralized packages before creating new ones
2. Follow the monorepo structure (packages/ for shared, apps/ for specific)
3. Use semantic commits (`feat:`, `fix:`, `docs:`, etc.)
4. Run `pnpm typecheck` and `pnpm lint` before committing
5. Update package READMEs when modifying shared packages

---

## 📊 Stats

- **7 Web Applications** (Next.js 15, React 19)
- **6 API Services** (Express + Socket.IO)
- **16+ Shared Packages** (100% TypeScript)
- **100% TypeCheck Coverage** across all packages

---

## 📄 License

Private monorepo - All rights reserved.

---

**Built with ❤️ using pnpm workspaces, Next.js 15, and TypeScript**
