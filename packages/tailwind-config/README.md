# @ezstart/tailwind-config

Centralized Tailwind CSS configuration for all @ezstart web applications.

## Overview

`@ezstart/tailwind-config` provides a standardized Tailwind CSS configuration that ensures design consistency and optimal CSS generation across all web applications in the @ezstart monorepo.

## Installation

This package is automatically included in all @ezstart web applications via workspace dependencies:

```json
{
  "devDependencies": {
    "@ezstart/tailwind-config": "workspace:*"
  }
}
```

## Usage

### Standard Configuration

```js
// tailwind.config.js
import config from '@ezstart/tailwind-config'

export default config
```

### Base Configuration

```js
// tailwind.config.js
export { default } from '@ezstart/tailwind-config/base'
```

### Extended Configuration

```js
// tailwind.config.js
import baseConfig from '@ezstart/tailwind-config'

export default {
  ...baseConfig,
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme.extend,
      // Your custom extensions
      colors: {
        ...baseConfig.theme.extend.colors,
        brand: '#your-color'
      }
    }
  }
}
```

## Included Features

### 📱 Responsive Design

- **Mobile-First** - Mobile-first responsive design approach
- **Breakpoints** - Standardized breakpoint system
- **Container** - Responsive container utilities
- **Grid System** - CSS Grid and Flexbox utilities

### 🎨 Design System

- **Colors** - Semantic color palette with CSS variables
- **Typography** - Consistent font scales and line heights
- **Spacing** - Harmonized spacing scale
- **Shadows** - Elevation and shadow utilities

### 🎯 Content Detection

Automatic content detection for optimal CSS generation:

```js
content: [
  // Next.js app directory
  "./app/**/*.{js,ts,jsx,tsx,mdx}",
  // Next.js pages directory (legacy)
  "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  // Components directory
  "./components/**/*.{js,ts,jsx,tsx,mdx}",
  // Src directory (for apps using src folder)
  "./src/**/*.{js,ts,jsx,tsx,mdx}",
  // Packages UI components
  "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  // Include all workspace packages
  "../**/*.{js,ts,jsx,tsx,mdx}"
]
```

### ⚡ Performance Optimizations

- **CSS Purging** - Automatic unused CSS removal
- **JIT Mode** - Just-In-Time compilation
- **Minimal Bundle** - Only includes used utilities
- **Fast Builds** - Optimized build performance

## Design Tokens

### Color System

The configuration includes semantic colors that work with both light and dark themes:

```css
/* CSS Variables automatically generated */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 84% 4.9%;
  /* ... */
}
```

### Typography Scale

```js
fontSize: {
  xs: ['0.75rem', { lineHeight: '1rem' }],
  sm: ['0.875rem', { lineHeight: '1.25rem' }],
  base: ['1rem', { lineHeight: '1.5rem' }],
  lg: ['1.125rem', { lineHeight: '1.75rem' }],
  xl: ['1.25rem', { lineHeight: '1.75rem' }],
  '2xl': ['1.5rem', { lineHeight: '2rem' }],
  // ...
}
```

### Spacing Scale

```js
spacing: {
  px: '1px',
  0: '0px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  // ...
}
```

## Integration with @ezstart/ui

The configuration is optimized for use with `@ezstart/ui` components:

```js
// Automatic detection of UI package components
content: [
  // ...
  "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
]
```

This ensures that all UI component styles are included in the final CSS bundle.

## Applications Using This Config

All @ezstart web applications use this centralized configuration:

- ✅ **ezauth/web** - Authentication service
- ✅ **ez-billing/web** - Billing management  
- ✅ **ezstart/web** - Main application
- ✅ **fengshui/web** - Feng Shui application
- ✅ **tower-defense/web** - Tower Defense game
- ✅ **asc-tcd/web** - ASC-TCD website

## PostCSS Integration

Works seamlessly with the PostCSS configuration from `@ezstart/ui`:

```js
// postcss.config.mjs
export { default } from '@ezstart/ui/postcss.config'
```

## Migration from Custom Config

### Before (Custom Configuration)

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#blue',
        // Custom color system...
      }
    },
  },
  plugins: [
    // Custom plugins...
  ],
}
```

### After (Centralized Configuration)

```js
// tailwind.config.js
export { default } from '@ezstart/tailwind-config'

// Or with minimal customization
import baseConfig from '@ezstart/tailwind-config'

export default {
  ...baseConfig,
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme.extend,
      // Only app-specific overrides
    }
  }
}
```

## Custom Extensions

### Adding Brand Colors

```js
import baseConfig from '@ezstart/tailwind-config'

export default {
  ...baseConfig,
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme.extend,
      colors: {
        ...baseConfig.theme.extend.colors,
        brand: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        }
      }
    }
  }
}
```

### Adding Custom Fonts

```js
export default {
  ...baseConfig,
  theme: {
    ...baseConfig.theme,
    extend: {
      ...baseConfig.theme.extend,
      fontFamily: {
        ...baseConfig.theme.extend.fontFamily,
        custom: ['CustomFont', 'sans-serif']
      }
    }
  }
}
```

### Adding Custom Plugins

```js
export default {
  ...baseConfig,
  plugins: [
    ...baseConfig.plugins,
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio')
  ]
}
```

## CSS Variables Support

The configuration includes full CSS variables support for dynamic theming:

```css
/* Usage in CSS */
.my-component {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  border-color: hsl(var(--border));
}
```

```jsx
// Usage in components
<div className="bg-background text-foreground border-border">
  Content with theme-aware colors
</div>
```

## Development

### Package Structure

```
packages/tailwind-config/
├── src/
│   └── base.js          # Base Tailwind configuration
├── package.json
└── README.md
```

### Dependencies

This package provides peer dependencies for:

- `tailwindcss` - Tailwind CSS framework
- Common Tailwind plugins
- PostCSS configuration

## Related Packages

- [`@ezstart/ui`](../ui/README.md) - UI components that use this config
- [`@ezstart/next-config`](../next-config/README.md) - Next.js configuration
- [`@ezstart/next-core`](../next-core/README.md) - Web application infrastructure
- [`@ezstart/eslint-config`](../eslint-config/README.md) - ESLint configuration

## Best Practices

### 1. Use Semantic Classes

✅ **Do:** Use semantic utility classes
```jsx
<div className="bg-background text-foreground border-border">
  Content
</div>
```

❌ **Don't:** Use arbitrary color values
```jsx
<div className="bg-white text-black border-gray-200">
  Content
</div>
```

### 2. Extend, Don't Replace

✅ **Do:** Extend the base configuration
```js
export default {
  ...baseConfig,
  theme: {
    ...baseConfig.theme,
    extend: { /* additions */ }
  }
}
```

❌ **Don't:** Replace the entire configuration
```js
export default {
  theme: { /* completely new theme */ }
}
```

### 3. Use CSS Variables

✅ **Do:** Leverage CSS variables for theming
```css
.custom {
  background-color: hsl(var(--primary));
}
```

❌ **Don't:** Use hardcoded colors
```css
.custom {
  background-color: #3b82f6;
}
```

## Troubleshooting

### CSS Not Updating

1. Check content paths in your configuration
2. Restart development server
3. Clear Tailwind cache: `rm -rf .next`

### Missing Styles

1. Ensure UI package content is included
2. Verify PostCSS configuration
3. Check for CSS import in globals.css