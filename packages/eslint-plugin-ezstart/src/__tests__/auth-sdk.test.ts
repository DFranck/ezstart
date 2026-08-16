import { authSdk } from '../rules/auth-sdk.js'
import { ruleTester } from './rule-tester.js'

const COMPONENT_FILE = '/repo/packages/auth-sdk/src/components/SignInForm.tsx'
const CORE_FILE = '/repo/packages/auth-sdk/src/core/auth-client.ts'
const REACT_FILE = '/repo/packages/auth-sdk/src/react/auth-provider.tsx'
const APP_FILE = '/repo/apps/ezauth/web/src/app/page.tsx'

ruleTester.run('auth-sdk', authSdk, {
  valid: [
    // Other paths aren't constrained.
    {
      filename: APP_FILE,
      code: "import { logger } from '@ezstart/logger'",
    },
    // core/ and react/ have separate stricter rules; this one targets components only.
    {
      filename: CORE_FILE,
      code: "import { logger } from '@ezstart/logger'",
    },
    {
      filename: REACT_FILE,
      code: "import { logger } from '@ezstart/logger'",
    },
    // Components may freely import @ezstart/ui.
    {
      filename: COMPONENT_FILE,
      code: "import { Button } from '@ezstart/ui/components'",
    },
    // Type-only imports of forbidden packages are allowed (erased at build).
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
    {
      filename: COMPONENT_FILE,
      code: "import { logger } from '@ezstart/logger'",
      errors: [{ messageId: 'forbidden' }],
    },
    {
      filename: COMPONENT_FILE,
      code: "import { getApiUrl } from '@ezstart/config'",
      errors: [{ messageId: 'forbidden' }],
    },
    {
      filename: COMPONENT_FILE,
      code: "import { useTranslations } from 'next-intl'",
      errors: [{ messageId: 'forbidden' }],
    },
    // Dynamic import is also forbidden (no type form for ImportExpression).
    {
      filename: COMPONENT_FILE,
      code: "const m = import('@ezstart/logger')",
      errors: [{ messageId: 'forbidden' }],
    },
  ],
})
