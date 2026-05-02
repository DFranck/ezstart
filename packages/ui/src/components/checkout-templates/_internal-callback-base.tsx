'use client'

/**
 * Shared internal base for checkout callback pages
 * (success / cancel for donate / purchase / subscribe).
 *
 * @internal — not exported from the package barrel. Used by:
 *   - DonateSuccessTemplate / DonateCancelTemplate
 *   - PurchaseSuccessTemplate / PurchaseCancelTemplate
 *   - SubscribeSuccessTemplate / SubscribeCancelTemplate
 *
 * Keeps the 6 callback pages DRY while letting each expose its own typed
 * `texts` shape and props surface (consumer-facing API stability).
 *
 * Reads `?session_id=` via `next/navigation`. The host app must be running
 * Next.js — which is the case for every checkout success/cancel landing
 * page (Stripe redirects always hit a Next.js route).
 */

import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useEffect, useState } from 'react'
import { Button } from '../button'
import { Icon, type KnownIconName } from '../icon'
import { Spinner } from '../feedback/spinner'
import { Div, H1, H3, Main, Span, UL, LI } from '../tag'
import { P } from '../tag'

/**
 * One bullet rendered in the "what's next" / "need help" section.
 * `icon` is a lucide icon name (e.g. `'lucide:Mail'`).
 */
export interface CheckoutCallbackStep {
  icon: KnownIconName
  label: string
}

/**
 * Action button rendered in the CTA row.
 * `variant` mirrors the `<Button>` variants from @ezstart/ui.
 */
export interface CheckoutCallbackAction {
  href: string
  label: string
  icon?: KnownIconName
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'secondary' | 'destructive'
}

export type CheckoutCallbackTone = 'success' | 'cancel'

export interface CheckoutCallbackBaseProps {
  /** Visual tone — drives icon container colour + heading colour. */
  tone: CheckoutCallbackTone
  /** Hero icon (lucide name) shown in the round badge. */
  heroIcon: KnownIconName
  /** Page heading. */
  title: string
  /** Subtitle / explanation paragraph below the heading. */
  description: string
  /** Optional auto-redirect destination (success pages only). */
  redirectTo?: string
  /** Auto-redirect delay in ms. Default 3000. Set 0 to disable. */
  redirectDelayMs?: number
  /** Localised redirect message — gets `{seconds}` interpolated. Default: 'Redirecting in {seconds}s…'. */
  redirectingLabel?: string
  /** Called once auto-redirect fires (after delay), before router.push. */
  onComplete?: () => void
  /** CTA buttons (1-2). The first uses the default variant, others outline. */
  actions: CheckoutCallbackAction[]
  /** Title above the bullet list (e.g. "What happens next?" or "Need help?"). */
  stepsTitle: string
  /** Lucide icon for the section title (defaults to Sparkles for success, HelpCircle for cancel). */
  stepsIcon?: KnownIconName
  /** Bullets shown in the panel. Empty array = no panel rendered. */
  steps: CheckoutCallbackStep[]
  /** Reference label rendered below (success only) — gets `{id}` interpolated. */
  referenceLabel?: string
}

function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    values[key] !== undefined ? String(values[key]) : `{${key}}`
  )
}

function CallbackContent(props: CheckoutCallbackBaseProps): React.ReactElement {
  const {
    tone,
    heroIcon,
    title,
    description,
    redirectTo,
    redirectDelayMs = 3000,
    redirectingLabel = 'Redirecting in {seconds}s…',
    onComplete,
    actions,
    stepsTitle,
    stepsIcon,
    steps,
    referenceLabel,
  } = props

  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  // Auto-redirect — only enabled when both redirectTo + non-zero delay are set.
  const enableRedirect = Boolean(redirectTo) && redirectDelayMs > 0
  const totalSeconds = enableRedirect ? Math.max(1, Math.round(redirectDelayMs / 1000)) : 0
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds)

  useEffect(() => {
    if (!enableRedirect || !redirectTo) return
    if (secondsLeft <= 0) {
      onComplete?.()
      router.push(redirectTo)
      return
    }
    const timer = setTimeout(() => setSecondsLeft(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft, enableRedirect, redirectTo, router, onComplete])

  const heroBg = tone === 'success' ? 'bg-primary/10' : 'bg-muted'
  const heroIconColor = tone === 'success' ? 'text-primary' : 'text-muted-foreground'
  const titleColor = tone === 'success' ? 'text-primary' : 'text-muted-foreground'
  const sectionIconName =
    stepsIcon || (tone === 'success' ? 'lucide:Sparkles' : 'lucide:HelpCircle')

  return (
    <Main className="relative pt-24 md:pt-32">
      <Div className="max-w-2xl mx-auto text-center px-4">
        <Div className="mb-12 flex justify-center">
          <Div
            className={`relative w-24 h-24 md:w-32 md:h-32 rounded-full ${heroBg} flex items-center justify-center`}
          >
            <Icon name={heroIcon} className={`w-12 h-12 md:w-16 md:h-16 ${heroIconColor}`} />
          </Div>
        </Div>

        <H1 className="text-4xl md:text-5xl font-bold mb-6">
          <Span className={titleColor}>{title}</Span>
        </H1>

        <P className="text-xl text-muted-foreground mb-6">{description}</P>

        {enableRedirect ? (
          <Div className="flex items-center justify-center gap-3 mb-12 text-sm text-muted-foreground">
            <Spinner variant="primary" size="sm" />
            <Span>{interpolate(redirectingLabel, { seconds: secondsLeft })}</Span>
          </Div>
        ) : null}

        {actions.length > 0 ? (
          <Div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            {actions.map((action, idx) => (
              <Button
                key={`${action.href}-${idx}`}
                asChild
                size="lg"
                variant={action.variant || (idx === 0 ? 'default' : 'outline')}
              >
                <a href={action.href}>
                  {action.icon ? <Icon name={action.icon} className="w-5 h-5 mr-2" /> : null}
                  {action.label}
                </a>
              </Button>
            ))}
          </Div>
        ) : null}

        {steps.length > 0 ? (
          <Div className="p-8 bg-muted/50 rounded-2xl text-left border border-border">
            <H3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Icon name={sectionIconName} className="w-5 h-5 text-primary" />
              {stepsTitle}
            </H3>
            <UL className="space-y-3 text-sm text-muted-foreground">
              {steps.map((step, idx) => (
                <LI key={`step-${idx}`} className="flex items-start gap-3">
                  <Icon name={step.icon} className="w-5 h-5 mt-0.5 text-primary flex-shrink-0" />
                  <Span>{step.label}</Span>
                </LI>
              ))}
            </UL>
          </Div>
        ) : null}

        {sessionId && referenceLabel ? (
          <Div className="mt-6 text-xs text-muted-foreground/60" data-session-id={sessionId}>
            {interpolate(referenceLabel, { id: sessionId.slice(-12) })}
          </Div>
        ) : null}
      </Div>
    </Main>
  )
}

/**
 * Internal Suspense wrapper — `useSearchParams` requires a Suspense boundary
 * in Next.js 15. Not exported from the package barrel.
 *
 * @internal
 */
export function CheckoutCallbackBase(props: CheckoutCallbackBaseProps): React.ReactElement {
  return (
    <Suspense
      fallback={
        <Div className="min-h-[60vh] flex items-center justify-center">
          <Spinner variant="primary" size="lg" />
        </Div>
      }
    >
      <CallbackContent {...props} />
    </Suspense>
  )
}
