import type { ReactNode } from 'react'

/**
 * Bare layout — minimal pass-through for routes that ship their own
 * full-screen chrome (`/docs/*` with DocsTopBar + sidebar, `/subscribe/*`
 * for Stripe Checkout return pages, future onboarding flows).
 *
 * Each child page or nested layout owns its visual surface entirely;
 * this group exists to opt out of the public AppShell without forcing
 * each leaf to declare it.
 */
export default function BareLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
