'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import { Badge } from './badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './card'
import { Div, P, Span } from '../tag'
import { formatCurrency as defaultFormatCurrency } from '../../utils/format-currency'

export interface ProductCardTexts {
  /** @internal — kept for backward-compat with deprecated pay-sdk re-export. */
  buyButton?: string
  /** @internal — kept for backward-compat with deprecated pay-sdk re-export. */
  subscribeButton?: string
}

export type ProductCardType = 'purchase' | 'subscription'

export interface ProductCardProps {
  /** Product display name shown in the card header. */
  name: string
  /** Optional short description rendered under the name (max ~2 lines). */
  description?: string
  /** Numeric price (eg. `10.5`) — formatted via `formatCurrency`. */
  price: number
  /** ISO 4217 currency code. Defaults to `'EUR'`. */
  currency?: string
  /** Optional product image URL (rendered fill / 16:9 via `next/image`). */
  image?: string
  /** Optional badge label (top-right corner, e.g. "Bestseller", "New"). */
  badge?: string
  /** Whether to render a price suffix (e.g. ` / mo`) for recurring billing. */
  type?: ProductCardType
  /**
   * Subscription billing interval in months. Used only when `type === 'subscription'`
   * to render a `/mo`, `/yr`, or `/Nmo` suffix. Defaults to `1`.
   */
  intervalCount?: number
  /**
   * Caller-provided action button (e.g. `<PurchaseButton>`, `<SubscribeButton>`,
   * `<Link href=...>Buy</Link>`). Rendered in the card footer.
   *
   * Required so `<ProductCard>` stays presentation-only and doesn't depend on
   * any payment SDK. Pair it with `@ezstart/pay-sdk`'s `<PurchaseButton>` /
   * `<SubscribeButton>` for the standard Stripe flow.
   */
  actionSlot: ReactNode
  /** Extra Tailwind classes appended to the outer `<Card>`. */
  className?: string
  /**
   * Custom currency formatter — overrides the default
   * `Intl.NumberFormat('en-US', { style: 'currency', currency })`.
   * Useful for SSR-safe per-currency locale resolution.
   */
  formatCurrency?: (amount: number, currency: string) => string
  /** Override default English labels (forwarded as-is to children when relevant). */
  texts?: ProductCardTexts
}

/**
 * Generic product card — image + name + description + price + action slot.
 * Pure presentation, zero coupling to payment SDKs. The action button (buy /
 * subscribe / contact / etc.) is provided by the caller via `actionSlot`.
 *
 * Originally `ProductCard` from `@ezstart/pay-sdk`. The pay-sdk re-export
 * preserves the `<PurchaseButton>` / `<SubscribeButton>` wiring for backward
 * compat — this UI primitive is the replacement for any non-payment surface
 * (catalog, marketplace teaser, store front, ...).
 *
 * @example
 * ```tsx
 * import { ProductCard, Button } from '@ezstart/ui/components'
 *
 * <ProductCard
 *   name="Pro Plan"
 *   description="Everything you need to ship."
 *   price={49}
 *   currency="USD"
 *   type="subscription"
 *   intervalCount={1}
 *   image="/products/pro.png"
 *   badge="Most popular"
 *   actionSlot={<Button className="w-full">Get started</Button>}
 * />
 * ```
 */
export function ProductCard({
  name,
  description,
  price,
  currency = 'EUR',
  image,
  badge: badgeLabel,
  type = 'purchase',
  intervalCount = 1,
  actionSlot,
  className,
  formatCurrency = defaultFormatCurrency,
}: ProductCardProps) {
  return (
    <Card
      className={`group relative overflow-hidden flex flex-col ${className || ''}`}
      hover="lift"
    >
      {/* Badge */}
      {badgeLabel && (
        <Div className="absolute top-3 right-3 z-10">
          <Badge variant="default" size="sm">
            {badgeLabel}
          </Badge>
        </Div>
      )}

      {/* Image */}
      {image && (
        <Div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Div>
      )}

      {/* Content */}
      <CardHeader>
        <CardTitle className="text-lg">{name}</CardTitle>
      </CardHeader>

      {description && (
        <CardContent className="flex-1">
          <P size="sm" variant="description" className="line-clamp-2">
            {description}
          </P>
        </CardContent>
      )}

      {/* Price */}
      <CardContent>
        <P size="lg" className="font-bold">
          {formatCurrency(price, currency)}
          {type === 'subscription' && (
            <Span className="text-sm font-normal text-muted-foreground">
              {' '}
              / {intervalCount === 12 ? 'yr' : intervalCount === 1 ? 'mo' : `${intervalCount}mo`}
            </Span>
          )}
        </P>
      </CardContent>

      {/* Action button (caller-provided) */}
      <CardFooter className="mt-auto">{actionSlot}</CardFooter>
    </Card>
  )
}

ProductCard.displayName = 'ProductCard'
