'use client'

import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Checkbox,
  Div,
  H3,
  Icon,
  Input,
  Label,
  P,
  Span,
} from '@ezstart/ui/components'
import { logger } from '@ezstart/logger'
import { usePay } from '../provider.js'
import { formatCurrency, getCurrencySymbol } from '../utils/format-currency.js'

export interface DonationCardProps {
  appName: string
  projectId: string
  projectName?: string
  className?: string
  variant?: 'default' | 'featured' | 'compact'
  presetAmounts?: number[]
  currency?: string
  allowCustomAmount?: boolean
  promoCode?: string
  onSuccess?: () => void
  onCancel?: () => void
  userId?: string
  userEmail?: string
  userName?: string
  texts?: Partial<DonationCardTexts>
}

export interface DonationCardTexts {
  title: string
  donate: string
  customAmount: string
  thankYou: string
  selectAmount: string
  loading: string
  error: string
  oneTime: string
  orEnterCustom: string
  messageLabel: string
  messagePlaceholder: string
  anonymous: string
}

const DEFAULT_TEXTS: DonationCardTexts = {
  title: 'Support this project',
  donate: 'Donate',
  customAmount: 'Custom amount',
  thankYou: 'Thank you for your support!',
  selectAmount: 'Select an amount',
  loading: 'Loading...',
  error: 'Something went wrong',
  oneTime: 'One-time donation',
  orEnterCustom: 'Or enter a custom amount',
  messageLabel: 'Message (optional)',
  messagePlaceholder: 'Leave a message...',
  anonymous: 'Donate anonymously',
}

export function DonationCard({
  appName,
  projectId,
  projectName,
  className,
  variant = 'default',
  presetAmounts = [5, 10, 25, 50],
  currency = 'USD',
  allowCustomAmount = true,
  userId,
  userEmail,
  userName,
  texts: textsProp,
}: DonationCardProps) {
  const texts = { ...DEFAULT_TEXTS, ...textsProp }
  const { createDonation, isLoading } = usePay()
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const isFeatured = variant === 'featured'
  const isCompact = variant === 'compact'

  const symbol = getCurrencySymbol(currency)
  const displayTitle = projectName
    ? texts.title.replace('this project', projectName)
    : texts.title

  const effectiveAmount = customAmount ? parseFloat(customAmount) : selectedAmount

  const handleDonate = async (amount: number) => {
    if (!amount || amount <= 0 || isNaN(amount)) return

    try {
      const result = await createDonation({
        projectId,
        amount,
        currency,
        isPublic: true,
        isAnonymous,
        message: message || undefined,
        userId,
        donorEmail: userEmail,
        donorName: userName,
      })

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }
    } catch (error) {
      logger.error('Donation failed:', error instanceof Error ? error.message : String(error))
    }
  }

  if (isCompact) {
    return (
      <Card className={`p-4 ${className || ''}`}>
        <Div className="flex flex-wrap items-center gap-3">
          <Icon name="lucide:Heart" className="w-5 h-5 text-destructive shrink-0" />
          <Span className="font-semibold">{displayTitle}</Span>
          <Div className="flex items-center gap-2 ml-auto">
            {presetAmounts.slice(0, 3).map(amount => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => handleDonate(amount)}
              >
                {formatCurrency(amount, currency)}
              </Button>
            ))}
          </Div>
        </Div>
      </Card>
    )
  }

  return (
    <Card
      className={`relative flex flex-col ${isFeatured ? 'border-primary shadow-lg' : ''} ${className || ''}`}
    >
      {isFeatured && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="default">
          {texts.oneTime}
        </Badge>
      )}
      <CardHeader>
        <H3 className="flex items-center gap-2">
          <Icon name="lucide:Heart" className="w-5 h-5 text-destructive" />
          {displayTitle}
        </H3>
        <P size="sm" className="text-muted-foreground">
          {texts.selectAmount}
        </P>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {/* Preset amount grid */}
        <Div className="grid grid-cols-2 gap-2">
          {presetAmounts.map(amount => (
            <Button
              key={amount}
              type="button"
              variant={selectedAmount === amount && !customAmount ? 'default' : 'outline'}
              className="text-lg font-semibold"
              onClick={() => {
                setSelectedAmount(amount)
                setCustomAmount('')
              }}
            >
              {formatCurrency(amount, currency)}
            </Button>
          ))}
        </Div>

        {/* Custom amount input */}
        {allowCustomAmount && (
          <Div className="space-y-1">
            <Label className="text-sm text-muted-foreground">{texts.orEnterCustom}</Label>
            <Div>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={customAmount}
                onChange={e => {
                  setCustomAmount(e.target.value)
                  setSelectedAmount(null)
                }}
                placeholder={`0.00 ${symbol}`}
              />
            </Div>
          </Div>
        )}
      </CardContent>
      {/* Message + Anonymous */}
      <CardContent className="space-y-3 pt-0">
        <Div>
          <Label className="text-sm text-muted-foreground">{texts.messageLabel || 'Message (optional)'}</Label>
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={texts.messagePlaceholder || 'Leave a message...'}
          />
        </Div>
        <Div className="flex items-center gap-2">
          <Checkbox
            id="donate-anonymous"
            checked={isAnonymous}
            onCheckedChange={(checked) => setIsAnonymous(checked === true)}
          />
          <Label htmlFor="donate-anonymous" className="text-sm text-muted-foreground cursor-pointer">
            {texts.anonymous || 'Donate anonymously'}
          </Label>
        </Div>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          size="lg"
          disabled={!effectiveAmount || effectiveAmount <= 0 || isLoading}
          onClick={() => effectiveAmount && handleDonate(effectiveAmount)}
        >
          {isLoading ? (
            <>
              <Icon name="lucide:Loader2" className="w-5 h-5 animate-spin" />
              {texts.loading}
            </>
          ) : (
            <>
              <Icon name="lucide:Heart" className="w-5 h-5" />
              {texts.donate}
              {effectiveAmount && effectiveAmount > 0
                ? ` ${formatCurrency(effectiveAmount, currency)}`
                : ''}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
