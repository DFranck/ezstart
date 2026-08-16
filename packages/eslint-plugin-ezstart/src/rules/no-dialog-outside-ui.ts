import { createRule } from './create-rule.js'

/**
 * Source paths allowed to import `Dialog*` from `@ezstart/ui/components`.
 * Only the UI kit itself may compose on top of the raw Dialog primitive.
 * Apps and SDKs must use `<Modal>`, `<AlertDialog>`, or `toast`.
 */
const ALLOWED_PATH = /[\\/]packages[\\/]ui[\\/]/

const DIALOG_COMPONENTS = new Set([
  'Dialog',
  'DialogTrigger',
  'DialogContent',
  'DialogHeader',
  'DialogFooter',
  'DialogTitle',
  'DialogDescription',
  'DialogClose',
  'DialogOverlay',
  'DialogPortal',
])

const UI_SOURCES = new Set([
  '@ezstart/ui',
  '@ezstart/ui/components',
  '@ezstart/ui/components/dialog',
])

/**
 * Blocks any `import { Dialog, DialogContent, ... } from '@ezstart/ui/...'`
 * outside `packages/ui/`.
 *
 * Rationale: `<Dialog>` is the raw primitive. App/SDK code must use the
 * higher-level abstractions that handle max-height, sticky header/footer,
 * body scroll, size variants:
 * - `<Modal>` for generic modals
 * - `<AlertDialog>` for destructive confirms
 * - `toast.*` for notifications
 *
 * No autofix: the replacement is structurally different.
 */
export const noDialogOutsideUi = createRule({
  name: 'no-dialog-outside-ui',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow Dialog imports from @ezstart/ui outside packages/ui. Use <Modal>, <AlertDialog>, or toast instead.',
    },
    schema: [],
    messages: {
      forbidden:
        "Import of '{{name}}' from '@ezstart/ui' is forbidden outside packages/ui — use <Modal>, <AlertDialog>, or toast instead.",
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename ?? context.getFilename?.() ?? ''
    if (ALLOWED_PATH.test(filename)) return {}

    return {
      ImportDeclaration(node) {
        const source = node.source.value
        if (typeof source !== 'string' || !UI_SOURCES.has(source)) return

        for (const spec of node.specifiers) {
          if (
            spec.type === 'ImportSpecifier' &&
            spec.imported.type === 'Identifier' &&
            DIALOG_COMPONENTS.has(spec.imported.name)
          ) {
            context.report({
              node: spec,
              messageId: 'forbidden',
              data: { name: spec.imported.name },
            })
          }
        }
      },
    }
  },
})
