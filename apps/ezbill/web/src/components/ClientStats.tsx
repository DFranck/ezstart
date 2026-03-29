'use client'

import StatsCard from '@/components/StatsCard'
import { useTranslations } from 'next-intl'
import { Div } from '@ezstart/ui/components'

interface ClientStatsProps {
  totalRevenue: number
  pendingAmount: number
  invoicesCount: number
  quotesCount: number
}

export function ClientStats({
  totalRevenue,
  pendingAmount,
  invoicesCount,
  quotesCount,
}: ClientStatsProps) {
  const tDashboard = useTranslations('dashboard')
  return (
    <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
      <StatsCard
        title={tDashboard('totalRevenue')}
        value={`$${totalRevenue.toFixed(2)}`}
        icon="lucide:DollarSign"
        iconGradient="bg-gradient-payment"
      />
      <StatsCard
        title={tDashboard('pending')}
        value={`$${pendingAmount.toFixed(2)}`}
        icon="lucide:Clock"
        iconGradient="bg-gradient-to-r from-orange-400 to-red-400"
      />
      <StatsCard
        title={tDashboard('invoices')}
        value={invoicesCount.toString()}
        icon="lucide:FileEdit"
        iconGradient="bg-gradient-invoice"
      />
      <StatsCard
        title={tDashboard('quotes')}
        value={quotesCount.toString()}
        icon="lucide:FileText"
        iconGradient="bg-gradient-receipt"
      />
    </Div>
  )
}
