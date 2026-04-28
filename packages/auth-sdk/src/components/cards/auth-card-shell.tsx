'use client'

import {
  BackButton,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Div,
  P,
} from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/ui/theme/components'
import type { ReactNode } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuthCardShellProps {
  /** Card title (e.g. "Sign in to MyApp"). When omitted, no title row is rendered. */
  title?: ReactNode
  /** Optional subtitle / description shown below title. */
  subtitle?: ReactNode
  /** Form content (the actual `<SignInForm>` / `<SignUpForm>` / etc.). */
  children: ReactNode
  /** Footer cross-link content (e.g. "Don't have an account? Sign up"). */
  footer?: ReactNode
  /** Show back button in header (left side). When `true`, renders the SDK's smart `<BackButton>`. */
  showBackButton?: boolean
  /** Optional explicit click handler for the back button (overrides the SDK default). */
  onBack?: () => void
  /** Tooltip / accessible label for the back button. */
  backLabel?: string
  /** Brand logo shown center top. Pass `<img>` / `<Logo>` or skip for text-only brand. */
  logo?: ReactNode
  /** Show theme switcher in header (default: true). */
  showThemeSwitcher?: boolean
  /** Card max-width — defaults to `'md'` (max-w-md). */
  size?: 'sm' | 'md' | 'lg'
  /** Extra className appended to the outer Card. */
  className?: string
}

// ─── Component ──────────────────────────────────────────────────────────────

const sizeClasses: Record<NonNullable<AuthCardShellProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

/**
 * Internal shell for self-contained auth cards (`<SignInCard>` / `<SignUpCard>` /
 * etc.). Provides the consistent chrome — Card container, header with optional
 * back button + theme switcher, brand logo, title/subtitle, and a footer slot
 * for cross-links — so every auth screen shipped via the SDK looks identical
 * across consumer apps.
 *
 * Consumers should reach for the public `<SignInCard>` / `<SignUpCard>` / etc.
 * components instead of using this directly. Exported for advanced custom
 * cards only.
 *
 * @internal
 */
export function AuthCardShell({
  title,
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
  const cardClassName = [widthClass, 'w-full relative max-h-[90vh] overflow-y-auto', className]
    .filter(Boolean)
    .join(' ')

  const hasHeaderActions = showBackButton || showThemeSwitcher

  return (
    <Card className={cardClassName}>
      {hasHeaderActions && (
        <>
          {showBackButton && (
            <Div className="absolute top-4 left-4 z-10">
              <BackButton {...(onBack ? { onClick: onBack } : {})} title={backLabel} />
            </Div>
          )}
          {showThemeSwitcher && (
            <Div className="absolute top-4 right-4 z-10">
              <ThemeSwitcher />
            </Div>
          )}
        </>
      )}

      {(logo || title || subtitle) && (
        <CardHeader className="text-center pb-4 pt-12">
          {logo && <Div className="flex justify-center mb-3">{logo}</Div>}
          {title &&
            (typeof title === 'string' ? (
              <CardTitle className="text-xl md:text-2xl font-bold">{title}</CardTitle>
            ) : (
              <CardTitle>{title}</CardTitle>
            ))}
          {subtitle &&
            (typeof subtitle === 'string' ? (
              <CardDescription className="text-xs md:text-sm">{subtitle}</CardDescription>
            ) : (
              <CardDescription>{subtitle}</CardDescription>
            ))}
        </CardHeader>
      )}

      <CardContent className="space-y-4">{children}</CardContent>

      {footer && (
        <CardFooter className="flex justify-center pb-6 pt-2">
          <P size="xs" className="text-center">
            {footer}
          </P>
        </CardFooter>
      )}
    </Card>
  )
}
