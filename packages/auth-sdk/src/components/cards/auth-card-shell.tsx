'use client'

import { BackButton, Card, Div, Span } from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/ui/theme/components'
import type { ReactNode } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuthCardShellProps {
  /**
   * Subtitle / context line rendered inline next to the back button in the
   * sticky header (e.g. "Sign in to access EZAuth"). The big card title
   * was dropped — the subtitle alone provides enough context.
   */
  subtitle?: ReactNode
  /** Form content (the actual `<SignInForm>` / `<SignUpForm>` / etc.). */
  children: ReactNode
  /** Footer content (cross-link + optional submit button). Sticky at the bottom. */
  footer?: ReactNode
  /** Show back button in header (left side). When `true`, renders the SDK's smart `<BackButton>`. */
  showBackButton?: boolean
  /** Optional explicit click handler for the back button (overrides the SDK default). */
  onBack?: () => void
  /** Tooltip / accessible label for the back button. */
  backLabel?: string
  /** Brand logo shown center top below the header row. Optional. */
  logo?: ReactNode
  /** Card max-width — defaults to `'md'` (max-w-md). */
  size?: 'sm' | 'md' | 'lg'
  /** Extra className appended to the outer Card. */
  className?: string
  /**
   * Show theme switcher on tablet/desktop (`md:` breakpoint and up). Hidden
   * on mobile to keep the header row compact alongside back button + subtitle.
   * Defaults to `true`.
   */
  showThemeSwitcher?: boolean
  /**
   * @deprecated Kept for backwards-compat. The title row was dropped — only
   * `subtitle` is rendered in the header now.
   */
  title?: ReactNode
}

// ─── Component ──────────────────────────────────────────────────────────────

const sizeClasses: Record<NonNullable<AuthCardShellProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

/**
 * Internal shell for self-contained auth cards. Mimics the modal `scrollBehavior='inside'`
 * pattern: sticky header (back + theme + logo + title + subtitle), scrollable body
 * (form content), sticky footer (submit button + cross-link). Card never overflows
 * the viewport — body scrolls internally so chrome (back / theme / submit / link)
 * stays visible at all viewport heights, especially on mobile.
 *
 * Consumers should reach for the public `<SignInCard>` / `<SignUpCard>` / etc.
 * components instead of using this directly.
 *
 * @internal
 */
export function AuthCardShell({
  subtitle,
  children,
  footer,
  showBackButton = false,
  onBack,
  backLabel,
  logo,
  showThemeSwitcher = true,
  size = 'md',
  className,
}: AuthCardShellProps) {
  const widthClass = sizeClasses[size]
  const cardClassName = [
    widthClass,
    'w-full relative flex flex-col max-h-full overflow-hidden p-0 gap-0',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const hasHeader = showBackButton || subtitle || logo || showThemeSwitcher

  return (
    <Card className={cardClassName}>
      {hasHeader && (
        <Div className="sticky top-0 z-10 bg-card border-b border-border/60">
          <Div className="flex items-center gap-3 px-3 py-2 min-h-[3rem]">
            {showBackButton && (
              <BackButton
                {...(onBack ? { onClick: onBack } : {})}
                title={backLabel}
                className="shrink-0"
              />
            )}
            {subtitle && (
              <Span className="block flex-1 text-sm text-foreground truncate md:text-center">
                {subtitle}
              </Span>
            )}
            {showThemeSwitcher && (
              <Div className="hidden md:flex shrink-0">
                <ThemeSwitcher />
              </Div>
            )}
          </Div>
          {logo && (
            <Div className="flex justify-center px-6 pb-3">
              <Div className="flex justify-center">{logo}</Div>
            </Div>
          )}
        </Div>
      )}

      <Div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">{children}</Div>

      {footer && (
        <Div className="sticky bottom-0 z-10 bg-card border-t border-border/60 px-6 py-4">
          {footer}
        </Div>
      )}
    </Card>
  )
}
