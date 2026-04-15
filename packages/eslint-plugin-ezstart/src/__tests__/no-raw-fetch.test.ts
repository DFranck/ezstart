import { noRawFetch } from '../rules/no-raw-fetch.js'
import { ruleTester } from './rule-tester.js'

const APP_FILE = '/repo/apps/myapp/web/src/components/UserList.tsx'
const ROUTE_HANDLER = '/repo/apps/myapp/web/src/app/api/proxy/route.ts'
const PACKAGE_FILE = '/repo/packages/api-sdk/src/core/client.ts'

ruleTester.run('no-raw-fetch', noRawFetch, {
  valid: [
    // Outside apps/*/web/src — rule ignores it entirely.
    {
      filename: PACKAGE_FILE,
      code: "const r = await fetch('/api/x')",
    },
    // Next.js route handler — explicitly allowed.
    {
      filename: ROUTE_HANDLER,
      code: "export async function GET() { return fetch('https://external.example/api') }",
    },
    // `fetchExternal(...)` is the sanctioned wrapper.
    {
      filename: APP_FILE,
      code: "import { fetchExternal } from '@ezstart/api-sdk'; await fetchExternal('https://x.com')",
    },
    // `apiCall(...)` is fine.
    {
      filename: APP_FILE,
      code: "import { apiCall } from '@ezstart/api-sdk'; await apiCall('myapp', '/me')",
    },
    // A local function named `refetch` is not `fetch`.
    {
      filename: APP_FILE,
      code: 'const refetch = () => {}; refetch()',
    },
  ],
  invalid: [
    {
      filename: APP_FILE,
      code: "const r = await fetch('/api/users')",
      errors: [{ messageId: 'rawFetch' }],
    },
    {
      filename: APP_FILE,
      code: "const r = await window.fetch('/api/users')",
      errors: [{ messageId: 'rawFetch' }],
    },
    {
      filename: APP_FILE,
      code: "const r = await globalThis.fetch('/api/users')",
      errors: [{ messageId: 'rawFetch' }],
    },
  ],
})
