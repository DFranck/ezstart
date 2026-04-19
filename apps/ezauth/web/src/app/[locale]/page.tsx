import { Button, Card, CardContent, CardHeader, Div, H1, H2, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function HomePage() {
  const t = useTranslations('home')

  return (
    <Div className="w-full max-w-3xl py-12 px-4">
      {/* Hero */}
      <Div className="text-center mb-12">
        <H1 className="text-4xl font-bold tracking-tight mb-4">{t('title')}</H1>
        <P className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">{t('subtitle')}</P>
        <Div className="flex items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/login">{t('signIn')}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">{t('signUp')}</Link>
          </Button>
        </Div>
      </Div>

      {/* Features */}
      <Div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <H2 size="h4" className="font-semibold">
              {t('featureSso')}
            </H2>
          </CardHeader>
          <CardContent>
            <P className="text-sm text-muted-foreground">{t('featureSsoDesc')}</P>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <H2 size="h4" className="font-semibold">
              {t('featureApiKeys')}
            </H2>
          </CardHeader>
          <CardContent>
            <P className="text-sm text-muted-foreground">{t('featureApiKeysDesc')}</P>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <H2 size="h4" className="font-semibold">
              {t('featureOauth')}
            </H2>
          </CardHeader>
          <CardContent>
            <P className="text-sm text-muted-foreground">{t('featureOauthDesc')}</P>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <H2 size="h4" className="font-semibold">
              {t('featureSecurity')}
            </H2>
          </CardHeader>
          <CardContent>
            <P className="text-sm text-muted-foreground">{t('featureSecurityDesc')}</P>
          </CardContent>
        </Card>
      </Div>
    </Div>
  )
}
