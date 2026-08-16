import { noAlertConfirm } from '../rules/no-alert-confirm.js'
import { ruleTester } from './rule-tester.js'

ruleTester.run('no-alert-confirm', noAlertConfirm, {
  valid: [
    { code: "import { toast } from 'sonner'; toast.error('boom')" },
    // A method named `confirm` on an object is not the browser API.
    { code: 'const api = { confirm: () => true }; api.confirm()' },
    // Named `alert` on a custom object.
    { code: 'const widget = { alert: () => {} }; widget.alert()' },
    // Unrelated call.
    { code: "console.info('hi')" },
  ],
  invalid: [
    {
      code: "alert('hi')",
      errors: [{ messageId: 'forbidden', data: { name: 'alert' } }],
    },
    {
      code: "confirm('sure?')",
      errors: [{ messageId: 'forbidden', data: { name: 'confirm' } }],
    },
    {
      code: "prompt('name?')",
      errors: [{ messageId: 'forbidden', data: { name: 'prompt' } }],
    },
    {
      code: "window.alert('hi')",
      errors: [{ messageId: 'forbidden', data: { name: 'alert' } }],
    },
    {
      code: "window.confirm('sure?')",
      errors: [{ messageId: 'forbidden', data: { name: 'confirm' } }],
    },
    {
      code: "globalThis.confirm('sure?')",
      errors: [{ messageId: 'forbidden', data: { name: 'confirm' } }],
    },
    {
      code: "self.alert('hi')",
      errors: [{ messageId: 'forbidden', data: { name: 'alert' } }],
    },
  ],
})
