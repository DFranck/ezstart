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
import { useDevice } from '@ezstart/ui/hooks'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

type RevenueChartProps = {
  invoices: Invoice[]
  className?: string
}

type PeriodType = '6m' | '12m' | 'year'

export function RevenueChart({ invoices, className }: RevenueChartProps) {
  const [period, setPeriod] = useState<PeriodType>('6m')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const { isMobile } = useDevice()

  // 🔒 Force 6 months on mobile (logic-level override)
  const effectivePeriod: PeriodType = isMobile ? '6m' : period

  const availableYears = Array.from(
    new Set(
      invoices
        .filter(inv => inv.status === 'paid')
        .map(inv => new Date(inv.updatedAt || inv.createdAt).getFullYear())
    )
  ).sort((a, b) => b - a)

  // Calculate date range based on the *effective* period
  const getDateRange = () => {
    const now = new Date()
    const startDate = new Date()

    if (effectivePeriod === '6m') {
      startDate.setMonth(now.getMonth() - 5)
      startDate.setDate(1)
    } else if (effectivePeriod === '12m') {
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
  const cursor = new Date(startDate)

  while (cursor <= endDate) {
    const yyyy = cursor.getFullYear()
    const mm = String(cursor.getMonth() + 1).padStart(2, '0')

    // 👇 Mobile label: MM/YY ; Desktop: "Sep 2025"
    const monthLabel = isMobile
      ? `${mm}/${String(yyyy).slice(-2)}`
      : cursor.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

    monthsInRange.push({
      monthKey: `${yyyy}-${mm}`,
      monthLabel,
    })

    cursor.setMonth(cursor.getMonth() + 1)
  }

  // Group paid invoices by month in range
  const revenueByMonth = invoices
    .filter(inv => {
      if (inv.status !== 'paid') return false
      const date = new Date(inv.updatedAt || inv.createdAt)
      return date >= startDate && date <= endDate
    })
    .reduce<Record<string, number>>((acc, inv) => {
      const d = new Date(inv.updatedAt || inv.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      acc[key] = (acc[key] ?? 0) + (inv.total || 0)
      return acc
    }, {})

  const chartData = monthsInRange.map(({ monthKey, monthLabel }) => ({
    month: monthLabel,
    revenue: revenueByMonth[monthKey] || 0,
  }))

  const chartConfig = {
    revenue: { label: 'Revenue', color: CHART_COLORS.payment },
  } satisfies ChartConfig

  if (invoices.every(inv => inv.status !== 'paid')) return null

  return (
    <Card className={className} variant="floating">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription>Total paid invoices by month</CardDescription>
          </div>

          {/* Controls: hidden on mobile, interactive on desktop */}
          <div className="flex-wrap gap-2 hidden sm:flex">
            <Button
              variant={period === '6m' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('6m')}
            >
              6 Months
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
                className="hidden md:inline-block px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground"
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
          <BarChart
            data={chartData}
            barCategoryGap={isMobile ? 8 : 16}
            margin={{ top: 0, right: 0, bottom: 0, left: -14 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
              // Mobile: horizontal labels; Desktop: angled for density
              angle={isMobile ? 0 : -45}
              textAnchor={isMobile ? 'middle' : 'end'}
              height={isMobile ? 36 : 80}
              padding={{ left: 0, right: 0 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
              tickFormatter={value => `$${value}`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="revenue"
              fill={CHART_COLORS.payment}
              radius={[4, 4, 0, 0]}
              barSize={isMobile ? 28 : 38}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
