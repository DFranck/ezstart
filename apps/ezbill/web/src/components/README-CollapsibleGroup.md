# CollapsibleGroup - Group & Collapse Items

## 🎯 What it does

Simple component to **group items with collapse/expand**. Perfect for grouping invoices by month/week/status to avoid long lists.

## 📦 Files

- [`CollapsibleGroup.tsx`](./CollapsibleGroup.tsx) - Main component
- [`group-invoices.ts`](../utils/group-invoices.ts) - Grouping functions
- [`EXAMPLE-with-collapsible.tsx`](../app/dashboard/[clientId]/EXAMPLE-with-collapsible.tsx) - Full usage example

## 🚀 Quick Start

### 1. Import

```tsx
import CollapsibleGroup from '@/components/CollapsibleGroup'
import { groupInvoicesByMonth } from '@/utils/group-invoices'
```

### 2. Group your data

```tsx
const invoicesByMonth = groupInvoicesByMonth(invoices, 'fr')
// Returns:
// [
//   { id: '2025-01', label: 'Janvier 2025 (ce mois)', count: 4, items: [...] },
//   { id: '2024-12', label: 'Décembre 2024', count: 5, items: [...] }
// ]
```

### 3. Render with CollapsibleGroup

```tsx
<CollapsibleGroup
  groups={invoicesByMonth}
  renderItem={(invoice) => <InvoiceCard invoice={invoice} />}
  defaultOpenAll={false}  // Start collapsed
  showToggleAll={true}    // Show "Expand/Collapse All" button
/>
```

## 📋 Visual Result

```
Invoices
12 total invoices                                [Create Invoice]

                                                 [Expand All]

┌──────────────────────────────────────────────────────────┐
│ > January 2025 (ce mois)                      4 items    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ ∨ December 2024                               5 items    │
│   ┌────────────────────────────────────────────────────┐ │
│   │ #INV-2024-0011  paid   15/12/2024  $1120 USD      │ │
│   │                         Download   Receipt         │ │
│   └────────────────────────────────────────────────────┘ │
│   ┌────────────────────────────────────────────────────┐ │
│   │ #INV-2024-0010  paid   10/12/2024  $800 USD       │ │
│   └────────────────────────────────────────────────────┘ │
│   ...                                                    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ > November 2024                               3 items    │
└──────────────────────────────────────────────────────────┘
```

## 🎨 Grouping Functions

### By Month
```tsx
import { groupInvoicesByMonth } from '@/utils/group-invoices'

const groups = groupInvoicesByMonth(invoices, 'fr')
// Groups: January 2025, December 2024, ...
```

### By Week
```tsx
import { groupInvoicesByWeek } from '@/utils/group-invoices'

const groups = groupInvoicesByWeek(invoices, 'fr')
// Groups: Semaine du 6 Jan 2025, Semaine du 30 Dec 2024, ...
```

### By Status
```tsx
import { groupInvoicesByStatus } from '@/utils/group-invoices'

const groups = groupInvoicesByStatus(invoices)
// Groups: Draft, Sent, Paid, Overdue, Cancelled
```

### By Year
```tsx
import { groupInvoicesByYear } from '@/utils/group-invoices'

const groups = groupInvoicesByYear(invoices)
// Groups: 2025, 2024, 2023, ...
```

## ⚙️ Props

```tsx
type Props<T> = {
  groups: GroupItem<T>[]          // Groups to display
  renderItem: (item: T, index: number) => ReactNode  // How to render each item
  defaultOpenAll?: boolean        // Default: true - Open all groups initially
  showToggleAll?: boolean         // Default: false - Show "Expand/Collapse All" button
  emptyMessage?: string           // Message when no groups
  className?: string              // Additional CSS classes
}
```

## 🎯 Use Cases

### Client Invoices Page

Replace flat list with grouped/collapsible view:

```tsx
// BEFORE: Flat list of 50 invoices
<div className="space-y-4">
  {invoices.map(invoice => <InvoiceCard invoice={invoice} />)}
</div>

// AFTER: Grouped by month with collapse/expand
<CollapsibleGroup
  groups={groupInvoicesByMonth(invoices)}
  renderItem={(invoice) => <InvoiceCard invoice={invoice} />}
  defaultOpenAll={false}
  showToggleAll={true}
/>
```

### With Group Selector

Let users choose how to group:

```tsx
const [groupBy, setGroupBy] = useState<'month' | 'week' | 'status'>('month')

const groups =
  groupBy === 'month' ? groupInvoicesByMonth(invoices) :
  groupBy === 'week' ? groupInvoicesByWeek(invoices) :
  groupInvoicesByStatus(invoices)

return (
  <>
    {/* Selector */}
    <div className="flex gap-2">
      <Button onClick={() => setGroupBy('month')}>By Month</Button>
      <Button onClick={() => setGroupBy('week')}>By Week</Button>
      <Button onClick={() => setGroupBy('status')}>By Status</Button>
    </div>

    {/* Groups */}
    <CollapsibleGroup groups={groups} renderItem={...} />
  </>
)
```

## ✅ Benefits

- ✅ **Compact**: 50 invoices → 4-5 groups
- ✅ **Fast navigation**: Click to expand month
- ✅ **Flexible**: Group by month, week, status
- ✅ **Smart indicators**: "ce mois", "cette semaine"
- ✅ **Auto-sorted**: Most recent first in each group
- ✅ **Toggle all**: Open/close all groups in one click

## 🔧 Customization

### Create custom grouping function

```tsx
export function groupInvoicesByClient(invoices: Invoice[]): GroupItem<Invoice>[] {
  const grouped = new Map<string, Invoice[]>()

  invoices.forEach(invoice => {
    const clientName = invoice.clientName
    if (!grouped.has(clientName)) {
      grouped.set(clientName, [])
    }
    grouped.get(clientName)?.push(invoice)
  })

  return Array.from(grouped.entries()).map(([name, items]) => ({
    id: name,
    label: name,
    count: items.length,
    items: items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }))
}
```

## 📝 Full Example

See [EXAMPLE-with-collapsible.tsx](../app/dashboard/[clientId]/EXAMPLE-with-collapsible.tsx) for complete implementation with selector buttons and all features.
