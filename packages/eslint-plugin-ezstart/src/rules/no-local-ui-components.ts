import type { TSESTree } from '@typescript-eslint/utils'
import { createRule } from './create-rule.js'

/**
 * Matches files located in `apps/<app>/web/src/components/**`.
 *
 * We intentionally do NOT flag files under `apps/<app>/web/src/app/` (pages,
 * layouts, route handlers) — those are composition by definition.
 */
const APP_COMPONENTS_PATH = /[\\/]apps[\\/][^\\/]+[\\/]web[\\/]src[\\/]components[\\/]/

/**
 * Patterns considered "visual" — if a component declares visual markup
 * (styling classes, variant-like classNames, design-system props), we suggest
 * it be promoted to `@ezstart/ui` or an SDK `components/` layer.
 *
 * We approximate "visual" by checking whether the default export / component
 * file uses `className` on JSX intrinsic elements (e.g. `<div className="..."`)
 * with more than a trivial utility.
 */
const MIN_CLASSNAME_TOKENS = 3

function countTailwindLikeTokens(value: string): number {
  return value
    .trim()
    .split(/\s+/)
    .filter(tok => /^[a-z0-9-]+(?::[a-z0-9-]+)*-[a-z0-9-]+/i.test(tok)).length
}

/**
 * Warns when a file inside `apps/<app>/web/src/components/` looks like a new
 * visual primitive (heavy className usage on intrinsic JSX). Those should be
 * promoted to `packages/ui/` or an SDK `components/` layer so they can be
 * reused across apps.
 *
 * Heuristic:
 * - File must be in `apps/<app>/web/src/components/**`
 * - Contains at least one JSX opening element with `className` having
 *   >= {@link MIN_CLASSNAME_TOKENS} tokens that look like Tailwind utilities
 * - Intrinsic element (lowercase tag) → more suspicious than `<MyButton />`
 *
 * No autofix: promoting a component is a human decision (API design, variants,
 * naming, peer deps).
 *
 * Severity: `warn` (soft rule, progressive cleanup).
 */
export const noLocalUiComponents = createRule({
  name: 'no-local-ui-components',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn when apps/*/web/src/components/ define visual primitives. Promote to @ezstart/ui or an SDK components/ layer.',
    },
    schema: [],
    messages: {
      localVisual:
        'Visual primitive detected in apps/*/web/src/components — promote to @ezstart/ui or an SDK components/ layer so other apps can reuse it.',
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? ''
    if (!APP_COMPONENTS_PATH.test(filename)) return {}

    let reported = false

    function report(node: TSESTree.Node): void {
      if (reported) return
      reported = true
      context.report({ node, messageId: 'localVisual' })
    }

    return {
      JSXOpeningElement(node) {
        if (reported) return
        if (node.name.type !== 'JSXIdentifier') return
        const tag = node.name.name
        // Only flag intrinsic (lowercase) JSX elements — custom components
        // are already composition.
        if (tag[0] !== tag[0]?.toLowerCase()) return

        for (const attr of node.attributes) {
          if (attr.type !== 'JSXAttribute') continue
          if (attr.name.type !== 'JSXIdentifier') continue
          if (attr.name.name !== 'className') continue
          if (!attr.value) continue

          if (attr.value.type === 'Literal' && typeof attr.value.value === 'string') {
            if (countTailwindLikeTokens(attr.value.value) >= MIN_CLASSNAME_TOKENS) {
              report(attr)
              return
            }
          }
          if (
            attr.value.type === 'JSXExpressionContainer' &&
            attr.value.expression.type === 'TemplateLiteral'
          ) {
            const total = attr.value.expression.quasis
              .map(q => q.value.cooked ?? '')
              .map(countTailwindLikeTokens)
              .reduce((a, b) => a + b, 0)
            if (total >= MIN_CLASSNAME_TOKENS) {
              report(attr)
              return
            }
          }
        }
      },
    }
  },
})
