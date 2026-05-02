'use client'

import {
  ProductCard as _ProductCard,
  type ProductCardProps as _ProductCardProps,
} from '@ezstart/ui/components'
import { Button, Icon } from '@ezstart/ui/components'
import { useDeprecationWarning } from '@ezstart/ui/hooks'
import { PurchaseButton } from './PurchaseButton.js'
import { SubscribeButton } from './SubscribeButton.js'
import { formatCurrency } from '../core/format-currency.js'

export interface ProductCardTexts {
  buyButton?: string
  subscribeButton?: string
}

/**
 * @deprecated Moved to `@ezstart/ui` as a presentation-only `ProductCard`
 * (caller provides the action via the `actionSlot` prop). Will be removed
 * in 2026-08-01.
 *
 * Backward-compat shape preserved here: the legacy `priceId` / `projectId`
 * / `userId` / etc. fields are forwarded to `<PurchaseButton>` /
 * `<SubscribeButton>` from `@ezstart/pay-sdk` so existing consumers keep
 * working unchanged. New code should call the UI primitive directly:
 *
 * ```tsx
 * import { ProductCard, Button } from '@ezstart/ui/components'
 * import { PurchaseButton } from '@ezstart/pay-sdk/components'
 *
 * <ProductCard
 *   name="..."
 *   price={49}
 *   actionSlot={<PurchaseButton trigger={<Button className="w-full">Buy</Button>} {...} />}
 * />
 * ```
 */
export interface ProductCardProps {
  name: string
  description?: string
  price: number
  currency?: string
  image?: string
  badge?: string
  priceId: string
  projectId: string
  type: 'purchase' | 'subscription'
  intervalCount?: number
  userId?: string
  userEmail?: string
  userName?: string
  onBuy?: () => void
  className?: string
  texts?: ProductCardTexts
}

/**
 * Backward-compat product card with built-in `<PurchaseButton>` /
 * `<SubscribeButton>` action wiring.
 *
 * @deprecated Moved to `@ezstart/ui` as a presentation-only `ProductCard`
 * with an `actionSlot` prop. Will be removed in 2026-08-01. Import
 * `ProductCard` from `@ezstart/ui/components` and pass your own action
 * button (e.g. `<PurchaseButton>` from `@ezstart/pay-sdk/components`)
 * via the `actionSlot` prop.
 */
export function ProductCard({
  name,
  description,
  price,
  currency = 'EUR',
  image,
  badge,
  priceId,
  projectId,
  type,
  intervalCount = 1,
  userId,
  userEmail,
  userName,
  onBuy,
  className,
  texts,
}: ProductCardProps) {
  useDeprecationWarning(
    'ProductCard from @ezstart/pay-sdk',
    'ProductCard from @ezstart/ui/components (compose with PurchaseButton/SubscribeButton via actionSlot)'
  )

  const t = {
    buyButton: texts?.buyButton || 'Buy now',
    subscribeButton: texts?.subscribeButton || 'Subscribe',
  }

  const actionSlot =
    type === 'purchase' ? (
      <PurchaseButton
        projectId={projectId}
        productId={priceId}
        productName={name}
        amount={price}
        currency={currency}
        description={description}
        userId={userId}
        userEmail={userEmail}
        userName={userName}
        trigger={
          <Button type="button" onClick={onBuy} variant="default" className="w-full gap-2">
            <Icon name="lucide:ShoppingCart" className="w-4 h-4" />
            {t.buyButton}
          </Button>
        }
        texts={{ buyButton: t.buyButton }}
      />
    ) : (
      <SubscribeButton
        projectId={projectId}
        priceId={priceId}
        planName={name}
        amount={price}
        intervalCount={intervalCount}
        currency={currency}
        description={description}
        userId={userId}
        userEmail={userEmail}
        userName={userName}
        trigger={
          <Button type="button" onClick={onBuy} variant="default" className="w-full gap-2">
            <Icon name="lucide:CreditCard" className="w-4 h-4" />
            {t.subscribeButton}
          </Button>
        }
        texts={{ subscribeButton: t.subscribeButton }}
      />
    )

  // Reuse the UI primitive for layout + presentation; pass our SSR-safe
  // currency formatter so the legacy `'fr-FR'` for EUR locale is preserved.
  const uiProps: _ProductCardProps = {
    name,
    description,
    price,
    currency,
    image,
    badge,
    type,
    intervalCount,
    actionSlot,
    className,
    formatCurrency,
  }
  return <_ProductCard {...uiProps} />
}

ProductCard.displayName = 'ProductCard'
