'use client'

import { LiaThread } from '@/components/lia/LiaThread'
import { ThreadProvider } from '@/components/lia/ThreadProvider'
import { useConversations } from '@/hooks/useConversations'
import { useProviders } from '@ezstart/ai-sdk/client'
import { LoginButton, RequireAuth, useAuthStore } from '@ezstart/auth-sdk'
import { callApi } from '@ezstart/fetch-client'
import { getApiUrl } from '@ezstart/config'
import { logger } from '@ezstart/logger'
import { InsufficientPermissions } from '@ezstart/rbac'
import {
  Button,
  Card,
  CardContent,
  Div,
  H2,
  Icon,
  Input,
  P,
  Section,
  Spinner,
} from '@ezstart/ui/components'
import { runWithFeedback, toast } from '@ezstart/ui/utils'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useMemo, useState } from 'react'

function LiaPageContent(): any {
  const t = useTranslations('chat')

  // Get user from Zustand store (localStorage 'ezauth-storage')
  const { user, isAuthenticated } = useAuthStore()
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [onConversationCreated, setOnConversationCreated] = useState<(() => void) | null>(null)

  // Load AI providers from API
  const { providers, selectedProvider, setSelectedProvider } = useProviders('green-pulse')

  // Get refreshConversation to invalidate cache after sending message
  const { refreshConversation } = useConversations()

  const config = useMemo(
    () => ({
      endpoint: `${getApiUrl('green-pulse')}/api/chat`,
      method: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
      },
      enableStreaming: true, // Auto-detects SSE vs JSON based on Content-Type
      formatRequest: (message: string) => {
        const payload: any = {
          message,
          stream: true, // Request streaming (API decides via Content-Type)
          extract_esg: false,
          // Include userId if authenticated
          ...(isAuthenticated && user?._id && { userId: user._id }),
        }
        // Only include providerId if it exists (avoid sending null)
        if (selectedProvider) {
          payload.providerId = selectedProvider
        }
        // Only include conversation_id if it exists (avoid sending null)
        if (activeConversationId) {
          payload.conversation_id = activeConversationId
        }
        return payload
      },
      formatResponse: (data: any) => {
        // For streaming, data contains chunks of text
        return data.delta || data.data?.response || data.response || ''
      },
      onSuccess: (data: any) => {
        const conversationId = data.data?.conversation_id

        // Save conversation_id for subsequent messages
        if (conversationId && !activeConversationId) {
          const userInfo = isAuthenticated && user?._id ? `userId: ${user._id}` : 'anonymous'
          logger.info(`Conversation created: ${conversationId} (${userInfo})`)
          setActiveConversationId(conversationId)
          // Trigger conversation list reload
          if (onConversationCreated) {
            onConversationCreated()
          }
        }

        // Refresh conversation to load new messages
        if (conversationId) {
          refreshConversation(conversationId)
        }
      },
      onError: (error: Error) => {
        logger.error('LIA Chat Error:', error)

        // Map error messages to translated versions
        let translatedError = t('errors.sendFailed')
        if (error.message.includes('overloaded')) {
          translatedError = t('errors.serviceOverloaded')
        } else if (error.message.includes('quota')) {
          translatedError = t('errors.quotaExceeded')
        } else if (error.message.includes('configuration')) {
          translatedError = t('errors.configError')
        }

        // Show translated error toast to user
        toast.error(translatedError)
      },
    }),
    [
      isAuthenticated,
      user,
      activeConversationId,
      onConversationCreated,
      selectedProvider,
      refreshConversation,
      t,
    ]
  ) // Re-create when auth state, activeConversationId, selectedProvider, or refreshConversation changes

  return (
    <ThreadProvider config={config}>
      <LiaThread
        activeConversationId={activeConversationId}
        setActiveConversationId={setActiveConversationId}
        onRegisterConversationCreatedCallback={setOnConversationCreated}
        providers={providers}
        selectedProvider={selectedProvider}
        onProviderChange={setSelectedProvider}
      />
    </ThreadProvider>
  )
}

