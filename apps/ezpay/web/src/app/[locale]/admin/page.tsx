import { redirect } from 'next/navigation'

/**
 * Deprecated — unified under `/dashboard?section=platform` (P8).
 *
 * The PayAdminDashboard now lives inside the Platform section of the
 * unified dashboard (visible to superadmins only).
 */
export default async function AdminRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}/dashboard?section=platform`)
}
