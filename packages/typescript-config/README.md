# @ezstart/typescript-config

Centralized TypeScript configurations for all @ezstart applications and packages.

## Overview

`@ezstart/typescript-config` provides standardized TypeScript configurations that ensure consistent compilation settings, type checking, and development experience across the entire @ezstart monorepo.

## Installation

This package is automatically included via workspace dependencies:

```json
{
  "devDependencies": {
    "@ezstart/typescript-config": "workspace:*"
  }
}
```

## Available Configurations

### 📄 Base Configuration (`base.json`)

Foundation configuration for most packages:

```json
{
  "extends": "@ezstart/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

**Includes:**
- Strict TypeScript settings
- Modern target (ES2022)
- Node.js module resolution
- Declaration file generation
- Source map support

### 🌐 Next.js Configuration (`nextjs.json`)

Optimized for Next.js web applications:

```json
{
  "extends": "@ezstart/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [
      { "name": "next" }
    ]
  }
}
```

**Includes:**
- Next.js specific settings
- JSX support (React JSX)
- DOM types
- Incremental compilation
- Path mapping support

### 🔧 API Configuration (`api.json`)

For Node.js API services:

```json
{
  "extends": "@ezstart/typescript-config/api.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node", "jest"]
  }
}
```

**Includes:**
- Node.js environment types
- Express.js compatibility
- CommonJS/ES modules support
- Test framework types
- API-specific optimizations

### 📚 Library Configuration (`library.json`)

For packages that will be consumed by other packages:

```json
{
  "extends": "@ezstart/typescript-config/library.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true
  }
}
```

**Includes:**
- Declaration file generation
- Declaration maps for debugging
- Library-specific module resolution
- Tree-shaking friendly output

### ⚛️ React Library Configuration (`react-library.json`)

For React component libraries:

```json
{
  "extends": "@ezstart/typescript-config/react-library.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx"
  }
}
```

**Includes:**
- React JSX support
- React types
- Component prop inference
- Event handler types

### 📝 Types Configuration (`types.json`)

For type-only packages:

```json
{
  "extends": "@ezstart/typescript-config/types.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "emitDeclarationOnly": true
  }
}
```

**Includes:**
- Declaration-only compilation
- Type-only imports/exports
- Optimized for type packages

## Configuration Details

### Core TypeScript Settings

All configurations inherit these strict settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": false,
    "noUncheckedIndexedAccess": false
  }
}
```

### Target and Module Settings

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

### Development Experience

```json
{
  "compilerOptions": {
    "incremental": true,
    "composite": false,
    "sourceMap": true,
    "declarationMap": true,
    "removeComments": false,
    "preserveWatchOutput": true
  }
}
```

## Applications Using These Configurations

### ✅ Web Applications (Next.js Config)
All web applications use the Next.js configuration:

- **ezauth/web** → `nextjs.json`
- **ezbill/web** → `nextjs.json`
- **ezstart/web** → `nextjs.json`
- **fengshui/web** → `nextjs.json`
- **tower-defense/web** → `nextjs.json`
- **asc-tcd/web** → `nextjs.json`

### ✅ API Services (API Config)
All API services use the API configuration:

- **ezauth/api** → `api.json`
- **ezbill/api** → `api.json`
- **tower-defense/api** → `api.json`

### ✅ React Packages (React Library Config)
React component packages use the React library configuration:

- **@ezstart/ui** → `react-library.json`
- **@ezstart/next-theme** → `react-library.json`
- **@ezstart/auth-sdk** → `base.json` (with JSX support)

### ✅ Utility Packages (Library/Base Config)
Utility and infrastructure packages:

- **@ezstart/express-core** → `base.json`
- **@ezstart/auth-sdk** → `base.json`
- **@ezstart/types** → `types.json`

## Configuration Examples

### Complete Web Application Setup

```json
{
  "extends": "@ezstart/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"]
    },
    "plugins": [
      { "name": "next" }
    ]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    ".next",
    "out"
  ]
}
```

### API Service Setup

```json
{
  "extends": "@ezstart/typescript-config/api.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node", "jest"],
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.*"]
}
```

### Package Library Setup

```json
{
  "extends": "@ezstart/typescript-config/library.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationMap": true,
    "composite": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.*", "**/*.stories.*"]
}
```

## Path Mapping Best Practices

### Web Applications
```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@/components/*": ["./src/components/*"],
    "@/lib/*": ["./src/lib/*"],
    "@/hooks/*": ["./src/hooks/*"],
    "@/utils/*": ["./src/utils/*"],
    "@/styles/*": ["./src/styles/*"]
  }
}
```

### API Services
```json
{
  "paths": {
    "@/*": ["./src/*"],
    "@/controllers/*": ["./src/controllers/*"],
    "@/models/*": ["./src/models/*"],
    "@/middleware/*": ["./src/middleware/*"],
    "@/utils/*": ["./src/utils/*"],
    "@/types/*": ["./src/types/*"]
  }
}
```

## Strict Mode Configuration

All configurations enable strict mode for maximum type safety:

