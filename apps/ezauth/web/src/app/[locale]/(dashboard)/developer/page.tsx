import { redirect } from 'next/navigation'

/**
 * Deprecated — unified under `/dashboard?section=applications` (P8).
 *
 * The Applications list now lives inside the unified dashboard sidebar.
 * Detail views (`/developer/[id]`) stay where they are because they are
 * navigated from inside the dashboard via `router.push`.
 */
export default async function DeveloperRedirect({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/dashboard?section=applications`)
}
