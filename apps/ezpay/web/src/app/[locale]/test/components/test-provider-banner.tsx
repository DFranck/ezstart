'use client'

import { useTranslations } from 'next-intl'
import {
  Badge,
  Div,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Icon,
} from '@ezstart/ui/components'

export function TestProviderBanner() {
  const t = useTranslations('test')

  return (
    <Div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border border-success/30 bg-success/5">
      <Div className="flex items-center gap-3">
        <Badge variant="success" dot>
          {t('banner.provider')}
        </Badge>
        <P size="sm" variant="description" className="flex items-center gap-1.5">
          <Icon name="lucide:CreditCard" className="w-4 h-4" />
          {t('banner.info')}
        </P>
      </Div>
      <Select defaultValue="stripe" disabled>
        <SelectTrigger className="w-48 opacity-60">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="stripe">{t('providerSelect.stripe')}</SelectItem>
          <SelectItem value="console">{t('providerSelect.console')}</SelectItem>
        </SelectContent>
      </Select>
    </Div>
  )
}
