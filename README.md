<!-- AUTO:TITLE:START -->
# 📦 ezstart
<!-- AUTO:TITLE:END -->

<!-- AUTO:DESC:START -->
Mono repo for ezstart projects
<!-- AUTO:DESC:END -->

<!-- AUTO:GETTING_STARTED:START -->
```bash
# 1️⃣ Clone the public repo and move to this package if it's public
git clone https://github.com/DFranck/ezstart-public.git
cd 

# 2️⃣ Install dependencies
pnpm install

# 3️⃣ Run the package
pnpm dev
```
<!-- AUTO:GETTING_STARTED:END -->

<!-- AUTO:PROJECT_STRUCTURE:START -->
## 📂 Project Structure

👉 See the full structure here: [structure.md](./structure.md)
<!-- AUTO:PROJECT_STRUCTURE:END -->

## 🏗️ Architecture and Standardization

### ⚡ Quality Control Dashboard

| Metric | Status | Coverage | Description |
|--------|---------|----------|-------------|
| **TypeCheck** | ✅ | **18/18 packages** | Complete TypeScript verification |
| **Lint** | ✅ | **17/17 packages** | Complete ESLint verification (code packages only) |
| **Centralization** | ✅ | **100% apps/packages** | All configurations centralized |
| **Warning Suppression** | ✅ | **Optimized** | Annoying rules disabled, important ones kept |

### Monorepo Configuration

This monorepo uses **pnpm workspaces** with a centralized architecture to maximize reusability and maintain consistency across all projects.

### 🌐 Web Applications - 100% Centralized Configuration

All Next.js web applications use the **exact same** standardized configuration:

| Configuration | Package/Source | Description |
|---------------|----------------|-------------|
| **React Providers** | [`@ezstart/next-core`](./packages/next-core/README.md) | SimpleWebProviders + WebProviders with EZAuth, Theming, i18n |
| **UI Components** | [`@ezstart/ui`](./packages/ui/README.md) | UI components, global styles, PostCSS config |
| **Tailwind Config** | [`@ezstart/tailwind-config`](./packages/tailwind-config/) | Centralized Tailwind configuration |
| **ESLint Config** | [`@ezstart/eslint-config/next-js`](./packages/eslint-config/) | ESLint rules for Next.js |
| **Next.js Config** | [`@ezstart/next-config`](./packages/next-config/) | Next.js configuration with optimizations |
| **TypeScript Config** | [`@ezstart/typescript-config/nextjs.json`](./packages/typescript-config/) | Shared TypeScript configurations |

#### Standardized Applications (100% Centralized)

- ✅ [`ezauth/web`](./apps/ezauth/web/) - Authentication service (port 8080)
- ✅ [`ez-billing/web`](./apps/ez-billing/web/) - Billing management (port 4100)
- ✅ [`ezstart/web`](./apps/ezstart/web/) - Main application (port 4000)
- ✅ [`fengshui/web`](./apps/fengshui/web/) - Feng Shui application (port 4400)
- ✅ [`tower-defense/web`](./apps/tower-defense/web/) - Tower Defense game (port 4200)
- ✅ [`asc-tcd/web`](./apps/asc-tcd/web/) - ASC-TCD website (port 4300)

### 🔧 APIs - 100% Centralized Configuration

All Node.js APIs use the **exact same** shared infrastructure:

| Configuration | Package/Source | Description |
|---------------|----------------|-------------|
| **ESLint Config** | [`@ezstart/eslint-config/base`](./packages/eslint-config/) | ESLint rules for APIs |
| **TypeScript Config** | [`@ezstart/typescript-config/api.json`](./packages/typescript-config/) | TypeScript configuration for APIs |
| **Base Infrastructure** | [`@ezstart/express-core`](./packages/express-core/) | Shared API infrastructure (Express, middleware, etc.) |
| **Common Types** | [`@ezstart/types`](./packages/types/) | Shared types between web and API |

#### Available APIs

- [`ezauth/api`](./apps/ezauth/api/) - Centralized authentication service (port 8001)
- [`ez-billing/api`](./apps/ez-billing/api/) - Billing API (port 4101)
- [`ezstart/api`](./apps/ezstart/api/) - Main API service (port 8888)
- [`tower-defense/api`](./apps/tower-defense/api/) - Tower Defense API (port 3101)

### 📦 Centralized Packages

#### Web Infrastructure
- [`@ezstart/next-core`](./packages/next-core/) - Standardized providers, React infrastructure
- [`@ezstart/ui`](./packages/ui/) - UI components, global styles, CSS configurations

#### API Infrastructure  
- [`@ezstart/express-core`](./packages/express-core/) - Express infrastructure, shared middleware
- [`@ezstart/auth-sdk`](./packages/auth-sdk/) - EZAuth client SDK with React hooks

#### Shared Utilities
- [`@ezstart/types`](./packages/types/) - Common TypeScript types

#### Configuration Packages (100% Centralized)
- [`@ezstart/tailwind-config`](./packages/tailwind-config/) - Tailwind configurations
- [`@ezstart/eslint-config`](./packages/eslint-config/) - ESLint rules with 3 variants:
  - `base.js` - Base configuration (APIs, packages)
  - `next-js.js` - Next.js configuration (web apps)  
  - `react-internal.js` - React configuration (internal packages)
- [`@ezstart/typescript-config`](./packages/typescript-config/) - TypeScript configs with 6 variants:
  - `base.json` - Base configuration
  - `api.json` - API configuration
  - `nextjs.json` - Next.js configuration
  - `library.json` - Library configuration
  - `react-library.json` - React library configuration
  - `types.json` - Types configuration
- [`@ezstart/next-config`](./packages/next-config/) - Next.js configuration

### 🔐 Authentication System - EZAuth

Centralized SSO architecture for all applications:

- **API Service** : [`ezauth/api`](./apps/ezauth/api/) (port 8001)
- **Web Interface** : [`ezauth/web`](./apps/ezauth/web/) (port 8080)  
- **Client SDK** : [`@ezstart/auth-sdk`](./packages/auth-sdk/)
- **OAuth2 Flow** : Authorization code → JWT (7 days)
- **Automatic SSO** : Token valid across all apps

### 🚀 Standardized Commands

#### Development
```bash
# Install all dependencies
pnpm install

# Start all apps in development mode
pnpm dev

# Start a specific app
pnpm --filter ez-billing-web dev
pnpm --filter ezauth-api dev
```

#### Production
```bash
# Build all apps
pnpm build

# Build a specific app  
pnpm --filter ez-billing-web build

# Global TypeCheck (18/18 packages)
pnpm typecheck

# Global Lint (17/17 packages)
pnpm lint
```

### ⚡ Automatic Propagation

✨ **Any change** in centralized packages propagates **automatically** to all projects. Single source of truth for the entire monorepo!

### 📚 Documentation

- [Web-Core Configuration](./packages/next-core/README.md) - Web application standardization
- [UI Components](./packages/ui/README.md) - Design system and components
- [EZAuth SDK](./packages/auth-sdk/README.md) - Authentication integration
- [Claude Instructions](./CLAUDE.md) - Development guide and best practices