import { Main } from '@ezstart/ui/components'
import type { ReactNode } from 'react'

/**
 * Auth route group layout (login/register/forgot-password/reset/verify).
 *
 * Renders forms full-bleed inside a centered `<Main>`. The locale-root
 * `<AppShell>` short-circuits to bare `children` for `/login`, `/register`,
 * `/forgot-password`, `/reset-password`, `/verify-email` and `/auth/*` (cf.
 * `BARE_PREFIXES` in `app-shell.tsx`), so no header/footer chrome is rendered
 * around these screens. AppShell stays MOUNTED above us though — combined
 * with the SSR `initialUser` bootstrap from `getServerAuth()`, this kills
 * the LoginButton flash that used to appear on cross-group navigations.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Main className="min-h-screen flex items-center justify-center bg-background">{children}</Main>
  )
}
