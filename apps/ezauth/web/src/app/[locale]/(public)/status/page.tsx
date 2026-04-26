import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  LandingSection,
  Main,
  P,
  Span,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

export default function StatusPage() {
  const t = useTranslations('status')

  const components = [
    { name: t('components.apiName'), status: t('components.apiStatus') },
    { name: t('components.dashboardName'), status: t('components.dashboardStatus') },
    { name: t('components.oauthName'), status: t('components.oauthStatus') },
  ]

  return (
    <Main className="flex-1">
      <LandingSection align="center">
        <Div className="mx-auto max-w-3xl space-y-4">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <Div className="flex justify-center">
            <Badge variant="success" size="lg" dot pulse>
              {t('summaryBadge')}
            </Badge>
          </Div>
          <P className="text-base text-muted-foreground sm:text-lg">{t('summaryBody')}</P>
        </Div>
      </LandingSection>

      <LandingSection>
        <Div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <H2 size="h3">{t('componentsHeading')}</H2>
            </CardHeader>
            <CardContent>
              <Div className="divide-y">
                {components.map(component => (
                  <Div
                    key={component.name}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <Span className="font-medium">{component.name}</Span>
                    <Badge variant="success" size="sm" dot>
                      {component.status}
                    </Badge>
                  </Div>
                ))}
              </Div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <H2 size="h3">{t('incidentsHeading')}</H2>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">{t('incidentsBody')}</P>
            </CardContent>
          </Card>
        </Div>
      </LandingSection>
    </Main>
  )
}
