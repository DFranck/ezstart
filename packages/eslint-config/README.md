# @ezstart/eslint-config

Centralized ESLint configuration for all @ezstart applications and packages.

## Overview

`@ezstart/eslint-config` provides standardized ESLint rules and configurations that ensure code quality and consistency across the entire @ezstart monorepo, from web applications to API services.

## Installation

This package is automatically included via workspace dependencies:

```json
{
  "devDependencies": {
    "@ezstart/eslint-config": "workspace:*"
  }
}
```

## Configurations Available

### 🌐 Next.js Applications (`next-js`)

For all web applications built with Next.js:

```js
// eslint.config.js
import { nextJsConfig } from "@ezstart/eslint-config/next-js"
export default nextJsConfig
```

**Includes:**
- Base TypeScript rules
- React and React Hooks rules
- Next.js specific optimizations
- Import/export validation
- Accessibility checks

### ⚛️ Internal React Packages (`react-internal`)

For packages that contain React components (like `@ezstart/ui`, `@ezstart/next-core`):

```js
// eslint.config.js
import { config } from "@ezstart/eslint-config/react-internal"
export default config
```

**Includes:**
- React and JSX support
- React Hooks validation
- Component best practices
- TypeScript integration

### 🔧 Base Configuration (`base`)

For APIs, utilities, and non-React packages:

```js
// eslint.config.js
import { config } from "@ezstart/eslint-config/base"
export default config
```

**Includes:**
- Core JavaScript/TypeScript rules
- Import/export validation
- Node.js environment support
- Performance optimizations

## Rules Philosophy

### ✅ **Enabled Rules (Errors)**

- **react-hooks/rules-of-hooks** - Critical React Hooks usage
- **@typescript-eslint/no-unused-vars** - Catch unused variables
- **no-console** - Prevent console.log in production
- **import/no-unresolved** - Validate imports

### ⚠️ **Suppressed Warnings**

Common "annoying" warnings that are disabled for better developer experience:

```js
rules: {
  // Development friendly
  "@typescript-eslint/no-unused-vars": "off",
  "@typescript-eslint/no-explicit-any": "off", 
  "no-undef": "off", // TypeScript handles this
  
  // Next.js specific
  "@next/next/no-img-element": "off",
  
  // React specific  
  "react/no-unescaped-entities": "off",
  "react-hooks/exhaustive-deps": "off",
  
  // Build tools
  "turbo/no-undeclared-env-vars": "off"
}
```

### 🎯 **Only-Warn Plugin**

All remaining issues are converted to warnings rather than errors, allowing builds to continue while still providing feedback.

## Integration Examples

### Web Applications

All @ezstart web applications use the Next.js configuration:

```js
// apps/ez-billing/web/eslint.config.js
import { nextJsConfig } from "@ezstart/eslint-config/next-js"
export default nextJsConfig
```

### API Services

All @ezstart APIs use the base configuration:

```js
// apps/ezauth/api/eslint.config.js
import { config as baseConfig } from '@ezstart/eslint-config/base'
export default baseConfig
```

### React Packages

Internal packages with React components:

```js
// packages/ui/eslint.config.js
import { config } from "@ezstart/eslint-config/react-internal"
export default [...config, {
  ignores: ["dist/**"]
}]
```

## Applications Using This Config

### ✅ Web Applications (Next.js Config)
- **ezauth/web** - Authentication service
- **ez-billing/web** - Billing management
- **ezstart/web** - Main application  
- **fengshui/web** - Feng Shui application
- **tower-defense/web** - Tower Defense game
- **asc-tcd/web** - ASC-TCD website

### ✅ API Services (Base Config)
- **ezauth/api** - Authentication API
- **ez-billing/api** - Billing API
- **tower-defense/api** - Tower Defense API

### ✅ React Packages (React Internal Config)
- **@ezstart/ui** - UI components library
- **@ezstart/next-core** - Web infrastructure

## Configuration Architecture

### Inheritance Hierarchy

```
base.js (Core rules)
├── next-js.js (extends base + Next.js rules)
└── react-internal.js (extends base + React rules)
```

### Plugin Dependencies

The configuration includes these ESLint plugins:

