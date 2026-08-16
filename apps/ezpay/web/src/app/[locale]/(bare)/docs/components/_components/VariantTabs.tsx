'use client'

import { Tabs, TabsList, TabsTrigger } from '@ezstart/ui/components'

export interface VariantTabsProps {
  /** Variant entries — each declares its label (`'Button'`, `'Modal'`, ...) and the slug used in the URL param. */
  variants: ReadonlyArray<{ label: string; value: string }>
  /** Slug of the variant currently active. */
  activeVariant: string
  /** Fired when the user picks a different variant. The caller is responsible for updating the URL or local state. */
  onChange: (variant: string) => void
  /** Optional aria-label override (defaults to "Variants"). */
  ariaLabel?: string
}

/**
 * Tab strip used to swap between variants of a feature group (Donate
 * Button/Modal/Card/Wall, Subscribe Button/Card/Plan, Purchase
 * Button/Card, ...). Renders as a Radix Tabs `<TabsList>` so keyboard
 * navigation (Left/Right arrows) is free.
 *
 * Stateless — the active variant + the `onChange` handler are both
 * controlled by the caller. The detail page persists the choice via
 * `?variant=<slug>` URL param ; the landing-page card uses local state
 * (no URL pollution since each card has its own variant).
 */
export function VariantTabs({ variants, activeVariant, onChange, ariaLabel }: VariantTabsProps) {
  return (
    <Tabs value={activeVariant} onValueChange={onChange} aria-label={ariaLabel ?? 'Variants'}>
      <TabsList>
        {variants.map(v => (
          <TabsTrigger key={v.value} value={v.value}>
            {v.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
