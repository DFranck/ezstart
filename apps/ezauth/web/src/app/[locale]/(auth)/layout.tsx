import { Main } from '@ezstart/ui/components'
import type { ReactNode } from 'react'

/**
 * Auth route group layout (login/register/forgot-password/reset/verify).
 *
 * Renders forms full-bleed inside a centered `<Main>`. The auth pages
 * themselves mount a `<SignInModal>` (etc.) portal with `backdrop='opaque'`
 * — the modal IS the page surface; the centered Main provides a pleasant
 * fallback during the SSR → hydration window before the Radix portal mounts.
 *
 * No AppShell chrome here — sibling route groups (`(public)`, `(dashboard)`,
 * `(bare)`) own their own layouts independently.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Main className="min-h-screen flex items-center justify-center bg-background">{children}</Main>
  )
}
