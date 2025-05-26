# Tag – Semantic & Styled React Tag System

**Tag** is a polymorphic, typed, and variant-powered React component library for HTML tags.  
It provides semantic markup, Tailwind-based styling via `cva()`, and DX-friendly aliases like `<H1 />`, `<Section />`, `<Button />`.

Designed to be accessible, maintainable, and scalable — Tag powers all layout, heading, and interactive elements in your UI.

> Built with ❤️ by [@ezstart](https://github.com/DFranck/ez-start)

## Features

- ✅ **Polymorphic**: Use any HTML tag via `as="..."` or prebuilt alias (`<H1>`, `<Section>`, etc.)
- 🎨 **Variants via `cva()`**: Define layout, typography, size, spacing variants per tag
- 📦 **Alias components**: Import ready-made aliases (`<Main>`, `<Button>`, etc.) for cleaner JSX
- 🧠 **Typed variants**: TypeScript infers valid props per tag (e.g. `size` only for `<Section>`)
- ♿️ **Semantic HTML output**: Keeps native tags for better accessibility and SEO
- 🧩 **Composable**: Easy to extend with your own tags, variants, and aliases
- 🛠 **Utility-friendly**: Fully compatible with `clsx`, `tailwind-merge`, `radix-slot`
- 🧪 **Safe by default**: Warnings for unsupported tags or missing variants

## Installation

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

### Tailwind & Peer Dependencies

[![](https://img.shields.io/badge/Download%20EzStart%20globals.css-blue)](https://raw.githubusercontent.com/DFranck/ezstart/master/packages/ui/styles/globals.css)

⚠️ **Important:** You must import the EzStart global CSS for styles to work as intended.  
[How to set up global CSS](../../ui/docs/usage-global-css.md)

Make sure your project includes:

```yaml
- Tailwind CSS
- class-variance-authority
- clsx (optional, recommended)
- tailwind-merge (used internally)
```

Tag assumes your Tailwind setup is already configured (tailwind.config.js)

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
import { Section, H1, H3, Button } from '@ezstart/ui/components';

<Section size='lg'>
  <H1>Welcome to EzStart</H1>
  <H3>Your React foundation, simplified.</H3>
  <Button variant='primary'>Get Started</Button>
</Section>;
```

### With asChild (Radix Slot support)

```tsx
import { Button } from '@ezstart/ui/components';
import { Link } from 'react-router-dom';

<Button asChild>
  <Link to='/docs'>Go to docs</Link>
</Button>;
```

Tag automatically applies the correct styles, responsive layout, and variants based on the tag you use — while keeping the DOM clean and semantic.

## License

MIT © [DFranck](https://github.com/DFranck)