function BetaAccessRequest() {
  const t = useTranslations('beta')
  const { user } = useAuthStore()
  const [accessCode, setAccessCode] = useState('')

  // Refetch user helper
  const refetchUser = async () => {
    // Force re-login to refresh roles
    window.location.reload()
  }

  // Check waitlist status
  const { data: waitlistStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['waitlist-status', user?.email],
    queryFn: async () => {
      if (!user?.email) return null
      const response = await callApi(
        `/waitlist/green-pulse/status/${encodeURIComponent(user.email)}`,
        {
          appName: 'ezauth',
        }
      )
      if (!response.ok) return null
      return response.data
    },
    enabled: !!user?.email,
  })

  const handleRequest = async () => {
    if (!user?.email) return

    await runWithFeedback({
      action: async () => {
        const response = await callApi('/waitlist/green-pulse/add', {
          appName: 'ezauth',
          method: 'POST',
          body: { email: user.email },
        })

        if (!response.ok) {
          throw new Error(
            response.error || (response.data as any)?.error || 'Failed to request beta access'
          )
        }

        await refetchStatus()
        return response.data
      },
      toastLoading: { message: 'Requesting beta access...' },
      toastSuccess: { message: 'Beta access requested! Waiting for admin approval.' },
    })
  }

  const handleActivate = async () => {
    if (!accessCode || !user?.email) return

    await runWithFeedback({
      action: async () => {
        const response = await callApi('/auth/register-with-code', {
          appName: 'ezauth',
          method: 'POST',
          body: {
            email: user.email,
            accessCode: accessCode.trim().toUpperCase(),
          },
        })

        if (!response.ok) {
          throw new Error(response.error || (response.data as any)?.error || 'Invalid access code')
        }

        await refetchUser()
        return response.data
      },
      toastLoading: { message: 'Activating...' },
      toastSuccess: { message: 'Access activated! Refreshing session...' },
    })
  }

  const handleRefreshSession = async () => {
    await runWithFeedback({
      action: async () => {
        await refetchUser()
      },
      toastLoading: { message: 'Refreshing session...' },
      toastSuccess: { message: 'Session refreshed! You now have access.' },
    })
  }

  const status = waitlistStatus?.status

  return (
    <Section size={'full'}>
      <Card variant={'ghost'}>
        <CardContent className="text-center py-12 space-y-6">
          <InsufficientPermissions
            requiredRoles={['client', 'beta-tester', 'manager', 'admin', 'superadmin']}
          />

          {/* Pending state */}
          {status === 'pending' && (
            <Div className="space-y-4">
              <Icon name="lucide:Clock" className="w-12 h-12 mx-auto text-warning" />
              <P className="text-warning font-medium">{t('requestSubmitted')}</P>
              <P className="text-sm text-muted-foreground">{t('waitingApproval')}</P>
            </Div>
          )}

          {/* Invited state - needs to enter code */}
          {status === 'invited' && (
            <Div className="space-y-4">
              <Icon name="lucide:Mail" className="w-12 h-12 mx-auto text-primary" />
              <P className="text-primary font-medium">{t('approved')}</P>
              <P className="text-sm text-muted-foreground">{t('enterCode')}</P>
              <Input
                type="text"
                placeholder={t('codePlaceholder')}
                value={accessCode}
                onChange={e => setAccessCode(e.target.value.toUpperCase())}
                className="max-w-xs mx-auto"
              />
              <Button
                onClick={handleActivate}
                size="lg"
                className="bg-gp-primary hover:bg-gp-primary/80"
              >
                <Icon name="lucide:Check" className="mr-2" />
                {t('activateAccess')}
              </Button>
            </Div>
          )}

          {/* Activated state - needs to refresh */}
          {status === 'activated' && (
            <Div className="space-y-4">
              <Icon name="lucide:CheckCircle2" className="w-12 h-12 mx-auto text-primary" />
              <P className="text-primary font-medium">{t('accessGranted')}</P>
              <P className="text-sm text-muted-foreground">{t('accessActivated')}</P>
              <Button
                onClick={handleRefreshSession}
                size="lg"
                className="bg-gp-primary hover:bg-gp-primary/80"
              >
                <Icon name="lucide:RefreshCw" className="mr-2" />
                {t('refreshSession')}
              </Button>
            </Div>
          )}

          {/* Rejected state */}
          {status === 'rejected' && (
            <Div className="space-y-4">
              <Icon name="lucide:XCircle" className="w-12 h-12 mx-auto text-destructive" />
              <P className="text-destructive font-medium">{t('accessDenied')}</P>
              <P className="text-sm text-muted-foreground">{t('accessRejected')}</P>
            </Div>
          )}

          {/* No status - can request */}
          {!status && !waitlistStatus?.found && (
            <Button
              onClick={handleRequest}
              size="lg"
              className="bg-gp-primary hover:bg-gp-primary/80"
            >
              <Icon name="lucide:Sparkles" className="mr-2" />
              {t('requestAccess')}
            </Button>
          )}
        </CardContent>
      </Card>
    </Section>
  )
}

export default function LiaPage() {
  const t = useTranslations('auth')

  return (
    <RequireAuth
      loadingComponent={
        <Section size="full">
          <Spinner size="lg" />
        </Section>
      }
      fallbackComponent={
        <Section size="full">
          <Card variant={'ghost'} className="max-w-md mx-auto text-center">
            <CardContent className="py-12 space-y-6">
              {/* Logo GreenPulse */}
              <Div className="flex justify-center">
                <Image
                  src="/logo_complet_light.svg"
                  alt="GreenPulse.AI Logo"
                  width={200}
                  height={40}
                  className="animate-glow-pulse-sm dark:hidden"
                />
                <Image
                  src="/logo_complet_dark.svg"
                  alt="GreenPulse.AI Logo"
                  width={200}
                  height={40}
                  className="animate-glow-pulse-sm hidden dark:block"
                />
              </Div>

              {/* Positive messaging */}
              <Div className="space-y-3">
                <H2 size="h4" className="text-gp-primary">
                  {t('welcome.title')}
                </H2>
                <P className="text-muted-foreground">{t('welcome.description')}</P>
              </Div>

              {/* Login button */}
              <LoginButton
                size="lg"
                className="bg-gp-primary hover:bg-gp-primary/80"
                alwaysShowText
                showIcon={false}
              >
                {t('welcome.login')}
              </LoginButton>
            </CardContent>
          </Card>
        </Section>
      }
    >
      {/* <RequireRole
        roles={['client', 'beta-tester', 'manager', 'admin', 'superadmin']}
        fallbackComponent={<BetaAccessRequest />}
      > */}
      <LiaPageContent />
      {/* </RequireRole> */}
    </RequireAuth>
  )
}
