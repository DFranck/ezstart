import { getServerAuth } from '@ezstart/auth-sdk/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import LoginClient from './LoginClient'

interface LoginPageProps {
  params: Promise<{ locale: string }>
}

/**
 * `/login` route for EZPay — Server Component shell.
 *
 * EZPay does not host its own login form — it delegates auth to EZAuth
 * (Tier 1 SaaS service, cf. `standard-architecture.md`). This page :
 *
 * 1. SSR — if the user is already authenticated (cookie session valid),
 *    redirect to `/{locale}/dashboard` server-side. The user never sees
 *    the spinner / "redirecting" UI in this case.
 * 2. Otherwise, render `<LoginClient />` which bounces the browser to the
 *    EZAuth hosted `/login` with `key` + `redirect_uri=/auth/callback`.
 */
export default async function LoginPage({ params }: LoginPageProps) {
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

  return <LoginClient locale={locale} />
}
