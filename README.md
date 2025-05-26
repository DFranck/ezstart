# 🧱 ezstart-monorepo

This monorepo contains a full-stack app using:

## 🧩 Packages Overview

- [`apps/ezstart/web`](./apps/ezstart/web/README.md) — EzStart Next.js frontend
- [`apps/api`](./apps/api/README.md) — EzStart Express backend
- [`packages/ui`](./packages/ui/README.md) — shared UI library with Tailwind support
- [`packages/libs/ez-tag`](./packages/libs/ez-tag/README.md) — polymorphic semantic tag system powered by Tailwind
- [`packages/libs/ez-icon`](./packages/libs/ez-icon/README.md) — SVG icon library (WIP)
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
├── apps/                     # Toutes tes apps déployables (web, api, workers...)
│   ├── web/                  # Next.js (ou autre frontend)
│   ├── admin/                # (optionnel) Backoffice
│   ├── api/                  # Express/Fastify/Nest (backend(s) REST/GraphQL)
│   └── worker/               # Cron jobs, queue handlers...
│
├── packages/                 # Ce qui est réutilisable, publishable, versionnable
│   ├── ui/                   # Ton design system (centralisé, tout ici)
│   │   ├── components/       # Tous les composants UI (atomic, form, overlay, layout, etc.)
│   │   ├── hooks/            # Hooks réutilisables
│   │   ├── lib/              # Fonctions utilitaires (cn, merge, math, date, etc.)
│   │   ├── templates/        # Templates d’email, PDF, exports (facultatif)
│   │   ├── styles/           # globals.css, tokens, config Tailwind, etc.
│   │   ├── icons/            # SVGs, générateurs d’icônes, etc.
│   │   ├── variants/         # Variant maps, cva config, etc.
│   │   ├── types/            # Types internes à ui (jamais any, tout commenté)
│   │   └── index.ts          # Barrel principal (`export * from ...`)
│   ├── types/                # Types globaux cross-app (DTO, entités métiers, etc.)
│   ├── eslint-config/        # (Optionnel) Config partagée
│   └── typescript-config/    # (Optionnel) tsconfig partagé
│
├── docs/                     # Documentation technique, guides, storybook, etc.
├── .github/                  # Actions, workflows, templates issues/PR
├── turbo.json                # Turborepo config
├── pnpm-workspace.yaml       # PNPM workspaces
├── package.json              # Racine (scripts, toolings, dev-deps)
├── tsconfig.json             # Racine, “paths” vers les packages
├── README.md                 # Documentation générale
└── ...                       # Autres fichiers de config, CI, etc.

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
