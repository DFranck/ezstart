import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  Icon,
  LandingSection,
  Main,
  P,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

const SECURITY_EMAIL = 'security@ezstart.xyz'
const SECURITY_TXT_PATH = '/.well-known/security.txt'

export default function SecurityPage() {
  const t = useTranslations('security')

  return (
    <Main className="flex-1">
      <LandingSection align="center">
        <Div className="mx-auto max-w-3xl space-y-4">
          <H1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('title')}</H1>
          <P className="text-base text-muted-foreground sm:text-lg">{t('lead')}</P>
        </Div>
      </LandingSection>

      <LandingSection>
        <Div className="mx-auto max-w-3xl space-y-6">
          <Card>
            <CardHeader>
              <Div className="flex items-center gap-2">
                <Icon name="lucide:Mail" className="h-5 w-5 text-primary" />
                <H2 size="h3">{t('contactHeading')}</H2>
              </Div>
            </CardHeader>
            <CardContent className="space-y-4">
              <P className="text-muted-foreground">{t('contactBody')}</P>
              <P className="font-mono text-sm text-foreground">{SECURITY_EMAIL}</P>
              <Button asChild variant="default">
                {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- mailto: external URL */}
                <a href={`mailto:${SECURITY_EMAIL}`}>{SECURITY_EMAIL}</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <H2 size="h3">{t('scopeHeading')}</H2>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">{t('scopeBody')}</P>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <H2 size="h3">{t('disclosureHeading')}</H2>
            </CardHeader>
            <CardContent className="space-y-4">
              <P className="text-muted-foreground">{t('disclosureBody')}</P>
              <Button asChild variant="outline">
                {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- external static path: next/link is for internal routes only */}
                <a href={SECURITY_TXT_PATH} target="_blank" rel="noopener noreferrer">
                  {t('txtLinkLabel')}
                </a>
              </Button>
            </CardContent>
          </Card>
        </Div>
      </LandingSection>
    </Main>
  )
}