### Enabled Strict Checks
- `strict: true` - Enable all strict checks
- `noImplicitAny: true` - Error on implicit any types
- `noImplicitReturns: true` - Error on missing return statements
- `exactOptionalPropertyTypes: true` - Exact optional property types
- `noImplicitOverride: true` - Require override keyword

### Relaxed for Development Experience
- `noUnusedLocals: false` - Allow unused variables during development
- `noUnusedParameters: false` - Allow unused parameters
- `noPropertyAccessFromIndexSignature: false` - Allow property access on index signatures

## IDE Integration

### VS Code Settings

The configurations work seamlessly with VS Code:

```json
{
  "typescript.preferences.openTsServerLog": false,
  "typescript.preferences.includePackageJsonAutoImports": true,
  "typescript.suggest.autoImports": true,
  "typescript.workspaceSymbols.scope": "allOpenProjects",
  "typescript.preferences.useLabelDetailsInCompletionEntries": true
}
```

### Multi-Root Workspaces

For monorepo development:

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "auto",
  "typescript.workspaceSymbols.scope": "allOpenProjects",
  "typescript.preferences.lazyConfiguredProjectsFromExternalProject": true
}
```

## Build Performance Optimization

### Incremental Compilation

All configurations enable incremental compilation:

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./dist/tsconfig.tsbuildinfo"
  }
}
```

### Project References (Future Enhancement)

For large monorepos, project references can be configured:

```json
{
  "references": [
    { "path": "../types" },
    { "path": "../ui" },
    { "path": "../express-core" }
  ]
}
```

## Troubleshooting

### Common Issues

#### 1. Path Resolution Problems
```typescript
// ❌ Error: Cannot find module '@/components/Button'
import { Button } from '@/components/Button'

// ✅ Solution: Check paths configuration
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

#### 2. Module Resolution Issues
```typescript
// ❌ Error: Module not found
import { api } from '@ezstart/express-core'

// ✅ Solution: Ensure package is in dependencies
{
  "dependencies": {
    "@ezstart/express-core": "workspace:*"
  }
}
```

#### 3. JSX Issues in Next.js
```typescript
// ❌ Error: JSX element implicitly has type 'any'
return <div>Content</div>

// ✅ Solution: Use nextjs.json configuration
{
  "extends": "@ezstart/typescript-config/nextjs.json"
}
```

### Performance Issues

#### Large Monorepo Compilation
- Use `skipLibCheck: true` (already enabled)
- Enable incremental compilation (already enabled)
- Consider project references for very large projects

#### Memory Issues
```json
{
  "ts-node": {
    "compilerOptions": {
      "module": "CommonJS"
    }
  }
}
```

## Migration Guide

### From Custom TypeScript Config

#### Before (Custom Configuration)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  }
}
```

#### After (Centralized Configuration)
```json
{
  "extends": "@ezstart/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] },
    "plugins": [{ "name": "next" }]
  }
}
```

### Update Steps

1. **Install the package**
```bash
pnpm add -D @ezstart/typescript-config
```

2. **Replace tsconfig.json**
```json
{
  "extends": "@ezstart/typescript-config/nextjs.json"
}
```

3. **Add project-specific settings**
```json
{
  "extends": "@ezstart/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

4. **Test the configuration**
```bash
pnpm typecheck
```

## Development

### Package Structure

```
packages/typescript-config/
├── src/
│   ├── base.json           # Base configuration
│   ├── nextjs.json         # Next.js configuration
│   ├── api.json           # API configuration
│   ├── library.json       # Library configuration
│   ├── react-library.json # React library configuration
│   └── types.json         # Types-only configuration
├── package.json
└── README.md
```

### Updating Configurations

When updating configurations:

1. **Consider all consumers** - Changes affect all projects
2. **Test with multiple project types** - Web, API, packages
3. **Document breaking changes** - Update migration guide
4. **Coordinate releases** - Sync with team updates

## Best Practices

### 1. Use Appropriate Configuration

✅ **Do:** Choose the right config for your project type
```json
// Web app
{ "extends": "@ezstart/typescript-config/nextjs.json" }

// API service  
{ "extends": "@ezstart/typescript-config/api.json" }

// Package library
{ "extends": "@ezstart/typescript-config/library.json" }
```

❌ **Don't:** Use the wrong configuration type
```json
// API using Next.js config
{ "extends": "@ezstart/typescript-config/nextjs.json" }
```

### 2. Minimal Overrides

✅ **Do:** Keep custom settings minimal
```json
{
  "extends": "@ezstart/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

❌ **Don't:** Override many base settings
```json
{
  "extends": "@ezstart/typescript-config/nextjs.json",
  "compilerOptions": {
    // Many overrides that duplicate base config
  }
}
```

### 3. Consistent Structure

✅ **Do:** Follow consistent project structure
```
src/
├── components/
├── lib/
├── utils/
└── types/
```

This works well with the path mappings in our configurations.

## Related Packages

- [`@ezstart/eslint-config`](../eslint-config/README.md) - ESLint configuration for TypeScript
- [`@ezstart/types`](../types/README.md) - Shared TypeScript types
- [`@ezstart/express-core`](../express-core/README.md) - Uses API configuration
- [`@ezstart/next-theme`](../next-theme/README.md) - Uses React library configuration