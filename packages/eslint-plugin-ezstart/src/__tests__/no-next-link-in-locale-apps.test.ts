import { noNextLinkInLocaleApps } from '../rules/no-next-link-in-locale-apps.js'
import { ruleTester } from './rule-tester.js'

const APP_FILE = '/repo/apps/myapp/web/src/app/[locale]/page.tsx'
const APP_COMPONENT = '/repo/apps/myapp/web/src/components/Header.tsx'
const PACKAGE_FILE = '/repo/packages/ui/src/components/link.tsx'
const SDK_FILE = '/repo/packages/auth-sdk/src/components/Dashboard.tsx'
const CONFIG_FILE = '/repo/apps/myapp/web/next.config.js'

ruleTester.run('no-next-link-in-locale-apps', noNextLinkInLocaleApps, {
  valid: [
    // Already migrated — the canonical form.
    {
      filename: APP_FILE,
      code: "import { Link } from '@/i18n/navigation'",
    },
    // Package source — rule is scoped to apps/*/web/src only.
    {
      filename: PACKAGE_FILE,
      code: "import Link from 'next/link'",
    },
    // SDK source — not apps/*/web/src.
    {
      filename: SDK_FILE,
      code: "import Link from 'next/link'",
    },
    // Config / tooling file outside src/.
    {
      filename: CONFIG_FILE,
      code: "import Link from 'next/link'",
    },
    // Default import from next/link but bound to a different name — out of
    // scope (caller chose to alias for a reason, we don't guess intent).
    {
      filename: APP_FILE,
      code: "import NextLink from 'next/link'",
    },
    // Named imports only (types) — we only block the default `Link` binding.
    {
      filename: APP_FILE,
      code: "import type { LinkProps } from 'next/link'",
    },
  ],
  invalid: [
    // Bare default import in an app page.
    {
      filename: APP_FILE,
      code: "import Link from 'next/link'",
      errors: [{ messageId: 'forbidden' }],
      output: "import { Link } from '@/i18n/navigation'",
    },
    // App component folder — still covered.
    {
      filename: APP_COMPONENT,
      code: "import Link from 'next/link'",
      errors: [{ messageId: 'forbidden' }],
      output: "import { Link } from '@/i18n/navigation'",
    },
    // Mixed default + named — autofix preserves the named import.
    {
      filename: APP_FILE,
      code: "import Link, { LinkProps } from 'next/link'",
      errors: [{ messageId: 'forbidden' }],
      output: "import { LinkProps } from 'next/link'\nimport { Link } from '@/i18n/navigation'",
    },
  ],
})
