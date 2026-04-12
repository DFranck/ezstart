'use client'

import { TwoFactorSettings, useAuthNavigation } from '@ezstart/auth-sdk'
import {
  BackButton,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  P,
} from '@ezstart/ui/components'
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function SettingsPage() {
  const t = useTranslations('twoFactor')
  const ts = useTranslations('settings')
  const { app } = useAuthNavigation()

  return (
    <Card className="max-w-md w-full relative" data-app={app}>
      <Div className="absolute top-4 left-4">
        <BackButton />
      </Div>
      <Div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </Div>

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">{ts('title')}</CardTitle>
        <CardDescription>{ts('security')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <Div className="space-y-2">
          <P className="font-medium">{t('title')}</P>
          <TwoFactorSettings
            texts={{
              enabled: t('enabled'),
              disabled: t('disabled'),
              enableButton: t('setup'),
              disableButton: t('disable'),
              scanQR: t('scanQrCode'),
              manualEntry: t('manualEntry'),
              enterCode: t('enterCode'),
              codePlaceholder: t('codePlaceholder'),
              verify: t('verify'),
              verifying: t('verifying'),
              backupTitle: t('backupCodes'),
              backupDescription: t('backupCodesDescription'),
              confirmBackup: t('backupCodesSaved'),
              disableConfirm: t('disableConfirm'),
            }}
          />
        </Div>

        <Div className="border-t pt-4">
          <Link href="/settings/sessions">
            <Button variant="outline" className="w-full">
              {ts('sessions')}
            </Button>
          </Link>
        </Div>
      </CardContent>
    </Card>
  )
}
