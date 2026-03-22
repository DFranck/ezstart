'use client'

import { Button, Card, CardContent, CardHeader, H1, H2, P, Div } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ScanCard } from '@/components/scan-card'
import { useScans } from '@/hooks/use-scans'

export default function DashboardPage() {
  const t = useTranslations()
  const { data: scans, isLoading } = useScans({ limit: 5 })

  return (
    <Div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <Div className="text-center mb-8">
        <H1 className="text-3xl font-bold mb-2">{t('dashboard.title')}</H1>
        <P className="text-muted-foreground">{t('dashboard.subtitle')}</P>
      </Div>

      {/* Main CTA */}
      <Div className="mb-8">
        <Button asChild size="lg" className="w-full py-6 text-lg">
          <Link href="/scan">{t('dashboard.scanButton')}</Link>
        </Button>
      </Div>

      {/* Recent Scans */}
      <Div className="space-y-4">
        <Div className="flex items-center justify-between">
          <H2 className="text-xl font-semibold">{t('dashboard.recentScans')}</H2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/history">{t('dashboard.viewHistory')}</Link>
          </Button>
        </Div>

        {isLoading ? (
          <Div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="h-20" />
              </Card>
            ))}
          </Div>
        ) : scans && scans.length > 0 ? (
          <Div className="space-y-3">
            {scans.map((scan) => (
              <ScanCard key={scan.id} scan={scan} />
            ))}
          </Div>
        ) : (
          <Card>
            <CardHeader>
              <P className="text-center text-muted-foreground">{t('labels.noScans')}</P>
            </CardHeader>
          </Card>
        )}
      </Div>
    </Div>
  )
}
