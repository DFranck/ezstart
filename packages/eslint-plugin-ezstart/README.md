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

## Migration

This is a **new** package — there is nothing to migrate from. Existing projects adopt it incrementally by switching one rule to `error` at a time.

The rules intentionally ship disabled by default for the monorepo: `@ezstart/eslint-config` will flip them to `error` once the legacy code (notably `@ezstart/fetch-client` imports) is fully migrated.

## Related

- [standard.md](../../.claude/rules/standard.md) — rule 7 requires every sensitive package to own at least one rule here
- [@ezstart/api-sdk](../api-sdk/README.md) — HTTP client that replaces the deprecated `@ezstart/fetch-client`
- [@ezstart/ui](../ui/README.md) — the component library that `no-raw-html` steers code towards
- [@ezstart/eslint-config](../eslint-config/README.md) — shared flat configs that will eventually enable this plugin
