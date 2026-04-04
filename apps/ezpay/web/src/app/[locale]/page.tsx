import { useTranslations } from 'next-intl'
import { Div, H1, H2, H3, Main, P } from '@ezstart/ui/components'
import { TestZone } from './test-zone'

export default function HomePage() {
  const t = useTranslations('home')

  return (
    <Main className="container mx-auto py-12 px-4">
      <Div className="max-w-4xl mx-auto text-center">
        <H1 className="text-4xl font-bold mb-4">{t('title')}</H1>
        <P className="text-xl text-muted-foreground mb-8">{t('subtitle')}</P>

        <Div className="grid md:grid-cols-3 gap-6 mt-12">
          <Div className="p-6 border rounded-lg">
            <H3 className="text-lg font-semibold mb-2">{t('donations')}</H3>
            <P className="text-sm text-muted-foreground">{t('donationsDescription')}</P>
          </Div>

          <Div className="p-6 border rounded-lg">
            <H3 className="text-lg font-semibold mb-2">{t('purchases')}</H3>
            <P className="text-sm text-muted-foreground">{t('purchasesDescription')}</P>
          </Div>

          <Div className="p-6 border rounded-lg">
            <H3 className="text-lg font-semibold mb-2">{t('subscriptions')}</H3>
            <P className="text-sm text-muted-foreground">{t('subscriptionsDescription')}</P>
          </Div>
        </Div>

        <Div className="mt-12 p-6 bg-muted rounded-lg">
          <H2 className="text-2xl font-semibold mb-4">{t('gettingStarted')}</H2>
          <Div className="text-left space-y-4">
            <Div>
              <H3 className="font-semibold">{t('installSdk')}</H3>
              <code className="text-sm bg-background p-2 block rounded mt-2">
                pnpm add @ezstart/pay-sdk
              </code>
            </Div>

            <Div>
              <H3 className="font-semibold">{t('setupClient')}</H3>
              <code className="text-sm bg-background p-2 block rounded mt-2">
                {`import { createPayClient } from '@ezstart/pay-sdk'`}
                <br />
                {`const client = createPayClient({ appName: 'my-app' })`}
              </code>
            </Div>

            <Div>
              <H3 className="font-semibold">{t('useComponents')}</H3>
              <code className="text-sm bg-background p-2 block rounded mt-2">
                {`import { DonateModal, DonationWall } from '@ezstart/pay-sdk'`}
              </code>
            </Div>
          </Div>
        </Div>

        <TestZone />
      </Div>
    </Main>
  )
}
