'use client'

import {
  MagicLinkButton,
  SignInCard,
  type MagicLinkButtonTexts,
} from '@ezstart/auth-sdk/components'
import { Div } from '@ezstart/ui/components'
import { useLocale, useTranslations } from 'next-intl'

interface LoginClientProps {
  ssrAppName: string | null
  ssrAppDisplayName: string | null
}

export default function LoginClient({ ssrAppName, ssrAppDisplayName }: LoginClientProps) {
  const t = useTranslations('magicLink')
  const locale = useLocale()

  const magicLinkTexts: Partial<MagicLinkButtonTexts> = {
    triggerLabel: t('triggerLabel'),
    modalTitle: t('modalTitle'),
    modalDescription: t('modalDescription'),
    closeButton: t('closeButton'),
    emailLabel: t('emailLabel'),
    emailPlaceholder: t('emailPlaceholder'),
    submitButton: t('submitButton'),
    submittingButton: t('submittingButton'),
    required: t('required'),
    invalidEmail: t('invalidEmail'),
    successTitle: t('successTitle'),
    successMessage: t('successMessage'),
    resetButton: t('resetButton'),
    errorGeneric: t('errorGeneric'),
    networkError: t('networkError'),
  }

  return (
    <Div className="space-y-3 w-full max-w-md mx-auto">
      <SignInCard ssrAppName={ssrAppName} ssrAppDisplayName={ssrAppDisplayName} />
      <Div className="text-center">
        <MagicLinkButton
          texts={magicLinkTexts}
          appName={ssrAppName ?? undefined}
          locale={locale}
          variant="link"
          showIcon={false}
        />
      </Div>
    </Div>
  )
}
