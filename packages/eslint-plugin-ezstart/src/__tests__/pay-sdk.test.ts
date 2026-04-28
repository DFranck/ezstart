import { paySdk } from '../rules/pay-sdk.js'
import { ruleTester } from './rule-tester.js'

const COMPONENT_FILE = '/repo/packages/pay-sdk/src/components/DonateModal.tsx'
const CORE_FILE = '/repo/packages/pay-sdk/src/core/pay-client.ts'
const REACT_FILE = '/repo/packages/pay-sdk/src/react/pay-provider.tsx'
const OTHER_PACKAGE_FILE = '/repo/packages/auth-sdk/src/components/SignInForm.tsx'
const APP_FILE = '/repo/apps/ezpay/web/src/app/page.tsx'

ruleTester.run('pay-sdk', paySdk, {
  valid: [
    // Other packages aren't constrained by this rule.
    {
      filename: OTHER_PACKAGE_FILE,
      code: "import { logger } from '@ezstart/logger'",
    },
    {
      filename: APP_FILE,
      code: "import { getApiUrl } from '@ezstart/config'",
    },
    // pay-sdk components may import @ezstart/ui freely.
    {
      filename: COMPONENT_FILE,
      code: "import { Button } from '@ezstart/ui/components'",
    },
    // pay-sdk core may import @ezstart/ui freely (well, they don't, but the rule
    // doesn't forbid it — agnosticism is enforced elsewhere).
    {
      filename: CORE_FILE,
      code: "import { something } from 'zod'",
    },
    // pay-sdk react layer may use @ezstart/api-sdk.
    {
      filename: REACT_FILE,
      code: "import { apiCall } from '@ezstart/api-sdk'",
    },
    // logger is fine OUTSIDE components (e.g. in core or react).
    {
      filename: CORE_FILE,
      code: "import { logger } from '@ezstart/logger'",
    },
    // Type-only logger import is allowed in components (erased at build,
    // zero runtime coupling). Lets the SDK re-use the canonical Logger
    // shape from @ezstart/logger without bundling it.
    {
      filename: COMPONENT_FILE,
      code: "import type { Logger } from '@ezstart/logger'",
    },
    {
      filename: COMPONENT_FILE,
      code: "import { type Logger } from '@ezstart/logger'",
    },
  ],
  invalid: [
    // logger forbidden in pay-sdk components.
    {
      filename: COMPONENT_FILE,
      code: "import { logger } from '@ezstart/logger'",
      errors: [{ messageId: 'noLoggerInComponents' }],
    },
    // config forbidden anywhere in pay-sdk src.
    {
      filename: CORE_FILE,
      code: "import { getApiUrl } from '@ezstart/config'",
      errors: [{ messageId: 'noConfig' }],
    },
    {
      filename: COMPONENT_FILE,
      code: "import { getApiUrl } from '@ezstart/config'",
      errors: [{ messageId: 'noConfig' }],
    },
    {
      filename: REACT_FILE,
      code: "import { getApiUrl } from '@ezstart/config'",
      errors: [{ messageId: 'noConfig' }],
    },
    // Dynamic import of forbidden source.
    {
      filename: COMPONENT_FILE,
      code: "const m = import('@ezstart/logger')",
      errors: [{ messageId: 'noLoggerInComponents' }],
    },
    // require() form (CommonJS interop).
    {
      filename: CORE_FILE,
      code: "const cfg = require('@ezstart/config')",
      errors: [{ messageId: 'noConfig' }],
    },
  ],
})
