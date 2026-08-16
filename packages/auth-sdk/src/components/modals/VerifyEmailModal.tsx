'use client'

import { Div, Spinner } from '@ezstart/ui/components'
import { Suspense, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { getAuthTexts } from '../../i18n/index.js'
import { useAuthNavigation } from '../../react/useAuthNavigation.js'
import {
  VerifyEmailFlow,
  type VerifyEmailFlowProps,
  type VerifyEmailFlowTexts,
} from '../VerifyEmailFlow.js'
import { AuthModalShell, type AuthModalShellProps } from './auth-modal-shell.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VerifyEmailModalTexts extends Partial<VerifyEmailFlowTexts> {
  cardTitle?: string
  cardSubtitle?: string
}

export interface VerifyEmailModalProps extends Omit<VerifyEmailFlowProps, 'token'> {
  /** Whether the modal is open. */
  isOpen: boolean
  /** Callback fired when the modal should close (X icon, Esc, overlay click). */
  onClose?: () => void
  /**
   * Optional explicit verification token. When omitted, the modal reads
   * `?token=` from the URL via `useSearchParams()`.
   */
  token?: string | null
  /** Brand logo shown above the title. */
  logo?: ReactNode
  /** Active locale (e.g. `'en'`, `'fr'`). Defaults to the URL pathname locale. */
  locale?: string
  /** Override the default chrome props. */
  modalShellProps?: Partial<AuthModalShellProps>
  /** Override texts (merged on top of localized defaults). */
  texts?: VerifyEmailModalTexts
}

// ─── Inner content ─────────────────────────────────────────────────────────

function VerifyEmailModalInner({
  isOpen,
  onClose,
  token: explicitToken,
  logo,
  modalShellProps,
  texts,
  locale: propLocale,
  ...flowProps
}: VerifyEmailModalProps) {
  const navigation = useAuthNavigation()
  const searchParams = useSearchParams()
  const locale = propLocale ?? navigation.locale
  const formDefaults = getAuthTexts(locale, 'verifyEmail') as Record<string, string>
  const t = {
    ...formDefaults,
    ...(texts as Record<string, string> | undefined),
  } as Required<VerifyEmailModalTexts>
  const flowTexts = t as Partial<VerifyEmailFlowTexts>

  const token = explicitToken ?? searchParams?.get('token') ?? null

  return (
    <AuthModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={t.cardTitle}
      subtitle={t.cardSubtitle}
      logo={logo}
      {...modalShellProps}
    >
      <VerifyEmailFlow token={token} texts={flowTexts} {...flowProps} />
    </AuthModalShell>
  )
}

// ─── Public ────────────────────────────────────────────────────────────────

/**
 * Self-contained Verify-Email modal — embeddable anywhere.
 *
 * Reads the `?token=` URL param automatically and runs the verification flow
 * via `<VerifyEmailFlow>`. Renders consistent chrome (Modal + theme switcher
 * + title) across success / already-verified / invalid / error states.
 *
 * @example
 *   // Standalone /verify-email page
 *   import { VerifyEmailModal } from '@ezstart/auth-sdk/components'
 *   import { useRouter } from '@/i18n/navigation'
 *   export default function VerifyEmailPage() {
 *     const router = useRouter()
 *     return <VerifyEmailModal isOpen onClose={() => router.push('/')} />
 *   }
 */
export function VerifyEmailModal(props: VerifyEmailModalProps) {
  return (
    <Suspense fallback={props.isOpen ? <VerifyEmailModalFallback {...props} /> : null}>
      <VerifyEmailModalInner {...props} />
    </Suspense>
  )
}

function VerifyEmailModalFallback({ isOpen, onClose, modalShellProps }: VerifyEmailModalProps) {
  return (
    <AuthModalShell isOpen={isOpen} onClose={onClose} {...modalShellProps}>
      <Div className="flex items-center justify-center min-h-[200px]">
        <Spinner variant="primary" size="lg" />
      </Div>
    </AuthModalShell>
  )
}
