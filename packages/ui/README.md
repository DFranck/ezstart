# 🧩 @ezstart/ui

**Design system & shared UI library for EzStart projects.**  
Reusable React components, icons, hooks, and helpers – styled with Tailwind CSS and optimized for Next.js.

---

## 📦 Quick Start

```bash
pnpm add @ezstart/ui
# or, in the monorepo
pnpm --filter=@ezstart/ui dev
```

## ⚠️ Required: Global Styles

[![](https://img.shields.io/badge/Download%20EzStart%20globals.css-blue)](https://raw.githubusercontent.com/DFranck/ez-start/main/packages/ui/styles/globals.css)

⚠️ **Important:** You must import the EzStart global CSS for styles to work as intended.  
[How to set up global CSS](../ui/docs/usage-global-css.md)

## 📁 Folder Structure

```plaintext
src/
├── components/
│   ├── accordion.tsx         # Accordion UI component
│   ├── dropdown-menu.tsx     # Dropdown menu UI component
│   ├── modal.tsx             # Modal dialog UI component
│   ├── select.tsx            # Select/dropdown UI component
│   ├── sonner.tsx            # Toast notification integration
│   └── index.ts              # Components barrel export (internal)
│
├── icons/
│   └── EzStartSvg.tsx        # Custom EzStart SVG logo/component
│
├── lib/
│   └── utils.ts              # Utility functions for UI (formatting, helpers, etc.)
│
├── styles/
│   └── globals.css           # Tailwind base and global styles for UI components
│   └── index.ts              # (Optional) Barrel export for styles

```

## 🚀 Usage

```tsx
import { Modal, Select, EzStartSvg } from '@ezstart/ui';
// Use as standard React components
```

## 🗃️ File Notes

- components/: All atomic or composite UI components (React, Tailwind, Radix UI).
- icons/: SVGs or Icon components (reusable in your apps).
- lib/: Utility functions purely for UI concerns (do not mix business logic!).
- styles/: Global or base CSS (can be imported by consumer apps for full theming).
- index.ts: Main entrypoint – re-exports all public components, icons, and helpers.

## 💡 Conventions

- All files & folders in kebab-case.
- Each component in its own file, exported in PascalCase.
- Utils and internal functions in camelCase.
- No business logic: keep this package pure UI/UX.

## ✨ Want to add a component?

- Add your .tsx file in /components/.
- Export it from /components/index.ts and /src/index.ts.
- Document usage/props in the component file.
- That’s it: it’s available everywhere in the monorepo!
