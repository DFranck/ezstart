# EzTag – Semantic & Styled React Tag System

**EzTag** is a polymorphic, typed, and variant-powered React component library for HTML tags.  
It provides semantic markup, Tailwind-based styling via `cva()`, and DX-friendly aliases like `<H1 />`, `<Section />`, `<Button />`.

Designed to be accessible, maintainable, and scalable — EzTag powers all layout, heading, and interactive elements in your UI.

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
pnpm add @ezstart/ez-tag
```

Or using npm / yarn

```bash
npm install @ezstart/ez-tag
# or
yarn add @ezstart/ez-tag
```

### Tailwind & Peer Dependencies

Make sure your project includes:

```yaml
- Tailwind CSS
- class-variance-authority
- clsx (optional, recommended)
- tailwind-merge (used internally)
```

EzTag assumes your Tailwind setup is already configured (tailwind.config.js)

## Usage

### Basic Usage with `EzTag`

```tsx
import { EzTag } from '@ezstart/ez-tag';

<EzTag as='section' size='lg'>
  <EzTag as='h1' variant='default'>
    Hello World
  </EzTag>
  <EzTag as='p'>This is a paragraph inside a styled section</EzTag>
</EzTag>;
```

### With Semantic Aliases

```tsx
import { Section, H1, H3, Button } from '@ezstart/ez-tag';

<Section size='lg'>
  <H1>Welcome to EzStart</H1>
  <H3>Your React foundation, simplified.</H3>
  <Button variant='primary'>Get Started</Button>
</Section>;
```

### With asChild (Radix Slot support)

```tsx
import { Button } from '@ezstart/ez-tag';
import { Link } from 'react-router-dom';

<Button asChild>
  <Link to='/docs'>Go to docs</Link>
</Button>;
```

EzTag automatically applies the correct styles, responsive layout, and variants based on the tag you use — while keeping the DOM clean and semantic.

## License

MIT © [DFranck](https://github.com/DFranck)
