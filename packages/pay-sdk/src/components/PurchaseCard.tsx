'use client'

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Div,
  H3,
  Icon,
  Img,
  P,
  Span,
} from '@ezstart/ui/components'
import { PurchaseButton } from './PurchaseButton.js'
import { formatCurrency } from '../utils/format-currency.js'

export interface PurchaseCardProps {
  appName: string
  productId: string
  productName: string
  amount: number
  currency?: string
  description?: string
  image?: string
  className?: string
  variant?: 'default' | 'featured' | 'compact'
  promoCode?: string
  onSuccess?: () => void
  onCancel?: () => void
  userId?: string
  userEmail?: string
  userName?: string
  texts?: Partial<PurchaseCardTexts>
}

export interface PurchaseCardTexts {
  buy: string
  addToCart: string
  outOfStock: string
  price: string
  description: string
  loading: string
  error: string
  featured: string
}

const DEFAULT_TEXTS: PurchaseCardTexts = {
  buy: 'Buy now',
  addToCart: 'Add to cart',
  outOfStock: 'Out of stock',
  price: 'Price',
  description: 'Description',
  loading: 'Loading...',
  error: 'Product not found',
  featured: 'Featured',
}

export function PurchaseCard({
  appName,
  productId,
  productName,
  amount,
  currency = 'EUR',
  description,
  image,
  className,
  variant = 'default',
  userId,
  userEmail,
  userName,
  texts: textsProp,
}: PurchaseCardProps) {
  const texts = { ...DEFAULT_TEXTS, ...textsProp }
  const isFeatured = variant === 'featured'
  const isCompact = variant === 'compact'
  const price = formatCurrency(amount, currency)

  if (isCompact) {
    return (
      <Card className={`flex flex-row items-center gap-4 p-4 ${className || ''}`}>
        {image && (
          <Img
            src={image}
            alt={productName}
            className="w-12 h-12 rounded-md object-cover shrink-0"
          />
        )}
        <Div className="flex-1 min-w-0">
          <H3 size="h5" className="truncate">
            {productName}
          </H3>
          <Span className="text-lg font-bold">{price}</Span>
        </Div>
        <Div className="shrink-0">
          <PurchaseButton
            projectId={appName}
            productId={productId}
            productName={productName}
            amount={amount}
            currency={currency}
            description={description}
            userId={userId}
            userEmail={userEmail}
            userName={userName}
            trigger={
              <Button size="sm">
                {texts.buy}
              </Button>
            }
          />
        </Div>
      </Card>
    )
  }

  return (
    <Card
      className={`relative flex flex-col overflow-hidden ${isFeatured ? 'border-primary shadow-lg' : ''} ${className || ''}`}
    >
      {isFeatured && (
        <Badge className="absolute top-3 right-3 z-10" variant="default">
          {texts.featured}
        </Badge>
      )}

      {/* Product image */}
      {image && (
        <Div className={`w-full overflow-hidden ${isFeatured ? 'h-48' : 'h-36'}`}>
          <Img
            src={image}
            alt={productName}
            className="w-full h-full object-cover"
          />
        </Div>
      )}

      <CardHeader>
        <H3>{productName}</H3>
        {description && (
          <P size="sm" className="text-muted-foreground">
            {description}
          </P>
        )}
        <Div className="mt-2">
          <Span className={`font-bold ${isFeatured ? 'text-3xl text-primary' : 'text-2xl'}`}>
            {price}
          </Span>
        </Div>
      </CardHeader>

      <CardContent className="flex-1" />

      <CardFooter>
        <PurchaseButton
          projectId={appName}
          productId={productId}
          productName={productName}
          amount={amount}
          currency={currency}
          description={description}
          userId={userId}
          userEmail={userEmail}
          userName={userName}
          trigger={
            <Button className="w-full" size="lg">
              <Icon name="lucide:ShoppingCart" className="w-4 h-4" />
              {texts.buy} — {price}
            </Button>
          }
        />
      </CardFooter>
    </Card>
  )
}
