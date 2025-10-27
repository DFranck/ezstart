# UI Library - Utilities

Generic utility functions shared across all apps in the monorepo.

## Available Utilities

### `cn()` - Class Name Merger

Combines multiple class names and intelligently merges Tailwind CSS classes.

**Import:**
```typescript
import { cn } from '@ezstart/ui/lib'
```

**Features:**
- ✅ Conditional class names via `clsx`
- ✅ Tailwind conflict resolution via `tailwind-merge`
- ✅ Type-safe with `ClassValue` types
- ✅ Used in 37+ components across 6 projects

**Usage:**

```tsx
// Simple merging
cn('px-2 py-1', 'bg-white')
// => "px-2 py-1 bg-white"

// Conditional classes
cn('base-class', condition && 'conditional-class')
// => "base-class conditional-class" (if condition is true)

// Object syntax
cn({ 'text-red': isError, 'text-green': isSuccess })
// => "text-red" or "text-green" based on booleans

// Tailwind conflicts (last wins)
cn('px-2', 'px-4')
// => "px-4" (tailwind-merge removes px-2)

// Typical component usage
function Button({ className, variant }) {
  return (
    <button className={cn(
      'base-styles',
      className,
      { 'variant-primary': variant === 'primary' }
    )} />
  )
}
```

---

### `isDebug()` - Debug Mode Check

Checks if debug mode is enabled via `NEXT_PUBLIC_DEBUG` environment variable.

**Import:**
```typescript
import { isDebug } from '@ezstart/ui/lib'
```

**Returns:** `boolean` - `true` if `NEXT_PUBLIC_DEBUG === 'true'`

**Usage:**

```typescript
// Conditional logging
if (isDebug()) {
  console.log('Debug info:', data)
}

// Conditional rendering
{isDebug() && <DebugPanel />}

// Environment setup
const config = {
  verbose: isDebug(),
  logLevel: isDebug() ? 'debug' : 'warn'
}
```

**Environment Variable:**
```env
# .env.local
NEXT_PUBLIC_DEBUG=true   # Enable debug mode
```

---

### `isDevEnv()` - Development Mode Check

Checks if the application is running in development environment.

**Import:**
```typescript
import { isDevEnv } from '@ezstart/ui/lib'
```

**Returns:** `boolean` - `true` if `NODE_ENV === 'development'`

**Usage:**

```typescript
// Development-only features
if (isDevEnv()) {
  console.log('Running in development')
  enableHMR()
}

// Conditional imports
const analytics = isDevEnv() 
  ? null 
  : await import('./analytics')

// Error handling
const errorHandler = isDevEnv()
  ? detailedErrorHandler
  : productionErrorHandler
```

**Environment Variable:**
```env
# Automatically set by frameworks
NODE_ENV=development   # Dev mode
NODE_ENV=production    # Prod mode
```

---

## Type Definitions

### `ClassValue` (from clsx)

```typescript
type ClassValue =
  | string
  | number
  | ClassDictionary
  | ClassArray
  | undefined
  | null
  | boolean

interface ClassDictionary {
  [id: string]: any
}

interface ClassArray extends Array<ClassValue> {}
```

---

## Usage Across Monorepo

### Apps Using `cn()`

- **EZBill** - 12 components
- **EZStart** - 6 components
- **ASC-TCD** - 10 components
- **FengShui** - 4 components
- **Tower Defense** - 2 components
- **packages/next-theme** - 1 component

**Total:** 37+ usages

### Apps Using `isDebug()` / `isDevEnv()`

- **packages/ui** - 4 internal components
- **Tower Defense** - useGames hook

**Total:** 6 usages

---

## Best Practices

### ✅ DO

```typescript
// Use cn() for dynamic classes
<div className={cn('base', className, { active: isActive })} />

// Check environment before debug logging
if (isDebug()) console.log(data)

// Use isDevEnv() for development features
if (isDevEnv()) enableDevTools()
```

### ❌ DON'T

```typescript
// Don't manually merge classes
<div className={`base ${className} ${isActive ? 'active' : ''}`} />

// Don't check env directly (use helpers)
if (process.env.NEXT_PUBLIC_DEBUG === 'true') // ❌ Use isDebug()
if (process.env.NODE_ENV === 'development') // ❌ Use isDevEnv()

// Don't use for production logging (use proper logger)
if (isDebug()) logToProduction() // ❌ Debug is not for production
```

---

## Related Packages

- **clsx** - Conditional class names ([GitHub](https://github.com/lukeed/clsx))
- **tailwind-merge** - Merge Tailwind classes ([GitHub](https://github.com/dcastil/tailwind-merge))
- **@ezstart/ui** - Parent UI library package

---

## Maintenance

**Last Updated:** 27 October 2025  
**Maintainer:** @ezstart team  
**Status:** ✅ Stable - No breaking changes planned

---

## Contributing

When adding new utilities:

1. ✅ Ensure they are **100% generic** (no project-specific code)
2. ✅ Add **JSDoc documentation** with examples
3. ✅ Export via `index.ts` for barrel exports
4. ✅ Update this README with usage examples
5. ✅ Add TypeScript types and explicit return types
