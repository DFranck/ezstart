import { headers } from 'next/headers'
import { resolveSsrTheme } from '@/server/theme-ssr'
import RegisterClient from './RegisterClient'

export default async function RegisterPage() {
  const h = await headers()
  const { appName, appDisplayName } = resolveSsrTheme(h)
  const ssrAppName = appName && appName !== 'ezauth' ? appName : null
  const ssrAppDisplayName = appDisplayName ?? null
  return <RegisterClient ssrAppName={ssrAppName} ssrAppDisplayName={ssrAppDisplayName} />
}
