'use client'

import { Button, Div, H1, P, Section, Icon } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  const t = useTranslations('error')

  return (
    <Section size="full" className="relative pt-24 md:pt-32">
      <Div className="max-w-2xl mx-auto text-center px-4">
        <Div className="mb-12 flex justify-center">
          <Div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-destructive/10 flex items-center justify-center">
            <Icon
              name="lucide:AlertCircle"
              className="w-12 h-12 md:w-16 md:h-16 text-destructive"
            />
          </Div>
        </Div>

        <H1 className="text-3xl md:text-4xl font-bold mb-6">{t('title')}</H1>

        <P className="text-xl text-muted-foreground mb-12">{t('message')}</P>

        <Div className="flex justify-center">
          <Button size="lg" onClick={reset}>
            <Icon name="lucide:RefreshCw" className="w-5 h-5 mr-2" />
            {t('retry')}
          </Button>
        </Div>
      </Div>
    </Section>
  )
}
