'use client'

import { Button, Div, P, Spinner } from '@ezstart/ui/components'
import Link from 'next/link'
import type { ResetPasswordFormTexts } from './types.js'

/** @internal */
export interface ResetPasswordStateProps {
  texts: ResetPasswordFormTexts
  backHref: string
  forgotHref: string
  requestNewLinkHref: string
}

/**
 * "No token" state — the link is missing the `?token=` param entirely.
 *
 * @internal
 */
export function ResetPasswordNoToken({ texts, forgotHref }: ResetPasswordStateProps) {
  return (
    <Div className="space-y-4">
      <P className="text-center text-sm text-destructive">{texts.invalidToken}</P>
      <Div className="text-center">
        <Button asChild variant="link" className="text-sm text-muted-foreground">
          <Link href={forgotHref}>{texts.tryAgain}</Link>
        </Button>
      </Div>
    </Div>
  )
}

/**
 * Pre-validation spinner shown while `onValidateToken` resolves.
 *
 * @internal
 */
export function ResetPasswordValidating({ texts }: Pick<ResetPasswordStateProps, 'texts'>) {
  return (
    <Div className="flex flex-col items-center justify-center gap-3 py-6">
      <Spinner variant="primary" size="lg" />
      <P className="text-sm text-muted-foreground m-0">{texts.validating}</P>
    </Div>
  )
}

/**
 * "Token expired / invalid" state — covers both pre-validation rejection and
 * a server-side `INVALID_OR_EXPIRED_TOKEN` on submit.
 *
 * @internal
 */
export function ResetPasswordTokenExpired({
  texts,
  backHref,
  requestNewLinkHref,
}: ResetPasswordStateProps) {
  return (
    <Div className="space-y-4">
      <Div
        role="alert"
        className="bg-destructive/10 border border-destructive/40 text-destructive px-4 py-3 rounded-md text-sm text-center"
      >
        <P className="text-sm text-destructive m-0">{texts.tokenExpired}</P>
      </Div>
      <Div className="text-center">
        <Button asChild variant="default" className="w-full">
          <Link href={requestNewLinkHref}>{texts.requestNewLink}</Link>
        </Button>
      </Div>
      <Div className="text-center">
        <Button asChild variant="link" className="text-sm text-muted-foreground">
          <Link href={backHref}>{texts.backToLogin}</Link>
        </Button>
      </Div>
    </Div>
  )
}

/**
 * Success state — password was reset; offer a manual back-to-login link in
 * addition to the auto-redirect handled by the parent.
 *
 * @internal
 */
export function ResetPasswordSuccess({
  texts,
  backHref,
}: Pick<ResetPasswordStateProps, 'texts' | 'backHref'>) {
  return (
    <Div className="space-y-4">
      <P className="text-center text-sm text-success">{texts.success}</P>
      <Div className="text-center">
        <Button asChild variant="link" className="text-sm text-muted-foreground">
          <Link href={backHref}>{texts.backToLogin}</Link>
        </Button>
      </Div>
    </Div>
  )
}
