'use client'

import { Button, Div, P } from '@ezstart/ui/components'
import Link from 'next/link'
import type { SignUpFormTexts } from './types.js'

/** @internal */
export interface SignUpSuccessProps {
  texts: SignUpFormTexts
  backToLoginHref: string
  onBackToLogin?: () => void
}

/**
 * Post-registration confirmation view — "check your email" + back-to-login
 * link/button. Rendered by `<SignUpForm>` once `registered` flips to true.
 *
 * @internal
 */
export function SignUpSuccess({ texts, backToLoginHref, onBackToLogin }: SignUpSuccessProps) {
  return (
    <Div className="space-y-4 text-center py-4">
      <Div className="text-4xl">&#9993;</Div>
      <P className="font-semibold text-lg">{texts.checkEmail}</P>
      <P className="text-sm text-muted-foreground">{texts.checkEmailDescription}</P>
      <Div className="pt-2">
        {onBackToLogin ? (
          <Button
            type="button"
            variant="link"
            className="text-sm text-muted-foreground hover:text-foreground font-medium underline-offset-4 hover:underline cursor-pointer"
            onClick={onBackToLogin}
          >
            {texts.backToLogin}
          </Button>
        ) : (
          <Button asChild variant="link" className="text-sm text-muted-foreground">
            <Link href={backToLoginHref}>{texts.backToLogin}</Link>
          </Button>
        )}
      </Div>
    </Div>
  )
}
