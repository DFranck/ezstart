import { noExpressCore } from '../rules/no-express-core.js'
import { ruleTester } from './rule-tester.js'

ruleTester.run('no-express-core', noExpressCore, {
  valid: [
    { code: "import { connectToMongo } from '@ezstart/api-core'" },
    { code: "import { something } from 'express-core'" },
    { code: "import { x } from '@ezstart/logger'" },
    { code: "const mod = await import('@ezstart/api-core')" },
    { code: "const mod = require('@ezstart/api-core')" },
  ],
  invalid: [
    {
      code: "import { connectToMongo } from '@ezstart/express-core'",
      errors: [{ messageId: 'deprecated' }],
      output: "import { connectToMongo } from '@ezstart/api-core'",
    },
    {
      code: "import '@ezstart/express-core'",
      errors: [{ messageId: 'deprecated' }],
      output: "import '@ezstart/api-core'",
    },
    {
      code: "const mod = await import('@ezstart/express-core')",
      errors: [{ messageId: 'deprecated' }],
      output: "const mod = await import('@ezstart/api-core')",
    },
    {
      code: "const mod = require('@ezstart/express-core')",
      errors: [{ messageId: 'deprecated' }],
      output: "const mod = require('@ezstart/api-core')",
    },
  ],
})
