'use client'

import { GRADIENT_BG } from '@/lib/theme-colors'
import { Button, Div, H4, Icon, P, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

type PremiumGateProps = {
  year: number
  onUnlock: () => void
  isAuthenticated: boolean
  onLogin?: () => void
}

export default function PremiumGate({
  year,
  onUnlock,
  isAuthenticated,
  onLogin,
}: PremiumGateProps) {
  const t = useTranslations('premium')

  return (
    <Div className="relative p-4 rounded-lg border-2 border-dashed border-warning/50 bg-warning/5 w-full">
      {/* Lock icon + title */}
      <Div className="flex items-center gap-2 mb-3">
        <Div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center">
          <Icon name="lucide:Lock" className="w-4 h-4 text-warning" />
        </Div>
        <Div>
          <H4 className="font-bold text-warning text-sm">{t('lockedTitle')}</H4>
          <P className="text-xs text-warning/80">{t('teaser')}</P>
        </Div>
      </Div>

      {/* Blurred preview - teaser */}
      <Div className="relative mb-4 overflow-hidden rounded-md">
        <Div className="filter blur-sm select-none pointer-events-none opacity-60 p-3 bg-success/5 rounded-md border border-success/20">
          <Div className="flex items-center gap-2 mb-2">
            <Icon name="lucide:Star" className="w-4 h-4 text-success" />
            <Span className="text-sm font-semibold text-success">★★★★★</Span>
          </Div>
          <Div className="space-y-1">
            <Div className="h-3 bg-success/20 rounded w-3/4" />
            <Div className="h-3 bg-success/20 rounded w-1/2" />
            <Div className="h-3 bg-success/20 rounded w-2/3" />
          </Div>
        </Div>
      </Div>

      {/* Description */}
      <P className="text-sm text-warning mb-4">{t('lockedDescription')}</P>

      {/* CTA */}
      {isAuthenticated ? (
        <Button
          onClick={onUnlock}
          className={`w-full ${GRADIENT_BG} text-white shadow-lg hover:shadow-xl transition-all`}
        >
          <Icon name="lucide:Sparkles" className="w-4 h-4 mr-2" />
          {t('unlock', { year })}
        </Button>
      ) : (
        <Div className="space-y-2">
          <P className="text-xs text-center text-warning/80">{t('loginRequired')}</P>
          <Button
            onClick={onLogin}
            variant="outline"
            className="w-full border-warning/50 text-warning hover:bg-warning/10"
          >
            <Icon name="lucide:LogIn" className="w-4 h-4 mr-2" />
            {t('loginFirst')}
          </Button>
        </Div>
      )}
    </Div>
  )
}
