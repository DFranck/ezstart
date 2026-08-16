import type { ReactNode } from 'react'
import { AppShell } from '@/components/app-shell'

/**
 * Public marketing layout — wraps `(public)/*` routes (`/`, `/about`,
 * `/pricing`, `/blog`, `/contact`, `/privacy`, `/terms`, `/status`,
 * `/changelog`) with the `<AppShell>` (header + footer + UserMenu).
 *
 * Sibling route groups (`(app)/`, `(auth)/`, `(bare)/`) own their own
 * chrome — Next.js auto-swaps the active layout on cross-group navigation,
 * which kills the routeMode-cache class of bug we used to hit when one
 * shared layout had to conditionally render different chromes.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
