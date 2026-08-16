'use client'

import type { ReactNode } from 'react'
import { Button, P } from '@ezstart/ui/components'
import { useBillingPortal } from '../react/hooks/useBillingPortal.js'

export interface ManageSubscriptionButtonTexts {
  label: string
  loading: string
  error: string
}

const DEFAULT_TEXTS: ManageSubscriptionButtonTexts = {
  label: 'Manage subscription',
  loading: 'Loading...',
  error: 'Failed to open billing portal',
}

export interface ManageSubscriptionButtonProps {
  /** URL to redirect to when the user leaves the Stripe portal. */
  returnUrl?: string
  /** Overrides the default button label. */
  children?: ReactNode
  className?: string
  /** Customizable labels (English defaults). */
  texts?: Partial<ManageSubscriptionButtonTexts>
  /** Button style variant. */
  variant?: 'default' | 'outline' | 'ghost'
}

/**
 * Button that opens the Stripe Customer Portal for the authenticated user.
 *
 * The portal lets the customer cancel, upgrade, update payment method, and
 * download invoices — so this component replaces any custom "cancel" /
 * "change plan" UI.
 *
 * @example
 * ```tsx
 * <ManageSubscriptionButton returnUrl={window.location.href} />
 * ```
 */
export function ManageSubscriptionButton({
  returnUrl,
  children,
  className,
  texts: textsProp,
  variant = 'default',
}: ManageSubscriptionButtonProps) {
  const t = { ...DEFAULT_TEXTS, ...textsProp }
  const { openPortal, loading, error } = useBillingPortal()

  return (
    <>
      <Button
        onClick={() => openPortal(returnUrl)}
        disabled={loading}
        variant={variant}
        className={className}
      >
        {loading ? t.loading : (children ?? t.label)}
      </Button>
      {error && <P className="text-destructive text-sm mt-2">{t.error}</P>}
    </>
  )
}
