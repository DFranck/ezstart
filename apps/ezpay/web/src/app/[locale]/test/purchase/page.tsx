'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, Div, H3, P } from '@ezstart/ui/components'
import { PurchaseButton, PaymentHistory, usePurchases } from '@ezstart/pay-sdk'

export default function TestPurchasePage() {
  const t = useTranslations('test')
  const { user } = useAuth()
  const { purchases, isLoading } = usePurchases({ userId: user?._id, limit: 20 })

  const products = [
    {
      id: 'ezpay-test-item',
      nameKey: 'products.testItem' as const,
      descKey: 'products.testItemDesc' as const,
      amount: 9.99,
    },
    {
      id: 'ezpay-premium-pass',
      nameKey: 'products.premiumPass' as const,
      descKey: 'products.premiumPassDesc' as const,
      amount: 24.99,
    },
  ]

  return (
    <Div className="space-y-8">
      {/* Purchase Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.purchases')}</CardTitle>
          <P variant="description">{t('sections.purchasesDesc')}</P>
        </CardHeader>
        <CardContent>
          <Div className="grid sm:grid-cols-2 gap-4">
            {products.map(product => (
              <Div key={product.id} className="p-4 border rounded-lg flex flex-col gap-3">
                <H3 className="font-semibold">{t(product.nameKey)}</H3>
                <P size="sm" variant="description">
                  {t(product.descKey)}
                </P>
                <PurchaseButton
                  projectId="ezpay"
                  productId={product.id}
                  productName={t(product.nameKey)}
                  amount={product.amount}
                  currency="EUR"
                  description={t(product.descKey)}
                  userId={user?._id}
                  userEmail={user?.email}
                  userName={user?.username}
                />
              </Div>
            ))}
          </Div>
        </CardContent>
      </Card>

      {/* Purchase History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sections.history')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentHistory
            payments={purchases || []}
            loading={isLoading}
            emptyMessage={t('noPurchases')}
          />
        </CardContent>
      </Card>
    </Div>
  )
}
