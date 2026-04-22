'use client'

/**
 * Button that swaps a user's active subscription to a different Plan
 * (upgrade / downgrade) via `POST /api/subscriptions/:id/change-plan`.
 *
 * The interaction is guarded by an `AlertDialog` so the user confirms the
 * proration behaviour before the API call fires. The component is
 * self-contained — no surrounding form / modal is required.
 *
 * Peer dependencies: `@ezstart/ui` + an enclosing `<PayProvider>`.
 *
 * @example
 * ```tsx
 * <ChangePlanButton
 *   subscriptionId="sub_123"
 *   currentPlanId="plan_pro_monthly"
 *   targetPlanId="plan_pro_yearly"
 *   targetPlanName="Pro Yearly"
 *   onChanged={refresh}
 * />
 * ```
 */

import { useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Label,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { logger } from '@ezstart/logger'
import { usePayContext } from '../react/pay-provider.js'
import type { ChangePlanRequest } from '../core/types.js'

type ProrationBehavior = NonNullable<ChangePlanRequest['prorationBehavior']>

export interface ChangePlanButtonTexts {
  /** Label rendered on the button when `children` is not provided. */
  label: string
  /** AlertDialog title. */
  title: string
  /**
   * AlertDialog body. Use `{target}` to inject `targetPlanName` and
   * `{current}` for the current plan name (if known).
   */
  description: string
  confirm: string
  cancel: string
  processing: string
  prorationLabel: string
  /** Human description for each proration behaviour. */
  prorationOptions: Record<ProrationBehavior, string>
  toast: {
    success: string
    error: string
    sameAsCurrent: string
  }
}

export const defaultChangePlanButtonTexts: ChangePlanButtonTexts = {
  label: 'Change plan',
  title: 'Change plan',
  description: 'Switch your subscription to {target}.',
  confirm: 'Confirm',
  cancel: 'Cancel',
  processing: 'Switching...',
  prorationLabel: 'Proration',
  prorationOptions: {
    create_prorations:
      'Create prorations — charge the difference on the next invoice (recommended).',
    none: 'No proration — new price takes effect at the next billing cycle.',
    always_invoice: 'Invoice immediately — bill the prorated amount now.',
  },
  toast: {
    success: 'Subscription plan updated',
    error: 'Failed to change subscription plan',
    sameAsCurrent: 'You are already on this plan',
  },
}

function mergeTexts(partial?: Partial<ChangePlanButtonTexts>): ChangePlanButtonTexts {
  if (!partial) return defaultChangePlanButtonTexts
  return {
    ...defaultChangePlanButtonTexts,
    ...partial,
    prorationOptions: {
      ...defaultChangePlanButtonTexts.prorationOptions,
      ...partial.prorationOptions,
    },
    toast: {
      ...defaultChangePlanButtonTexts.toast,
      ...partial.toast,
    },
  }
}

export interface ChangePlanButtonProps {
  /** Stripe subscription id (sub_…) the change applies to. */
  subscriptionId: string
  /** Current plan id — used to short-circuit when the target matches. */
  currentPlanId?: string
  /** Target Plan id (EZPay) to switch to. */
  targetPlanId: string
  /** Target plan name — surfaced in the confirmation copy. */
  targetPlanName?: string
  /** Current plan name — surfaced in the confirmation copy. */
  currentPlanName?: string
  /** Default proration behaviour surfaced in the Select. */
  defaultProrationBehavior?: ProrationBehavior
  /** When true, hides the proration Select and uses `defaultProrationBehavior`. */
  hideProrationSelect?: boolean
  /** Button variant. */
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'secondary'
  /** Button size. */
  size?: 'sm' | 'default' | 'lg' | 'icon'
  /** Override the button label. */
  children?: ReactNode
  className?: string
  /** Fired after a successful switch so parents can refetch their data. */
  onChanged?: (newPlanId: string) => void
  texts?: Partial<ChangePlanButtonTexts>
}

export function ChangePlanButton({
  subscriptionId,
  currentPlanId,
  targetPlanId,
  targetPlanName,
  currentPlanName,
  defaultProrationBehavior = 'create_prorations',
  hideProrationSelect = false,
  variant = 'default',
  size = 'default',
  children,
  className,
  onChanged,
  texts: partialTexts,
}: ChangePlanButtonProps) {
  const texts = mergeTexts(partialTexts)
  const { client } = usePayContext()

  const [open, setOpen] = useState(false)
  const [prorationBehavior, setProrationBehavior] =
    useState<ProrationBehavior>(defaultProrationBehavior)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isSamePlan = !!currentPlanId && currentPlanId === targetPlanId

  const description = texts.description
    .replace('{target}', targetPlanName ?? 'the selected plan')
    .replace('{current}', currentPlanName ?? '')

  function handleOpenChange(next: boolean) {
    if (isSubmitting) return
    setOpen(next)
  }

  function handleClick() {
    if (isSamePlan) {
      toast.info(texts.toast.sameAsCurrent)
      return
    }
    setProrationBehavior(defaultProrationBehavior)
    setOpen(true)
  }

  async function handleConfirm() {
    setIsSubmitting(true)
    try {
      const response = await client.changeSubscriptionPlan(subscriptionId, {
        newPlanId: targetPlanId,
        prorationBehavior,
      })
      toast.success(texts.toast.success)
      setOpen(false)
      onChanged?.(response.newPlanId ?? targetPlanId)
    } catch (err) {
      const message = err instanceof Error ? err.message : texts.toast.error
      logger.error('ChangePlanButton: change plan failed', err instanceof Error ? err : message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={isSamePlan}
      >
        {children ?? texts.label}
      </Button>

      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{texts.title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>

          {!hideProrationSelect && (
            <div className="space-y-2">
              <Label htmlFor="change-plan-proration">{texts.prorationLabel}</Label>
              <Select
                value={prorationBehavior}
                onValueChange={v => setProrationBehavior(v as ProrationBehavior)}
              >
                <SelectTrigger id="change-plan-proration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create_prorations">
                    {texts.prorationOptions.create_prorations}
                  </SelectItem>
                  <SelectItem value="none">{texts.prorationOptions.none}</SelectItem>
                  <SelectItem value="always_invoice">
                    {texts.prorationOptions.always_invoice}
                  </SelectItem>
                </SelectContent>
              </Select>
              <P className="text-xs text-muted-foreground">
                {texts.prorationOptions[prorationBehavior]}
              </P>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>{texts.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
              {isSubmitting ? texts.processing : texts.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
