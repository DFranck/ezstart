import type { TSESTree } from '@typescript-eslint/utils'
import { createRule } from './create-rule.js'

/**
 * Source files where this rule fires. We only want to flag user-facing strings
 * in app + SDK component code. Packages like `api-sdk`, `logger`, `config` are
 * server/infra code — English strings there are fine.
 */
const APP_OR_SDK_PATH =
  /[\\/](apps[\\/][^\\/]+[\\/]web[\\/]src|packages[\\/](ui|auth-sdk|pay-sdk|ai-sdk|capture-sdk|ocr-sdk|pdf-sdk)[\\/]src[\\/]components)[\\/]/

/**
 * Function names that traditionally receive user-facing strings.
 * If they receive a raw string literal with 2+ words starting uppercase, we warn.
 */
const USER_FACING_CALLERS = new Set(['alert', 'confirm', 'prompt'])

const TOAST_METHODS = new Set(['success', 'error', 'info', 'warning', 'message', 'loading'])

/**
 * Heuristic to catch "probably user-facing" strings.
 *
 * - At least 2 words
 * - Starts with an uppercase letter
 * - Not purely uppercase (SHOUT_CASE, likely constant)
 * - Not a dotted identifier (e.g. 'Foo.Bar')
 * - No curly braces, no HTML angle brackets
 */
function looksLikeUserFacing(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed.length < 4) return false
  if (!/^[A-Z]/.test(trimmed)) return false
  if (trimmed === trimmed.toUpperCase()) return false
  if (/[{}<>]/.test(trimmed)) return false
  const words = trimmed.split(/\s+/)
  if (words.length < 2) return false
  // Exclude URLs, file paths, CSS classes, pseudo-identifiers
  if (/\b(https?:|www\.|\/\/|\.[a-z]+$)/i.test(trimmed)) return false
  return true
}

/**
 * Warns when a string that looks user-facing (2+ words, starts uppercase)
 * is used as:
 *
 * - A JSX text node: `<Button>Save Changes</Button>`
 * - A prop known to be user-facing: `placeholder`, `label`, `title`, `aria-label`, `description`
 * - An argument to `toast.success/error/info/...`
 * - An argument to `alert()` / `confirm()` / `prompt()` (see also `no-alert-confirm`)
 *
 * Heuristic-based — intentionally liberal. Consumers should upgrade to `error`
 * only after sweeping the codebase.
 *
 * No autofix: the replacement requires knowing the i18n namespace + key.
 */
export const requireI18nString = createRule({
  name: 'require-i18n-string',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn when user-facing strings are hardcoded instead of wrapped in t() from next-intl / texts props.',
    },
    schema: [],
    messages: {
      hardcoded:
        "Hardcoded user-facing string '{{preview}}' — wrap it in t('...') from next-intl or accept it via a 'texts' prop.",
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? ''
    if (!APP_OR_SDK_PATH.test(filename)) return {}

    function preview(value: string): string {
      const trimmed = value.trim()
      return trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed
    }

    function reportIfUserFacing(value: string, node: TSESTree.Node): void {
      if (!looksLikeUserFacing(value)) return
      context.report({
        node,
        messageId: 'hardcoded',
        data: { preview: preview(value) },
      })
    }

    const USER_FACING_JSX_PROPS = new Set([
      'placeholder',
      'label',
      'title',
      'description',
      'aria-label',
      'aria-description',
      'alt',
      'helperText',
    ])

    return {
      JSXText(node) {
        reportIfUserFacing(node.value, node)
      },
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier') return
        if (!USER_FACING_JSX_PROPS.has(node.name.name)) return
        if (!node.value) return
        if (node.value.type === 'Literal' && typeof node.value.value === 'string') {
          reportIfUserFacing(node.value.value, node.value)
        }
      },
      CallExpression(node) {
        // toast.success('...') / toast.error('...')
        if (
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'toast' &&
          node.callee.property.type === 'Identifier' &&
          TOAST_METHODS.has(node.callee.property.name)
        ) {
          const first = node.arguments[0]
          if (first && first.type === 'Literal' && typeof first.value === 'string') {
            reportIfUserFacing(first.value, first)
          }
          return
        }
        // alert('...') / confirm('...') / prompt('...')
        if (node.callee.type === 'Identifier' && USER_FACING_CALLERS.has(node.callee.name)) {
          const first = node.arguments[0]
          if (first && first.type === 'Literal' && typeof first.value === 'string') {
            reportIfUserFacing(first.value, first)
          }
        }
      },
    }
  },
})
