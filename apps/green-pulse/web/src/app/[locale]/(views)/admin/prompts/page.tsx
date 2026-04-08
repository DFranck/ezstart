'use client'

import { AIAdminDashboard, AIProvider } from '@ezstart/ai-sdk/client'
import { Div, H1, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

export default function PromptsPage() {
  const t = useTranslations('admin.prompts')

  return (
    <Div>
      <Div className="mb-6">
        <H1>{t('title')}</H1>
        <P className="text-muted-foreground mt-2">{t('description')}</P>
      </Div>

      <AIProvider appName="green-pulse">
        <AIAdminDashboard appName="green-pulse" />
      </AIProvider>
    </Div>
  )
}
