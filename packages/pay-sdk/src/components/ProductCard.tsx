'use client'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Div,
  Icon,
  P,
  Span,
} from '@ezstart/ui/components'
import Image from 'next/image'
import { PurchaseButton } from './PurchaseButton.js'
import { SubscribeButton } from './SubscribeButton.js'
import { formatCurrency } from '../core/format-currency.js'

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
        )}
      </CardFooter>
    </Card>
  )
}
