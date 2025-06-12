# 🧩 EzTag `<Tag />` – Semantic & Styled React Tag System

**Tag** is a polymorphic, typed, and variant-friendly React component system for HTML tags.

It provides semantic markup, Tailwind-based styling via `cva()`, and developer-friendly JSX aliases like `<H1 />`, `<Section />`, and `<Main />` — all designed for clean, accessible, and scalable UI.

---

## ✨ Features

- ✅ **Polymorphic**: Use any tag via `as="..."` or JSX alias
- 🎨 **Variants**: Tailwind-powered styles with `cva()`
- 📦 **JSX Aliases**: `<H1 />`, `<Section />`, `<UL />`, etc.
- 🧠 **Typed Props**: Per-tag variants and props inference
- ♿️ **Accessible & Semantic**: Outputs clean native HTML
- 🧩 **Composable**: Extend with your own variants/tags
- 🛠 **DX-friendly**: Compatible with `clsx`, `tailwind-merge`, `asChild`

---

## 📦 Installation

### With `pnpm`

```bash
pnpm add @ezstart/ui
```

Or using npm / yarn

```bash
npm install @ezstart/ui
# or
yarn add @ezstart/ui
```

## ⚙️ Peer Dependencies

[![](https://img.shields.io/badge/Download%20EzStart%20globals.css-blue)](https://raw.githubusercontent.com/DFranck/ezstart/master/packages/ui/styles/globals.css)

⚠️ **Important**  
You must import EzStart's global CSS for styles and Tailwind config.

Make sure your project has:

```bash
- pnpm add -D tailwindcss class-variance-authority tailwind-merge
```

Tag does not include Tailwind or config — you must use your own tailwind.config.js and include the globals.css file.

## Usage

### Basic Usage with `Tag`

```tsx
import { Tag } from '@ezstart/ui/components';

<Tag as='section' size='lg'>
  <Tag as='h1' variant='default'>
    Hello World
  </Tag>
  <Tag as='p'>This is a paragraph inside a styled section</Tag>
</Tag>;
```

### With Semantic Aliases

```tsx
import { H1, H3, Section, P, Ul, Li } from '@ezstart/ui/components';

<Section>
  <H1>Welcome</H1>
  <H3>A lightweight, flexible system</H3>
  <UL>
    <Li>Polymorphic</LI>
    <Li>Composable</LI>
  </UL>
</Section>;
```

Tag automatically applies the correct styles, responsive layout, and variants based on the tag you use — while keeping the DOM clean and semantic.

## License

MIT © [DFranck](https://github.com/DFranck)/ @ezstart
