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
import { toast } from 'sonner'
import { usePay, useApplicationContext } from '../react/pay-provider.js'
import { formatCurrency, getCurrencySymbol } from '../core/format-currency.js'
import { PayNotConfiguredCard, type PayNotConfiguredTexts } from './common/PayNotConfiguredCard.js'

export interface DonationCardProps {
  /**
   * @deprecated Use `applicationId` instead. This field was never wired into
   * the donation request — `projectId` carries the routing information.
   */
  appName?: string
  /** Ezauth Application id (preferred, forwarded on the donation request). */
  applicationId?: string
  projectId: string
  projectName?: string
  className?: string
  variant?: 'default' | 'featured' | 'compact'
  /** Card size (forwarded to Card component) */
  cardSize?: 'xs' | 'sm' | 'default' | 'lg' | 'xl'
  /** Card visual variant (forwarded to Card component) */
  cardVariant?: 'default' | 'outline' | 'ghost' | 'floating' | 'dark' | 'premium' | 'elevated'
  /** Card hover effect (forwarded to Card component) */
  cardHover?: 'none' | 'lift' | 'glow' | 'border' | 'scale'
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
  /**
   * Overrides for the graceful fallback card rendered when the PayProvider
   * resolution failed (missing / invalid publishable key, ezpay API down on
   * `/keys/config`). Keys are optional — English defaults are used when
   * omitted.
   */
  notConfiguredTexts?: PayNotConfiguredTexts
  /**
   * BCP-47 locale used to build the developer portal URL (e.g. `en`, `fr`).
   * When omitted, inherits from `<PayProvider locale={…}>` context (default `'en'`).
   * SDK stays i18n-agnostic — consumers should pass `useLocale()`. Defaults
   * to `'en'`.
   */
  locale?: string
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
  support: string
  sendMessage: string
  messageRequired: string
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
  support: 'Or just leave a message',
  sendMessage: 'Send message',
  messageRequired: 'Message (required)',
}

