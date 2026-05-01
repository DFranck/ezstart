'use client'

import type { ReactNode } from 'react'
import { Div } from '../tag'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ErrorAlertTexts {
  /** Optional accessible label announced by screen readers via the alert role.
   *  Not rendered visually — useful when the banner contains only an icon or
   *  short snippet that needs a spoken context.
   */
  ariaLabel: string
}

export interface ErrorAlertProps {
  /** Error content to display (string, ReactNode, or rich children). */
  children: ReactNode
  /** Extra Tailwind classes appended to the default destructive styling. */
  className?: string
  /** Override default English labels (e.g. for i18n consumers). */
  texts?: Partial<ErrorAlertTexts>
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: ErrorAlertTexts = {
  ariaLabel: 'Error',
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Reusable destructive error banner for forms, modals and settings pages.
 * Uses semantic theme colors (`destructive`) so dark/light mode work without
 * additional config. Zero coupling to any i18n library — pass localized
 * strings via the `texts` prop or render translated children directly.
 *
 * @example
 * ```tsx
 * import { ErrorAlert } from '@ezstart/ui/components'
 *
 * function LoginForm() {
 *   const [error, setError] = useState<string | null>(null)
 *   return (
 *     <>
 *       {error && <ErrorAlert>{error}</ErrorAlert>}
 *     </>
 *   )
 * }
 * ```
 *
 * @example i18n consumer (next-intl)
 * ```tsx
 * const t = useTranslations('auth.errors')
 * <ErrorAlert texts={{ ariaLabel: t('banner.aria') }}>
 *   {t('invalid_credentials')}
 * </ErrorAlert>
 * ```
 */
export function ErrorAlert({ children, className, texts }: ErrorAlertProps) {
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
