'use client'

/**
 * Header section of the PricingPage: title, subtitle, monthly/yearly toggle.
 *
 * @internal
 */

import { Badge, Button, Div, H2, P } from '@ezstart/ui/components'
import type { BillingCycle, PricingPageTexts } from './pricing-types.js'

export interface PricingHeaderProps {
  texts: PricingPageTexts
  hasYearly: boolean
  billingCycle: BillingCycle
  onCycleChange: (cycle: BillingCycle) => void
  /**
   * Pre-formatted savings label (e.g. "Save 20%"). When `null` the badge is
   * hidden — typically because no plan has `metadata.discountVsMonthly`.
   */
  savingsLabel: string | null
}

export function PricingHeader({
  texts,
  hasYearly,
  billingCycle,
  onCycleChange,
  savingsLabel,
}: PricingHeaderProps) {
  return (
    <>
      <Div className="text-center mb-8">
        <H2 size="h1">{texts.title}</H2>
        <P className="text-muted-foreground text-lg mt-2">{texts.subtitle}</P>
      </Div>

      {hasYearly && (
        <Div className="flex items-center justify-center gap-2 mb-10">
          <Div
            role="tablist"
            aria-label="Billing cycle"
            className="inline-flex items-center rounded-full border bg-muted p-1"
          >
            <Button
              type="button"
              role="tab"
              aria-selected={billingCycle === 'month'}
              variant={billingCycle === 'month' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full"
              onClick={() => onCycleChange('month')}
            >
              {texts.billingMonthly}
            </Button>
            <Button
              type="button"
              role="tab"
              aria-selected={billingCycle === 'year'}
              variant={billingCycle === 'year' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-full"
              onClick={() => onCycleChange('year')}
            >
              {texts.billingYearly}
            </Button>
          </Div>
          {savingsLabel && (
            <Badge variant="success" className="ml-2">
              {savingsLabel}
            </Badge>
          )}
        </Div>
      )}
    </>
  )
}
