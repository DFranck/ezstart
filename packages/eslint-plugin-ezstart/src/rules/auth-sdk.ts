import { createRule } from './create-rule.js'

/**
 * Match files inside `packages/auth-sdk/src/components/` (cross-platform path
 * separators). The rule is scoped to the components layer because the SDK
 * core/ and react/ layers have separate, stricter agnosticism rules already
 * enforced by `standard.md` (no `@ezstart/*` at all in `core/`).
 */
const AUTH_SDK_COMPONENTS_PATH = /[\\/]packages[\\/]auth-sdk[\\/]src[\\/]components[\\/]/

/**
 * Forbidden imports inside `packages/auth-sdk/src/components/`.
 *
 * Rationale (cf. `.claude/rules/standard-architecture.md` Tier 1 SaaS):
 * - `@ezstart/config` couples the SDK to monorepo URL helpers — consumers
 *   running outside the monorepo cannot install it. Every URL must be
 *   accepted via props or via the `<AuthProvider>` context.
 * - `@ezstart/logger` couples the SDK to the monorepo Pino setup — the
 *   `<AuthProvider>` already exposes an opt-in `logger` prop with English
 *   defaults that no-op silently. Components must consume that injected
 *   logger (or stay silent) instead of importing the monorepo wrapper.
 * - `next-intl` makes the SDK unusable for any consumer that ships a
 *   different i18n library (or no i18n library at all). All user-facing
 *   strings must be accepted through a `texts?: Partial<...>` prop with
 *   English defaults, and the active locale must be derived from the URL
 *   pathname via `useAuthNavigation()` (no `useLocale()` / `useTranslations()`).
 */
const FORBIDDEN_PACKAGES = new Set<string>([
  '@ezstart/config',
  '@ezstart/config/urls',
  '@ezstart/logger',
  '@ezstart/logger/server',
  'next-intl',
  'next-intl/server',
])

/**
 * Blocks monorepo-coupling imports inside `packages/auth-sdk/src/components/`.
 *
 * Auth SDK components must stay 100% agnostic so the SDK can be installed
 * standalone (`npm install @ezstart/auth-sdk`) without dragging the
 * monorepo's URL/logger/i18n helpers into the consumer's bundle.
 *
 * @see `.claude/rules/standard.md` §1 "Agnostique"
 * @see `.claude/rules/standard-architecture.md` Tier 1 SaaS services
 */
export const authSdk = createRule({
  name: 'auth-sdk',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow monorepo-coupling imports (`@ezstart/config`, `@ezstart/logger`, `next-intl`) inside packages/auth-sdk/src/components/.',
    },
    schema: [],
    messages: {
      forbidden:
        "Import of '{{source}}' is forbidden in packages/auth-sdk/src/components/. The auth-sdk components must stay agnostic — accept URLs via props (or AuthProvider context), use the injected `logger` prop, and accept user-facing strings via `texts?: Partial<...>` with English defaults.",
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? ''
    if (!AUTH_SDK_COMPONENTS_PATH.test(filename)) return {}

    return {
      ImportDeclaration(node) {
        const source = node.source.value
        if (typeof source !== 'string') return
        if (!FORBIDDEN_PACKAGES.has(source)) return
        // Type-only imports (`import type { Foo } from ...`) are erased at
        // compile time and do NOT add a runtime dependency. Allow them so
        // SDKs can re-use canonical type definitions (e.g. `Logger` from
        // `@ezstart/logger`) without coupling the bundle.
        if (node.importKind === 'type') return
        // Allow `import { type Foo } from ...` when EVERY specifier is
        // type-only. The TS compiler erases the import in that case.
        const allSpecifiersTypeOnly =
          node.specifiers.length > 0 &&
          node.specifiers.every(
            spec => spec.type === 'ImportSpecifier' && spec.importKind === 'type'
          )
        if (allSpecifiersTypeOnly) return
        context.report({
          node: node.source,
          messageId: 'forbidden',
          data: { source },
        })
      },
      ImportExpression(node) {
        if (node.source.type !== 'Literal') return
        const source = node.source.value
        if (typeof source !== 'string') return
        if (!FORBIDDEN_PACKAGES.has(source)) return
        context.report({
          node: node.source,
          messageId: 'forbidden',
          data: { source },
        })
      },
    }
  },
})
