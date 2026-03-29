import { useTranslations } from 'next-intl'

export default function HomePage(): any {
  const t = useTranslations('home')

  return (
    <main className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
        <p className="text-xl text-muted-foreground mb-8">{t('subtitle')}</p>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">{t('donations')}</h3>
            <p className="text-sm text-muted-foreground">{t('donationsDescription')}</p>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">{t('purchases')}</h3>
            <p className="text-sm text-muted-foreground">{t('purchasesDescription')}</p>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">{t('subscriptions')}</h3>
            <p className="text-sm text-muted-foreground">{t('subscriptionsDescription')}</p>
          </div>
        </div>

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">{t('gettingStarted')}</h2>
          <div className="text-left space-y-4">
            <div>
              <h3 className="font-semibold">{t('installSdk')}</h3>
              <code className="text-sm bg-background p-2 block rounded mt-2">
                pnpm add @ezstart/pay-sdk
              </code>
            </div>

            <div>
              <h3 className="font-semibold">{t('setupClient')}</h3>
              <code className="text-sm bg-background p-2 block rounded mt-2">
                {`import { createPayClient } from '@ezstart/pay-sdk'`}
                <br />
                {`const client = createPayClient({ appName: 'my-app' })`}
              </code>
            </div>

            <div>
              <h3 className="font-semibold">{t('useComponents')}</h3>
              <code className="text-sm bg-background p-2 block rounded mt-2">
                {`import { DonateModal, DonationWall } from '@ezstart/pay-sdk'`}
              </code>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
