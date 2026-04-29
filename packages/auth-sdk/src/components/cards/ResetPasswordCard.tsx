'use client'

import { apiCall, ApiError, parseApiErrorCode } from '@ezstart/api-sdk'
import { Div, Spinner } from '@ezstart/ui/components'
import { Suspense, useCallback, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { getAuthTexts } from '../../i18n/index.js'
import {
  ResetPasswordForm,
  type ResetPasswordFormProps,
  type ResetPasswordFormTexts,
} from '../ResetPasswordForm.js'
import { useAuthNavigation } from '../../react/useAuthNavigation.js'
import { AuthCardShell, type AuthCardShellProps } from './auth-card-shell.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ResetPasswordCardTexts extends Partial<ResetPasswordFormTexts> {
  cardTitle?: string
  cardSubtitle?: string
  loading?: string
}

export interface ResetPasswordCardProps extends Omit<ResetPasswordFormProps, 'token'> {
  /**
   * Optional explicit token. When omitted, the card reads `?token=` from
   * the URL via `useSearchParams()` (matches the historical ezauth flow).
   */
  token?: string | null
  /** Brand logo shown above the title. */
  logo?: ReactNode
  /** Override the default chrome props. */
  cardShellProps?: Partial<AuthCardShellProps>
  /** Override texts (merged on top of localized defaults). */
  texts?: ResetPasswordCardTexts
}

// ─── Default token validator ──────────────────────────────────────────────

async function defaultValidateResetToken(
  token: string
): Promise<{ valid: boolean; code?: string }> {
  try {
    const data = await apiCall<{ valid: boolean }>('/auth/validate-reset-token', {
      appName: 'ezauth',
      method: 'POST',
      body: { token },
    })
    return { valid: data?.valid === true }
  } catch (err: unknown) {
    if (ApiError.isApiError(err)) {
      const code = parseApiErrorCode(err.data)
      return code ? { valid: false, code } : { valid: false }
    }
    return { valid: false }
  }
}

// ─── Inner content ─────────────────────────────────────────────────────────

function ResetPasswordCardInner({
  token: explicitToken,
  logo,
  cardShellProps,
  texts,
  locale: propLocale,
  onValidateToken,
  ...formProps
}: ResetPasswordCardProps) {
  const navigation = useAuthNavigation()
  const searchParams = useSearchParams()
  const locale = propLocale ?? navigation.locale
  const formDefaults = getAuthTexts(locale, 'resetPassword') as Record<string, string>
  const t = {
    ...formDefaults,
    ...(texts as Record<string, string> | undefined),
  } as Required<ResetPasswordCardTexts>
  const formTexts = t as Partial<ResetPasswordFormTexts>

  const token = explicitToken ?? searchParams?.get('token') ?? null
  const handleValidateToken = useCallback(
    (tokenValue: string) =>
      onValidateToken ? onValidateToken(tokenValue) : defaultValidateResetToken(tokenValue),
    [onValidateToken]
  )

  return (
    <AuthCardShell subtitle={t.cardSubtitle} showBackButton logo={logo} {...cardShellProps}>
      <ResetPasswordForm
        token={token}
        onValidateToken={handleValidateToken}
        requestNewLinkHref={navigation.forgotPasswordHref}
        locale={propLocale ?? locale}
        texts={formTexts}
        {...formProps}
      />
    </AuthCardShell>
  )
}

// ─── Public ────────────────────────────────────────────────────────────────

/**
 * Self-contained Reset-Password card — drop-in for `/reset-password?token=...`.
 *
 * Reads the `?token=` URL param automatically (override via `token` prop) and
 * pre-validates it via `POST /auth/validate-reset-token` so the user sees a
 * dedicated "expired link" view instead of submitting the form blindly.
 *
 * @example
 *   // app/[locale]/reset-password/page.tsx
 *   import { ResetPasswordCard } from '@ezstart/auth-sdk/components'
 *   export default function ResetPasswordPage() {
 *     return <ResetPasswordCard />
 *   }
 */
export function ResetPasswordCard(props: ResetPasswordCardProps) {
  return (
    <Suspense fallback={<ResetPasswordCardFallback />}>
      <ResetPasswordCardInner {...props} />
    </Suspense>
  )
}

function ResetPasswordCardFallback() {
  return (
    <AuthCardShell>
      <Div className="flex items-center justify-center min-h-[200px]">
        <Spinner variant="primary" size="lg" />
      </Div>
    </AuthCardShell>
  )
}
