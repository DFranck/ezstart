# Coding Rules — Mandatory for ALL coding agents

Quick reference of non-negotiable rules. Violating any NEVER rule = instant rejection.

---

## NEVER (instant rejection)

- **Raw HTML tags** (`div`, `p`, `span`, `h1`, `table`, `button`, `input`...) — use `@ezstart/ui` (`Card`, `P`, `Span`, `H1`, `DataTable`, `Button`, `Input`...)
- **Tailwind hardcoded colors** (`bg-gray-100`, `text-indigo-500`) — use semantic (`bg-card`, `text-foreground`, `bg-primary`)
- **`console.log/warn/error`** — use `@ezstart/logger` (`logger.debug/info/warn/error`)
- **`alert()` / `window.confirm`** — use `sonner` toast / `AlertDialog` from `@ezstart/ui`
- **`useState` + `useEffect` + `fetch`** — use React Query (`useQuery` / `useMutation`)
- **Raw `fetch()` / `axios`** — use `callApi` wrapper from `src/config/api.ts`
- **Hardcoded strings in UI** — use `next-intl` `t()` for ALL user-facing text
- **`any` type** — use proper typing, always
- **Raw `<table>` or custom table** — use `DataTable` from `@ezstart/ui`
- **App-specific components in `packages/`** — packages are 100% agnostic
- **App-specific UI components** — everything comes from `@ezstart/ui`, new designs = new variant
- **`deleteMany({})` / `drop()` without env check** — protect with `NODE_ENV !== 'test'` guard
- **Inline styles or className overrides** outside `packages/ui` — use props/variants
- **Duplicated logic between apps** — extract to `packages/` if shared

## ALWAYS (mandatory)

- **Import UI** from `@ezstart/ui/components` — `import { Button, Card, H1 } from '@ezstart/ui/components'`
- **DataTable** for ALL data lists/tables (TanStack-based, from `@ezstart/ui`)
- **React Query** for ALL data fetching — `useQuery` for reads, `useMutation` for writes
- **`callApi`** for ALL API calls — configured in `src/config/api.ts` with `appName`
- **`next-intl` `t()`** for ALL user-facing text (labels, placeholders, toasts, buttons, titles) — FR + EN minimum
- **Zod validation** on ALL API inputs (body, query, params)
- **`sendSuccess` / `sendError`** for ALL API responses — format: `{ success, data, meta? }`
- **Pagination** on ALL list endpoints — `limit` (default 20) + `offset`, return `meta: { total, limit, offset }`
- **`@ezstart/logger`** for all logging — appropriate levels (debug/info/warn/error)
- **Semantic colors** — `bg-card`, `text-foreground`, `bg-primary`, `text-destructive`
- **Loading/error/empty states** on ALL async content (skeleton, retry, helpful message)
- **Toast via sonner** for ALL user feedback — messages use `t()`, not hardcoded
- **`formatCurrency`** for ALL currency amounts
- **Naming**: PascalCase components, camelCase functions/variables, UPPERCASE constants, kebab-case folders
- **Functions < 50 lines**, components < 300 lines — extract helpers/sub-components
- **`tsc --noEmit` must pass** before any commit

## UI Components

- ALL HTML via Tag components: `Div`, `P`, `Span`, `H1`-`H6`, `Card`, `Button`, `Input`...
- Use **variants/size props** when available: `<Card variant="floating" />`, `<Button variant="destructive" size="sm" />`
- New design need = new variant in `packages/ui`, NEVER local override
- Dark mode must work (OKLCH CSS variables)
- Responsive required (mobile/tablet/desktop)

## Data Fetching

- `callApi` wrapper: `const { data } = await callApi('/endpoint', { method: 'GET' })`
- React Query keys: `['users']` for list, `['user', id]` for item — consistent naming
- `enabled: !!id` for conditional queries
- Optimistic updates for mutations where appropriate
- QueryProvider with `staleTime: 5min`, `gcTime: 10min`, `retry: 1`

## i18n

- ALL user-facing text through `useTranslations('namespace')`
- Keys in ALL language files (FR + EN minimum)
- Key naming: `namespace.action` format (`invoice.created`, `common.save`)
- Exceptions: API error messages (EN ok), logs, technical identifiers

## API Routes

- Response: `sendSuccess(res, { data, meta? })` / `sendError(res, statusCode, message)`
- Zod schema on every input: `const schema = z.object({ ... }); const parsed = schema.parse(req.body)`
- HTTP status codes: 200, 201, 400, 401, 403, 404, 500
- Rate limiting on sensitive endpoints
- CORS via `@ezstart/config`

## Packages

- **Hierarchy** (check in order): `packages/` > `apps/[project]/types|utils|config` > `apps/[project]/web|api`
- Packages expose **generic interfaces** — apps implement business logic
- If used by 2+ apps = MUST be in `packages/`
- Every package: proper `exports` in `package.json`, `index.ts`, README up to date
- `.env.example` committed, `.env.local` gitignored, zero secrets in code
