import { requireI18nString } from '../rules/require-i18n-string.js'
import { ruleTester } from './rule-tester.js'

const APP_FILE = '/repo/apps/myapp/web/src/components/Page.tsx'
const SDK_FILE = '/repo/packages/ui/src/components/welcome-banner.tsx'
const INFRA_FILE = '/repo/packages/api-sdk/src/core/client.ts'

ruleTester.run('require-i18n-string', requireI18nString, {
  valid: [
    // Outside app/SDK paths — rule ignores.
    { filename: INFRA_FILE, code: "throw new Error('Invalid input provided')" },
    // Single word (not user-facing heuristic).
    { filename: APP_FILE, code: 'const Page = () => <span>OK</span>' },
    // Wrapped in t() — the literal is no longer a bare user-facing string.
    {
      filename: APP_FILE,
      code: "const Page = () => <span>{t('hello')}</span>",
    },
    // Short string.
    { filename: APP_FILE, code: 'const Page = () => <span>Hi</span>' },
    // URL / identifier.
    {
      filename: APP_FILE,
      code: 'const Page = () => <div placeholder="https://example.com" />',
    },
    // All caps constant.
    { filename: APP_FILE, code: 'const Page = () => <span>ABC DEF</span>' },
    // toast with identifier (t('...')).
    {
      filename: APP_FILE,
      code: "import { toast } from 'sonner'; toast.success(t('done'))",
    },
  ],
  invalid: [
    // JSX text.
    {
      filename: APP_FILE,
      code: 'const Page = () => <Button>Save Changes</Button>',
      errors: [{ messageId: 'hardcoded' }],
    },
    // placeholder prop.
    {
      filename: APP_FILE,
      code: 'const Page = () => <Input placeholder="Enter your name" />',
      errors: [{ messageId: 'hardcoded' }],
    },
    // toast.
    {
      filename: APP_FILE,
      code: "import { toast } from 'sonner'; toast.success('Profile updated successfully')",
      errors: [{ messageId: 'hardcoded' }],
    },
    // alert().
    {
      filename: APP_FILE,
      code: "alert('Something went wrong')",
      errors: [{ messageId: 'hardcoded' }],
    },
    // In SDK components layer.
    {
      filename: SDK_FILE,
      code: 'const X = () => <H1>Welcome Back</H1>',
      errors: [{ messageId: 'hardcoded' }],
    },
  ],
})
