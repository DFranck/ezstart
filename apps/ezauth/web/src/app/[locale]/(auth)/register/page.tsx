import { getServerAuth } from '@ezstart/auth-sdk/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { resolveSsrTheme } from '@/server/theme-ssr'
import RegisterClient from './RegisterClient'

interface RegisterPageProps {
  params: Promise<{ locale: string }>
}

/**
 * Server wrapper for `/register` — performs an SSR redirect to
 * `/{locale}/dashboard` when the user is already authenticated, killing the
 * flash where the registration form briefly renders before client-side
 * bounces the user away.
 */
export default async function RegisterPage({ params }: RegisterPageProps) {
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
  return <RegisterClient ssrAppName={ssrAppName} ssrAppDisplayName={ssrAppDisplayName} />
}
