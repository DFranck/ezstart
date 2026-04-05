'use client'

import {
  Icon,
  SkeletonList,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { useDonations } from '../hooks/useDonations.js'
import { usePurchases } from '../hooks/usePurchases.js'
import { useSubscriptions } from '../hooks/useSubscriptions.js'
import { usePaymentHistory } from '../hooks/usePaymentHistory.js'
import { SubscriptionCard } from './SubscriptionCard.js'
import { PaymentHistory } from './PaymentHistory.js'

export interface UserPaymentDashboardTexts {
  title?: string
  donations?: string
  purchases?: string
  subscriptions?: string
  all?: string
  empty?: string
  activeSubscriptions?: string
}

export interface UserPaymentDashboardProps {
  userId?: string
  showDonations?: boolean
  showPurchases?: boolean
  showSubscriptions?: boolean
  onCancelSubscription?: (subscriptionId: string) => Promise<void>
  className?: string
  texts?: UserPaymentDashboardTexts
}

export function UserPaymentDashboard({
  userId,
  showDonations = true,
  showPurchases = true,
  showSubscriptions = true,
  onCancelSubscription,
  className,
  texts,
}: UserPaymentDashboardProps) {
  const t = {
    title: texts?.title || 'My payments',
    donations: texts?.donations || 'Donations',
    purchases: texts?.purchases || 'Purchases',
    subscriptions: texts?.subscriptions || 'Subscriptions',
    all: texts?.all || 'All',
    empty: texts?.empty || 'No payments yet.',
    activeSubscriptions: texts?.activeSubscriptions || 'Active subscriptions',
  }

  const { payments: allPayments, isLoading: allLoading } = usePaymentHistory({ userId })

  const { donations, isLoading: donationsLoading } = useDonations({
    limit: 50,
    autoLoad: showDonations,
  })

  const { purchases, isLoading: purchasesLoading } = usePurchases({
    userId,
    limit: 50,
    autoLoad: showPurchases,
  })

  const { subscriptions, isLoading: subscriptionsLoading } = useSubscriptions({
    userId,
    limit: 50,
    autoLoad: showSubscriptions,
  })

  const activeSubscriptions = subscriptions.filter(s => s.status === 'completed')

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center gap-4 p-12 rounded-lg border-2 border-dashed border-muted-foreground/20">
      <Icon name="lucide:Receipt" className="w-12 h-12 text-muted-foreground/40" />
      <p className="text-muted-foreground text-center">{message}</p>
    </div>
  )

  return (
    <div className={className}>
      <h2 className="text-2xl font-bold mb-6">{t.title}</h2>

      {/* Active subscriptions at the top */}
      {showSubscriptions && activeSubscriptions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">{t.activeSubscriptions}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeSubscriptions.map(sub => (
              <SubscriptionCard
                key={sub.id}
                subscription={{
                  id: sub.id,
                  projectId: sub.projectId,
                  planName: sub.metadata?.planName as string | undefined,
                  amount: sub.amount,
                  currency: sub.currency,
                  interval: sub.metadata?.interval as string | undefined,
                  intervalCount: sub.metadata?.intervalCount as number | undefined,
                  status: sub.status,
                  metadata: {
                    subscriptionId: sub.metadata?.subscriptionId as string | undefined,
                  },
                }}
                onCancel={onCancelSubscription}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tabs for payment history */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">{t.all}</TabsTrigger>
          {showDonations && <TabsTrigger value="donations">{t.donations}</TabsTrigger>}
          {showPurchases && <TabsTrigger value="purchases">{t.purchases}</TabsTrigger>}
          {showSubscriptions && <TabsTrigger value="subscriptions">{t.subscriptions}</TabsTrigger>}
        </TabsList>

        <TabsContent value="all">
          {allLoading ? (
            <SkeletonList items={4} showAvatar={false} />
          ) : allPayments.length === 0 ? (
            <EmptyState message={t.empty} />
          ) : (
            <PaymentHistory payments={allPayments} />
          )}
        </TabsContent>

        {showDonations && (
          <TabsContent value="donations">
            {donationsLoading ? (
              <SkeletonList items={4} showAvatar={false} />
            ) : donations.length === 0 ? (
              <EmptyState message={t.empty} />
            ) : (
              <PaymentHistory payments={donations} />
            )}
          </TabsContent>
        )}

        {showPurchases && (
          <TabsContent value="purchases">
            {purchasesLoading ? (
              <SkeletonList items={4} showAvatar={false} />
            ) : purchases.length === 0 ? (
              <EmptyState message={t.empty} />
            ) : (
              <PaymentHistory payments={purchases} />
            )}
          </TabsContent>
        )}

        {showSubscriptions && (
          <TabsContent value="subscriptions">
            {subscriptionsLoading ? (
              <SkeletonList items={4} showAvatar={false} />
            ) : subscriptions.length === 0 ? (
              <EmptyState message={t.empty} />
            ) : (
              <PaymentHistory payments={subscriptions} />
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
