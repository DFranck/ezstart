import { redirect } from 'next/navigation'

/**
 * Deprecated — unified under `/dashboard?section=account` (P8).
 *
 * This server-side redirect preserves legacy bookmarks. RBAC-scoped sections
 * (my profile, my apps users, platform users) are now rendered as sidebar
 * entries inside the unified dashboard.
 */
export default async function AccountRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  redirect(`/${locale}/dashboard?section=account`)
}
