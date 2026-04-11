'use client'

import { LiaThread } from '@/components/lia/LiaThread'
import { ThreadProvider } from '@/components/lia/ThreadProvider'
import { AIProvider, useConversations } from '@ezstart/ai-sdk/client'
import { LoginButton, RequireAuth, useAuthStore } from '@ezstart/auth-sdk'
import { getApiUrl } from '@ezstart/config'
import { logger } from '@ezstart/logger'
import { Card, CardContent, Div, H2, P, Section, Spinner } from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useLocale, useTranslations } from 'next-intl'
import Image from 'next/image'
import { useMemo, useState } from 'react'

function LiaPageContent() {
  const t = useTranslations('chat')
  const locale = useLocale()

  // Get user from Zustand store (localStorage 'ezauth-storage')
  const { user, isAuthenticated, accessToken } = useAuthStore()
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [onConversationCreated, setOnConversationCreated] = useState<(() => void) | null>(null)

  // AI provider is managed by admin — no user-facing selector
  // Provider selection handled server-side via cascade/default

  // Get refreshConversation to invalidate cache after sending message
  const { refreshConversation } = useConversations()

  const config = useMemo(
    () => ({
      endpoint: `${getApiUrl('ezstart')}/api/ai/chat`,
      method: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      enableStreaming: true, // Auto-detects SSE vs JSON based on Content-Type
      formatRequest: (message: string) => {
        const payload: Record<string, unknown> = {
          message,
          appName: 'green-pulse', // Scope conversation to green-pulse
          stream: true, // Request streaming (API decides via Content-Type)
          extract_esg: false,
          locale, // Pass locale so AI responds in the user's language
          // Include userId if authenticated
          ...(isAuthenticated && user?._id && { userId: user._id }),
        }
        // Provider is managed by admin cascade — no client-side selection
        // Only include conversationId if it exists (avoid sending null)
        if (activeConversationId) {
          payload.conversationId = activeConversationId
        }
        return payload
      },
      formatResponse: (rawData: unknown): string => {
        const data = rawData as Record<string, unknown> & {
          delta?: string
          data?: Record<string, unknown>
          response?: string
        }
        return String(data.delta || data.data?.response || data.response || '')
      },
      onSuccess: (rawData: unknown) => {
        const data = rawData as Record<string, unknown> & { data?: Record<string, unknown> }
        const conversationId = data.data?.conversationId as string | undefined

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
      accessToken,
      activeConversationId,
      onConversationCreated,
      refreshConversation,
      t,
    ]
  ) // Re-create when auth state, activeConversationId, selectedProvider, or refreshConversation changes

  return (
    <Div className="fixed inset-0 z-0">
      <ThreadProvider config={config}>
        <LiaThread
          activeConversationId={activeConversationId}
          setActiveConversationId={setActiveConversationId}
          onRegisterConversationCreatedCallback={setOnConversationCreated}
        />
      </ThreadProvider>
    </Div>
  )
}

export default function LiaPage() {
  const t = useTranslations('auth')

  return (
    <AIProvider appName="green-pulse" getToken={() => useAuthStore.getState().accessToken}>
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
        <LiaPageContent />
      </RequireAuth>
    </AIProvider>
  )
}
