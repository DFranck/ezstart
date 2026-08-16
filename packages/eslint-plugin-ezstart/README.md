# @ezstart/eslint-plugin-ezstart

Custom ESLint rules that codify `@ezstart` monorepo conventions (HTTP client, typography, confirm dialogs, error parsing).

## Install

```bash
pnpm add -D @ezstart/eslint-plugin-ezstart
```

Requires ESLint 8 or 9 as a peer dependency.

## Quickstart (monorepo)

Add the plugin's `recommended` config to your flat `eslint.config.js`:

```js
import ezstart from '@ezstart/eslint-plugin-ezstart'

export default [
  // ...other configs
  {
    plugins: { '@ezstart/ezstart': ezstart },
    rules: ezstart.configs.recommended.rules,
  },
]
```

Or cherry-pick individual rules:

```js
import ezstart from '@ezstart/eslint-plugin-ezstart'

export default [
  {
    plugins: { '@ezstart/ezstart': ezstart },
    rules: {
      '@ezstart/ezstart/no-raw-fetch': 'error',
      '@ezstart/ezstart/no-alert-confirm': 'error',
    },
  },
]
```

## Quickstart (external / standalone)

The plugin is published as a standard ESLint plugin (flat config). Drop it into any ESLint 8/9 project:

```js
// eslint.config.js
import ezstart from '@ezstart/eslint-plugin-ezstart'

export default [
  {
    plugins: { '@ezstart/ezstart': ezstart },
    rules: ezstart.configs.recommended.rules,
  },
]
```

No runtime dependency on the rest of the `@ezstart` monorepo.

## Presets

| Preset        | Severity policy                                               | Use when                          |
| ------------- | ------------------------------------------------------------- | --------------------------------- |
| `recommended` | `error` on hard rules, `warn` on rules exposing existing debt | Default — adopt progressively     |
| `strict`      | All rules set to `error`                                      | After sweeping the codebase clean |

```js
import ezstart from '@ezstart/eslint-plugin-ezstart'

export default [
  {
    plugins: { '@ezstart/ezstart': ezstart },
    rules: ezstart.configs.strict.rules, // or .recommended
  },
]
```

## API

### `no-fetch-client`

Disallows `import … from '@ezstart/fetch-client'`. The deprecated package was replaced by `@ezstart/api-sdk`.

- Severity: `error`
- Autofix: yes (rewrites the module specifier)

```ts
// ❌
import { apiCall } from '@ezstart/fetch-client'

// ✅
import { apiCall } from '@ezstart/api-sdk'
```

### `no-raw-fetch`

Disallows calling the global `fetch()` (and `window.fetch`, `globalThis.fetch`) inside `apps/<app>/web/src/**/*.{ts,tsx}`.

- Severity: `error`
- Autofix: no (rewrite needs human context)
- Ignored: Next.js route handlers under `apps/<app>/web/src/app/api/**`
- Sanctioned wrapper: `fetchExternal()` from `@ezstart/api-sdk` is never flagged.

```ts
// ❌
const res = await fetch('/api/users')

// ✅ internal
import { apiCall } from '@ezstart/api-sdk'
const users = await apiCall('myapp', '/api/users')

// ✅ 3rd-party
import { fetchExternal } from '@ezstart/api-sdk'
const rates = await fetchExternal('https://api.example.com/rates')
```

### `parse-api-error-required`

Flags `throw new Error(X.error || '…')` patterns where `X` is a variable — `X.error` is often an `ErrorPayload` object that stringifies to `[object Object]`.

- Severity: `error`
- Autofix: yes, **only if** `parseApiError` is already imported in the file.

```ts
// ❌
throw new Error(response.error || 'Failed')

// ✅
import { parseApiError } from '@ezstart/api-sdk'
throw new Error(parseApiError(response.data) ?? 'Failed')
```

### `no-raw-html`

In `apps/<app>/web/src/**/*.{ts,tsx}`, flags native HTML elements that have a documented `@ezstart/ui/components` replacement.

- Severity: `error`
- Autofix: no (replacement needs an import + often a `variant`/`size`)
- Flagged tags: `p`, `span`, `h1`–`h6`, `button`, `input`, `textarea`, `select`, `a`
- Allowed (layout): `div`, `main`, `aside`, `header`, `footer`, `nav`, `section`, `article`, `ul`, `ol`, `li`, `figure`, `figcaption`

```tsx
// ❌
<h1>Dashboard</h1>
<button onClick={onClick}>Save</button>

// ✅
import { H1, Button } from '@ezstart/ui/components'
<H1>Dashboard</H1>
<Button onClick={onClick}>Save</Button>
```

### `no-alert-confirm`

Disallows `alert()`, `confirm()`, `prompt()` and their `window.*` / `globalThis.*` variants.

