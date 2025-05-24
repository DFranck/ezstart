# 🧱 ezstart-monorepo

This monorepo contains a full-stack app using:

## 🧩 Packages Overview

- [`apps/web`](./apps/web/README.md) — EzStart Next.js frontend
- [`apps/api`](./apps/api/README.md) — EzStart Express backend
- [`packages/ui`](./packages/ui/README.md) — shared UI library with Tailwind support
- [`packages/libs/ez-tag`](./packages/libs/ez-tag/README.md) — polymorphic semantic tag system powered by Tailwind
- [`packages/libs/ez-icon`](./packages/libs/ez-icon/README.md) — SVG icon library (WIP)
- [`packages/libs/ez-billing`](./packages/libs/ez-billing/README.md) — Billing & quotes logic (WIP)
- [`packages/types`](./packages/types/README.md) — shared types

Managed with [`pnpm`](https://pnpm.io/) workspaces.

## 📦 Quick Start

```bash
pnpm install
pnpm run dev
```

## 🗂️ Project Layout

```bash
/
├── apps/                     # Application entry points (deployable)
│   ├── api/                  # Backend/API (can be split by service/domain)
│   └── web/                  # Frontend(s) (can be split by app/tenant/etc.)
│
├── packages/                 # All reusable packages and configurations
│   ├── libs/                 # Business logic & feature libraries
│   │   ├── ez-billing/       # Billing/core business library
│   │   ├── ez-icon/          # Icons library
│   │   └── ez-tag/           # HTML/SEO tags and helpers
│   │
│   ├── ui/                   # Shared design system & UI components
│   │
│   ├── types/                # Global TypeScript types/interfaces
│   ├── templates/            # Email, markdown, or code templates
│   ├── eslint-config/        # Shared ESLint configurations
│   └── typescript-config/    # Shared TypeScript configs
│
├── .turbo/                   # Turborepo state/cache
├── node_modules/
├── .eslintrc.js
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
├── turbo.json
└── README.md
```

## 📁 File and Naming Conventions

> **Consistency is key!**
> This project follows strict naming conventions to ensure reliability across all environments (Linux, macOS, Windows), readability for all contributors, and seamless scalability.

### 📦 **Folders and Files**

- **Always use `kebab-case` for file and folder names.**

  - Lowercase only, use hyphens (`-`) to separate words.
  - ✅ `modal.tsx`
  - ✅ `dropdown-menu.tsx`
  - ✅ `components/`
  - ✅ `hooks/`
  - ❌ `Modal.tsx` (avoid PascalCase for files)
  - ❌ `dropdownMenu.tsx` (avoid camelCase for files)

- **Each React component lives in its own file.**
  - The file should be named after the component in kebab-case.

### ⚛️ **Component and Export Naming**

- **Export your React components in `PascalCase`.**
  - ```tsx
    // modal.tsx
    export function Modal() { ... }
    ```
- **Variables and utility functions use `camelCase`.**
  - ```ts
    // utils.ts
    export function formatPrice() { ... }
    ```

### 🚫 **Why Not PascalCase for Files?**

- Avoids case-sensitivity bugs on Linux servers or in CI/CD.
- Aligns with industry standards: Next.js, Vercel, Shopify, shadcn/ui, Astro, etc.

### 🧑‍💻 **Sample Structure**

```bash
packages/
└── ui/
    └── src/
        ├── components/
        │   ├── modal.tsx
        │   ├── dropdown-menu.tsx
        │   └── index.ts
        ├── hooks/
        │   └── use-toggle.ts
        ├── icons/
        │   └── ezstart-logo.tsx
        └── lib/
            └── utils.ts
```
