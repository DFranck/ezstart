import { redirect } from 'next/navigation'

/**
 * Deprecated — unified under `/dashboard` (P8).
 *
 * Applications / API Keys / Stripe Connect / Plans are now tabs inside the
 * unified dashboard sidebar. Detail views (`/developer/applications/[id]`)
 * stay where they are because they are navigated from inside the dashboard
 * via `router.push`.
 */
export default async function DeveloperRedirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/dashboard?section=applications`)
}
