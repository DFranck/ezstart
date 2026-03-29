'use client'

import { CHART_COLORS } from '@/utils/chart-colors'
import { Invoice, Quote } from '@ezbill/types'
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
  Div,
} from '@ezstart/ui/components'
import { useDevice } from '@ezstart/ui/hooks'
import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'

type CombinedRevenueChartProps = {
  invoices: Invoice[]
  quotes: Quote[]
  className?: string
}

type PeriodType = '6m' | '12m' | 'year'

export function CombinedRevenueChart({ invoices, quotes, className }: CombinedRevenueChartProps) {
  const [period, setPeriod] = useState<PeriodType>('6m')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const { isMobile } = useDevice()

  // 🔒 Force 6 months on mobile (logic-level override)
  const effectivePeriod: PeriodType = isMobile ? '6m' : period

  // Get all years from invoices and quotes
  const availableYears = Array.from(
    new Set([
      ...invoices.map(inv => new Date(inv.createdAt).getFullYear()),
      ...quotes.map(q => new Date(q.createdAt).getFullYear()),
    ])
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

  // 📊 Group PAYMENTS (paid invoices) by paidAt month
  const paymentsByMonth = invoices
    .filter(inv => {
      if (inv.status !== 'paid') return false
      // Use paidAt if available, otherwise fallback to updatedAt
      const payDate = inv.paidAt ? new Date(inv.paidAt) : new Date(inv.updatedAt || inv.createdAt)
      return payDate >= startDate && payDate <= endDate
    })
    .reduce<Record<string, number>>((acc, inv) => {
      const payDate = inv.paidAt ? new Date(inv.paidAt) : new Date(inv.updatedAt || inv.createdAt)
      const key = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}`
      acc[key] = (acc[key] ?? 0) + (inv.total || 0)
      return acc
    }, {})

  // 📈 Group INVOICES CREATED by createdAt month
  const invoicesCreatedByMonth = invoices
    .filter(inv => {
      const date = new Date(inv.createdAt)
      return date >= startDate && date <= endDate
    })
    .reduce<Record<string, number>>((acc, inv) => {
      const d = new Date(inv.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      acc[key] = (acc[key] ?? 0) + (inv.total || 0)
      return acc
    }, {})

  // 📈 Group QUOTES CREATED by createdAt month
  const quotesCreatedByMonth = quotes
    .filter(quote => {
      const date = new Date(quote.createdAt)
      return date >= startDate && date <= endDate
    })
    .reduce<Record<string, number>>((acc, quote) => {
      const d = new Date(quote.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      acc[key] = (acc[key] ?? 0) + (quote.total || 0)
      return acc
    }, {})

  const chartData = monthsInRange.map(({ monthKey, monthLabel }) => ({
    month: monthLabel,
    payments: paymentsByMonth[monthKey] || 0,
    invoices: invoicesCreatedByMonth[monthKey] || 0,
    quotes: quotesCreatedByMonth[monthKey] || 0,
  }))

  const chartConfig = {
    payments: { label: 'Payments', color: CHART_COLORS.payment },
    invoices: { label: 'Invoices', color: CHART_COLORS.invoice },
    quotes: { label: 'Quotes', color: CHART_COLORS.quote },
  } satisfies ChartConfig

  // Hide chart if no data
  if (invoices.length === 0 && quotes.length === 0) return null

  return (
    <Card className={className} variant="floating">
      <CardHeader>
        <Div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Div>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>
              Payments received (bars), invoices & quotes created (lines)
            </CardDescription>
          </Div>

          {/* Controls: hidden on mobile, interactive on desktop */}
          <Div className="flex-wrap gap-2 hidden sm:flex">
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
          </Div>
        </Div>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 0, bottom: 0, left: -14 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
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

            {/* 📊 Bars = Payments (green) */}
            <Bar
              dataKey="payments"
              fill={CHART_COLORS.payment}
              radius={[4, 4, 0, 0]}
              barSize={isMobile ? 24 : 32}
            />

            {/* 📈 Lines = Invoices (blue) & Quotes (orange) */}
            <Line
              type="monotone"
              dataKey="invoices"
              stroke={CHART_COLORS.invoice}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.invoice, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="quotes"
              stroke={CHART_COLORS.quote}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.quote, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
