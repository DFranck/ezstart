'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, Div } from '@ezstart/ui/components'
import {
  DonationCard,
  DonationWall,
  PaymentHistory,
  useDonations,
} from '@ezstart/pay-sdk'

export default function TestDonatePage() {
  const t = useTranslations('test')
  const { user } = useAuth()
  const { donations, isLoading } = useDonations({ limit: 20 })

  return (
    <Div className="space-y-8">
      {/* Donation Card */}
      <DonationCard
        appName="ezpay"
        projectId="ezpay"
        projectName="EZPay Development"
        presetAmounts={[5, 10]}
        currency="EUR"
        allowCustomAmount
        userId={user?._id}
        userEmail={user?.email}
        userName={user?.username}
      />

      {/* Donation Wall */}
      <Card>
        <CardHeader>
          <CardTitle>Donation Wall</CardTitle>
        </CardHeader>
        <CardContent>
          <DonationWall
            limit={20}
            texts={{ noDonationsText: t('noDonations') }}
          />
        </CardContent>
      </Card>

      {/* Donation History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.history')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentHistory
            payments={donations || []}
            loading={isLoading}
            emptyMessage={t('noDonations')}
          />
        </CardContent>
      </Card>
    </Div>
  )
}
