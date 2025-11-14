'use client'

import { LiaThread } from '@/components/lia/LiaThread'
import { ThreadProvider } from '@/components/lia/ThreadProvider'
import { getApiUrl } from '@ezstart/config'
import { AccessDenied, LoginButton, RequireAuth, useAuthStore } from '@ezstart/auth-sdk'
import { InsufficientPermissions, RequireRole } from '@ezstart/rbac'
import { Button, Card, CardContent, Div, H3, Icon, P, Section, Spinner } from '@ezstart/ui/components'
import { runWithFeedback, toast } from '@ezstart/ui/utils'
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

function BetaAccessRequest() {
  const { user } = useAuthStore()
  const [requested, setRequested] = useState(false)

  const handleRequest = async () => {
    if (!user?.email) return

    await runWithFeedback({
      action: async () => {
        const apiUrl = getApiUrl('ezauth')
        const response = await fetch(`${apiUrl}/api/waitlist/green-pulse/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email }),
        })

        const data = await response.json()

        if (!response.ok) {
          if (response.status === 409 && data.code === 'EMAIL_EXISTS') {
            throw new Error('You are already on the waitlist!')
          }
          throw new Error(data.error || 'Failed to request beta access')
        }

        setRequested(true)
        return data
      },
      toastLoading: { message: 'Requesting beta access...' },
      toastSuccess: { message: 'Beta access requested! We will review your request soon.' },
      toastError: false,
      onError: error => {
        toast.error(error instanceof Error ? error.message : 'Failed to request beta access')
      },
    })
  }

  return (
    <Section size={'full'}>
      <Card variant={'ghost'}>
        <CardContent className="text-center py-12 space-y-6">
          <InsufficientPermissions requiredRoles={['client', 'beta-tester', 'manager', 'admin', 'superadmin']} />
          {!requested ? (
            <Button onClick={handleRequest} size="lg" className="bg-gp-primary hover:bg-gp-primary/80">
              <Icon name="lucide:Sparkles" className="mr-2" />
              Request Beta Access
            </Button>
          ) : (
            <Div className="space-y-2">
              <Icon name="lucide:CheckCircle2" className="w-12 h-12 mx-auto text-green-500" />
              <P className="text-green-600 font-medium">Request submitted successfully!</P>
              <P className="text-sm text-muted-foreground">
                We will review your request and notify you via email.
              </P>
            </Div>
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
          <Card variant={'ghost'}>
            <AccessDenied>
              <LoginButton>{t('login')}</LoginButton>
            </AccessDenied>
          </Card>
        </Section>
      }
    >
      <RequireRole roles={['client', 'beta-tester', 'manager', 'admin', 'superadmin']} fallbackComponent={<BetaAccessRequest />}>
        <LiaPageContent />
      </RequireRole>
    </RequireAuth>
  )
}
