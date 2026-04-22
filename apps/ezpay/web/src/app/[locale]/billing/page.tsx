import { redirect } from 'next/navigation'

/**
 * Deprecated — unified under `/dashboard?section=billing` (P8).
 *
 * My subscription, my apps revenue, and the platform overview are now
 * rendered inside the Billing section of the unified dashboard.
 */
export default async function BillingRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}/dashboard?section=billing`)
}
