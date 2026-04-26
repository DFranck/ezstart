'use client'

import { Div } from '@ezstart/ui/components'
import type { ReactNode } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuthErrorBannerTexts {
  /** Optional accessible label announced by screen readers via the alert role.
   *  Not rendered visually — useful when the banner contains only an icon or
   *  short snippet that needs a spoken context.
   */
  ariaLabel: string
}

export interface AuthErrorBannerProps {
  /** Error content to display (string, ReactNode, or rich children). */
  children: ReactNode
  /** Extra Tailwind classes appended to the default destructive styling. */
  className?: string
  /** Override default English labels (e.g. for i18n consumers). */
  texts?: Partial<AuthErrorBannerTexts>
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: AuthErrorBannerTexts = {
  ariaLabel: 'Authentication error',
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Reusable destructive error banner for auth forms, modals and settings pages.
 * Uses semantic theme colors (`destructive`) so dark/light mode work without
 * additional config. Zero coupling to any i18n library — pass localized
 * strings via the `texts` prop or render translated children directly.
 *
 * @example
 * ```tsx
 * import { AuthErrorBanner } from '@ezstart/auth-sdk/components'
 *
 * function LoginForm() {
 *   const [error, setError] = useState<string | null>(null)
 *   return (
 *     <>
 *       {error && <AuthErrorBanner>{error}</AuthErrorBanner>}
 *     </>
 *   )
 * }
 * ```
 *
 * @example i18n consumer (next-intl)
 * ```tsx
 * const t = useTranslations('auth.errors')
 * <AuthErrorBanner texts={{ ariaLabel: t('banner.aria') }}>
 *   {t('invalid_credentials')}
 * </AuthErrorBanner>
 * ```
 */
export function AuthErrorBanner({ children, className, texts }: AuthErrorBannerProps) {
  const t = { ...DEFAULT_TEXTS, ...texts }

  return (
    <Div
      role="alert"
      aria-label={t.ariaLabel}
      className={[
        'bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Div>
  )
}