- Severity: `error`
- Autofix: no (replacement is structurally different — `<AlertDialog>` is async)

```ts
// ❌
if (window.confirm('Delete?')) deleteItem()

// ✅ destructive confirm
import { AlertDialog } from '@ezstart/ui/components'
// render <AlertDialog /> with open state + onConfirm handler

// ✅ notification
import { toast } from 'sonner'
toast.error('Delete failed')
```

### `no-console-log`

Disallows `console.log`, `console.warn`, `console.error`, `console.info`, `console.debug` in source files. Use `@ezstart/logger` for consistent leveled logging.

- Severity: `warn` (recommended) / `error` (strict)
- Autofix: no
- Allowed: `__tests__/`, `*.test.ts`, `*.spec.ts`, `scripts/`, `bin/`, `*.config.ts`, `packages/logger/**`

```ts
// ❌
console.log('user logged in')
console.error('boom', err)

// ✅
import { logger } from '@ezstart/logger'
logger.info('user logged in')
logger.error('boom', err)
```

### `no-hardcoded-tailwind-colors`

Flags raw Tailwind palette utilities (`bg-red-500`, `text-gray-700`, `border-indigo-200`, ...) in JSX `className`, class-name helpers (`cn`, `clsx`, `classnames`, `tw`). Forces semantic tokens.

- Severity: `warn` (recommended) / `error` (strict)
- Autofix: no (the right semantic token depends on intent)

```tsx
// ❌
<div className="bg-gray-100 text-gray-900 border-gray-200" />
<button className="bg-indigo-500 hover:bg-indigo-600 text-white" />

// ✅
<div className="bg-card text-foreground border" />
<button className="bg-primary hover:bg-primary/90 text-primary-foreground" />
```

### `no-dialog-outside-ui`

Blocks `Dialog` / `DialogContent` / `DialogHeader` / ... imports from `@ezstart/ui` outside `packages/ui/`. App and SDK code must use higher-level abstractions.

- Severity: `warn` (recommended) / `error` (strict)
- Autofix: no

```tsx
// ❌
import { Dialog, DialogContent } from '@ezstart/ui/components'

// ✅ generic modal
import { Modal } from '@ezstart/ui/components'

// ✅ destructive confirm
import { AlertDialog } from '@ezstart/ui/components'

// ✅ notification
import { toast } from 'sonner'
```

### `require-i18n-string`

Heuristic-based. Warns when a hardcoded user-facing string (2+ words, starts with uppercase) appears in:

- JSX text: `<Button>Save Changes</Button>`
- User-facing props: `placeholder`, `label`, `title`, `description`, `aria-label`, `alt`, `helperText`
- `toast.success/error/info/...` arguments
- `alert()`, `confirm()`, `prompt()` arguments

Scoped to `apps/*/web/src/**` and `packages/{ui,*-sdk}/src/components/**`.

- Severity: `warn` (recommended) / `error` (strict)
- Autofix: no

```tsx
// ❌
<Button>Save Changes</Button>
<Input placeholder="Enter your email" />
toast.success('Profile updated successfully')

// ✅
const t = useTranslations('profile')
<Button>{t('saveChanges')}</Button>
<Input placeholder={t('emailPlaceholder')} />
toast.success(t('profileUpdated'))
```

### `no-local-ui-components`

Warns when `apps/<app>/web/src/components/**` defines a visual primitive (intrinsic JSX element with 3+ Tailwind-like className tokens). Visual primitives should live in `@ezstart/ui` or an SDK `components/` layer.

- Severity: `warn`
- Autofix: no

```tsx
// ❌ apps/myapp/web/src/components/FancyCard.tsx
export const FancyCard = ({ children }) => (
  <div className="flex items-center gap-4 rounded-md bg-card p-4">{children}</div>
)

// ✅ app does composition only
import { Card, CardContent } from '@ezstart/ui/components'
export const MyPage = () => (
  <Card>
    <CardContent>...</CardContent>
  </Card>
)
```

## Migration

This is a **new** package — there is nothing to migrate from. Existing projects adopt it incrementally by switching one rule to `error` at a time.

The rules `no-express-core` and `no-fetch-client` are set to `error` — both legacy packages have been fully migrated and deleted (replaced by `@ezstart/api-core` and `@ezstart/api-sdk` respectively).

## Related

- [standard.md](../../.claude/rules/standard.md) — rule 7 requires every sensitive package to own at least one rule here
- [@ezstart/api-sdk](../api-sdk/README.md) — HTTP client that replaces the deprecated `@ezstart/fetch-client`
- [@ezstart/ui](../ui/README.md) — the component library that `no-raw-html` steers code towards
- [@ezstart/eslint-config](../eslint-config/README.md) — shared flat configs that will eventually enable this plugin
