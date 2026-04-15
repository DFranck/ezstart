import { noFetchClient } from '../rules/no-fetch-client.js'
import { ruleTester } from './rule-tester.js'

ruleTester.run('no-fetch-client', noFetchClient, {
  valid: [
    { code: "import { apiCall } from '@ezstart/api-sdk'" },
    { code: "import { something } from 'fetch-client'" },
    { code: "import { x } from '@ezstart/logger'" },
    { code: "const mod = await import('@ezstart/api-sdk')" },
    { code: "const mod = require('@ezstart/api-sdk')" },
  ],
  invalid: [
    {
      code: "import { apiCall } from '@ezstart/fetch-client'",
      errors: [{ messageId: 'deprecated' }],
      output: "import { apiCall } from '@ezstart/api-sdk'",
    },
    {
      code: "import '@ezstart/fetch-client'",
      errors: [{ messageId: 'deprecated' }],
      output: "import '@ezstart/api-sdk'",
    },
    {
      code: "const mod = await import('@ezstart/fetch-client')",
      errors: [{ messageId: 'deprecated' }],
      output: "const mod = await import('@ezstart/api-sdk')",
    },
    {
      code: "const mod = require('@ezstart/fetch-client')",
      errors: [{ messageId: 'deprecated' }],
      output: "const mod = require('@ezstart/api-sdk')",
    },
  ],
})
