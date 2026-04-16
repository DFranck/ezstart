'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
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
  Card,
  CardContent,
  Div,
  H1,
  Main,
  P,
  Skeleton,
} from '@ezstart/ui/components'
import { useAuth } from '@ezstart/auth-sdk'
import Link from 'next/link'
import { payQuery, callApi } from '../../../config/api'
import { ConnectStatusCard } from './components/connect-status-card'
import { OnboardForm } from './components/onboard-form'
import { FeeSummaryCard } from './components/fee-summary-card'
import { RecentTransactions } from './components/recent-transactions'
import { PlansSection } from './components/plans-section'
import { AuthHeader } from '../auth-header'

// ========================================
// Types
// ========================================

type ConnectedAccount = {
  stripeAccountId: string
  email: string
  businessName: string
  accountType: 'standard' | 'express'
  status: 'pending' | 'active' | 'restricted' | 'disabled'
  chargesEnabled: boolean
  payoutsEnabled: boolean
  defaultFeePercent: number
  onboardedAt: string | null
  createdAt: string
}

type ConnectStatusResponse = {
  connectedAccount: ConnectedAccount | null
}

type DashboardLinkResponse = {
  loginLinkUrl: string
  message?: string
}

type OnboardResponse = {
  accountLinkUrl: string
  connectedAccount: ConnectedAccount
}

// ========================================
// Mock transaction data (until API endpoint exists)
// ========================================

const MOCK_TRANSACTIONS: {
  id: string
  date: string
  amount: number
  fee: number
  net: number
  status: 'completed' | 'pending' | 'failed'
}[] = []

// ========================================
// Component
// ========================================

export default function DeveloperPage() {
  const t = useTranslations('developer')
  const { isAuthenticated } = useAuth()
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const [isDashboardLoading, setIsDashboardLoading] = useState(false)

  // Fetch connect status
  const {
    data: statusData,
    isLoading,
    refetch,
  } = payQuery.useQuery<ConnectStatusResponse>('/connect/status', {
    enabled: isAuthenticated,
  })

  const account = statusData?.connectedAccount ?? null

  // Onboard mutation
  const onboardMutation = payQuery.useMutation<
    OnboardResponse,
    { email: string; businessName: string; type: 'standard' | 'express' }
  >('/connect/onboard', {
    onSuccess: (data) => {
      if (data.accountLinkUrl) {
        window.location.href = data.accountLinkUrl
      }
    },
    onError: () => {
      toast.error(t('error'))
    },
  })

  // ---- Handlers ----

  async function handleOpenDashboard() {
    setIsDashboardLoading(true)
    try {
      const data = await callApi<DashboardLinkResponse>('/connect/dashboard-link')
      if (data.loginLinkUrl) {
        window.open(data.loginLinkUrl, '_blank', 'noopener,noreferrer')
      }
    } catch {
      toast.error(t('error'))
    } finally {
      setIsDashboardLoading(false)
    }
  }

  function handleDisconnect() {
    setDisconnectOpen(true)
  }

  async function confirmDisconnect() {
    try {
      await callApi('/connect/disconnect', { method: 'DELETE' })
      toast.success(t('connect.disconnect.button'))
      setDisconnectOpen(false)
      await refetch()
    } catch {
      toast.error(t('error'))
    }
  }

  function handleOnboard(data: { email: string; businessName: string; type: 'standard' | 'express' }) {
    onboardMutation.mutate(data)
  }

  // ---- Auth guard ----
  if (!isAuthenticated) {
    return (
      <Main className="container mx-auto py-12 px-4">
        <AuthHeader />
        <Div className="max-w-md mx-auto text-center">
          <Card className="p-8">
            <H1 className="text-2xl font-bold mb-4">{t('loginRequired')}</H1>
            <P className="text-muted-foreground">{t('loginRequiredDescription')}</P>
          </Card>
        </Div>
      </Main>
    )
  }

  // ---- Loading ----
  if (isLoading) {
    return (
      <Main className="container mx-auto py-12 px-4">
        <AuthHeader />
        <Div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </Div>
      </Main>
    )
  }

  // ---- Fee calculations (from mock data or account info) ----
  const totalFees = MOCK_TRANSACTIONS.reduce((sum, tx) => sum + tx.fee, 0)
  const avgFee = account?.defaultFeePercent ?? 5
  const txCount = MOCK_TRANSACTIONS.length

  return (
    <Main className="container mx-auto py-12 px-4">
      <AuthHeader />

      <Div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <Div className="flex items-center justify-between">
          <Div>
            <H1 className="text-3xl font-bold">{t('title')}</H1>
            <P variant="description" className="mt-1">
              {t('subtitle')}
            </P>
          </Div>
          <Button asChild variant="outline" size="sm">
            <Link href="/">&larr;</Link>
          </Button>
        </Div>

        {/* Connect section */}
        {account ? (
          <>
            <ConnectStatusCard
              account={account}
              onOpenDashboard={handleOpenDashboard}
              onDisconnect={handleDisconnect}
              isDashboardLoading={isDashboardLoading}
            />

            {account.status === 'active' && (
              <>
                <FeeSummaryCard
                  totalFees={totalFees}
                  averageFeePercent={avgFee}
                  transactionCount={txCount}
                />
                <RecentTransactions transactions={MOCK_TRANSACTIONS} />
              </>
            )}
          </>
        ) : (
          <OnboardForm
            onSubmit={handleOnboard}
            isSubmitting={onboardMutation.isPending}
          />
        )}

        {/* Plans section (always visible) */}
        <PlansSection currentFeePercent={account?.defaultFeePercent ?? 5} />
      </Div>

      {/* Disconnect confirmation */}
      <AlertDialog variant="destructive" open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('connect.disconnect.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('connect.disconnect.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('connect.disconnect.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDisconnect}>
              {t('connect.disconnect.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Main>
  )
}
