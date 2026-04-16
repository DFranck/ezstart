'use client'

import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Div, H3, P, Span, Icon } from '@ezstart/ui/components'

const PLANS = [
  {
    key: 'starter' as const,
    feePercent: 5,
    price: 0,
  },
  {
    key: 'growth' as const,
    feePercent: 3,
    price: 49,
  },
  {
    key: 'enterprise' as const,
    feePercent: 1.5,
    price: 199,
  },
]

type PlansSectionProps = {
  currentFeePercent: number
}

export function PlansSection({ currentFeePercent }: PlansSectionProps) {
  const t = useTranslations('developer.plans')

  function handleUpgrade() {
    toast.info(t('comingSoon'))
  }

  function isCurrent(feePercent: number): boolean {
    return Math.abs(currentFeePercent - feePercent) < 0.1
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="lucide:CreditCard" className="h-5 w-5 text-primary" />
          {t('title')}
        </CardTitle>
        <P variant="description">{t('subtitle')}</P>
      </CardHeader>
      <CardContent>
        <Div className="grid gap-4 sm:grid-cols-3">
          {PLANS.map(plan => {
            const current = isCurrent(plan.feePercent)
            return (
              <Div
                key={plan.key}
                className={`rounded-lg border p-4 space-y-3 ${current ? 'border-primary bg-primary/5' : ''}`}
              >
                <Div className="flex items-center justify-between">
                  <H3 className="text-lg font-semibold">{t(`${plan.key}.name`)}</H3>
                  {current && (
                    <Badge variant="primary" size="sm">
                      {t('current')}
                    </Badge>
                  )}
                </Div>
                <P size="sm" variant="description">
                  {t(`${plan.key}.description`)}
                </P>
                <Div>
                  <P className="text-2xl font-bold text-primary">
                    {plan.price === 0 ? t('free') : `$${plan.price}`}
                    {plan.price > 0 && (
                      <Span className="text-sm text-muted-foreground font-normal">
                        {t('perMonth')}
                      </Span>
                    )}
                  </P>
                  <P size="sm" className="text-muted-foreground">
                    {plan.feePercent}% {t('platformFee')}
                  </P>
                </Div>
                <P size="xs" variant="description">
                  {t(`${plan.key}.features`)}
                </P>
                {!current && (
                  <Button variant="outline" size="sm" className="w-full" onClick={handleUpgrade}>
                    {t('upgrade')}
                  </Button>
                )}
              </Div>
            )
          })}
        </Div>
      </CardContent>
    </Card>
  )
}
