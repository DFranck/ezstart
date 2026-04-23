'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { DonationCard, DonationWall } from '@ezstart/pay-sdk'
import { Div, Section } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'

type Props = {
  id?: string
}

const SupportSection = ({ id }: Props): React.JSX.Element => {
  const t = useTranslations('support')
  const locale = useLocale()
  const { user, isAuthenticated } = useAuth()

  return (
    <Section id={id} size="lg">
      <Div className="flex flex-col items-center gap-6">
        <Div className="w-full max-w-2xl">
          <DonationCard
            cardVariant="ghost"
            appName="ezstart"
            projectId="ezstart"
            projectName="EZStart"
            presetAmounts={[5, 10]}
            currency="EUR"
            allowCustomAmount
            locale={locale}
            userId={isAuthenticated ? user?._id : undefined}
            userEmail={isAuthenticated ? user?.email : undefined}
            userName={isAuthenticated ? user?.username : undefined}
            texts={{
              title: t('title'),
              selectAmount: t('description'),
            }}
          />
        </Div>

        <DonationWall
          projectId="ezstart"
          limit={10}
          className="w-full max-w-3xl"
          locale={locale}
          texts={{
            loadingText: t('wall.loadingText'),
            errorText: t('wall.errorText'),
            noDonationsText: t('wall.noDonationsText'),
            anonymousLabel: t('wall.anonymousLabel'),
          }}
        />
      </Div>
    </Section>
  )
}

export default SupportSection
