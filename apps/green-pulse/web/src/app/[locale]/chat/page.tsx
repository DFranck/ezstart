'use client'

import { LiaThread } from '@/components/lia/LiaThread'
import { ThreadProvider } from '@/components/lia/ThreadProvider'
import { getApiUrl } from '@ezstart/config'
import { AccessDenied, LoginButton, RequireAuth, useAuthStore } from '@ezstart/auth-sdk'
import { InsufficientPermissions, RequireRole } from '@ezstart/rbac'
import { Card, Section, Spinner } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

function LiaPageContent(): any {
  // Get user from Zustand store (localStorage 'ezauth-storage')
  const { user, isAuthenticated } = useAuthStore()
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [onConversationCreated, setOnConversationCreated] = useState<(() => void) | null>(null)

  const config = useMemo(
    () => ({
      endpoint: `${getApiUrl('green-pulse')}/api/chat`,
      method: 'POST' as const,
      headers: {
        'Content-Type': 'application/json',
      },
      formatRequest: (message: string) => {
        const payload: any = {
          message,
          extract_esg: false,
          // Include userId if authenticated
          ...(isAuthenticated && user?._id && { userId: user._id }),
        }
        // Only include conversation_id if it exists (avoid sending null)
        if (activeConversationId) {
          payload.conversation_id = activeConversationId
        }
        return payload
      },
      formatResponse: (data: any) => {
        return data.data?.response || data.response || 'No response'
      },
      onSuccess: (data: any) => {
        // Save conversation_id for subsequent messages
        if (data.data?.conversation_id && !activeConversationId) {
          const userInfo = isAuthenticated && user?._id ? `userId: ${user._id}` : 'anonymous'
          console.log(`✅ Conversation created: ${data.data.conversation_id} (${userInfo})`)
          setActiveConversationId(data.data.conversation_id)
          // Trigger conversation list reload
          if (onConversationCreated) {
            onConversationCreated()
          }
        }
      },
      onError: (error: Error) => {
        console.error('LIA Chat Error:', error)
      },
    }),
    [isAuthenticated, user, activeConversationId, onConversationCreated]
  ) // Re-create when auth state or activeConversationId changes

  return (
    <ThreadProvider config={config}>
      <LiaThread
        activeConversationId={activeConversationId}
        setActiveConversationId={setActiveConversationId}
        onRegisterConversationCreatedCallback={setOnConversationCreated}
      />
    </ThreadProvider>
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
          <Card variant={'ghost'}>
            <AccessDenied>
              <LoginButton>{t('login')}</LoginButton>
            </AccessDenied>
          </Card>
        </Section>
      }
    >
      <RequireRole
        roles={['client', 'beta-tester']}
        fallbackComponent={
          <Section size={'full'}>
            <Card variant={'ghost'}>
              <InsufficientPermissions requiredRoles={['client', 'beta-tester']} />
            </Card>
          </Section>
        }
      >
        <LiaPageContent />
      </RequireRole>
    </RequireAuth>
  )
}
