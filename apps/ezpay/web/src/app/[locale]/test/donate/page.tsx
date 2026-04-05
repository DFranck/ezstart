'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, Div, P } from '@ezstart/ui/components'
import {
  DonateButton,
  DonateModal,
  DonationWall,
  PaymentHistory,
  useDonations,
} from '@ezstart/pay-sdk'

export default function TestDonatePage() {
  const t = useTranslations('test')
  const { user } = useAuth()
  const { donations, isLoading } = useDonations({ projectId: 'ezpay', limit: 20 })

  return (
    <Div className="space-y-8">
      {/* Donate Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.donations')}</CardTitle>
          <P variant="description">{t('sections.donationsDesc')}</P>
        </CardHeader>
        <CardContent className="space-y-6">
          <Div className="flex flex-wrap gap-4">
            {[5, 10, 25, 50, 100].map(amount => (
              <DonateModal
                key={amount}
                projectId="ezpay"
                projectName="EZPay Development"
                amounts={[amount]}
                currency="EUR"
                userId={user?._id}
                userEmail={user?.email}
                userName={user?.username}
                trigger={<DonateButton>❤️ €{amount}</DonateButton>}
              />
            ))}
          </Div>
        </CardContent>
      </Card>

      {/* Donation Wall */}
      <Card>
        <CardHeader>
          <CardTitle>Donation Wall</CardTitle>
        </CardHeader>
        <CardContent>
          <DonationWall
            projectId="ezpay"
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