- `@typescript-eslint/eslint-plugin` - TypeScript support
- `eslint-plugin-react` - React component rules
- `eslint-plugin-react-hooks` - React Hooks validation
- `@next/eslint-plugin-next` - Next.js optimizations
- `eslint-plugin-turbo` - Monorepo optimizations
- `eslint-plugin-only-warn` - Convert errors to warnings

## Customization

### Extending Configuration

```js
import { nextJsConfig } from "@ezstart/eslint-config/next-js"

export default [
  ...nextJsConfig,
  {
    rules: {
      // Add custom rules
      "prefer-const": "error"
    }
  },
  {
    ignores: [
      // Add custom ignores
      "build/**",
      "*.config.js"
    ]
  }
]
```

### Project-Specific Overrides

```js
export default [
  ...nextJsConfig,
  {
    files: ["**/*.test.ts"],
    rules: {
      // Test-specific rules
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
]
```

## IDE Integration

### VS Code Settings

```json
{
  "eslint.validate": [
    "javascript",
    "javascriptreact", 
    "typescript",
    "typescriptreact"
  ],
  "eslint.workingDirectories": [
    "apps/*",
    "packages/*"
  ]
}
```

### WebStorm/IntelliJ

ESLint is automatically detected and configured when using the workspace structure.

## Development Workflow

### Linting Commands

```bash
# Lint all packages
pnpm lint

# Lint specific package
pnpm --filter @ezstart/ui lint

# Fix auto-fixable issues
pnpm lint:fix
```

### Pre-commit Hooks

The configuration works with pre-commit tools like Husky:

```json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx}": ["eslint --fix"]
  }
}
```

## Performance Optimizations

### Flat Config Format

Uses ESLint 9's flat config format for better performance:

```js
export const config = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { /* ... */ },
    rules: { /* ... */ }
  }
]
```

### Selective Rules

Only includes necessary rules to minimize linting time while maintaining code quality.

## Migration Guide

### From Legacy ESLint Config

```js
// Old (.eslintrc.js)
module.exports = {
  extends: ["next/core-web-vitals", "@typescript-eslint/recommended"],
  rules: { /* custom rules */ }
}

// New (eslint.config.js)
import { nextJsConfig } from "@ezstart/eslint-config/next-js"
export default nextJsConfig
```

### Updating Existing Projects

1. Remove `.eslintrc.*` files
2. Create `eslint.config.js` with appropriate config
3. Update `package.json` scripts if needed
4. Test with `pnpm lint`

## Best Practices

### 1. Use Appropriate Configuration

✅ **Do:** Choose the right config for your project type
```js
// Web app
import { nextJsConfig } from "@ezstart/eslint-config/next-js"

// API
import { config } from "@ezstart/eslint-config/base"
```

❌ **Don't:** Use React config for non-React projects

### 2. Minimal Overrides

✅ **Do:** Keep custom rules to minimum
```js
export default [...nextJsConfig, {
  rules: { "prefer-const": "error" } // Only what's necessary
}]
```

❌ **Don't:** Override many rules
```js
rules: { /* dozens of custom rules */ }
```

### 3. Consistent Usage

✅ **Do:** Use the same config across similar projects
- All web apps use `next-js`
- All APIs use `base`

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**
   - Ensure `@ezstart/eslint-config` is in dependencies
   - Run `pnpm install`

2. **Rules not applying**
   - Check config inheritance
   - Verify file patterns match

3. **Performance issues**
   - Check ignore patterns
   - Use appropriate configuration level

## Development

### Package Structure

```
packages/eslint-config/
├── src/
│   ├── base.js           # Base configuration
│   ├── next.js           # Next.js configuration  
│   └── react-internal.js # React internal packages
├── package.json
└── README.md
```

### Contributing

When modifying rules:

1. Consider impact on all projects
2. Test with multiple project types
3. Update documentation
4. Coordinate with team

## Related Packages

- [`@ezstart/typescript-config`](../typescript-config/README.md) - TypeScript configuration
- [`@ezstart/next-config`](../next-config/README.md) - Next.js configuration  
- [`@ezstart/next-core`](../next-core/README.md) - Web application infrastructure
- [`@ezstart/ui`](../ui/README.md) - UI components that use this config