'use client'

import { Card, CardContent, CardHeader, CardTitle, Div, H3, Icon, P } from '@ezstart/ui/components'

export interface ConnectFeeSummaryTexts {
  title?: string
  thisMonth?: string
  totalFees?: string
  averageFee?: string
  transactions?: string
}

export interface ConnectFeeSummaryProps {
  totalFees: number
  averageFeePercent: number
  transactionCount: number
  className?: string
  texts?: ConnectFeeSummaryTexts
}

export function ConnectFeeSummary({
  totalFees,
  averageFeePercent,
  transactionCount,
  className,
  texts,
}: ConnectFeeSummaryProps) {
  const t = {
    title: texts?.title ?? 'Fee Summary',
    thisMonth: texts?.thisMonth ?? 'This month',
    totalFees: texts?.totalFees ?? 'Total Fees',
    averageFee: texts?.averageFee ?? 'Average Fee',
    transactions: texts?.transactions ?? 'Transactions',
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="lucide:Receipt" className="h-5 w-5 text-primary" />
          {t.title}
        </CardTitle>
        <P size="sm" variant="description">{t.thisMonth}</P>
      </CardHeader>
      <CardContent>
        <Div className="grid gap-4 sm:grid-cols-3">
          <Div className="space-y-1 rounded-lg border p-4 text-center">
            <P size="sm" variant="description">{t.totalFees}</P>
            <H3 className="text-2xl font-bold text-primary">
              ${totalFees.toFixed(2)}
            </H3>
          </Div>
          <Div className="space-y-1 rounded-lg border p-4 text-center">
            <P size="sm" variant="description">{t.averageFee}</P>
            <H3 className="text-2xl font-bold text-primary">
              {averageFeePercent.toFixed(1)}%
            </H3>
          </Div>
          <Div className="space-y-1 rounded-lg border p-4 text-center">
            <P size="sm" variant="description">{t.transactions}</P>
            <H3 className="text-2xl font-bold text-primary">{transactionCount}</H3>
          </Div>
        </Div>
      </CardContent>
    </Card>
  )
}
