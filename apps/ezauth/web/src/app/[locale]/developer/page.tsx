'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { apiCall } from '@ezstart/api-sdk'
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
  Spinner,
} from '@ezstart/ui/components'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ApiKeyItem, CreateApiKeyResponse } from './types'
import { ApiKeysTable } from './components/ApiKeysTable'
import { CreateKeyModal } from './components/CreateKeyModal'
import { KeyCreatedModal } from './components/KeyCreatedModal'

export default function DeveloperPage() {
  const t = useTranslations('developer')
  const { user, isAuthReady, isAuthenticated } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isAuthReady && !isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthReady, isAuthenticated, router])

  // Fetch API keys
  const {
    data: apiKeys = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () =>
      apiCall<ApiKeyItem[]>('/keys', {
        appName: 'ezauth',
        method: 'GET',
      }),
    enabled: !!user,
  })

  // Create key mutation
  const createMutation = useMutation({
    mutationFn: (body: { name: string; appName: string; expiresAt: string | null }) =>
      apiCall<CreateApiKeyResponse>('/keys', {
        appName: 'ezauth',
        method: 'POST',
        body,
      }),
    onSuccess: (data) => {
      setShowCreateModal(false)
      setCreatedKey(data.key)
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: () => {
      toast.error(t('errors.createFailed'))
    },
  })

  // Revoke mutation
  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      apiCall(`/keys/${id}`, {
        appName: 'ezauth',
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success(t('revoke.success'))
      setRevokeTargetId(null)
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: () => {
      toast.error(t('errors.revokeFailed'))
    },
  })

  // Rotate mutation
  const rotateMutation = useMutation({
    mutationFn: (id: string) =>
      apiCall<CreateApiKeyResponse>(`/keys/${id}/rotate`, {
        appName: 'ezauth',
        method: 'POST',
      }),
    onSuccess: (data) => {
      toast.success(t('rotate.success'))
      setCreatedKey(data.key)
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: () => {
      toast.error(t('errors.rotateFailed'))
    },
  })

  if (!isAuthReady || !user) {
    return (
      <Div className="flex items-center justify-center min-h-[50vh]">
        <Spinner variant="primary" size="lg" />
      </Div>
    )
  }

  return (
    <Card className="max-w-3xl w-full relative">
      <Div className="absolute top-4 left-4">
        <BackButton />
      </Div>

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Div className="flex justify-end">
          <Button onClick={() => setShowCreateModal(true)}>{t('createKey')}</Button>
        </Div>

        {isLoading && (
          <Div className="flex justify-center py-8">
            <Spinner variant="primary" size="md" />
          </Div>
        )}

        {isError && (
          <Div className="text-center space-y-3">
            <P className="text-destructive">{t('errors.fetchFailed')}</P>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t('retry')}
            </Button>
          </Div>
        )}

        {!isLoading && !isError && apiKeys.length === 0 && (
          <P className="text-muted-foreground text-center py-8">{t('noKeys')}</P>
        )}

        {!isLoading && !isError && apiKeys.length > 0 && (
          <ApiKeysTable
            keys={apiKeys}
            onRevoke={setRevokeTargetId}
            onRotate={(id) => rotateMutation.mutate(id)}
            isRevoking={revokeMutation.isPending}
            isRotating={rotateMutation.isPending}
          />
        )}
      </CardContent>

      {/* Create Key Modal */}
      <CreateKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
      />

      {/* Key Created Modal (shows raw key once) */}
      <KeyCreatedModal
        isOpen={!!createdKey}
        onClose={() => setCreatedKey(null)}
        rawKey={createdKey}
      />

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeTargetId} onOpenChange={(open) => !open && setRevokeTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('revoke.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('revoke.confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('created.done')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeTargetId && revokeMutation.mutate(revokeTargetId)}
            >
              {t('revoke.submit')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
