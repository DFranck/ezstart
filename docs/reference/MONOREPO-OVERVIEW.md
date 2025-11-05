# @ezstart Monorepo - Complete Overview

> Comprehensive technical overview of the @ezstart monorepo architecture, packages, applications, and infrastructure.

**Last Updated:** 2025-11-05
**Global Score:** 95/100 ⭐⭐⭐⭐⭐ EXCELLENT
**Status:** Production-Ready with 337+ Tests

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Packages Ecosystem](#packages-ecosystem)
- [Applications](#applications)
- [Development Workflow](#development-workflow)
- [Testing Strategy](#testing-strategy)
- [Deployment Infrastructure](#deployment-infrastructure)
- [Security & Authentication](#security--authentication)
- [Monitoring & Observability](#monitoring--observability)
- [Performance Metrics](#performance-metrics)
- [Tech Stack](#tech-stack)

---

## Architecture Overview

### Monorepo Structure

```
@ezstart/
├── packages/           # 16 shared packages (core infrastructure)
│   ├── types/         # TypeScript type definitions
│   ├── config/        # Centralized URLs/CORS configuration
│   ├── ui/            # React component library (340+ components)
│   ├── auth-sdk/      # Authentication SDK (JWT + httpOnly)
│   ├── pay-sdk/       # Stripe payment integration
│   ├── fetch-client/  # Type-safe HTTP client
│   ├── express-core/  # Express.js infrastructure
│   ├── test-utils/    # Testing infrastructure (Vitest)
│   ├── monitoring/    # Health checks & observability
│   └── ...
│
├── apps/              # 15 applications (8 web apps + 6 APIs + monitoring)
│   ├── ezstart/       # Landing page + Monitoring Dashboard
│   ├── ezauth/        # SSO Authentication (API + Web)
│   ├── ezpay/         # Payment System (API + Web)
│   ├── ezbill/        # Invoicing (API + Web)
│   ├── tower-defense/ # Game (API + Web)
│   ├── green-pulse/   # AI Forms (API + Web)
│   ├── fengshui/      # Feng Shui Analysis (Web)
│   └── asc-tcd/       # Association Website (Web)
│
└── docs/              # Comprehensive documentation (16 audits)
    ├── audits/        # 16 detailed audits (security, performance, etc.)
    ├── guides/        # Testing, deployment, audit guides
    ├── reference/     # Roadmap, archive, technical specs
    └── ai-agents/     # AI agent integration guides
```

### Design Principles

1. **Single Source of Truth** - All configurations centralized in `packages/config`
2. **Type Safety** - 100% TypeScript with strict mode enabled
3. **Code Reusability** - Shared packages prevent duplication
4. **Scalability** - Modular architecture supports adding new apps
5. **Developer Experience** - Hot reload, TypeScript autocomplete, comprehensive tests

### Package Hierarchy Rules

**Priority order when creating new code:**

1. **`packages/`** - For code reusable across multiple projects
2. **`apps/[project]/[shared]`** - For code shared between web/api of a project
3. **`apps/[project]/web|api`** - For layer-specific code only

**Examples:**
- UI component used by 3+ apps → `packages/ui`
- Type used by API + Web of same project → `apps/[project]/[shared]/types`
- API-specific controller → `apps/[project]/api/src/controllers`

---

## Packages Ecosystem

### Infrastructure Packages (Core)

#### @ezstart/config
**Purpose:** Centralized URLs and CORS configuration
**Why:** Single source of truth for all service URLs (local + production)
**Used by:** All 8 web apps, all 6 APIs

```typescript
import { API_URLS, WEB_URLS, CORS_OPTIONS } from '@ezstart/config'

// Automatic environment detection
const authUrl = API_URLS.ezauth // http://localhost:5010 (dev) or production URL
```

**Key Features:**
- Environment-aware URL resolution
- CORS whitelist management
- TypeScript autocomplete for all URLs

#### @ezstart/express-core
**Purpose:** Express.js infrastructure with MongoDB, OpenAPI, rate limiting
**Why:** Eliminates boilerplate, ensures consistency across APIs
**Used by:** All 6 APIs

```typescript
import { createApp, connectToMongo, startServer, rateLimitMiddleware } from '@ezstart/express-core'

const app = createApp({ apiApp: 'ezauth' })
app.use(rateLimitMiddleware()) // 100 req/15min per IP

connectToMongo('ezauth')
  .then(() => startServer(app, { routes, registries, serviceName: 'EZAuth', port: 5010 }))
```

**Key Features:**
- MongoDB connection with singleton pattern
- OpenAPI auto-generation from Zod schemas
- Rate limiting middleware (tested with 15 tests)
- Health check endpoints (`/api/health`)
- Structured logging with Pino

#### @ezstart/fetch-client
**Purpose:** Type-safe HTTP client with error handling
**Why:** Consistent API calls, automatic error parsing
**Used by:** All 8 web apps

```typescript
import { callApi, parseApiError, runWithFeedback } from '@ezstart/fetch-client'

const response = await callApi<User>('/users', { method: 'POST', body: userData })
if (!response.ok) throw new Error(parseApiError(response.data))
```

**Key Features:**
- Type-safe responses with generics
- Automatic error message extraction (handles 4 formats)
- Integration with toast notifications via `runWithFeedback`
- Prevents `[object Object]` display

#### @ezstart/test-utils
**Purpose:** Testing infrastructure with database protection
**Why:** Ensures tests never touch production, consistent test setup
**Used by:** All 6 APIs

```typescript
import { createVitestConfig } from '@ezstart/test-utils'

export default createVitestConfig({
  dbName: 'ezauth', // Isolated test database
})
```

**Key Features:**
- Triple database protection (NODE_ENV + fallback URL + .env.test)
- Consistent Vitest configuration
- Global test utilities and mocks

### UI/UX Packages

#### @ezstart/ui
**Purpose:** Component library with 340+ components (3-layer architecture)
**Why:** Design consistency, accessibility, reusability
**Used by:** All 8 web apps

**Architecture:**
```
Layer 3: Business Components (PasswordInput, BackButton, LocaleSwitcher)
   ↓
Layer 2: High-Level Components (Modal, Dropdown, Hero)
   ↓
Layer 1: Primitives & Base (Dialog, Select, Button, Card, Input)
```

**Key Features:**
- 114+ ARIA attributes for accessibility
- Dark/light mode support
- Semantic color system (`bg-card`, `text-foreground`)
- 13 React.memo optimizations
- 16+ useCallback hooks for performance

**Usage Rules:**
❌ **NEVER** use raw HTML (`<div>`, `<button>`, `<input>`)
✅ **ALWAYS** use components from `@ezstart/ui`

```tsx
// ❌ WRONG
<div className="bg-white p-4">
  <h2 className="text-gray-900">Title</h2>
  <button className="bg-blue-500">Click</button>
</div>

// ✅ CORRECT
<Card variant="floating">
  <CardHeader>
    <H2>Title</H2>
  </CardHeader>
  <CardContent>
    <Button>Click</Button>
  </CardContent>
</Card>
```

#### @ezstart/next-theme
**Purpose:** Dark/light mode provider with hydration safety
**Why:** Consistent theming, no flash of unstyled content
**Used by:** All 8 web apps

```tsx
import { ThemeProvider, ThemeToggle } from '@ezstart/next-theme'

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Configuration Packages

#### @ezstart/typescript-config
**Purpose:** Centralized TypeScript configurations
**Why:** Consistent type checking, zero config
**Used by:** All 22 projects (packages + apps)

**Variants:**
- `base.json` - Base configuration
- `api.json` - Express APIs
- `nextjs.json` - Next.js apps
- `react-library.json` - React packages
- `types.json` - Type packages

```json
{
  "extends": "@ezstart/typescript-config/nextjs.json"
}
```

#### @ezstart/eslint-config
**Purpose:** ESLint rules for TypeScript, React, Next.js
**Why:** Code quality, consistent style
**Used by:** All projects

**Rules:**
- React Hooks checks
- Next.js best practices
- TypeScript strict rules
- Import/export validation

#### @ezstart/tailwind-config
**Purpose:** Shared Tailwind configuration
**Why:** Design token consistency (colors, spacing, fonts)
**Used by:** All 8 web apps

**Features:**
- Semantic color system
- Dark mode configuration
- Custom animations
- Responsive breakpoints

### Feature Packages

#### @ezstart/auth-sdk
**Purpose:** Authentication SDK with JWT + httpOnly cookies
**Why:** Secure auth across all apps, SSO support
**Used by:** All 8 web apps

```tsx
import { AuthProvider, useAuth } from '@ezstart/auth-sdk'

export default function RootLayout({ children }) {
  return (
    <AuthProvider appName="ezbill">
      {children}
    </AuthProvider>
  )
}

function Profile() {
  const { user, logout } = useAuth()
  return <div>Welcome {user?.name}</div>
}
```

**Key Features:**
- httpOnly cookies (XSS protection)
- Automatic token refresh
- SSO support via EZAuth
- Profile management UI

#### @ezstart/pay-sdk
**Purpose:** Stripe payment integration
**Why:** Consistent payment flows, PCI compliance
**Used by:** EZPay, EZBill

```typescript
import { createPaymentIntent, confirmPayment } from '@ezstart/pay-sdk'

const paymentIntent = await createPaymentIntent({
  amount: 9999, // $99.99
  currency: 'usd',
  userId: 'user123',
})

const result = await confirmPayment(paymentIntent.clientSecret)
```

**Key Features:**
- Stripe Elements integration
- Webhook handling
- Payment method management
- Subscription support

#### @ezstart/monitoring
**Purpose:** Health checks, audits, observability
**Why:** Centralized monitoring dashboard
**Used by:** EZStart Monitoring Dashboard

```typescript
import { HealthChecker, MONITORED_SERVICES } from '@ezstart/monitoring'

const checker = new HealthChecker()
const result = await checker.check({
  name: 'EZAuth API',
  url: 'http://localhost:5010/api/health',
  timeout: 5000,
})

console.log(result.status) // 'healthy' | 'degraded' | 'unhealthy'
```

**Key Features:**
- Service health monitoring (14 services)
- Uptime calculation
- Response time tracking
- Audit metadata management

#### @ezstart/logger
**Purpose:** Structured logging with Pino
**Why:** Performance (5x faster than Winston), searchable logs
**Used by:** All 6 APIs

```typescript
import { logger } from '@ezstart/logger'

logger.info({ userId, action: 'checkout' }, 'Payment initiated')
logger.error({ error, paymentId }, 'Payment failed')
```

**Key Features:**
- JSON logs in production
- Pretty-printed logs in development
- Log levels (info, warn, error, debug)
- High performance (50K logs/sec)

### Build & Deploy Packages

#### @ezstart/next-config
**Purpose:** Next.js configuration factory
**Why:** Zero config, i18n + PWA enabled
**Used by:** All 8 web apps

```typescript
import { createNextConfig } from '@ezstart/next-config'

export default createNextConfig({
  appName: 'ezbill',
  locales: ['en', 'fr', 'es'],
  defaultLocale: 'en',
})
```

**Features:**
- Automatic i18n setup
- PWA configuration
- Bundle analyzer
- Source map optimization

#### @ezstart/seo-config
**Purpose:** SEO metadata generation
**Why:** Consistent meta tags, Open Graph, JSON-LD
**Used by:** All 8 web apps

```typescript
import { generateMetadata } from '@ezstart/seo-config'

export const metadata = generateMetadata({
  title: 'EZBill - Invoice Management',
  description: 'Create and manage invoices',
  siteName: 'EZBill',
})
```

---

## Applications

### Production Applications

#### 1. EZStart (Landing + Monitoring)
**Tech:** Next.js 15 (Web) + Express.js (Monitoring API)
**URL:** https://www.ezstart.xyz
**Ports:** 5005 (Web), 5000 (API)
**Purpose:** Main landing page + Monitoring Dashboard

**Features:**
- Hero landing page
- Service catalog
- Monitoring dashboard (14 services, 16 audits)
- Health check API
- Uptime tracking
- Real-time status updates

**Dependencies:**
- `@ezstart/monitoring` - Health checks and metrics
- `@ezstart/ui` - Dashboard components
- `@tanstack/react-query` - Data fetching

#### 2. EZAuth (SSO Authentication)
**Tech:** Next.js 15 (Web) + Express.js (API) + MongoDB
**URL:** https://ezauth.ezstart.xyz (Web) + API
**Ports:** 5015 (Web), 5010 (API)
**Purpose:** Single Sign-On authentication for all apps

**Features:**
- User registration/login
- OAuth providers (Google, GitHub)
- JWT + httpOnly cookies
- Profile management
- Session management
- Password reset flow

**API Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PUT /api/users/:id` - Update profile

**Security:**
- Rate limiting: 100 req/15min per IP
- Password hashing with bcrypt
- httpOnly cookies (XSS protection)
- CORS whitelist
- Input validation with Zod

#### 3. EZPay (Payment System)
**Tech:** Next.js 15 (Web) + Express.js (API) + MongoDB + Stripe
**URL:** https://ezpay.ezstart.xyz (Web) + API
**Ports:** 5045 (Web), 5040 (API)
**Purpose:** Payment processing and subscription management

**Features:**
- Payment intents
- Subscription management
- Payment method storage
- Webhook handling (Stripe)
- Invoice generation
- Receipt emails

**API Endpoints:**
- `POST /api/payments` - Create payment intent
- `POST /api/subscriptions` - Create subscription
- `GET /api/payment-methods` - List payment methods
- `POST /api/webhooks/stripe` - Stripe webhook handler

**Integrations:**
- Stripe API v2024-10
- Email notifications
- Invoice generation (EZBill integration)

#### 4. EZBill (Invoicing)
**Tech:** Next.js 15 (Web) + Express.js (API) + MongoDB
**URL:** https://ezbill.ezstart.xyz (Web) + API
**Ports:** 5025 (Web), 5020 (API)
**Purpose:** Invoice and quote management

**Features:**
- Invoice CRUD (Create, Read, Update, Delete)
- Quote management
- Client management
- Company profiles
- Payment method tracking
- Mark invoices as paid
- Soft delete + restore

**API Endpoints:**
- `POST /api/invoices` - Create invoice
- `GET /api/invoices` - List invoices
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Soft delete
- `POST /api/invoices/:id/restore` - Restore
- `POST /api/invoices/:id/mark-paid` - Mark as paid
- `POST /api/quotes` - Create quote
- `POST /api/clients` - Create client
- `POST /api/companies` - Create company

**Data Model:**
```typescript
Invoice {
  _id: string
  userId: string
  clientId: string
  lineItems: LineItem[]
  totalAmount: number
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  isPaid: boolean
  paidAt?: Date
  deletedAt?: Date
}
```

#### 5. Tower Defense (Game)
**Tech:** Next.js 15 (Web) + Express.js (API) + MongoDB
**URL:** https://tower-defense.ezstart.xyz (Web) + API
**Ports:** 5035 (Web), 5030 (API)
**Purpose:** Multiplayer tower defense game

**Features:**
- Player registration
- Game lobby (create/join)
- Real-time gameplay
- Turn-based mechanics
- Tower placement
- Enemy waves
- Score tracking

**API Endpoints:**
- `POST /api/players` - Register player
- `POST /api/games` - Create game
- `POST /api/games/:id/join` - Join game
- `POST /api/games/:id/leave` - Leave game
- `GET /api/games` - List games (waiting/playing)

**Game Flow:**
1. Player registers
2. Creates/joins game lobby
3. Game starts when 2+ players ready
4. Turn-based tower placement
5. Enemy waves attack
6. Score calculated

#### 6. GreenPulse (AI Forms & Conversations)
**Tech:** Next.js 15 (Web) + Express.js (API) + MongoDB
**URL:** https://greenpulse.ezstart.xyz (Web) + API
**Ports:** 5075 (Web), 5070 (API)
**Purpose:** AI-powered form generation and conversations

**Features:**
- AI chat interface
- Form generation from conversation
- Conversation history
- Thread management
- Streaming responses
- Message persistence

**API Endpoints:**
- `POST /api/conversations` - Create conversation
- `GET /api/conversations` - List conversations
- `POST /api/messages` - Send message
- `GET /api/messages/:conversationId` - Get messages

**AI Integration:**
- OpenAI GPT-4 API
- Streaming responses
- Context-aware form generation

#### 7. FengShui (Wellness App)
**Tech:** Next.js 15 (Web only)
**URL:** https://fengshui.ezstart.xyz
**Port:** 5065
**Purpose:** Feng Shui analysis and recommendations

**Features:**
- Room analysis
- Element balancing
- Color recommendations
- Layout suggestions

#### 8. ASC-TCD (Association Website)
**Tech:** Next.js 15 (Web only)
**URL:** https://asc-tcd.ezstart.xyz
**Port:** 5055
**Purpose:** Educational association website

**Features:**
- Course catalog
- Event calendar
- Member portal
- News & updates

---

## Development Workflow

### Quick Start

```bash
# Install dependencies
pnpm install

# Mode Optimisé (RECOMMENDED)
pnpm dev:types  # Terminal 1: TypeScript build watch
pnpm dev        # Terminal 2: All servers

# Mode Ciblé
pnpm dev:ez     # EZStart + Monitoring + APIs
pnpm dev:bill   # EZBill + EZAuth
pnpm dev:td     # Tower Defense + EZAuth
pnpm dev:gp     # GreenPulse + EZAuth

# Type checking
pnpm typecheck

# Testing
pnpm test                          # All tests
pnpm --filter api-ezauth test     # Single API
pnpm test -- --coverage           # With coverage
```

### Port Allocation

| Service           | Type | Port | URL                   |
| ----------------- | ---- | ---- | --------------------- |
| **EZStart**       | API  | 5000 | http://localhost:5000 |
| **EZAuth**        | API  | 5010 | http://localhost:5010 |
| **EZBill**        | API  | 5020 | http://localhost:5020 |
| **Tower Defense** | API  | 5030 | http://localhost:5030 |
| **EZPay**         | API  | 5040 | http://localhost:5040 |
| **GreenPulse**    | API  | 5070 | http://localhost:5070 |
| **EZStart**       | Web  | 5005 | http://localhost:5005 |
| **EZAuth**        | Web  | 5015 | http://localhost:5015 |
| **EZBill**        | Web  | 5025 | http://localhost:5025 |
| **Tower Defense** | Web  | 5035 | http://localhost:5035 |
| **EZPay**         | Web  | 5045 | http://localhost:5045 |
| **ASC-TCD**       | Web  | 5055 | http://localhost:5055 |
| **FengShui**      | Web  | 5065 | http://localhost:5065 |
| **GreenPulse**    | Web  | 5075 | http://localhost:5075 |

### Code Generation Commands

```bash
# Add new package
pnpm create:package @ezstart/new-package

# Add new app
pnpm create:app my-app

# Build all packages
pnpm build

# Build specific package
pnpm --filter @ezstart/ui build
```

### Git Workflow

**Commit Rules:**
✅ **DO:**
- Commit after significant changes
- Document changes clearly
- Update relevant READMEs
- Update CLAUDE.md if new patterns

❌ **DON'T:**
- Add "Generated with Claude Code" footers
- Commit secrets or .env files
- Create commits with failing tests

**Structure:**
```
type: brief description

- Detailed changes list
- Technical modifications
- Impact/results
```

---

## Testing Strategy

### Test Coverage

**Total:** 337 tests across 6 APIs
**Coverage:** 70-85% average
**Status:** 82/100 🎯 TARGET EXCEEDED

### Test Breakdown

| Package/App         | Tests | Coverage | Status |
| ------------------- | ----- | -------- | ------ |
| express-core        | 15    | 100%     | ✅     |
| api-ezauth          | 103   | 85%      | ✅     |
| api-ezpay           | 48    | 80%      | ✅     |
| api-ezbill          | 82    | 75%      | ✅     |
| api-tower-defense   | 49    | 70%      | ✅     |
| api-green-pulse     | 40    | 70%      | ✅     |

### Test Types

**Unit Tests:**
```typescript
import { describe, it, expect } from 'vitest'

describe('parseApiError', () => {
  it('should extract error message from nested object', () => {
    const result = parseApiError({ error: { message: 'Not found' } })
    expect(result).toBe('Not found')
  })
})
```

**Integration Tests:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../index.js'

describe('POST /api/auth/register', () => {
  it('should register new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' })

    expect(res.status).toBe(201)
    expect(res.body.user).toBeDefined()
  })
})
```

**Database Protection:**
All APIs use `createVitestConfig({ dbName })` for triple protection:
1. ✅ `NODE_ENV=test` forced
2. ✅ `MONGO_URL` fallback to localhost (never production)
3. ✅ `.env.test` loaded automatically

---

## Deployment Infrastructure

### Oracle Cloud Free Tier (ALL APIs)

**Platform:** Oracle Cloud Infrastructure (OCI)
**Cost:** $0/month (Free Tier - LIFETIME)
**Resources:** 1x VM ARM (4 cores, 24GB RAM, 200GB storage)

**Deployed APIs:**
1. EZAuth API - https://api.ezauth.ezstart.xyz
2. EZPay API - https://api.ezpay.ezstart.xyz
3. EZBill API - https://api.ezbill.ezstart.xyz
4. Tower Defense API - https://api.tower-defense.ezstart.xyz
5. GreenPulse API - https://api.greenpulse.ezstart.xyz
6. EZStart API - https://api.ezstart.xyz

**Infrastructure:**
- Docker Compose orchestration
- Nginx reverse proxy + SSL (Let's Encrypt)
- MongoDB on same VM
- Automated deployment via SSH

**Configuration:**
```yaml
# docker-compose.yml
services:
  ezauth-api:
    build: ./apps/ezauth/api
    environment:
      MONGO_URL: mongodb://mongo:27017/ezauth
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "5010:5010"
```

### Vercel (ALL Web Apps)

**Platform:** Vercel
**Cost:** $0/month (Hobby plan)

**Deployed Apps:**
1. EZStart - https://www.ezstart.xyz
2. EZAuth - https://ezauth.ezstart.xyz
3. EZBill - https://ezbill.ezstart.xyz
4. EZPay - https://ezpay.ezstart.xyz
5. Tower Defense - https://tower-defense.ezstart.xyz
6. FengShui - https://fengshui.ezstart.xyz
7. ASC-TCD - https://asc-tcd.ezstart.xyz
8. GreenPulse - https://greenpulse.ezstart.xyz

**Features:**
- Automatic deployments from Git
- Edge network (CDN)
- Custom domains
- SSL certificates
- Preview deployments

### Deployment Workflow

```bash
# Deploy APIs (Oracle Cloud)
./scripts/oracle-deploy.sh

# Deploy Web Apps (Vercel)
git push origin main  # Auto-deploys via Vercel webhook

# Manual deploy
vercel --prod
```

---

## Security & Authentication

### Authentication Flow

**Pattern:** JWT + httpOnly cookies

```
1. User login → EZAuth API
2. EZAuth generates JWT + sets httpOnly cookie
3. Cookie sent with all requests automatically
4. APIs verify JWT via @ezstart/auth-sdk
5. Automatic token refresh on expiry
```

### Security Measures

**Rate Limiting:**
- 100 requests/15min per IP (general protection)
- Strict limiters available: 5 req/min, 3 req/hour
- Automatic /api/health exclusion
- Standard RateLimit-* headers

**CORS Protection:**
```typescript
// Centralized whitelist in @ezstart/config
export const CORS_OPTIONS = {
  origin: [
    'http://localhost:5005',
    'https://www.ezstart.xyz',
    'https://ezauth.ezstart.xyz',
    // ... all allowed origins
  ],
  credentials: true,
}
```

**Environment Variables:**
```env
# .env.local (gitignored)
JWT_SECRET=your-secret-key
MONGO_URL=mongodb://localhost:27017/ezauth
STRIPE_SECRET_KEY=sk_test_...

# .env.example (committed, no secrets)
JWT_SECRET=your-secret-key-here
MONGO_URL=mongodb://localhost:27017/ezauth
```

**Secrets Management:**
- All secrets in `.env.local` (gitignored)
- `.env.example` templates (committed)
- Production secrets in platform (Vercel/Oracle)
- Never commit real secrets

---

## Monitoring & Observability

### Health Checks

**Endpoint:** `/api/health` (all 6 APIs)

```json
{
  "status": "healthy",
  "service": "EZAuth",
  "uptime": 3600,
  "timestamp": "2025-11-05T10:30:00Z"
}
```

**Monitoring Dashboard:** https://www.ezstart.xyz/monitoring

**Metrics:**
- Service health (14 services)
- Uptime percentage
- Response times
- Error rates
- Database connections

### Logging

**Library:** Pino (via `@ezstart/logger`)

**Development:**
```
[21:15:30] INFO: 🚀 Server started
    service: "EZAuth"
    url: "http://localhost:5010"
    port: 5010
```

**Production:**
```json
{"level":"info","time":1634567890,"service":"EZAuth","msg":"🚀 Server started"}
```

**Best Practices:**
```typescript
// ✅ GOOD - Structured logging
logger.info({ userId, action: 'checkout', amount: 99.99 }, 'Payment initiated')

// ❌ BAD - String concatenation
console.log('Payment initiated for user: ' + userId)
```

### Error Tracking

**Frontend:**
- `parseApiError()` extracts API errors
- `runWithFeedback()` displays errors as toasts
- React Error Boundaries

**Backend:**
- Structured error responses
- Stack traces in development
- Error codes for client handling

---

## Performance Metrics

### Bundle Sizes

**Target:** <200KB initial bundle per app

**Optimizations:**
- Source maps disabled in production (-40-80MB)
- Dynamic imports for heavy components
- Tree-shaking enabled
- Code splitting by route

**Analysis:**
```bash
ANALYZE=true pnpm build  # Bundle analyzer report
```

### API Response Times

**Target:** <200ms average

**Current:**
- Health checks: ~50ms
- CRUD operations: 100-150ms
- Complex queries: 150-300ms

**Optimizations:**
- MongoDB indexing
- React Query caching
- Rate limiting reduces load

### Core Web Vitals

**Targets:**
- LCP (Largest Contentful Paint): <2.5s
- FID (First Input Delay): <100ms
- CLS (Cumulative Layout Shift): <0.1

**Achieved:**
- LCP: 1.2-1.8s ✅
- FID: 50-80ms ✅
- CLS: 0.05-0.08 ✅

---

## Tech Stack

### Frontend

**Framework:** Next.js 15.1
**React:** 19.0
**Language:** TypeScript 5.7
**Styling:** Tailwind CSS 4.0
**State Management:** Zustand, React Query
**Forms:** React Hook Form + Zod
**UI Components:** Radix UI + Custom (@ezstart/ui)
**Icons:** Lucide React
**i18n:** next-intl

### Backend

**Runtime:** Node.js 20+
**Framework:** Express.js 5.0
**Language:** TypeScript 5.7
**Database:** MongoDB 8.0
**ORM:** Mongoose 8.8
**Validation:** Zod
**Auth:** JWT (jsonwebtoken)
**Logging:** Pino
**Testing:** Vitest + Supertest

### DevOps

**Monorepo:** pnpm Workspaces
**Package Manager:** pnpm 9+
**Build Tool:** Turbo (Next.js) + tsup (packages)
**Linting:** ESLint 9
**Formatting:** Prettier
**Testing:** Vitest (backend) + Playwright (E2E)
**CI/CD:** GitHub Actions (planned)
**Deployment:** Vercel (web) + Oracle Cloud (APIs)
**Containerization:** Docker + Docker Compose
**Reverse Proxy:** Nginx
**SSL:** Let's Encrypt

### External Services

**Payments:** Stripe API
**AI:** OpenAI GPT-4
**Email:** (planned)
**Analytics:** (planned)

---

## Key Metrics Summary

**Overall Score:** 95/100 ⭐⭐⭐⭐⭐ EXCELLENT

**Category Scores:**
- Architecture: 95/100 ✅
- Web Apps: 95/100 ✅
- API: 100/100 ✅ PERFECT
- Code Quality: 92/100 ✅
- Accessibility: 92/100 ✅
- Documentation: 90/100 ✅
- Dependencies: 88/100 ✅
- Security: 85/100 ✅
- Performance: 82/100 ✅
- Testing: 82/100 ✅
- Infrastructure: 82/100 ✅
- UX: 80/100 ✅
- Monitoring: 80/100 ✅

**Test Coverage:**
- Total tests: 337
- Average coverage: 70-85%
- All APIs: ✅ Passing

**Production Readiness:**
- All APIs: ✅ Deployed
- All Web Apps: ✅ Deployed
- Custom domains: ✅ Configured
- SSL certificates: ✅ Active
- Rate limiting: ✅ Implemented
- Database backups: ✅ Configured

---

## Quick Links

**Documentation:**
- [Start Here](../00-START-HERE.md) - Navigation guide
- [CLAUDE.md](../../CLAUDE.md) - Development rules
- [ROADMAP.md](./ROADMAP.md) - Phase 3 roadmap
- [TESTING.md](../guides/TESTING.md) - Testing strategy
- [DEPLOY.md](../../DEPLOY.md) - Deployment guide

**Audits:**
- [All Audits](../audits/) - 16 detailed audits
- [Audit Dashboard](../README.md) - Scores & status

**Packages:**
- [UI Components](../../packages/ui/README.md)
- [Auth SDK](../../packages/auth-sdk/README.md)
- [Express Core](../../packages/express-core/README.md)
- [Fetch Client](../../packages/fetch-client/README.md)

---

**Last Updated:** 2025-11-05
**Monorepo Version:** 1.0.0
**License:** MIT
