'use client'

import { useState } from 'react'
import { logger } from '@ezstart/logger'
import { useRouter } from 'next/navigation'
import { Button, Label, P, Card, CardContent } from '@ezstart/ui/components'
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

interface CreateFormInstanceDialogProps {
  projectId: string
  workspaceSlug: string
}

export function CreateFormInstanceDialog({
  projectId,
  workspaceSlug,
}: CreateFormInstanceDialogProps) {
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
        <Button>+ New Form</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Form Instance</DialogTitle>
          <DialogDescription>Choose a form template and filling mode</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form Template Selection */}
          <div>
            <Label className="mb-3 block">Select Form Template *</Label>
            {isLoading ? (
              <P className="text-sm text-muted-foreground">Loading form templates...</P>
            ) : formConfigs.length === 0 ? (
              <P className="text-sm text-muted-foreground">
                No form templates available. Please seed the database first.
              </P>
            ) : (
              <div className="grid gap-3">
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
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{config.icon || '📄'}</span>
                        <div className="flex-1">
                          <P className="font-medium mb-1">{config.name}</P>
                          <P className="text-sm text-muted-foreground">{config.description}</P>
                          <div className="flex gap-2 mt-2">
                            <span className="text-xs px-2 py-1 bg-muted rounded">
                              {config.category}
                            </span>
                            <span className="text-xs px-2 py-1 bg-muted rounded">
                              {config.extraction?.fields?.length || 0} fields
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Filling Mode Selection */}
          <div>
            <Label className="mb-3 block">Filling Mode *</Label>
            <div className="grid gap-3">
              <Card
                className={`cursor-pointer transition-all ${
                  mode === 'chat'
                    ? 'border-primary ring-2 ring-primary'
                    : 'hover:border-muted-foreground'
                }`}
                onClick={() => setMode('chat')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">💬</span>
                    <div>
                      <P className="font-medium mb-1">Chat Mode (Recommended)</P>
                      <P className="text-sm text-muted-foreground">
                        Have a conversation with AI to fill the form automatically
                      </P>
                    </div>
                  </div>
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
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎤</span>
                    <div>
                      <P className="font-medium mb-1">Vocal Mode</P>
                      <P className="text-sm text-muted-foreground">
                        Talk naturally to AI using voice (Web Speech API)
                      </P>
                    </div>
                  </div>
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
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">✍️</span>
                    <div>
                      <P className="font-medium mb-1">Manual Mode</P>
                      <P className="text-sm text-muted-foreground">
                        Fill out the form fields manually (traditional)
                      </P>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedConfigId || createFormInstance.isPending}>
              {createFormInstance.isPending ? 'Creating...' : 'Create & Fill Form'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
