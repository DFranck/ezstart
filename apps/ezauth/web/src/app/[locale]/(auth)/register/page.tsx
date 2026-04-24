import { headers } from 'next/headers'
import { resolveSsrTheme } from '@/server/theme-ssr'
import RegisterClient from './RegisterClient'

export default async function RegisterPage() {
  const h = await headers()
  const { appName } = resolveSsrTheme(h)
  const ssrAppName = appName && appName !== 'ezauth' ? appName : null
  return <RegisterClient ssrAppName={ssrAppName} />
}
