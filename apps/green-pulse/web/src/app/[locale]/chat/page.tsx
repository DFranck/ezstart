'use client'

import { LiaThread } from '@/components/lia/LiaThread'
import { ThreadProvider } from '@/components/lia/ThreadProvider'
import { getApiUrl } from '@ezstart/config'
import { AccessDenied, LoginButton, RequireAuth, useAuthStore } from '@ezstart/auth-sdk'
import { InsufficientPermissions, RequireRole } from '@ezstart/rbac'
import { useProviders } from '@ezstart/ai-sdk/client'
import { Button, Card, CardContent, Div, H3, Icon, Input, P, Section, Spinner } from '@ezstart/ui/components'
import { runWithFeedback, toast } from '@ezstart/ui/utils'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

function LiaPageContent(): any {
  // Get user from Zustand store (localStorage 'ezauth-storage')
  const { user, isAuthenticated } = useAuthStore()
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [onConversationCreated, setOnConversationCreated] = useState<(() => void) | null>(null)

  // Load AI providers from API
  const { providers, selectedProvider, setSelectedProvider } = useProviders('green-pulse')

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
          providerId: selectedProvider, // AI provider selection
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
        // Show error toast to user
        toast.error(error.message || 'Failed to send message. Please try again.')
      },
    }),
    [isAuthenticated, user, activeConversationId, onConversationCreated, selectedProvider]
  ) // Re-create when auth state, activeConversationId, or selectedProvider changes

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
      const apiUrl = getApiUrl('ezauth')
      const response = await fetch(`${apiUrl}/api/waitlist/green-pulse/status/${encodeURIComponent(user.email)}`)
      if (!response.ok) return null
      return response.json()
    },
    enabled: !!user?.email,
  })

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
          throw new Error(data.error || 'Failed to request beta access')
        }

        await refetchStatus()
        return data
      },
      toastLoading: { message: 'Requesting beta access...' },
      toastSuccess: { message: 'Beta access requested! Waiting for admin approval.' },
    })
  }

  const handleActivate = async () => {
    if (!accessCode || !user?.email) return

    await runWithFeedback({
      action: async () => {
        const apiUrl = getApiUrl('ezauth')
        const response = await fetch(`${apiUrl}/api/auth/register-with-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            accessCode: accessCode.trim().toUpperCase(),
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Invalid access code')
        }

        await refetchUser()
        return response.json()
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
          <InsufficientPermissions requiredRoles={['client', 'beta-tester', 'manager', 'admin', 'superadmin']} />

          {/* Pending state */}
          {status === 'pending' && (
            <Div className="space-y-4">
              <Icon name="lucide:Clock" className="w-12 h-12 mx-auto text-orange-500" />
              <P className="text-orange-600 font-medium">Request submitted!</P>
              <P className="text-sm text-muted-foreground">
                Waiting for admin approval. We'll notify you once approved.
              </P>
            </Div>
          )}

          {/* Invited state - needs to enter code */}
          {status === 'invited' && (
            <Div className="space-y-4">
              <Icon name="lucide:Mail" className="w-12 h-12 mx-auto text-blue-500" />
              <P className="text-blue-600 font-medium">You've been approved!</P>
              <P className="text-sm text-muted-foreground">
                Enter your access code to activate beta access:
              </P>
              <Input
                type="text"
                placeholder="BETA-GP-XXXXXXXX"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="max-w-xs mx-auto"
              />
              <Button onClick={handleActivate} size="lg" className="bg-gp-primary hover:bg-gp-primary/80">
                <Icon name="lucide:Check" className="mr-2" />
                Activate Access
              </Button>
            </Div>
          )}

          {/* Activated state - needs to refresh */}
          {status === 'activated' && (
            <Div className="space-y-4">
              <Icon name="lucide:CheckCircle2" className="w-12 h-12 mx-auto text-green-500" />
              <P className="text-green-600 font-medium">Access granted!</P>
              <P className="text-sm text-muted-foreground">
                Your beta access has been activated. Click below to refresh your session.
              </P>
              <Button onClick={handleRefreshSession} size="lg" className="bg-green-600 hover:bg-green-700">
                <Icon name="lucide:RefreshCw" className="mr-2" />
                Refresh Session
              </Button>
            </Div>
          )}

          {/* Rejected state */}
          {status === 'rejected' && (
            <Div className="space-y-4">
              <Icon name="lucide:XCircle" className="w-12 h-12 mx-auto text-red-500" />
              <P className="text-red-600 font-medium">Access denied</P>
              <P className="text-sm text-muted-foreground">
                Your beta access request was rejected. Please contact support for more information.
              </P>
            </Div>
          )}

          {/* No status - can request */}
          {!status && !waitlistStatus?.found && (
            <Button onClick={handleRequest} size="lg" className="bg-gp-primary hover:bg-gp-primary/80">
              <Icon name="lucide:Sparkles" className="mr-2" />
              Request Beta Access
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
