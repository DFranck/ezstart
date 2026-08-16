'use client'

import { useTranslations } from 'next-intl'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
  Icon,
  P,
} from '@ezstart/ui/components'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ezstart/ui/components'

type Transaction = {
  id: string
  date: string
  amount: number
  fee: number
  net: number
  status: 'completed' | 'pending' | 'failed'
}

type RecentTransactionsProps = {
  transactions: Transaction[]
}

function statusVariant(status: string): 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'completed':
      return 'success'
    case 'pending':
      return 'warning'
    case 'failed':
      return 'destructive'
    default:
      return 'warning'
  }
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const t = useTranslations('developer.transactions')

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="lucide:ArrowLeftRight" className="h-5 w-5 text-primary" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <P variant="description" className="text-center py-8">
            {t('noTransactions')}
          </P>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="lucide:ArrowLeftRight" className="h-5 w-5 text-primary" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('date')}</TableHead>
                <TableHead className="text-right">{t('amount')}</TableHead>
                <TableHead className="text-right">{t('fee')}</TableHead>
                <TableHead className="text-right">{t('net')}</TableHead>
                <TableHead>{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map(tx => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">${tx.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-destructive">
                    -${tx.fee.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">${tx.net.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(tx.status)} size="sm">
                      {t(tx.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Div>
      </CardContent>
    </Card>
  )
}
