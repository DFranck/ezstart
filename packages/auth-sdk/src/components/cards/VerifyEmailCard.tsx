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
import { AuthCardShell, type AuthCardShellProps } from './auth-card-shell.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VerifyEmailCardTexts extends Partial<VerifyEmailFlowTexts> {
  cardTitle?: string
  cardSubtitle?: string
}

export interface VerifyEmailCardProps extends Omit<VerifyEmailFlowProps, 'token'> {
  /**
   * Optional explicit verification token. When omitted, the card reads
   * `?token=` from the URL via `useSearchParams()`.
   */
  token?: string | null
  /** Brand logo shown above the title. */
  logo?: ReactNode
  /** Active locale (e.g. `'en'`, `'fr'`). Defaults to the URL pathname locale. */
  locale?: string
  /** Override the default chrome props. */
  cardShellProps?: Partial<AuthCardShellProps>
  /** Override texts (merged on top of localized defaults). */
  texts?: VerifyEmailCardTexts
}

// ─── Inner content ─────────────────────────────────────────────────────────

function VerifyEmailCardInner({
  token: explicitToken,
  logo,
  cardShellProps,
  texts,
  locale: propLocale,
  ...flowProps
}: VerifyEmailCardProps) {
  const navigation = useAuthNavigation()
  const searchParams = useSearchParams()
  const locale = propLocale ?? navigation.locale
  const formDefaults = getAuthTexts(locale, 'verifyEmail') as Record<string, string>
  const t = {
    ...formDefaults,
    ...(texts as Record<string, string> | undefined),
  } as Required<VerifyEmailCardTexts>
  const flowTexts = t as Partial<VerifyEmailFlowTexts>

  const token = explicitToken ?? searchParams?.get('token') ?? null

  return (
    <AuthCardShell subtitle={t.cardSubtitle} showBackButton logo={logo} {...cardShellProps}>
      <VerifyEmailFlow token={token} texts={flowTexts} {...flowProps} />
    </AuthCardShell>
  )
}

// ─── Public ────────────────────────────────────────────────────────────────

/**
 * Self-contained Verify-Email card — drop-in for `/verify-email?token=...`.
 *
 * Reads the `?token=` URL param automatically and runs the verification flow
 * via `<VerifyEmailFlow>`. Renders consistent chrome (Card + theme switcher
 * + back button + title) across success / already-verified / invalid / error
 * states.
 *
 * @example
 *   // app/[locale]/verify-email/page.tsx
 *   import { VerifyEmailCard } from '@ezstart/auth-sdk/components'
 *   export default function VerifyEmailPage() {
 *     return <VerifyEmailCard />
 *   }
 */
export function VerifyEmailCard(props: VerifyEmailCardProps) {
  return (
    <Suspense fallback={<VerifyEmailCardFallback />}>
      <VerifyEmailCardInner {...props} />
    </Suspense>
  )
}

function VerifyEmailCardFallback() {
  return (
    <AuthCardShell>
      <Div className="flex items-center justify-center min-h-[200px]">
        <Spinner variant="primary" size="lg" />
      </Div>
    </AuthCardShell>
  )
}
