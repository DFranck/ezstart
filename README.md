# 🚀 EZStart Monorepo

**Modern full-stack monorepo** - Build and launch applications faster with shared infrastructure and best practices.

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)
[![Monorepo](https://img.shields.io/badge/Monorepo-pnpm%20workspaces-orange)](https://pnpm.io/)
[![Health Score](https://img.shields.io/badge/Health-85%2F100-brightgreen)](#-health--quality-score)
[![Apps](https://img.shields.io/badge/Apps-7%20web%20%2B%205%20API-blueviolet)](#-applications)

---

## 📊 Health & Quality Score

**Overall: 85/100** 🟢 Excellent

| Category | Score | Status |
|----------|-------|--------|
| [Architecture](./docs/audits/ARCHITECTURE-AUDIT.md) | 95/100 | 🟢 Exemplary |
| [Code Quality](./docs/audits/CODE-QUALITY-AUDIT.md) | 92/100 | 🟢 Excellent |
| [SEO](./docs/audits/SEO-AUDIT.md) | 85/100 | 🟢 Excellent |
| [Infrastructure](./docs/audits/INFRASTRUCTURE-AUDIT.md) | 82/100 | 🟢 Very Good |
| [Dependencies](./docs/audits/DEPENDENCIES-AUDIT.md) | 80/100 | 🟢 Very Good |
| [Monitoring](./docs/audits/MONITORING-AUDIT.md) | 70/100 | 🟡 Fair |

📈 **Full Audit Dashboard**: [docs/README.md](./docs/README.md)
📋 **Improvement Roadmap**: [docs/IMPROVEMENT-ROADMAP.md](./docs/IMPROVEMENT-ROADMAP.md)

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

| Service | Web | API |
|---------|-----|-----|
| **EZStart** | http://localhost:5050 | http://localhost:5000 |
| **EZAuth** | http://localhost:5015 | http://localhost:5010 |
| **EZBill** | http://localhost:5025 | http://localhost:5020 |
| **EZPay** | http://localhost:5045 | http://localhost:5040 |
| **FengShui** | http://localhost:5065 | - |
| **ASC-TCD** | http://localhost:5055 | - |
| **GreenPulse** | http://localhost:5075 | http://localhost:5070 |

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

- **EZAuth API** (5010) - Authentication service
- **EZBill API** (5020) - Billing backend
- **EZPay API** (5040) - Payment processing
- **GreenPulse API** (5070) - AI sustainability backend
- **EZStart API** (5000) - Health checks and metrics

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
└── docs/                  # Documentation & audits
    ├── README.md          # Audit dashboard
    ├── audits/            # 16 complete audits
    └── IMPROVEMENT-ROADMAP.md
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

All services use the **50xx** pattern:
- **APIs**: 5000, 5010, 5020, 5040, 5070 (ending in 0)
- **Web Apps**: 5015, 5025, 5045, 5050, 5055, 5065, 5075 (ending in 5)

Auto-detected from `@ezstart/config` - no manual configuration needed!

### Environment Variables

Each app has:
- `.env.example` - Template with placeholders (committed)
- `.env.local` - Your local secrets (gitignored)
- `.env.production` - Production secrets (gitignored)

All URLs and ports are auto-configured via `@ezstart/config`.

---

## 📚 Documentation

### Essential Reads

- **[CLAUDE.md](./CLAUDE.md)** - 📐 Complete development guide (architecture, patterns, conventions)
- **[DEV-RULES.md](./DEV-RULES.md)** - ⭐ **MANDATORY** development rules
- **[docs/README.md](./docs/README.md)** - 📊 Audit dashboard (16/16 audits)
- **[DEPLOY.md](./DEPLOY.md)** - 🚀 Deployment guide (Railway + Vercel)

### Audits (16/16 Complete)

All audits available in [docs/audits/](./docs/audits/):
- Architecture, Code Quality, Dependencies, Security
- Performance, SEO, Accessibility, Infrastructure
- API, Web Apps, Testing, UX, i18n, Monitoring

### Package Documentation

Browse [packages/](./packages/) - Each package has a comprehensive README with:
- Installation & setup
- API reference
- Usage examples
- Migration guides

---

## 🚢 Deployment

### Production URLs

| App | Domain | Platform |
|-----|--------|----------|
| EZStart | ezstart-web.vercel.app | Vercel |
| EZAuth | ezauth.vercel.app | Vercel (Web) |
| EZAuth API | ezauth.up.railway.app | Railway |
| EZBill | ezstart-ezbill.vercel.app | Vercel |
| EZPay | ezstart-ezpay.vercel.app | Vercel |
| EZPay API | ezpay-api.up.railway.app | Railway |
| FengShui | ezfengshui.vercel.app | Vercel |
| ASC-TCD | asc-tcd-web.vercel.app | Vercel |
| GreenPulse | green-pulse-web.vercel.app | Vercel |

**See [DEPLOY.md](./DEPLOY.md) for complete deployment instructions.**

---

## 🤝 Contributing

### Before You Start

1. Read [DEV-RULES.md](./DEV-RULES.md) - **Mandatory rules**
2. Read [CLAUDE.md](./CLAUDE.md) - Architecture & patterns
3. Check [docs/IMPROVEMENT-ROADMAP.md](./docs/IMPROVEMENT-ROADMAP.md) - Current priorities

### Development Workflow

1. Always use centralized packages before creating new ones
2. Follow the monorepo structure (packages/ for shared, apps/ for specific)
3. Use semantic commits (`feat:`, `fix:`, `docs:`, etc.)
4. Run `pnpm typecheck` and `pnpm lint` before committing
5. Update package READMEs when modifying shared packages

---

## 📊 Stats

- **7 Web Applications** (Next.js 15, React 19)
- **5 API Services** (Express + Socket.IO)
- **16 Shared Packages** (100% TypeScript)
- **18/18 TypeCheck Coverage** (100%)
- **17/17 Lint Coverage** (100%)
- **16/16 Audits Complete** (100%)
- **Overall Health: 85/100** (Excellent)

---

## 📄 License

Private monorepo - All rights reserved.

---

**Built with ❤️ using pnpm workspaces, Next.js 15, and TypeScript**
