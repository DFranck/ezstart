import { noDialogOutsideUi } from '../rules/no-dialog-outside-ui.js'
import { ruleTester } from './rule-tester.js'

const APP_FILE = '/repo/apps/myapp/web/src/components/Form.tsx'
const SDK_FILE = '/repo/packages/auth-sdk/src/components/UserSettings.tsx'
const UI_FILE = '/repo/packages/ui/src/components/modal.tsx'

ruleTester.run('no-dialog-outside-ui', noDialogOutsideUi, {
  valid: [
    // UI kit itself — allowed.
    {
      filename: UI_FILE,
      code: "import { Dialog, DialogContent } from '@ezstart/ui/components'",
    },
    // Other UI imports — not Dialog.
    {
      filename: APP_FILE,
      code: "import { Modal, Button } from '@ezstart/ui/components'",
    },
    // AlertDialog is fine.
    {
      filename: APP_FILE,
      code: "import { AlertDialog } from '@ezstart/ui/components'",
    },
    // Import Dialog from somewhere else — not our concern.
    {
      filename: APP_FILE,
      code: "import { Dialog } from 'radix-ui'",
    },
  ],
  invalid: [
    {
      filename: APP_FILE,
      code: "import { Dialog } from '@ezstart/ui/components'",
      errors: [{ messageId: 'forbidden', data: { name: 'Dialog' } }],
    },
    {
      filename: APP_FILE,
      code: "import { Dialog, DialogContent, DialogHeader } from '@ezstart/ui/components'",
      errors: [
        { messageId: 'forbidden', data: { name: 'Dialog' } },
        { messageId: 'forbidden', data: { name: 'DialogContent' } },
        { messageId: 'forbidden', data: { name: 'DialogHeader' } },
      ],
    },
    // SDK components also forbidden.
    {
      filename: SDK_FILE,
      code: "import { DialogTitle } from '@ezstart/ui/components'",
      errors: [{ messageId: 'forbidden', data: { name: 'DialogTitle' } }],
    },
    // From '@ezstart/ui' root.
    {
      filename: APP_FILE,
      code: "import { DialogFooter } from '@ezstart/ui'",
      errors: [{ messageId: 'forbidden', data: { name: 'DialogFooter' } }],
    },
  ],
})
