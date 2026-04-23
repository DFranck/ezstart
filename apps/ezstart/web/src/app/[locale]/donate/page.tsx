'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { DonationCard, DonationWall } from '@ezstart/pay-sdk'
import { Div, H1, Main, P, Section } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'

export default function DonatePage(): React.JSX.Element {
  const t = useTranslations('donate.landing')
  const tSupport = useTranslations('support')
  const locale = useLocale()
  const { user, isAuthenticated } = useAuth()

  return (
    <Main>
      <Section size="lg">
        <Div className="flex flex-col items-center gap-8">
          <Div className="text-center max-w-2xl">
            <H1>{t('title')}</H1>
            <P className="mt-4 text-muted-foreground">{t('description')}</P>
          </Div>

          <Div className="w-full max-w-2xl">
            <DonationCard
              cardVariant="floating"
              appName="ezstart"
              projectId="ezstart"
              projectName="EZStart"
              presetAmounts={[5, 10, 25]}
              currency="EUR"
              allowCustomAmount
              locale={locale}
              userId={isAuthenticated ? user?._id : undefined}
              userEmail={isAuthenticated ? user?.email : undefined}
              userName={isAuthenticated ? user?.username : undefined}
              texts={{
                title: tSupport('title'),
                selectAmount: tSupport('description'),
              }}
            />
          </Div>

          <DonationWall
            projectId="ezstart"
            limit={10}
            className="w-full max-w-3xl"
            locale={locale}
            texts={{
              loadingText: tSupport('wall.loadingText'),
              errorText: tSupport('wall.errorText'),
              noDonationsText: tSupport('wall.noDonationsText'),
              anonymousLabel: tSupport('wall.anonymousLabel'),
            }}
          />
        </Div>
      </Section>
    </Main>
  )
}
