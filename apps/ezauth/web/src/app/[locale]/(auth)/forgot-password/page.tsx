import { headers } from 'next/headers'
import { resolveSsrTheme } from '@/server/theme-ssr'
import ForgotPasswordClient from './ForgotPasswordClient'

export default async function ForgotPasswordPage() {
  const h = await headers()
  const { appName } = resolveSsrTheme(h)
  const ssrAppName = appName && appName !== 'ezauth' ? appName : null
  return <ForgotPasswordClient ssrAppName={ssrAppName} />
}
