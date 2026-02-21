'use client'

import { GRADIENT_BG } from '@/lib/theme-colors'
import { Button, Icon, P } from '@ezstart/ui/components'
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
    <div className="relative p-4 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700 w-full">
      {/* Lock icon + title */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
          <Icon name="lucide:Lock" className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h4 className="font-bold text-amber-800 dark:text-amber-300 text-sm">
            {t('lockedTitle')}
          </h4>
          <P className="text-xs text-amber-600 dark:text-amber-400">
            {t('teaser')}
          </P>
        </div>
      </div>

      {/* Blurred preview - teaser */}
      <div className="relative mb-4 overflow-hidden rounded-md">
        <div className="filter blur-sm select-none pointer-events-none opacity-60 p-3 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="lucide:Star" className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700">★★★★★</span>
          </div>
          <div className="space-y-1">
            <div className="h-3 bg-green-200 dark:bg-green-800 rounded w-3/4" />
            <div className="h-3 bg-green-200 dark:bg-green-800 rounded w-1/2" />
            <div className="h-3 bg-green-200 dark:bg-green-800 rounded w-2/3" />
          </div>
        </div>
      </div>

      {/* Description */}
      <P className="text-sm text-amber-700 dark:text-amber-300 mb-4">
        {t('lockedDescription')}
      </P>

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
        <div className="space-y-2">
          <P className="text-xs text-center text-amber-600 dark:text-amber-400">
            {t('loginRequired')}
          </P>
          <Button
            onClick={onLogin}
            variant="outline"
            className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
          >
            <Icon name="lucide:LogIn" className="w-4 h-4 mr-2" />
            {t('loginFirst')}
          </Button>
        </div>
      )}
    </div>
  )
}
