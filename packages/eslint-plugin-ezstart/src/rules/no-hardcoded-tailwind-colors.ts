import type { TSESTree } from '@typescript-eslint/utils'
import { createRule } from './create-rule.js'

/**
 * Tailwind color palettes that are considered "raw / palette-based" and
 * forbidden in favor of semantic tokens (bg-primary, text-foreground, ...).
 *
 * We list only utility prefixes that accept a shade (e.g. `bg-red-500`),
 * not semantic tokens (e.g. `bg-primary`).
 */
const PALETTE_PREFIXES = [
  'bg',
  'text',
  'border',
  'ring',
  'from',
  'to',
  'via',
  'divide',
  'outline',
  'decoration',
  'placeholder',
  'caret',
  'fill',
  'stroke',
  'shadow',
  'accent',
]

const PALETTE_COLORS = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]

const PALETTE_REGEX = buildPaletteRegex()

function buildPaletteRegex(): RegExp {
  const prefixes = PALETTE_PREFIXES.join('|')
  const colors = PALETTE_COLORS.join('|')
  // Matches: `bg-red-500`, `hover:text-blue-400`, `dark:bg-slate-900/50`, `md:border-gray-200`, etc.
  // - Optional variant prefix `(foo:)*`
  // - Utility prefix
  // - Dash + color name
  // - Dash + shade (50-950)
  // - Optional alpha `/nn`
  return new RegExp(
    `(?:^|\\s)(?:[a-z0-9-]+:)*(?:${prefixes})-(?:${colors})-(?:50|100|200|300|400|500|600|700|800|900|950)(?:/\\d{1,3})?(?=\\s|$)`,
    'g'
  )
}

const CSS_LIKE_ATTRIBUTES = new Set(['className', 'class'])

/**
 * Flags hardcoded Tailwind palette utilities (e.g. `bg-red-500`, `text-gray-700`)
 * in JSX `className` / `class` attributes and known class-name helpers (cn, clsx,
 * classnames, tw, cva).
 *
 * Rationale: @ezstart components must use semantic tokens (`bg-primary`,
 * `text-foreground`, `bg-card`, ...) to support dark mode + theme tokens.
 * Raw palette shades break the design system.
 *
 * Scope: applies everywhere (packages + apps). No autofix — the right semantic
 * token depends on intent (destructive? muted? primary?).
 */
export const noHardcodedTailwindColors = createRule({
  name: 'no-hardcoded-tailwind-colors',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw Tailwind palette colors (bg-red-500, text-gray-700, ...). Use semantic tokens instead (bg-primary, text-foreground, bg-card).',
    },
    schema: [],
    messages: {
      hardcoded:
        "Hardcoded Tailwind color '{{match}}' — use a semantic token (bg-primary, text-foreground, bg-card, bg-muted, text-destructive, ...) instead.",
    },
  },
  defaultOptions: [],
  create(context) {
    function checkString(value: string, node: TSESTree.Node): void {
      const matches = value.match(PALETTE_REGEX)
      if (!matches) return
      for (const raw of matches) {
        const match = raw.trim()
        context.report({
          node,
          messageId: 'hardcoded',
          data: { match },
        })
      }
    }

    function visitTemplate(node: TSESTree.TemplateLiteral): void {
      for (const quasi of node.quasis) {
        if (quasi.value.cooked) checkString(quasi.value.cooked, quasi)
      }
    }

    function visitExpression(node: TSESTree.Node): void {
      if (node.type === 'Literal' && typeof node.value === 'string') {
        checkString(node.value, node)
        return
      }
      if (node.type === 'TemplateLiteral') {
        visitTemplate(node)
        return
      }
      // cn('foo', 'bar', isA && 'bg-red-500')
      if (node.type === 'LogicalExpression') {
        visitExpression(node.right)
        return
      }
      // x ? 'bg-red-500' : 'bg-primary'
      if (node.type === 'ConditionalExpression') {
        visitExpression(node.consequent)
        visitExpression(node.alternate)
        return
      }
      // { 'bg-red-500': cond }
      if (node.type === 'ObjectExpression') {
        for (const prop of node.properties) {
          if (prop.type !== 'Property') continue
          const key = prop.key
          if (key.type === 'Literal' && typeof key.value === 'string') {
            checkString(key.value, key)
          } else if (key.type === 'Identifier' && !prop.computed) {
            checkString(key.name, key)
          }
        }
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return
        if (!CSS_LIKE_ATTRIBUTES.has(node.name.name)) return
        if (!node.value) return

        if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
          checkString(node.value.value, node.value)
          return
        }
        if (
          node.value.type === 'JSXExpressionContainer' &&
          node.value.expression.type !== 'JSXEmptyExpression'
        ) {
          visitExpression(node.value.expression)
        }
      },
      CallExpression(node) {
        if (node.callee.type !== 'Identifier') return
        const name = node.callee.name
        if (name !== 'cn' && name !== 'clsx' && name !== 'classnames' && name !== 'tw') {
          return
        }
        for (const arg of node.arguments) {
          if (arg.type !== 'SpreadElement') {
            visitExpression(arg)
          }
        }
      },
    }
  },
})
