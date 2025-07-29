# 🧩 EzIcon `<Icon />` – Dynamic Icon Component for React

A polymorphic, lazy-loaded icon component that supports multiple icon libraries (`lucide-react`, `react-icons/fa`, and your own `custom-icons`).  
Built for performance, flexibility, and clean DX.

---

## ✨ Features

✅ Supports multiple libraries (`lucide`, `fa`, `custom`)  
🎯 Tree-shaking friendly via `React.lazy()` + `Suspense`  
🔁 `spin` and `rotate` props for animations  
🔠 `size`, `style`, and `className` passthrough  
⚠️ Typed with `KnownIconName` for intellisense & safety  
🧩 Fully composable and extensible with custom icons

---

## 📦 Installation

```bash
pnpm add lucide-react react-icons
```

## 🚀 Usage

```tsx
'use client';

import { Icon } from '@/components/icon';

<Icon name="lucide:Search" size={24} />
<Icon name="fa:FaGithub" size={32} className="text-gray-500" />
<Icon name="custom:myLogo" rotate={90} />
<Icon name="lucide:Loader" spin />

```

✅ Automatically lazy-loads only the icon requested

## 🔠 Icon Naming Convention

```ts
// Format: `${prefix}:${iconName}`

name = 'lucide:Search'; // From lucide-react
name = 'fa:FaGithub'; // From react-icons/fa
name = 'custom:myLogo'; // From your custom-icon map
```

## 🛠 Props

```ts
interface IconProps extends LucideProps {
  name: KnownIconName; // e.g. 'lucide:Search', 'fa:FaBeer', 'custom:logo'
  spin?: boolean; // Adds Tailwind class "animate-spin"
  rotate?: number; // Rotation in degrees
}
```

All other props are passed to the underlying SVG icon.

## 🔧 Custom Icons

You can extend with your own icons via a custom-iconMap:

```ts
// src/components/custom-icons/index.ts
export const customIconMap = {
  myLogo: () => <svg>...</svg>,
};

```

Then they can be used with:

```tsx
<Icon name='custom:myLogo' />
```

## 🧠 Internal Logic

- Icons are lazy-loaded with React.lazy to keep bundle size low.
- The prefix determines which package to import:
  - lucide → lucide-react
  - fa → react-icons/fa
  - custom → ../custom-icons/

## 🪪 License

MIT © DFranck
Part of the @ezstart ecosystem
