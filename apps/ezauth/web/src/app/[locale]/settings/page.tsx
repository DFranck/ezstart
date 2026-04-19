'use client'

import { TwoFactorSettings, useAuth, useAuthNavigation } from '@ezstart/auth-sdk'
import { apiCall } from '@ezstart/api-sdk'
import {
  BackButton,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  Icon,
  P,
  Span,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { ThemeSwitcher } from '@ezstart/ui/theme/components'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'

export default function SettingsPage() {
  const t = useTranslations('twoFactor')
  const ts = useTranslations('settings')
  const { app, redirectUri } = useAuthNavigation()
  const { user } = useAuth()
  const [sendingVerification, setSendingVerification] = useState(false)

  const handleResendVerification = async () => {
    if (!user) return
    setSendingVerification(true)
    try {
      await apiCall('/auth/send-verification', {
        appName: 'ezauth',
        method: 'POST',
        body: { app, redirect_uri: redirectUri },
      })
      toast.success(ts('verificationSent'))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : ts('verifyError')
      toast.error(message)
    } finally {
      setSendingVerification(false)
    }
  }

  return (
    <Div className="flex flex-1 items-center justify-center px-2">
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
        {user && (
          <Div className="space-y-2">
            <P className="font-medium">{ts('emailSection')}</P>
            <Div className="flex flex-col gap-2 rounded-md border bg-card p-3">
              <Div className="flex items-center gap-3">
                <Icon name="lucide:Mail" className="w-4 h-4 text-muted-foreground shrink-0" />
                <Span className="text-sm text-foreground flex-1 truncate">{user.email}</Span>
                {user.isVerified ? (
                  <Badge
                    variant="secondary"
                    className="text-xs shrink-0 bg-success/15 text-success border-success/30"
                  >
                    <Icon name="lucide:CheckCircle2" className="w-3 h-3 mr-1" />
                    {ts('emailVerified')}
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="text-xs shrink-0 bg-warning/15 text-warning border-warning/30"
                  >
                    <Icon name="lucide:AlertTriangle" className="w-3 h-3 mr-1" />
                    {ts('emailUnverified')}
                  </Badge>
                )}
              </Div>
              {!user.isVerified && (
                <Div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={handleResendVerification}
                    disabled={sendingVerification}
                  >
                    <Icon name="lucide:Send" className="w-4 h-4 mr-1.5" />
                    {ts('resendVerification')}
                  </Button>
                </Div>
              )}
            </Div>
          </Div>
        )}

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

        <Div className="border-t pt-4 space-y-2">
          <Link href="/settings/sessions">
            <Button variant="outline" className="w-full">
              {ts('sessions')}
            </Button>
          </Link>
          <Link href="/developer">
            <Button variant="outline" className="w-full">
              {ts('apiKeys')}
            </Button>
          </Link>
        </Div>
      </CardContent>
    </Card>
    </Div>
  )
}
