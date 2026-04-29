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
import { AuthCardShell, type AuthCardShellProps } from './auth-card-shell.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ForgotPasswordCardTexts extends Partial<ForgotPasswordFormTexts> {
  cardTitle?: string
  cardSubtitle?: string
}

export interface ForgotPasswordCardProps extends Omit<
  ForgotPasswordFormProps,
  'appName' | 'keyStatus' | 'urlKey'
> {
  /** Pre-resolved app name (SSR fallback). */
  ssrAppName?: string | null
  /** Brand logo shown above the title. */
  logo?: ReactNode
  /** Override the default chrome props. */
  cardShellProps?: Partial<AuthCardShellProps>
  /** Override texts (merged on top of localized defaults). */
  texts?: ForgotPasswordCardTexts
}

// ─── Inner content ─────────────────────────────────────────────────────────

function ForgotPasswordCardInner({
  ssrAppName = null,
  logo,
  cardShellProps,
  texts,
  locale: propLocale,
  ...formProps
}: ForgotPasswordCardProps) {
  const navigation = useAuthNavigation()
  const locale = propLocale ?? navigation.locale
  const formDefaults = getAuthTexts(locale, 'forgotPassword') as Record<string, string>
  const t = {
    ...formDefaults,
    ...(texts as Record<string, string> | undefined),
  } as Required<ForgotPasswordCardTexts>
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
    <AuthCardShell subtitle={t.cardSubtitle} showBackButton logo={logo} {...cardShellProps}>
      <ForgotPasswordForm
        appName={app}
        keyStatus={bannerKeyStatus}
        urlKey={navigation.publishableKey}
        locale={propLocale ?? locale}
        texts={formTexts}
        {...formProps}
      />
    </AuthCardShell>
  )
}

// ─── Public ────────────────────────────────────────────────────────────────

/**
 * Self-contained Forgot-Password card — drop-in for any `/forgot-password` page.
 *
 * Wraps `<ForgotPasswordForm>` inside `<AuthCardShell>` with title + subtitle,
 * back-button, and theme switcher. The "Back to login" CTA is rendered by the
 * inner form itself.
 *
 * @example
 *   // app/[locale]/forgot-password/page.tsx
 *   import { ForgotPasswordCard } from '@ezstart/auth-sdk/components'
 *   export default function ForgotPasswordPage() {
 *     return <ForgotPasswordCard />
 *   }
 */
export function ForgotPasswordCard(props: ForgotPasswordCardProps) {
  return (
    <Suspense fallback={<ForgotPasswordCardFallback />}>
      <ForgotPasswordCardInner {...props} />
    </Suspense>
  )
}

function ForgotPasswordCardFallback() {
  return (
    <AuthCardShell>
      <Div className="flex items-center justify-center min-h-[200px]">
        <Spinner variant="primary" size="lg" />
      </Div>
    </AuthCardShell>
  )
}
