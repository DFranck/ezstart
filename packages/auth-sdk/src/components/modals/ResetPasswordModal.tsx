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
import { AuthModalShell, type AuthModalShellProps } from './auth-modal-shell.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ResetPasswordModalTexts extends Partial<ResetPasswordFormTexts> {
  cardTitle?: string
  cardSubtitle?: string
  loading?: string
}

export interface ResetPasswordModalProps extends Omit<ResetPasswordFormProps, 'token'> {
  /** Whether the modal is open. */
  isOpen: boolean
  /** Callback fired when the modal should close (X icon, Esc, overlay click). */
  onClose?: () => void
  /**
   * Optional explicit token. When omitted, the modal reads `?token=` from
   * the URL via `useSearchParams()` (matches the historical ezauth flow).
   */
  token?: string | null
  /** Brand logo shown above the title. */
  logo?: ReactNode
  /** Override the default chrome props. */
  modalShellProps?: Partial<AuthModalShellProps>
  /** Override texts (merged on top of localized defaults). */
  texts?: ResetPasswordModalTexts
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

function ResetPasswordModalInner({
  isOpen,
  onClose,
  token: explicitToken,
  logo,
  modalShellProps,
  texts,
  locale: propLocale,
  onValidateToken,
  ...formProps
}: ResetPasswordModalProps) {
  const navigation = useAuthNavigation()
  const searchParams = useSearchParams()
  const locale = propLocale ?? navigation.locale
  const formDefaults = getAuthTexts(locale, 'resetPassword') as Record<string, string>
  const t = {
    ...formDefaults,
    ...(texts as Record<string, string> | undefined),
  } as Required<ResetPasswordModalTexts>
  const formTexts = t as Partial<ResetPasswordFormTexts>

  const token = explicitToken ?? searchParams?.get('token') ?? null
  const handleValidateToken = useCallback(
    (tokenValue: string) =>
      onValidateToken ? onValidateToken(tokenValue) : defaultValidateResetToken(tokenValue),
    [onValidateToken]
  )

  return (
    <AuthModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t.cardTitle}
      subtitle={t.cardSubtitle}
      logo={logo}
      {...modalShellProps}
    >
      <ResetPasswordForm
        token={token}
        onValidateToken={handleValidateToken}
        requestNewLinkHref={navigation.forgotPasswordHref}
        locale={propLocale ?? locale}
        texts={formTexts}
        {...formProps}
      />
    </AuthModalShell>
  )
}

// ─── Public ────────────────────────────────────────────────────────────────

/**
 * Self-contained Reset-Password modal — embeddable anywhere.
 *
 * Reads the `?token=` URL param automatically (override via `token` prop) and
 * pre-validates it via `POST /auth/validate-reset-token` so the user sees a
 * dedicated "expired link" view instead of submitting the form blindly.
 *
 * @example
 *   // Standalone /reset-password page
 *   import { ResetPasswordModal } from '@ezstart/auth-sdk/components'
 *   import { useRouter } from '@/i18n/navigation'
 *   export default function ResetPasswordPage() {
 *     const router = useRouter()
 *     return <ResetPasswordModal isOpen onClose={() => router.push('/')} />
 *   }
 */
export function ResetPasswordModal(props: ResetPasswordModalProps) {
  return (
    <Suspense fallback={props.isOpen ? <ResetPasswordModalFallback {...props} /> : null}>
      <ResetPasswordModalInner {...props} />
    </Suspense>
  )
}

function ResetPasswordModalFallback({ isOpen, onClose, modalShellProps }: ResetPasswordModalProps) {
  return (
    <AuthModalShell isOpen={isOpen} onClose={onClose} {...modalShellProps}>
      <Div className="flex items-center justify-center min-h-[200px]">
        <Spinner variant="primary" size="lg" />
      </Div>
    </AuthModalShell>
  )
}
