'use client'

import React, { useState } from 'react'
import { apiCall } from '@ezstart/api-sdk'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H3,
  Icon,
  Input,
  Label,
  Modal,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { runWithFeedback, toast } from '@ezstart/ui/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { PromptConfigEditor, type PromptConfig } from './PromptConfigEditor'

type SystemPrompt = {
  _id: string
  key: string
  name: string
  description?: string
  content: string
  config?: PromptConfig
  type: 'general' | 'extraction' | 'validation' | 'vision' | 'custom'
  provider: 'all' | 'gemini' | 'openai' | 'anthropic'
  isActive: boolean
  isDefault: boolean
  variables?: string[]
  updatedBy?: string
  createdAt: string
  updatedAt: string
}

type PromptsResponse = SystemPrompt[]

// Only show types currently implemented in /chat
// extract_esg is hardcoded to false in chat/page.tsx, so only 'general' is used
const PROMPT_TYPES = [
  { value: 'general', label: 'General (Chat)' },
  // TODO: Enable when extract_esg feature is activated
  // { value: 'extraction', label: 'Extraction (ESG)' },
  // { value: 'validation', label: 'Validation' },
  // { value: 'vision', label: 'Vision' },
  // { value: 'custom', label: 'Custom' },
]

// All types for the form (in case admin wants to prepare future prompts)
const ALL_PROMPT_TYPES = [
  { value: 'general', label: 'General (Chat)' },
  { value: 'extraction', label: 'Extraction (ESG)' },
  { value: 'validation', label: 'Validation' },
  { value: 'vision', label: 'Vision' },
  { value: 'custom', label: 'Custom' },
]

