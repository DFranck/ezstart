'use client'

import StatsCard from '@/components/StatsCard'

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
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
      <StatsCard
        title="Total Revenue"
        value={`$${totalRevenue.toFixed(2)}`}
        icon="lucide:DollarSign"
        iconGradient="bg-gradient-to-r from-ezbill-green-400 to-ezbill-emerald-400"
      />
      <StatsCard
        title="Pending"
        value={`$${pendingAmount.toFixed(2)}`}
        icon="lucide:Clock"
        iconGradient="bg-gradient-to-r from-orange-400 to-red-400"
      />
      <StatsCard
        title="Invoices"
        value={invoicesCount.toString()}
        icon="lucide:FileEdit"
        iconGradient="bg-gradient-to-r from-ezbill-blue-400 to-ezbill-indigo-400"
      />
      <StatsCard
        title="Quotes"
        value={quotesCount.toString()}
        icon="lucide:FileText"
        iconGradient="bg-gradient-to-r from-ezbill-purple-400 to-ezbill-pink-400"
      />
    </div>
  )
}
