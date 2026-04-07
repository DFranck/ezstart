'use client'

import { useState } from 'react'
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
  Input,
  Label,
  P,
  Span,
} from '@ezstart/ui/components'
import { DonateModal } from './DonateModal.js'
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
}

export function DonationCard({
  appName,
  projectId,
  projectName,
  className,
  variant = 'default',
  presetAmounts = [5, 10, 25, 50],
  currency = 'EUR',
  allowCustomAmount = true,
  userId,
  userEmail,
  userName,
  texts: textsProp,
}: DonationCardProps) {
  const texts = { ...DEFAULT_TEXTS, ...textsProp }
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const isFeatured = variant === 'featured'
  const isCompact = variant === 'compact'

  const symbol = getCurrencySymbol(currency)
  const displayTitle = projectName
    ? texts.title.replace('this project', projectName)
    : texts.title

  // The amount used for the donate modal trigger
  const effectiveAmount = customAmount ? parseFloat(customAmount) : selectedAmount

  if (isCompact) {
    return (
      <Card className={`p-4 ${className || ''}`}>
        <Div className="flex flex-wrap items-center gap-3">
          <Icon name="lucide:Heart" className="w-5 h-5 text-destructive shrink-0" />
          <Span className="font-semibold">{displayTitle}</Span>
          <Div className="flex items-center gap-2 ml-auto">
            {presetAmounts.slice(0, 3).map(amount => (
              <DonateModal
                key={amount}
                projectId={projectId}
                projectName={projectName || appName}
                amounts={presetAmounts}
                currency={currency}
                userId={userId}
                userEmail={userEmail}
                userName={userName}
                trigger={
                  <Button variant="outline" size="sm">
                    {formatCurrency(amount, currency)}
                  </Button>
                }
              />
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
            <Div className="relative">
              <Span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {symbol}
              </Span>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={customAmount}
                onChange={e => {
                  setCustomAmount(e.target.value)
                  setSelectedAmount(null)
                }}
                placeholder="0.00"
                className="pl-7"
              />
            </Div>
          </Div>
        )}
      </CardContent>
      <CardFooter>
        <DonateModal
          projectId={projectId}
          projectName={projectName || appName}
          amounts={presetAmounts}
          currency={currency}
          userId={userId}
          userEmail={userEmail}
          userName={userName}
          trigger={
            <Button
              className="w-full"
              size="lg"
              disabled={!effectiveAmount || effectiveAmount <= 0}
            >
              <Icon name="lucide:Heart" className="w-5 h-5" />
              {texts.donate}
              {effectiveAmount && effectiveAmount > 0
                ? ` ${formatCurrency(effectiveAmount, currency)}`
                : ''}
            </Button>
          }
        />
      </CardFooter>
    </Card>
  )
}