const PROVIDERS = [
  { value: 'all', label: 'All Providers' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
]

export function PromptsManagement() {
  const t = useTranslations('admin.prompts')
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null)
  const [filter, setFilter] = useState<string>('all')

  // Form state
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    content: '',
    config: {} as PromptConfig,
    type: 'general' as SystemPrompt['type'],
    provider: 'all' as SystemPrompt['provider'],
    isActive: true,
    isDefault: false,
  })

  // Fetch prompts
  const { data, isLoading, error } = useQuery<PromptsResponse>({
    queryKey: ['ezstart', '/ai/prompts'],
    queryFn: () => apiCall<PromptsResponse>('/ai/prompts', { appName: 'ezstart' }),
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      apiCall('/ai/prompts', {
        appName: 'ezstart',
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ezstart', '/ai/prompts'] })
      setIsDialogOpen(false)
      resetForm()
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: Partial<typeof formData> }) =>
      apiCall(`/ai/prompts/${key}`, {
        appName: 'ezstart',
        method: 'PATCH',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ezstart', '/ai/prompts'] })
      setIsDialogOpen(false)
      setEditingPrompt(null)
      resetForm()
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (key: string) =>
      apiCall(`/ai/prompts/${key}`, {
        appName: 'ezstart',
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ezstart', '/ai/prompts'] })
    },
  })

  const resetForm = () => {
    setFormData({
      key: '',
      name: '',
      description: '',
      content: '',
      config: {},
      type: 'general',
      provider: 'all',
      isActive: true,
      isDefault: false,
    })
  }

  const handleEdit = (prompt: SystemPrompt) => {
    setEditingPrompt(prompt)
    setFormData({
      key: prompt.key,
      name: prompt.name,
      description: prompt.description || '',
      content: prompt.content,
      config: prompt.config || {},
      type: prompt.type,
      provider: prompt.provider,
      isActive: prompt.isActive,
      isDefault: prompt.isDefault,
    })
    setIsDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingPrompt(null)
    resetForm()
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (editingPrompt) {
      await runWithFeedback({
        action: () => updateMutation.mutateAsync({ key: editingPrompt.key, data: formData }),
        toastLoading: { message: 'Updating prompt...' },
        toastSuccess: { message: 'Prompt updated successfully' },
        toastError: { message: 'Failed to update prompt' },
      })
    } else {
      await runWithFeedback({
        action: () => createMutation.mutateAsync(formData),
        toastLoading: { message: 'Creating prompt...' },
        toastSuccess: { message: 'Prompt created successfully' },
        toastError: { message: 'Failed to create prompt' },
      })
    }
  }

  const handleDelete = async (key: string) => {
    if (!confirm(`Delete prompt "${key}"? This action cannot be undone.`)) return
    await runWithFeedback({
      action: () => deleteMutation.mutateAsync(key),
      toastLoading: { message: 'Deleting prompt...' },
      toastSuccess: { message: 'Prompt deleted' },
      toastError: { message: 'Failed to delete prompt' },
    })
  }

  // Filter by active types only (general, extraction) + selected filter
  const activeTypes = PROMPT_TYPES.map(t => t.value)
  const filteredPrompts =
    data?.filter(p => {
      const isActiveType = activeTypes.includes(p.type)
      const matchesFilter = filter === 'all' ? true : p.type === filter
      return isActiveType && matchesFilter
    }) || []

  const getTypeBadge = (type: SystemPrompt['type']) => {
    const variants = {
      general: 'default',
      extraction: 'default',
      validation: 'secondary',
      vision: 'outline',
      custom: 'secondary',
    } as const
    return <Badge variant={variants[type]}>{type}</Badge>
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Icon name="lucide:Loader2" className="w-8 h-8 mx-auto animate-spin" />
          <P className="text-muted-foreground mt-2">{t('loading')}</P>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Icon name="lucide:AlertCircle" className="w-12 h-12 mx-auto text-destructive mb-2" />
          <P className="text-destructive font-medium">{t('loadFailed')}</P>
          <P className="text-sm text-muted-foreground mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </P>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <Div className="flex items-center justify-between">
            <Div>
              <H3 className="flex items-center gap-2">
                <Icon name="lucide:MessageSquare" />
                {t('title')}
              </H3>
              <P className="text-sm text-muted-foreground mt-1">{t('manageDescription')}</P>
            </Div>
            <Button onClick={handleCreate}>
              <Icon name="lucide:Plus" className="mr-2" />
              {t('newPrompt')}
            </Button>
          </Div>
        </CardHeader>
        <CardContent>
          {/* Filter tabs */}
          <Div className="flex gap-2 mb-4 flex-wrap">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All ({data?.filter(p => activeTypes.includes(p.type)).length || 0})
            </Button>
            {PROMPT_TYPES.map(t => (
              <Button
                key={t.value}
                size="sm"
                variant={filter === t.value ? 'default' : 'outline'}
                onClick={() => setFilter(t.value)}
              >
                {t.label} ({data?.filter(p => p.type === t.value).length || 0})
              </Button>
            ))}
          </Div>

          {/* Prompts list */}
          {filteredPrompts.length === 0 ? (
            <Div className="text-center py-12">
              <Icon
                name="lucide:FileText"
                className="w-12 h-12 mx-auto text-muted-foreground mb-2"
              />
              <P className="text-muted-foreground">{t('noPrompts')}</P>
              <Button className="mt-4" onClick={handleCreate}>
                {t('createFirst')}
              </Button>
            </Div>
          ) : (
            <Div className="space-y-3">
              {filteredPrompts.map(prompt => (
                <Card key={prompt._id} variant="ghost" className="border">
                  <CardContent className="py-4">
                    <Div className="flex items-start justify-between">
                      <Div className="flex-1">
                        <Div className="flex items-center gap-2 mb-1">
                          <P className="font-medium">{prompt.name}</P>
                          {getTypeBadge(prompt.type)}
                          <Badge variant="outline">{prompt.provider}</Badge>
                          {prompt.isDefault && <Badge variant="default">Default</Badge>}
                          {!prompt.isActive && <Badge variant="secondary">Inactive</Badge>}
                        </Div>
                        <P className="text-xs text-muted-foreground font-mono mb-2">
                          key: {prompt.key}
                        </P>
                        {prompt.description && (
                          <P className="text-sm text-muted-foreground mb-2">{prompt.description}</P>
                        )}
                        <Div className="bg-muted/50 rounded p-2 max-h-24 overflow-y-auto">
                          <P className="text-xs font-mono whitespace-pre-wrap">
                            {prompt.content.slice(0, 300)}
                            {prompt.content.length > 300 && '...'}
                          </P>
                        </Div>
                        <P className="text-xs text-muted-foreground mt-2">
                          Updated: {new Date(prompt.updatedAt).toLocaleString()}
                          {prompt.updatedBy && ` by ${prompt.updatedBy}`}
                        </P>
                      </Div>
                      <Div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(prompt)}>
                          <Icon name="lucide:Pencil" size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(prompt.key)}
                          disabled={prompt.isDefault}
                        >
                          <Icon name="lucide:Trash2" size={14} />
                        </Button>
                      </Div>
                    </Div>
                  </CardContent>
                </Card>
              ))}
            </Div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Modal
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        size="xl"
        title={editingPrompt ? t('editPrompt') : t('createPrompt')}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.key || !formData.name || !formData.content}
            >
              {editingPrompt ? t('update') : t('create')}
            </Button>
          </>
        }
      >
        <Tabs defaultValue="prompt" className="py-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prompt">
              <Icon name="lucide:MessageSquare" className="mr-2" size={16} />
              {t('promptContent')}
            </TabsTrigger>
            <TabsTrigger value="config">
              <Icon name="lucide:Settings" className="mr-2" size={16} />
              {t('configuration')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="prompt" className="space-y-4">
            <Div className="grid grid-cols-2 gap-4">
              <Div>
                <Label htmlFor="key">{t('key')}</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      key: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''),
                    })
                  }
                  placeholder="e.g., general-esg-advisor"
                  disabled={!!editingPrompt}
                />
              </Div>
              <Div>
                <Label htmlFor="name">{t('name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., ESG Advisor"
                />
              </Div>
            </Div>

            <Div>
              <Label htmlFor="description">{t('description_label')}</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this prompt"
              />
            </Div>

            <Div className="grid grid-cols-2 gap-4">
              <Div>
                <Label htmlFor="type">{t('type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: SystemPrompt['type']) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_PROMPT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Div>
              <Div>
                <Label htmlFor="provider">{t('provider')}</Label>
                <Select
                  value={formData.provider}
                  onValueChange={(value: SystemPrompt['provider']) =>
                    setFormData({ ...formData, provider: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Div>
            </Div>

            <Div>
              <Label htmlFor="content">{t('content')}</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                placeholder={t('contentPlaceholder')}
                className="min-h-[200px] font-mono text-sm"
              />
              <P className="text-xs text-muted-foreground mt-1">
                {t('characters', { count: formData.content.length })}
              </P>
            </Div>

            <Div className="flex items-center gap-6">
              <Div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={checked => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">{t('active')}</Label>
              </Div>
              <Div className="flex items-center gap-2">
                <Switch
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={checked => setFormData({ ...formData, isDefault: checked })}
                />
                <Label htmlFor="isDefault">{t('setDefault')}</Label>
              </Div>
            </Div>
          </TabsContent>

          <TabsContent value="config">
            <PromptConfigEditor
              config={formData.config}
              onChange={config => setFormData({ ...formData, config })}
            />
          </TabsContent>
        </Tabs>
      </Modal>
    </>
  )
}
