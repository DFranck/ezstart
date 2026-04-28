import type { ReactNode } from 'react'

/**
 * Dashboard route group layout (dashboard / admin / developer / account).
 *
 * Pass-through wrapper. The locale-root `<AppShell>` short-circuits to bare
 * `children` for these prefixes (cf. `BARE_PREFIXES` in `app-shell.tsx`), so
 * the dashboard pages render their own full-screen chrome
 * (`<EZAuthDashboard>`, `<AuthAdminDashboard>`, ...) without the landing
 * header/footer wrapping them. AppShell stays MOUNTED above this group
 * though — combined with the SSR `initialUser` bootstrap from
 * `getServerAuth()`, this kills the LoginButton flash that used to appear
 * on cross-group navigations like `/dashboard` → `/`.
 */
export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
