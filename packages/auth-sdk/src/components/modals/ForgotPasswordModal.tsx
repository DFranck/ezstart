'use client'

import { Div, Spinner } from '@ezstart/ui/components'
import { Suspense, type ReactNode } from 'react'
import { useAuthNavigation } from '../../react/useAuthNavigation.js'
import { useKeyConfig } from '../../react/useKeyConfig.js'
import { getAuthTexts } from '../../i18n/index.js'
import {
  ForgotPasswordForm,
  type ForgotPasswordFormProps,
  type ForgotPasswordFormTexts,
} from '../ForgotPasswordForm.js'
import { AuthModalShell, type AuthModalShellProps } from './auth-modal-shell.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ForgotPasswordModalTexts extends Partial<ForgotPasswordFormTexts> {
  cardTitle?: string
  cardSubtitle?: string
}

export interface ForgotPasswordModalProps extends Omit<
  ForgotPasswordFormProps,
  'appName' | 'keyStatus' | 'urlKey'
> {
  /** Whether the modal is open. */
  isOpen: boolean
  /** Callback fired when the modal should close (X icon, Esc, overlay click). */
  onClose?: () => void
  /** Pre-resolved app name (SSR fallback). */
  ssrAppName?: string | null
  /** Brand logo shown above the title. */
  logo?: ReactNode
  /** Override the default chrome props. */
  modalShellProps?: Partial<AuthModalShellProps>
  /** Override texts (merged on top of localized defaults). */
  texts?: ForgotPasswordModalTexts
}

// ─── Inner content ─────────────────────────────────────────────────────────

function ForgotPasswordModalInner({
  isOpen,
  onClose,
  ssrAppName = null,
  logo,
  modalShellProps,
  texts,
  locale: propLocale,
  ...formProps
}: ForgotPasswordModalProps) {
  const navigation = useAuthNavigation()
  const locale = propLocale ?? navigation.locale
  const formDefaults = getAuthTexts(locale, 'forgotPassword') as Record<string, string>
  const t = {
    ...formDefaults,
    ...(texts as Record<string, string> | undefined),
  } as Required<ForgotPasswordModalTexts>
  const formTexts = t as Partial<ForgotPasswordFormTexts>

  const keyConfig = useKeyConfig(navigation.publishableKey)
  const app = keyConfig.appName ?? navigation.app ?? ssrAppName ?? 'ezauth'
  const bannerKeyStatus = navigation.publishableKey
    ? keyConfig.status === 'valid'
      ? ('valid' as const)
      : keyConfig.status === 'invalid'
        ? ('invalid' as const)
        : undefined
    : undefined

  return (
    <AuthModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t.cardTitle}
      subtitle={t.cardSubtitle}
      logo={logo}
      {...modalShellProps}
    >
      <ForgotPasswordForm
        appName={app}
        keyStatus={bannerKeyStatus}
        urlKey={navigation.publishableKey}
        locale={propLocale ?? locale}
        texts={formTexts}
        {...formProps}
      />
    </AuthModalShell>
  )
}

// ─── Public ────────────────────────────────────────────────────────────────

/**
 * Self-contained Forgot-Password modal — embeddable anywhere.
 *
 * Wraps `<ForgotPasswordForm>` inside `<AuthModalShell>` with title + subtitle
 * and theme switcher. The "Back to login" CTA is rendered by the inner form
 * itself.
 *
 * @example
 *   // Standalone /forgot-password page
 *   import { ForgotPasswordModal } from '@ezstart/auth-sdk/components'
 *   import { useRouter } from '@/i18n/navigation'
 *   export default function ForgotPasswordPage() {
 *     const router = useRouter()
 *     return <ForgotPasswordModal isOpen onClose={() => router.push('/')} />
 *   }
 */
export function ForgotPasswordModal(props: ForgotPasswordModalProps) {
  return (
    <Suspense fallback={props.isOpen ? <ForgotPasswordModalFallback {...props} /> : null}>
      <ForgotPasswordModalInner {...props} />
    </Suspense>
  )
}

function ForgotPasswordModalFallback({
  isOpen,
  onClose,
  modalShellProps,
}: ForgotPasswordModalProps) {
  return (
    <AuthModalShell isOpen={isOpen} onClose={onClose} {...modalShellProps}>
      <Div className="flex items-center justify-center min-h-[200px]">
        <Spinner variant="primary" size="lg" />
      </Div>
    </AuthModalShell>
  )
}
