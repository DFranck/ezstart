import { createRule } from './create-rule.js'

const FORBIDDEN = new Set(['alert', 'confirm', 'prompt'])

/**
 * Disallows the blocking browser dialogs: alert, confirm, prompt
 * — in their bare form or accessed through window / globalThis / self.
 *
 * Replacement:
 * - Destructive or confirmation flows → `<AlertDialog>` from `@ezstart/ui`
 * - Notifications → `toast.success` / `toast.error` (sonner)
 *
 * No autofix: the replacement is structurally different (async dialog vs.
 * blocking browser API).
 */
export const noAlertConfirm = createRule({
  name: 'no-alert-confirm',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow alert/confirm/prompt. Use <AlertDialog> from @ezstart/ui for destructive confirms, toast.error for alerts.',
    },
    schema: [],
    messages: {
      forbidden:
        "'{{name}}' is forbidden — use <AlertDialog> from @ezstart/ui for destructive confirms, toast.error for alerts.",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee

        // Bare identifier calls to the blocked names.
        if (callee.type === 'Identifier' && FORBIDDEN.has(callee.name)) {
          context.report({
            node: callee,
            messageId: 'forbidden',
            data: { name: callee.name },
          })
          return
        }

        // Member access on window / globalThis / self.
        if (
          callee.type === 'MemberExpression' &&
          !callee.computed &&
          callee.property.type === 'Identifier' &&
          FORBIDDEN.has(callee.property.name) &&
          callee.object.type === 'Identifier' &&
          (callee.object.name === 'window' ||
            callee.object.name === 'globalThis' ||
            callee.object.name === 'self')
        ) {
          context.report({
            node: callee.property,
            messageId: 'forbidden',
            data: { name: callee.property.name },
          })
        }
      },
    }
  },
})
