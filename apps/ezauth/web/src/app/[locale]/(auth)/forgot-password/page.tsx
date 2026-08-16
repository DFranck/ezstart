import { getServerAuth } from '@ezstart/auth-sdk/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveSsrTheme } from '@/server/theme-ssr'
import ForgotPasswordClient from './ForgotPasswordClient'

interface ForgotPasswordPageProps {
  params: Promise<{ locale: string }>
}

/**
 * Server wrapper for `/forgot-password` — performs an SSR redirect to
 * `/{locale}/dashboard` when the user is already authenticated. There is no
 * legitimate reason to be on this form when a session is active, so we send
 * the user straight to the dashboard instead of flashing the form.
 */
export default async function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
  const { locale } = await params
  const h = await headers()
  const cookieHeader = h.get('cookie') ?? undefined

  const initialUser = await getServerAuth({
    apiUrl: process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110',
    cookieHeader,
  })

  if (initialUser) {
    redirect(`/${locale}/dashboard`)
  }

  const { appName, appDisplayName } = resolveSsrTheme(h)
  const ssrAppName = appName && appName !== 'ezauth' ? appName : null
  const ssrAppDisplayName = appDisplayName ?? null
  return <ForgotPasswordClient ssrAppName={ssrAppName} ssrAppDisplayName={ssrAppDisplayName} />
}
