'use client'

import { CHART_COLORS } from '@/utils/chart-colors'
import { Invoice } from '@ezbill/types'
import {
  Button,
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
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

type RevenueChartProps = {
  invoices: Invoice[]
  className?: string
}

type PeriodType = '6m' | '12m' | 'year'

export function RevenueChart({ invoices, className }: RevenueChartProps) {
  const [period, setPeriod] = useState<PeriodType>('12m')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  // Get all available years from invoices
  const availableYears = Array.from(
    new Set(
      invoices
        .filter(inv => inv.status === 'paid')
        .map(inv => new Date(inv.updatedAt || inv.createdAt).getFullYear())
    )
  ).sort((a, b) => b - a)

  // Calculate date range based on period
  const getDateRange = () => {
    const now = new Date()
    const startDate = new Date()

    if (period === '6m') {
      startDate.setMonth(now.getMonth() - 5)
      startDate.setDate(1)
    } else if (period === '12m') {
      startDate.setMonth(now.getMonth() - 11)
      startDate.setDate(1)
    } else {
      // year
      startDate.setFullYear(selectedYear, 0, 1)
      now.setFullYear(selectedYear, 11, 31)
    }

    return { startDate, endDate: now }
  }

  const { startDate, endDate } = getDateRange()

  // Generate all months in range
  const monthsInRange: Array<{ monthKey: string; monthLabel: string }> = []
  const current = new Date(startDate)

  while (current <= endDate) {
    const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    monthsInRange.push({ monthKey, monthLabel })
    current.setMonth(current.getMonth() + 1)
  }

  // Group paid invoices by month
  const revenueByMonth = invoices
    .filter(inv => {
      if (inv.status !== 'paid') return false
      const date = new Date(inv.updatedAt || inv.createdAt)
      return date >= startDate && date <= endDate
    })
    .reduce(
      (acc, inv) => {
        const date = new Date(inv.updatedAt || inv.createdAt)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        if (!acc[monthKey]) {
          acc[monthKey] = 0
        }
        acc[monthKey] += inv.total || 0

        return acc
      },
      {} as Record<string, number>
    )

  // Create chart data with all months (including zero revenue months)
  const chartData = monthsInRange.map(({ monthKey, monthLabel }) => ({
    month: monthLabel,
    revenue: revenueByMonth[monthKey] || 0,
  }))

  const chartConfig = {
    revenue: {
      label: 'Revenue',
      color: CHART_COLORS.payment,
    },
  } satisfies ChartConfig

  if (invoices.filter(inv => inv.status === 'paid').length === 0) {
    return null
  }

  return (
    <Card className={className} variant={'floating'}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription>Total paid invoices by month</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={period === '6m' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('6m')}
            >
              6 Months
            </Button>
            <Button
              variant={period === '12m' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('12m')}
            >
              12 Months
            </Button>
            <Button
              variant={period === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('year')}
            >
              Year
            </Button>
            {period === 'year' && availableYears.length > 0 && (
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-muted-foreground"
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-muted-foreground"
              tickFormatter={value => `$${value}`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="revenue" fill={CHART_COLORS.payment} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
