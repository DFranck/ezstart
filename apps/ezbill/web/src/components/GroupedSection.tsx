import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Icon, KnownIconName, P } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { ReactNode } from 'react'

export type GroupConfig<T = unknown> = {
  id: string
  label: string
  items: T[]
  icon?: KnownIconName
  badge?: string
  badgeVariant?: 'default' | 'accent' | 'muted'
}

type Props<T> = {
  groups: GroupConfig<T>[]
  renderItem: (item: T, index: number) => ReactNode
  useAccordion?: boolean
  defaultOpen?: string[]
  emptyState?: {
    icon: KnownIconName
    iconBg: string
    title: string
    description: string
  }
  className?: string
}

function GroupedSection<T>({
  groups,
  renderItem,
  useAccordion = true,
  defaultOpen,
  emptyState,
  className
}: Props<T>) {
  // Check if all groups are empty
  const isEmpty = groups.every(group => group.items.length === 0)

  if (isEmpty && emptyState) {
    return (
      <div className="text-center py-12">
        <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6', emptyState.iconBg)}>
          <Icon name={emptyState.icon} className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{emptyState.title}</h3>
        <P variant="description">{emptyState.description}</P>
      </div>
    )
  }

  // Filter out empty groups
  const nonEmptyGroups = groups.filter(group => group.items.length > 0)

  // If not using accordion, render flat list
  if (!useAccordion) {
    return (
      <div className={cn('space-y-6', className)}>
        {nonEmptyGroups.map(group => (
          <div key={group.id}>
            <div className="flex items-center gap-2 mb-3">
              {group.icon && (
                <Icon name={group.icon} className="w-4 h-4 text-muted-foreground" />
              )}
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {group.label}
              </h3>
              {group.badge && (
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  group.badgeVariant === 'accent' && 'bg-accent text-accent-foreground',
                  group.badgeVariant === 'muted' && 'bg-muted text-muted-foreground',
                  !group.badgeVariant && 'bg-primary/10 text-primary'
                )}>
                  {group.badge}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {group.items.map((item, idx) => renderItem(item, idx))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Using accordion
  return (
    <Accordion
      type="multiple"
      defaultValue={defaultOpen || nonEmptyGroups.map(g => g.id)}
      className={cn('space-y-2', className)}
    >
      {nonEmptyGroups.map(group => (
        <AccordionItem key={group.id} value={group.id} className="border rounded-xl px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3 w-full">
              {group.icon && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name={group.icon} className="w-4 h-4 text-primary" />
                </div>
              )}
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{group.label}</span>
                  {group.badge && (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      group.badgeVariant === 'accent' && 'bg-accent text-accent-foreground',
                      group.badgeVariant === 'muted' && 'bg-muted text-muted-foreground',
                      !group.badgeVariant && 'bg-primary/10 text-primary'
                    )}>
                      {group.badge}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 pt-2">
            <div className="space-y-3">
              {group.items.map((item, idx) => renderItem(item, idx))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export default GroupedSection
