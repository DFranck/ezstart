'use client'

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

export default function HomePage() {
  const t = useTranslations('home')

  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">This app is pre-configured with:</p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Internationalization (i18n) with next-intl</li>
            <li>Progressive Web App (PWA) support</li>
            <li>@ezstart/ui components library</li>
            <li>@ezstart/next-theme & auth-sdk providers</li>
            <li>Centralized TypeScript, ESLint, and Tailwind configs</li>
          </ul>
          <div className="pt-4">
            <Button>{t('getStarted')}</Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
