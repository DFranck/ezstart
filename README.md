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

### Monorepo Configuration

This monorepo uses **pnpm workspaces** with a centralized architecture to maximize reusability and maintain consistency across all projects.

### 🌐 Web Applications - 100% Centralized Configuration

All Next.js web applications use the same standardized configuration:

| Configuration | Package/Source | Description |
|---------------|----------------|-------------|
| **React Providers** | [`@ezstart/web-core`](./packages/web-core/README.md) | SimpleWebProviders + WebProviders with EZAuth, Theming, i18n |
| **UI Components** | [`@ezstart/ui`](./packages/ui/README.md) | UI components, global styles, PostCSS config |
| **Tailwind Config** | [`@workspace/tailwind-config`](./workspaces/tailwind-config/) | Centralized Tailwind configuration |
| **ESLint Config** | [`@workspace/eslint-config`](./workspaces/eslint-config/) | ESLint rules for Next.js |
| **Next.js Config** | [`@workspace/next-config`](./workspaces/next-config/) | Next.js configuration with optimizations |
| **TypeScript Config** | [`@workspace/typescript-config`](./workspaces/typescript-config/) | Shared TypeScript configurations |

#### Standardized Applications

- ✅ [`ezauth/web`](./apps/ezauth/web/) - Authentication service (port 8080)
- ✅ [`ez-billing/web`](./apps/ez-billing/web/) - Billing management (port 4100)
- ✅ [`ezstart/web`](./apps/ezstart/web/) - Main application (port 4000)
- ✅ [`fengshui/web`](./apps/fengshui/web/) - Feng Shui application (port 4400)
- ✅ [`tower-defense/web`](./apps/tower-defense/web/) - Tower Defense game (port 4200)
- ❌ [`asc-tcd/web`](./apps/asc-tcd/web/) - Not standardized (port 4300, specific config)

### 🔧 APIs - Centralized Configuration

All Node.js APIs use shared infrastructure:

| Configuration | Package/Source | Description |
|---------------|----------------|-------------|
| **Base Infrastructure** | [`@ezstart/api-core`](./packages/api-core/) | Shared API infrastructure (Express, middleware, etc.) |
| **TypeScript Config** | [`@workspace/typescript-config/api.json`](./workspaces/typescript-config/) | TypeScript configuration for APIs |
| **Standardized Structure** | Convention | `outDir: "dist"`, `rootDir: "."`, identical includes/excludes |
| **Common Types** | [`@ezstart/types`](./packages/types/) | Shared types between web and API |

#### Available APIs

- [`ezauth/api`](./apps/ezauth/api/) - Centralized authentication service (port 8001)
- [`ez-billing/api`](./apps/ez-billing/api/) - Billing API (port 4101)
- [`ezstart/api`](./apps/ezstart/api/) - Main API service (port 8888)
- [`tower-defense/api`](./apps/tower-defense/api/) - Tower Defense API (port 3101)

### 📦 Centralized Packages

#### Web Infrastructure
- [`@ezstart/web-core`](./packages/web-core/) - Standardized providers, React infrastructure
- [`@ezstart/ui`](./packages/ui/) - UI components, global styles, CSS configurations

#### API Infrastructure  
- [`@ezstart/api-core`](./packages/api-core/) - Express infrastructure, shared middleware
- [`@ezstart/auth-sdk`](./packages/auth-sdk/) - EZAuth client SDK with React hooks

#### Shared Utilities
- [`@ezstart/types`](./packages/types/) - Common TypeScript types
- [`@ezstart/utils`](./packages/utils/) - Shared utilities
- [`@ezstart/config`](./packages/config/) - Common configurations

#### Configuration Workspaces
- [`@workspace/tailwind-config`](./workspaces/tailwind-config/) - Tailwind configurations
- [`@workspace/eslint-config`](./workspaces/eslint-config/) - ESLint rules  
- [`@workspace/typescript-config`](./workspaces/typescript-config/) - TypeScript configs
- [`@workspace/next-config`](./workspaces/next-config/) - Next.js configuration

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

# Global TypeCheck
pnpm typecheck

# Global Lint
pnpm lint
```

### ⚡ Automatic Propagation

✨ **Any change** in centralized packages propagates **automatically** to all projects. Single source of truth for the entire monorepo!

### 📚 Documentation

- [Web-Core Configuration](./packages/web-core/README.md) - Web application standardization
- [UI Components](./packages/ui/README.md) - Design system and components
- [EZAuth SDK](./packages/auth-sdk/README.md) - Authentication integration
- [Claude Instructions](./CLAUDE.md) - Development guide and best practices