import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Icon,
  Div,
  Span,
} from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { ReactNode, useState } from 'react'

export type GroupItem<T = unknown> = {
  id: string
  label: string
  count: number
  items: T[]
}

type Props<T> = {
  groups: GroupItem<T>[]
  renderItem: (item: T, index: number) => ReactNode
  getItemKey?: (item: T, index: number) => string
  defaultOpenAll?: boolean
  showToggleAll?: boolean
  emptyMessage?: string
  className?: string
}

/**
 * CollapsibleGroup - Simple component to group items with collapse/expand
 *
 * Perfect for grouping invoices by month, quotes by status, etc.
 *
 * @example
 * ```tsx
 * const invoicesByMonth = groupInvoicesByMonth(invoices)
 *
 * <CollapsibleGroup
 *   groups={invoicesByMonth}
 *   renderItem={(invoice) => <InvoiceCard invoice={invoice} />}
 *   defaultOpenAll={false}
 *   showToggleAll={true}
 * />
 * ```
 */
function CollapsibleGroup<T>({
  groups,
  renderItem,
  getItemKey,
  defaultOpenAll = true,
  showToggleAll = false,
  emptyMessage,
  className,
}: Props<T>) {
  const [openGroups, setOpenGroups] = useState<string[]>(
    defaultOpenAll ? groups.map(g => g.id) : groups.length > 0 && groups[0] ? [groups[0].id] : []
  )

  const toggleAll = () => {
    if (openGroups.length === groups.length) {
      setOpenGroups([])
    } else {
      setOpenGroups(groups.map(g => g.id))
    }
  }

  if (groups.length === 0 && emptyMessage) {
    return <Div className="text-center py-8 text-muted-foreground">{emptyMessage}</Div>
  }

  const allOpen = openGroups.length === groups.length

  return (
    <Div className={cn('space-y-3', className)}>
      {/* Toggle All Button */}
      {showToggleAll && groups.length > 1 && (
        <Div className="flex justify-end mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            className="text-muted-foreground hover:text-foreground"
          >
            <Icon
              name={allOpen ? 'lucide:ChevronsDown' : 'lucide:ChevronsRight'}
              className="w-4 h-4 mr-2"
            />
            {allOpen ? 'Collapse All' : 'Expand All'}
          </Button>
        </Div>
      )}

      {/* Accordion Groups */}
      <Accordion
        type="multiple"
        value={openGroups}
        onValueChange={setOpenGroups}
        className="space-y-3"
      >
        {groups.map(group => (
          <AccordionItem
            key={group.id}
            value={group.id}
            className="border rounded-xl bg-card !border-b"
          >
            <AccordionTrigger className="hover:no-underline px-4 py-3">
              <Div className="flex items-center justify-between w-full pr-2">
                <Div className="flex items-center gap-3">
                  <Span className="font-semibold text-base">{group.label}</Span>
                  <Badge variant="secondary" className="font-normal">
                    {group.count} {group.count === 1 ? 'item' : 'items'}
                  </Badge>
                </Div>
              </Div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              <Div className="space-y-3">
                {group.items.map((item, idx) => {
                  const key = getItemKey ? getItemKey(item, idx) : `${group.id}-item-${idx}`
                  return <Div key={key}>{renderItem(item, idx)}</Div>
                })}
              </Div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Div>
  )
}

export default CollapsibleGroup
