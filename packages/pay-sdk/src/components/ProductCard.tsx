'use client'

import {
  Badge,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Icon,
  P,
} from '@ezstart/ui/components'
import { PurchaseButton } from './PurchaseButton.js'
import { SubscribeButton } from './SubscribeButton.js'
import { formatCurrency } from '../utils/format-currency.js'

export interface ProductCardTexts {
  buyButton?: string
  subscribeButton?: string
}

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

export function ProductCard({
  name,
  description,
  price,
  currency = 'EUR',
  image,
  badge: badgeLabel,
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
  const t = {
    buyButton: texts?.buyButton || 'Buy now',
    subscribeButton: texts?.subscribeButton || 'Subscribe',
  }

  return (
    <Card
      className={`group relative overflow-hidden flex flex-col ${className || ''}`}
      hover="lift"
    >
      {/* Badge */}
      {badgeLabel && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="default" size="sm">
            {badgeLabel}
          </Badge>
        </div>
      )}

      {/* Image */}
      {image && (
        <div className="relative w-full aspect-video overflow-hidden rounded-t-xl">
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
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
            <span className="text-sm font-normal text-muted-foreground">
              {' '}
              / {intervalCount === 12 ? 'yr' : intervalCount === 1 ? 'mo' : `${intervalCount}mo`}
            </span>
          )}
        </P>
      </CardContent>

      {/* Action button */}
      <CardFooter className="mt-auto">
        {type === 'purchase' ? (
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
              <button
                type="button"
                onClick={onBuy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Icon name="lucide:ShoppingCart" className="w-4 h-4" />
                {t.buyButton}
              </button>
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
              <button
                type="button"
                onClick={onBuy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Icon name="lucide:CreditCard" className="w-4 h-4" />
                {t.subscribeButton}
              </button>
            }
            texts={{ subscribeButton: t.subscribeButton }}
          />
        )}
      </CardFooter>
    </Card>
  )
}
