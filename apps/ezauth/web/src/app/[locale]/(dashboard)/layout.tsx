import type { ReactNode } from 'react'

/**
 * Dashboard route group layout (dashboard / admin / developer / account).
 *
 * Pass-through wrapper — each leaf page mounts its own dashboard chrome
 * (`<EZAuthDashboard>`, `<AuthAdminDashboard>`, ...) which already provides
 * sidebar + content header. No AppShell here; the public marketing chrome
 * lives in `(public)/layout.tsx` and Next.js auto-swaps to this layout on
 * cross-group navigation.
 */
export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
