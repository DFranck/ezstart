'use client'

import { Div, Spinner } from '@ezstart/ui/components'
import type { ReactNode } from 'react'

export interface RequireAuthLoaderProps {
  /** Optional text shown below the spinner (typically i18n `t('loading')`). */
  text?: string
  /**
   * Spinner color variant. Defaults to `'primary'` for brand-consistent
   * loading states across the platform.
   */
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'destructive' | 'success' | 'fancy'
  /** Spinner size. Defaults to `'lg'`. */
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl'
  /**
   * Render with a translucent backdrop blur (shadcn-style modal feel).
   * Defaults to `true` for full-screen overlay; pass `false` to render
   * without backdrop (useful for inline embeds).
   */
  backdrop?: boolean
  /**
   * Custom content rendered next to the spinner. Most callers should pass
   * `text` instead — this prop is reserved for richer states (e.g. progress
   * indicators).
   */
  children?: ReactNode
}

/**
 * Pre-styled full-screen loading overlay for `<RequireAuth>`.
 *
 * Uses `@ezstart/ui` Spinner inside a fixed centered Div with optional
 * backdrop blur, giving consumers a shadcn-consistent loading UX without
 * having to reinvent the centering/backdrop pattern in every page.
 *
 * Pass to `RequireAuth` like so:
 *
 * @example
 * ```tsx
 * import { RequireAuth } from '@ezstart/auth-sdk'
 * import { RequireAuthLoader } from '@ezstart/auth-sdk/components'
 * import { useTranslations } from 'next-intl'
 *
 * function AdminPage() {
 *   const t = useTranslations('common')
 *   return (
 *     <RequireAuth loadingComponent={<RequireAuthLoader text={t('loading')} />}>
 *       <AdminDashboard />
 *     </RequireAuth>
 *   )
 * }
 * ```
 *
 * For a no-styling, dependency-free fallback, omit the `loadingComponent`
 * prop entirely — `<RequireAuth>` ships with a built-in agnostic SVG
 * spinner.
 */
export function RequireAuthLoader({
  text,
  variant = 'primary',
  size = 'lg',
  backdrop = true,
  children,
}: RequireAuthLoaderProps) {
  return (
    <Div
      className={
        backdrop
          ? 'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm'
          : 'fixed inset-0 z-50 flex items-center justify-center'
      }
      aria-busy="true"
      role="status"
      aria-label={text || 'Loading'}
    >
      <Spinner variant={variant} size={size} text={text} />
      {children}
    </Div>
  )
}

RequireAuthLoader.displayName = 'RequireAuthLoader'