export function DonationCard({
  appName: _appName,
  applicationId,
  projectId,
  projectName,
  className,
  variant = 'default',
  cardSize,
  cardVariant,
  cardHover,
  presetAmounts = [5, 10, 25, 50],
  currency = 'USD',
  allowCustomAmount = true,
  userId,
  userEmail,
  userName,
  texts: textsProp,
  notConfiguredTexts,
  locale,
}: DonationCardProps) {
  const texts = { ...DEFAULT_TEXTS, ...textsProp }
  const { createDonation, isLoading } = usePay()
  const { applicationResolutionStatus, payWebUrl, locale: contextLocale } = useApplicationContext()
  const resolvedLocale = locale ?? contextLocale
  const dashboardUrl = payWebUrl ? `${payWebUrl}/${resolvedLocale}/developer` : undefined
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [message, setMessage] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const isFeatured = variant === 'featured'
  const isCompact = variant === 'compact'

  const symbol = getCurrencySymbol(currency)
  const displayTitle = projectName ? texts.title.replace('this project', projectName) : texts.title

  const effectiveAmount = customAmount ? parseFloat(customAmount) : selectedAmount
  const isTestimonial = effectiveAmount === 0 || effectiveAmount === null

  const canSubmit =
    !isLoading &&
    (isTestimonial
      ? message.trim().length > 0
      : effectiveAmount !== null && effectiveAmount > 0 && !isNaN(effectiveAmount))

  const handleDonate = async (amount: number) => {
    if (amount < 0 || isNaN(amount)) return
    if (amount === 0 && !message.trim()) return // testimonial needs a message

    try {
      const result = await createDonation({
        projectId,
        ...(applicationId ? { applicationId } : {}),
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
      } else {
        // Testimonial saved successfully - reset form
        setSelectedAmount(null)
        setCustomAmount('')
        setMessage('')
        setIsAnonymous(false)
        toast.success(texts.thankYou)
      }
    } catch (error) {
      logger.error('Donation failed:', error instanceof Error ? error.message : String(error))
    }
  }

  // Graceful fallback — the PayProvider could not resolve the application
  // context (missing key, ezpay /keys/config down, invalid key). Rendering
  // the form would break on submit, so we surface a helpful CTA instead.
  if (applicationResolutionStatus === 'failed') {
    return (
      <PayNotConfiguredCard
        reason="resolve-failed"
        dashboardUrl={dashboardUrl}
        texts={notConfiguredTexts}
        className={className}
        variant={isCompact ? 'compact' : 'default'}
      />
    )
  }

  if (isCompact) {
    return (
      <Card
        className={`p-4 ${className || ''}`}
        size={cardSize}
        variant={cardVariant}
        hover={cardHover}
      >
        <Div className={`flex flex-wrap items-center gap-3`}>
          <Icon name="lucide:Heart" className={`w-5 h-5 text-destructive shrink-0`} />
          <Span className={`font-semibold`}>{displayTitle}</Span>
          <Div className={`flex items-center gap-2 ml-auto`}>
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
      size={cardSize}
      variant={cardVariant}
      hover={cardHover}
    >
      {isFeatured && (
        <Badge className={`absolute -top-3 left-1/2 -translate-x-1/2`} variant="default">
          {texts.oneTime}
        </Badge>
      )}
      <CardHeader>
        <H3 className={`flex items-center gap-2`}>
          <Icon name="lucide:Heart" className={`w-5 h-5 text-destructive`} />
          {displayTitle}
        </H3>
        <P size="sm" className={`text-muted-foreground`}>
          {texts.selectAmount}
        </P>
      </CardHeader>
      <CardContent className={`flex-1 space-y-4`}>
        {/* Preset amount grid */}
        <Div className={`grid grid-cols-2 gap-2`}>
          {presetAmounts.map(amount => (
            <Button
              key={amount}
              type="button"
              variant={selectedAmount === amount && !customAmount ? 'default' : 'outline'}
              className={`text-lg font-semibold`}
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
          <Div className={`space-y-1`}>
            <Label className={`text-sm text-muted-foreground`}>{texts.orEnterCustom}</Label>
            <Div>
              <Input
                type="number"
                min="0"
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
      {/* Separator + Message */}
      <CardContent className={`space-y-3 pt-0`}>
        {/* "or just leave a message" separator */}
        <Div className={`flex items-center gap-3`}>
          <Div className={`flex-1 h-px bg-border`} />
          <Span className={`text-xs text-muted-foreground uppercase`}>{texts.support}</Span>
          <Div className={`flex-1 h-px bg-border`} />
        </Div>
        <Div>
          <Label className={`text-sm text-muted-foreground`}>{texts.messageLabel}</Label>
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={texts.messagePlaceholder || 'Leave a message...'}
          />
        </Div>
        <Div className={`flex items-center gap-2`}>
          <Checkbox
            id="donate-anonymous"
            checked={isAnonymous}
            onCheckedChange={checked => setIsAnonymous(checked === true)}
          />
          <Label
            htmlFor="donate-anonymous"
            className={`text-sm text-muted-foreground cursor-pointer`}
          >
            {texts.anonymous || 'Donate anonymously'}
          </Label>
        </Div>
      </CardContent>
      <CardFooter>
        <Button
          className={`w-full`}
          size="lg"
          disabled={!canSubmit}
          onClick={() => handleDonate(isTestimonial ? 0 : effectiveAmount!)}
        >
          {isLoading ? (
            <>
              <Icon name="lucide:Loader2" className={`w-5 h-5 animate-spin`} />
              {texts.loading}
            </>
          ) : isTestimonial ? (
            <>
              <Icon name="lucide:MessageCircle" className={`w-5 h-5`} />
              {texts.sendMessage}
            </>
          ) : (
            <>
              <Icon name="lucide:Heart" className={`w-5 h-5`} />
              {texts.donate} {formatCurrency(effectiveAmount!, currency)}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
