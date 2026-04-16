'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, Div, H3, P, Icon } from '@ezstart/ui/components'

type FeeSummaryCardProps = {
  totalFees: number
  averageFeePercent: number
  transactionCount: number
}

export function FeeSummaryCard({
  totalFees,
  averageFeePercent,
  transactionCount,
}: FeeSummaryCardProps) {
  const t = useTranslations('developer.fees')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="lucide:Receipt" className="h-5 w-5 text-primary" />
          {t('title')}
        </CardTitle>
        <P size="sm" variant="description">
          {t('thisMonth')}
        </P>
      </CardHeader>
      <CardContent>
        <Div className="grid gap-4 sm:grid-cols-3">
          <Div className="space-y-1 rounded-lg border p-4 text-center">
            <P size="sm" variant="description">
              {t('totalFees')}
            </P>
            <H3 className="text-2xl font-bold text-primary">
              ${totalFees.toFixed(2)}
            </H3>
          </Div>
          <Div className="space-y-1 rounded-lg border p-4 text-center">
            <P size="sm" variant="description">
              {t('averageFee')}
            </P>
            <H3 className="text-2xl font-bold text-primary">
              {averageFeePercent.toFixed(1)}%
            </H3>
          </Div>
          <Div className="space-y-1 rounded-lg border p-4 text-center">
            <P size="sm" variant="description">
              {t('transactions')}
            </P>
            <H3 className="text-2xl font-bold text-primary">{transactionCount}</H3>
          </Div>
        </Div>
      </CardContent>
    </Card>
  )
}
