'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Div,
  Skeleton,
} from '@ezstart/ui/components'
import { useConnectStatus } from '../react/hooks/useConnectStatus.js'
import { useConnectOnboard } from '../react/hooks/useConnectOnboard.js'
import { useConnectResume } from '../react/hooks/useConnectResume.js'
import { useConnectDashboardLink } from '../react/hooks/useConnectDashboardLink.js'
import { useConnectDisconnect } from '../react/hooks/useConnectDisconnect.js'
import { useApplicationContext } from '../react/pay-provider.js'
import { ConnectStatusCard, type ConnectStatusCardTexts } from './ConnectStatusCard.js'
import { ConnectOnboardForm, type ConnectOnboardFormTexts } from './ConnectOnboardForm.js'
import { ConnectFeeSummary, type ConnectFeeSummaryTexts } from './ConnectFeeSummary.js'
import type { ConnectAccountType } from '../core/types.js'

export interface DeveloperConnectDashboardTexts {
  connectStatus?: ConnectStatusCardTexts
  onboardForm?: ConnectOnboardFormTexts
  feeSummary?: ConnectFeeSummaryTexts
  disconnectTitle?: string
  disconnectDescription?: string
  disconnectCancel?: string
  disconnectConfirm?: string
  error?: string
}

export interface DeveloperConnectDashboardProps {
  /**
   * Required — the ezauth Application this Connect account is scoped to.
   * Forwarded to the onboarding form and the onboard call so the API can
   * validate ownership and persist the account with the correct
   * `applicationId`.
   */
  applicationId: string
  /**
   * Optional — user locale (e.g. `'en'`, `'fr'`) forwarded to the onboarding
   * API so Stripe's post-onboarding callback redirects the user back to the
   * matching locale route on the EZPay web UI. When omitted, inherits from
   * `<PayProvider locale={…}>` context (default `'en'`).
   */
  locale?: string
  className?: string
  texts?: DeveloperConnectDashboardTexts
  /** Callback when onboarding returns an account link URL */
  onOnboardRedirect?: (url: string) => void
  /** Callback when dashboard link is received */
  onDashboardOpen?: (url: string) => void
  /** Callback on error */
  onError?: (message: string) => void
  /** Callback on successful disconnect */
  onDisconnect?: () => void
  /** Fee data (optional, for display only) */
  feeData?: {
    totalFees: number
    averageFeePercent: number
    transactionCount: number
  }
}

export function DeveloperConnectDashboard({
  applicationId,
  locale,
  className,
  texts,
  onOnboardRedirect,
  onDashboardOpen,
  onError,
  onDisconnect: onDisconnectCallback,
  feeData,
}: DeveloperConnectDashboardProps) {
  const { account, isLoading, refetch } = useConnectStatus({
    applicationId: applicationId || undefined,
  })
  const { onboard, isPending: isOnboarding } = useConnectOnboard()
  const { resume, isPending: isResuming } = useConnectResume()
  const { openDashboard, isLoading: isDashboardLoading } = useConnectDashboardLink()
  const { disconnect } = useConnectDisconnect()
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const { locale: contextLocale } = useApplicationContext()
  const resolvedLocale = locale ?? contextLocale

  const t = {
    disconnectTitle: texts?.disconnectTitle ?? 'Disconnect Account',
    disconnectDescription:
      texts?.disconnectDescription ?? 'Are you sure you want to disconnect your Stripe account?',
    disconnectCancel: texts?.disconnectCancel ?? 'Cancel',
    disconnectConfirm: texts?.disconnectConfirm ?? 'Disconnect',
    error: texts?.error ?? 'An error occurred',
  }

  async function handleOnboard(data: {
    applicationId: string
    email: string
    businessName: string
    type: ConnectAccountType
  }) {
    try {
      const result = await onboard({ ...data, locale: resolvedLocale })
      if (result.accountLinkUrl) {
        if (onOnboardRedirect) {
          onOnboardRedirect(result.accountLinkUrl)
        } else {
          window.location.href = result.accountLinkUrl
        }
      }
    } catch {
      onError?.(t.error)
    }
  }

  async function handleResume() {
    // We need the row id to address the resume endpoint. The status endpoint
    // returns it via `.lean()` so it's always present at runtime, but the
    // optional shape on `ConnectedAccount._id` lets older callers compile.
    if (!account?._id) {
      onError?.(t.error)
      return
    }
    try {
      const result = await resume({ connectedAccountId: account._id, locale: resolvedLocale })
      if (result.accountLinkUrl) {
        if (onOnboardRedirect) {
          onOnboardRedirect(result.accountLinkUrl)
        } else {
          window.location.href = result.accountLinkUrl
        }
      }
    } catch {
      onError?.(t.error)
    }
  }

  async function handleOpenDashboard() {
    const url = await openDashboard()
    if (url) {
      if (onDashboardOpen) {
        onDashboardOpen(url)
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } else {
      onError?.(t.error)
    }
  }

  async function handleConfirmDisconnect() {
    const success = await disconnect()
    if (success) {
      setDisconnectOpen(false)
      onDisconnectCallback?.()
      await refetch()
    } else {
      onError?.(t.error)
    }
  }

  if (isLoading) {
    return (
      <Div className={className}>
        <Div className="space-y-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </Div>
      </Div>
    )
  }

  return (
    <Div className={className}>
      <Div className="space-y-6">
        {account ? (
          <>
            <ConnectStatusCard
              account={account}
              onOpenDashboard={handleOpenDashboard}
              onDisconnect={() => setDisconnectOpen(true)}
              isDashboardLoading={isDashboardLoading}
              onResume={handleResume}
              isResumeLoading={isResuming}
              texts={texts?.connectStatus}
            />

            {account.status === 'active' && feeData && (
              <ConnectFeeSummary
                totalFees={feeData.totalFees}
                averageFeePercent={feeData.averageFeePercent}
                transactionCount={feeData.transactionCount}
                texts={texts?.feeSummary}
              />
            )}
          </>
        ) : (
          <ConnectOnboardForm
            applicationId={applicationId}
            onSubmit={handleOnboard}
            isSubmitting={isOnboarding}
            texts={texts?.onboardForm}
          />
        )}
      </Div>

      <AlertDialog variant="destructive" open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.disconnectTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.disconnectDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.disconnectCancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDisconnect}>
              {t.disconnectConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Div>
  )
}
