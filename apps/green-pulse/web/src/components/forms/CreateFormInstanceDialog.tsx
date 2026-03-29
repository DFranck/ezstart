'use client'

import { useState } from 'react'
import { logger } from '@ezstart/logger'
import { useRouter } from 'next/navigation'
import { Button, Card, CardContent, Div, Label, P, Span } from '@ezstart/ui/components'
import { useCreateFormInstance } from '@/hooks/useForms'
import { useFormConfigs } from '@/hooks/useForms'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

interface CreateFormInstanceDialogProps {
  projectId: string
  workspaceSlug: string
}

export function CreateFormInstanceDialog({
  projectId,
  workspaceSlug,
}: CreateFormInstanceDialogProps) {
  const t = useTranslations('forms.createInstance')
  const tActions = useTranslations('actions')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedConfigId, setSelectedConfigId] = useState('')
  const [mode, setMode] = useState<'manual' | 'chat' | 'vocal'>('chat')

  const createFormInstance = useCreateFormInstance()
  const { data: configsData, isLoading } = useFormConfigs()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedConfigId) {
      return
    }

    try {
      const result = await createFormInstance.mutateAsync({
        formConfigId: selectedConfigId,
        projectId,
        mode,
      })

      const formInstanceId = result?.data?._id

      if (formInstanceId) {
        router.push(`/w/${workspaceSlug}/p/${projectId}/f/${formInstanceId}`)
      }

      setOpen(false)
    } catch (error) {
      logger.error('Failed to create form instance:', error)
    }
  }

  // ✅ Fixed: callApi wraps response as { ok, data: { success, data: [...] } }
  const formConfigs = configsData?.data?.data || []

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t('newForm')}</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form Template Selection */}
          <Div>
            <Label className="mb-3 block">{t('selectTemplate')}</Label>
            {isLoading ? (
              <P className="text-sm text-muted-foreground">{t('loadingTemplates')}</P>
            ) : formConfigs.length === 0 ? (
              <P className="text-sm text-muted-foreground">{t('noTemplates')}</P>
            ) : (
              <Div className="grid gap-3">
                {formConfigs.map((config: any) => (
                  <Card
                    key={config.id}
                    className={`cursor-pointer transition-all ${
                      selectedConfigId === config.id
                        ? 'border-primary ring-2 ring-primary'
                        : 'hover:border-muted-foreground'
                    }`}
                    onClick={() => setSelectedConfigId(config.id)}
                  >
                    <CardContent className="p-4">
                      <Div className="flex items-start gap-3">
                        <Span className="text-2xl">{config.icon || '📄'}</Span>
                        <Div className="flex-1">
                          <P className="font-medium mb-1">{config.name}</P>
                          <P className="text-sm text-muted-foreground">{config.description}</P>
                          <Div className="flex gap-2 mt-2">
                            <Span className="text-xs px-2 py-1 bg-muted rounded">
                              {config.category}
                            </Span>
                            <Span className="text-xs px-2 py-1 bg-muted rounded">
                              {t('fields', { count: config.extraction?.fields?.length || 0 })}
                            </Span>
                          </Div>
                        </Div>
                      </Div>
                    </CardContent>
                  </Card>
                ))}
              </Div>
            )}
          </Div>

          {/* Filling Mode Selection */}
          <Div>
            <Label className="mb-3 block">{t('fillingMode')}</Label>
            <Div className="grid gap-3">
              <Card
                className={`cursor-pointer transition-all ${
                  mode === 'chat'
                    ? 'border-primary ring-2 ring-primary'
                    : 'hover:border-muted-foreground'
                }`}
                onClick={() => setMode('chat')}
              >
                <CardContent className="p-4">
                  <Div className="flex items-start gap-3">
                    <Span className="text-2xl">💬</Span>
                    <Div>
                      <P className="font-medium mb-1">{t('chatMode')}</P>
                      <P className="text-sm text-muted-foreground">{t('chatModeDescription')}</P>
                    </Div>
                  </Div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  mode === 'vocal'
                    ? 'border-primary ring-2 ring-primary'
                    : 'hover:border-muted-foreground'
                }`}
                onClick={() => setMode('vocal')}
              >
                <CardContent className="p-4">
                  <Div className="flex items-start gap-3">
                    <Span className="text-2xl">🎤</Span>
                    <Div>
                      <P className="font-medium mb-1">{t('vocalMode')}</P>
                      <P className="text-sm text-muted-foreground">{t('vocalModeDescription')}</P>
                    </Div>
                  </Div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-all ${
                  mode === 'manual'
                    ? 'border-primary ring-2 ring-primary'
                    : 'hover:border-muted-foreground'
                }`}
                onClick={() => setMode('manual')}
              >
                <CardContent className="p-4">
                  <Div className="flex items-start gap-3">
                    <Span className="text-2xl">✍️</Span>
                    <Div>
                      <P className="font-medium mb-1">{t('manualMode')}</P>
                      <P className="text-sm text-muted-foreground">{t('manualModeDescription')}</P>
                    </Div>
                  </Div>
                </CardContent>
              </Card>
            </Div>
          </Div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {tActions('cancel')}
            </Button>
            <Button type="submit" disabled={!selectedConfigId || createFormInstance.isPending}>
              {createFormInstance.isPending ? tActions('creating') : t('createAndFill')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
