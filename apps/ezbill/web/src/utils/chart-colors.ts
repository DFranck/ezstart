/**
 * Chart Colors for EZBill
 *
 * These hex colors match the OKLCH colors defined in globals.css
 * but are suitable for use in Recharts/SVG which don't support CSS variables.
 *
 * Mapping:
 * - client: oklch(0.731 0.165 210) → #3b82f6 (blue-500)
 * - payment: oklch(0.754 0.184 146) → #10b981 (emerald-500)
 * - invoice: oklch(0.640 0.178 251) → #6366f1 (indigo-500)
 * - company: oklch(0.667 0.223 295) → #a855f7 (purple-500)
 * - receipt: oklch(0.667 0.223 295) → #d946ef (fuchsia-500)
 * - quote: Same as payment (green)
 */
export const CHART_COLORS = {
  // Entity colors
  client: '#3b82f6',      // Cyan-Blue - Individual clients
  company: '#a855f7',     // Purple - Corporate entities
  payment: '#10b981',     // Green-Emerald - Money, revenue, payments

  // Document type colors
  invoice: '#6366f1',     // Blue-Indigo - Invoices
  quote: '#10b981',       // Green - Quotes (same as payment)
  receipt: '#d946ef',     // Purple-Pink - Receipts

  // Status colors (for pie charts)
  paid: '#10b981',        // Green - Successfully paid
  sent: '#6366f1',        // Blue - Sent/pending
  draft: '#94a3b8',       // Gray - Work in progress
  accepted: '#10b981',    // Green - Accepted quotes
  rejected: '#ef4444',    // Red - Rejected quotes
  pending: '#f59e0b',     // Orange-Amber - Pending action
} as const

/**
 * Get chart color by type
 * @param type - The type of data being charted
 * @returns Hex color string
 */
export function getChartColor(type: keyof typeof CHART_COLORS): string {
  return CHART_COLORS[type]
}

/**
 * Chart config for common use cases
 */
export const CHART_CONFIGS = {
  revenue: {
    label: 'Revenue',
    color: CHART_COLORS.payment,
  },
  invoices: {
    label: 'Invoices',
    color: CHART_COLORS.invoice,
  },
  quotes: {
    label: 'Quotes',
    color: CHART_COLORS.quote,
  },
  clients: {
    label: 'Clients',
    color: CHART_COLORS.client,
  },
  companies: {
    label: 'Companies',
    color: CHART_COLORS.company,
  },
} as const
