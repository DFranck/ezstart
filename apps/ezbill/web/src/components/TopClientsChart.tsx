'use client'

import { CHART_COLORS } from '@/utils/chart-colors'
import { Client, Invoice } from '@ezbill/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@ezstart/ui/components'
import { formatCurrency } from '@ezstart/ui/utils'
import { Cell, Pie, PieChart } from 'recharts'

type TopClientsChartProps = {
  invoices: Invoice[]
  clients: Client[]
  className?: string
}

// Color palette for top 3 clients
const TOP_CLIENT_COLORS = [
  CHART_COLORS.client, // Blue for #1
  '#60a5fa', // Lighter blue for #2
  '#93c5fd', // Even lighter blue for #3
]

export function TopClientsChart({ invoices, clients, className }: TopClientsChartProps) {
  // Calculate revenue per client
  const revenueByClient = invoices
    .filter(inv => inv.status === 'paid')
    .reduce(
      (acc, inv) => {
        acc[inv.clientId] = (acc[inv.clientId] || 0) + (inv.total || 0)
        return acc
      },
      {} as Record<string, number>
    )

  // Helper to truncate long names
  const truncateName = (name: string, maxLength: number = 20) => {
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name
  }

  // Get top 3 clients
  const chartData = Object.entries(revenueByClient)
    .map(([clientId, revenue]) => {
      const client = clients.find(c => c._id === clientId)
      const fullName = client?.clientName || 'Unknown'
      return {
        name: truncateName(fullName),
        fullName, // Keep for tooltip
        revenue,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3)

  const chartConfig = {
    revenue: {
      label: 'Revenue',
      color: CHART_COLORS.client,
    },
  } satisfies ChartConfig

  if (chartData.length === 0) {
    return null
  }

  return (
    <Card className={className} variant={'floating'}>
      <CardHeader>
        <CardTitle>Top 3 Clients</CardTitle>
        <CardDescription>By total revenue</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="fullName" />} />
            <Pie
              data={chartData}
              dataKey="revenue"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={entry => formatCurrency(entry.revenue, 'USD')}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={TOP_CLIENT_COLORS[index]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
