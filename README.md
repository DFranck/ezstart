# 🧱 ezstart-monorepo

This monorepo contains a full-stack app using:

- [shadcn/ui](https://ui.shadcn.dev/) for shared UI components
- [`apps/web`](./apps/web/README.md) — Next.js frontend
- [`apps/api`](./apps/api/README.md) — Express backend
- [`packages/ui`](./packages/ui) — shared UI library with Tailwind support
- [`packages/ez-tag`](./packages/libs/ez-tag/README.md) — polymorphic semantic tag system powered by Tailwind

Managed with [`pnpm`](https://pnpm.io/) workspaces.

---

## 📦 Quick Start

```bash
pnpm install
pnpm dev:all
```

## 🗂️ Structure

```bash
.
├── apps/
│ ├── web/ → Next.js app (frontend)
│ └── api/ → Express app (backend)
├── packages/
│ └── ui/ → Shared UI components (Tailwind) // lot are switched out for ez-tag
│ └── ez-tag/    → Reusable, variant-driven HTML tags (EzTag, H1, Section, etc.)
└── pnpm-workspace.yaml

```
