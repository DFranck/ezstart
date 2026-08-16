import { headers } from 'next/headers'
import { getServerApiKeys, getServerApplication } from '@ezstart/auth-sdk/server'
import { logger } from '@ezstart/logger/server'
import { DeveloperDetailClient } from './DeveloperDetailClient'

/**
 * `/developer/[id]` — Server Component shell for the Application detail page.
 *
 * Pre-fetches the Application document AND the user's API keys server-side
 * via the SSR helpers (`getServerApplication`, `getServerApiKeys`) using the
 * inbound session cookie. Both results are forwarded to
 * `<DeveloperDetailClient>` which seeds React Query so the detail tabs
 * (Keys, Settings, Theme) render on the very first paint with no
 * `<Skeleton>` / `<Spinner>` flash.
 *
 * When the user is anonymous (no cookie) or the Application is missing /
 * forbidden, each helper returns `null` and the client component falls back
 * to the legacy client-side behavior (loading state + redirect to `/login`
 * when applicable).
 */
export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const headersList = await headers()
  const cookieHeader = headersList.get('cookie')
  const apiUrl = process.env.NEXT_PUBLIC_EZAUTH_API_URL ?? 'http://localhost:6110'

  // The two fetches are independent — run them in parallel.
  const [initialApplication, initialKeys] = await Promise.all([
    getServerApplication({ apiUrl, cookieHeader, id, logger }),
    getServerApiKeys({ apiUrl, cookieHeader, logger }),
  ])

  return (
    <DeveloperDetailClient
      applicationId={id}
      initialApplication={initialApplication ?? undefined}
      initialKeys={initialKeys ?? undefined}
    />
  )
}
