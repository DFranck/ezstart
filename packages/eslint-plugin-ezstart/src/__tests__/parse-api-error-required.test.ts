import { parseApiErrorRequired } from '../rules/parse-api-error-required.js'
import { ruleTester } from './rule-tester.js'

ruleTester.run('parse-api-error-required', parseApiErrorRequired, {
  valid: [
    // String literal — not a dynamic payload.
    { code: "throw new Error('bad input')" },
    // Already using parseApiError.
    {
      code: "import { parseApiError } from '@ezstart/api-sdk'\nthrow new Error(parseApiError(res.data) ?? 'fallback')",
    },
    // Bare Error with no args → not our concern.
    { code: 'throw new Error()' },
    // Member access that isn't `.error`.
    { code: "throw new Error(res.message || 'x')" },
  ],
  invalid: [
    {
      code: "throw new Error(response.error || 'fallback')",
      errors: [{ messageId: 'useParseApiError', data: { source: 'response' } }],
      // No autofix: parseApiError not imported.
      output: null,
    },
    {
      code: 'throw new Error(response.error)',
      errors: [{ messageId: 'useParseApiError', data: { source: 'response' } }],
      output: null,
    },
    {
      code:
        "import { parseApiError } from '@ezstart/api-sdk'\n" +
        "throw new Error(response.error || 'fallback')",
      errors: [{ messageId: 'useParseApiError', data: { source: 'response' } }],
      output:
        "import { parseApiError } from '@ezstart/api-sdk'\n" +
        "throw new Error(parseApiError(response.data) ?? 'fallback')",
    },
    {
      code: "import { parseApiError } from '@ezstart/api-sdk'\n" + 'throw new Error(res.error)',
      errors: [{ messageId: 'useParseApiError', data: { source: 'res' } }],
      output:
        "import { parseApiError } from '@ezstart/api-sdk'\n" +
        'throw new Error(parseApiError(res.data))',
    },
  ],
})
