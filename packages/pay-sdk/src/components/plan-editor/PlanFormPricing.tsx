'use client'

/**
 * Pricing fields section of the plan editor: amount, currency, interval,
 * intervalCount, trialDays, billingGroup, discountVsMonthly (yearly only).
 *
 * Pure presentational sub-component — receives values + setters from the
 * parent `PlanEditorDialog`.
 *
 * @internal
 */

import {
  Div,
  Input,
  Label,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ezstart/ui/components'
import type {
  Currency,
  Interval,
  PlanEditorDialogTexts,
  PlanFormFieldErrors,
} from './plan-editor-types.js'

export interface PlanFormPricingProps {
  amount: string
  currency: Currency
  interval: Interval
  intervalCount: string
  trialDays: string
  billingGroup: string
  discountVsMonthly: string
  onAmountChange: (value: string) => void
  onCurrencyChange: (value: Currency) => void
  onIntervalChange: (value: Interval) => void
  onIntervalCountChange: (value: string) => void
  onTrialDaysChange: (value: string) => void
  onBillingGroupChange: (value: string) => void
  onDiscountVsMonthlyChange: (value: string) => void
  errors: PlanFormFieldErrors
  texts: PlanEditorDialogTexts
}

export function PlanFormPricing({
  amount,
  currency,
  interval,
  intervalCount,
  trialDays,
  billingGroup,
  discountVsMonthly,
  onAmountChange,
  onCurrencyChange,
  onIntervalChange,
  onIntervalCountChange,
  onTrialDaysChange,
  onBillingGroupChange,
  onDiscountVsMonthlyChange,
  errors,
  texts,
}: PlanFormPricingProps) {
  return (
    <>
      <Div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Div className="space-y-2">
          <Label htmlFor="plan-amount">{texts.amountLabel}</Label>
          <Input
            id="plan-amount"
            inputMode="decimal"
            placeholder={texts.amountPlaceholder}
            value={amount}
            onChange={e => onAmountChange(e.target.value)}
            aria-invalid={!!errors.amount}
          />
          {errors.amount && <P className="text-xs text-destructive">{errors.amount}</P>}
        </Div>

        <Div className="space-y-2">
          <Label>{texts.currencyLabel}</Label>
          <Select value={currency} onValueChange={v => onCurrencyChange(v as Currency)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
            </SelectContent>
          </Select>
        </Div>
      </Div>

      <Div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Div className="space-y-2">
          <Label>{texts.intervalLabel}</Label>
          <Select value={interval} onValueChange={v => onIntervalChange(v as Interval)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{texts.intervalMonth}</SelectItem>
              <SelectItem value="year">{texts.intervalYear}</SelectItem>
            </SelectContent>
          </Select>
        </Div>

        <Div className="space-y-2">
          <Label htmlFor="plan-interval-count">{texts.intervalCountLabel}</Label>
          <Input
            id="plan-interval-count"
            type="number"
            min={1}
            max={12}
            value={intervalCount}
            onChange={e => onIntervalCountChange(e.target.value)}
            aria-invalid={!!errors.intervalCount}
          />
          {errors.intervalCount ? (
            <P className="text-xs text-destructive">{errors.intervalCount}</P>
          ) : (
            <P className="text-xs text-muted-foreground">{texts.intervalCountHelp}</P>
          )}
        </Div>
      </Div>

      <Div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Div className="space-y-2">
          <Label htmlFor="plan-trial-days">{texts.trialDaysLabel}</Label>
          <Input
            id="plan-trial-days"
            type="number"
            min={0}
            max={90}
            value={trialDays}
            onChange={e => onTrialDaysChange(e.target.value)}
            aria-invalid={!!errors.trialDays}
          />
          {errors.trialDays ? (
            <P className="text-xs text-destructive">{errors.trialDays}</P>
          ) : (
            <P className="text-xs text-muted-foreground">{texts.trialDaysHelp}</P>
          )}
        </Div>

        <Div className="space-y-2">
          <Label htmlFor="plan-billing-group">{texts.billingGroupLabel}</Label>
          <Input
            id="plan-billing-group"
            value={billingGroup}
            onChange={e => onBillingGroupChange(e.target.value)}
            placeholder="pro"
            maxLength={100}
          />
          <P className="text-xs text-muted-foreground">{texts.billingGroupHelp}</P>
        </Div>
      </Div>

      {interval === 'year' && (
        <Div className="space-y-2">
          <Label htmlFor="plan-discount-vs-monthly">{texts.discountVsMonthlyLabel}</Label>
          <Input
            id="plan-discount-vs-monthly"
            type="number"
            min={0}
            max={100}
            step={1}
            value={discountVsMonthly}
            onChange={e => onDiscountVsMonthlyChange(e.target.value)}
            placeholder="20"
            aria-invalid={!!errors.discountVsMonthly}
          />
          {errors.discountVsMonthly ? (
            <P className="text-xs text-destructive">{errors.discountVsMonthly}</P>
          ) : (
            <P className="text-xs text-muted-foreground">{texts.discountVsMonthlyHelp}</P>
          )}
        </Div>
      )}
    </>
  )
}
