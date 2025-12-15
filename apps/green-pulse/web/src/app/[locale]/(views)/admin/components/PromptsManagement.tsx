'use client'

import React, { useState } from 'react'
import { callApi } from '@ezstart/fetch-client'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Div,
  H3,
  Icon,
  Input,
  Label,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TextArea,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import { runWithFeedback, toast } from '@ezstart/ui/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

type PromptsResponse = {
  success: boolean
  data: SystemPrompt[]
}

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
    queryKey: ['prompts'],
    queryFn: async () => {
      const response = await callApi<PromptsResponse>('/prompts', {
        appName: 'green-pulse',
      })
      if (!response.ok || !response.data) {
        throw new Error(`Failed to fetch prompts: ${response.status}`)
      }
      return response.data
    },
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await callApi('/prompts', {
        appName: 'green-pulse',
        method: 'POST',
        body: data,
      })
      if (!response.ok) throw new Error('Failed to create prompt')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
      setIsDialogOpen(false)
      resetForm()
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ key, data }: { key: string; data: Partial<typeof formData> }) => {
      const response = await callApi(`/prompts/${key}`, {
        appName: 'green-pulse',
        method: 'PATCH',
        body: data,
      })
      if (!response.ok) throw new Error('Failed to update prompt')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
      setIsDialogOpen(false)
      setEditingPrompt(null)
      resetForm()
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await callApi(`/prompts/${key}`, {
        appName: 'green-pulse',
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete prompt')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
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
  const filteredPrompts = data?.data?.filter(p => {
    const isActiveType = activeTypes.includes(p.type)
    const matchesFilter = filter === 'all' ? true : p.type === filter
    return isActiveType && matchesFilter
  }) || []

  const getTypeBadge = (type: SystemPrompt['type']) => {
    const colors = {
      general: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      extraction: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      validation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      vision: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    }
    return <Badge className={colors[type]}>{type}</Badge>
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Icon name="lucide:Loader2" className="w-8 h-8 mx-auto animate-spin" />
          <P className="text-muted-foreground mt-2">Loading prompts...</P>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Icon name="lucide:AlertCircle" className="w-12 h-12 mx-auto text-destructive mb-2" />
          <P className="text-destructive font-medium">Failed to load prompts</P>
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
                System Prompts
              </H3>
              <P className="text-sm text-muted-foreground mt-1">
                Manage AI system prompts for chat and extraction
              </P>
            </Div>
            <Button onClick={handleCreate}>
              <Icon name="lucide:Plus" className="mr-2" />
              New Prompt
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
              All ({data?.data?.filter(p => activeTypes.includes(p.type)).length || 0})
            </Button>
            {PROMPT_TYPES.map(t => (
              <Button
                key={t.value}
                size="sm"
                variant={filter === t.value ? 'default' : 'outline'}
                onClick={() => setFilter(t.value)}
              >
                {t.label} ({data?.data?.filter(p => p.type === t.value).length || 0})
              </Button>
            ))}
          </Div>

          {/* Prompts list */}
          {filteredPrompts.length === 0 ? (
            <Div className="text-center py-12">
              <Icon name="lucide:FileText" className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <P className="text-muted-foreground">No prompts found</P>
              <Button className="mt-4" onClick={handleCreate}>
                Create your first prompt
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
                          {prompt.isDefault && (
                            <Badge variant="default">Default</Badge>
                          )}
                          {!prompt.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </Div>
                        <P className="text-xs text-muted-foreground font-mono mb-2">
                          key: {prompt.key}
                        </P>
                        {prompt.description && (
                          <P className="text-sm text-muted-foreground mb-2">
                            {prompt.description}
                          </P>
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="prompt" className="py-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="prompt">
                <Icon name="lucide:MessageSquare" className="mr-2" size={16} />
                Prompt Content
              </TabsTrigger>
              <TabsTrigger value="config">
                <Icon name="lucide:Settings" className="mr-2" size={16} />
                Configuration
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prompt" className="space-y-4">
              <Div className="grid grid-cols-2 gap-4">
                <Div>
                  <Label htmlFor="key">Key (unique identifier)</Label>
                  <Input
                    id="key"
                    value={formData.key}
                    onChange={e => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
                    placeholder="e.g., general-esg-advisor"
                    disabled={!!editingPrompt}
                  />
                </Div>
                <Div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., ESG Advisor"
                  />
                </Div>
              </Div>

              <Div>
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this prompt"
                />
              </Div>

              <Div className="grid grid-cols-2 gap-4">
                <Div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: SystemPrompt['type']) => setFormData({ ...formData, type: value })}
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
                  <Label htmlFor="provider">Provider</Label>
                  <Select
                    value={formData.provider}
                    onValueChange={(value: SystemPrompt['provider']) => setFormData({ ...formData, provider: value })}
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
                <Label htmlFor="content">System Prompt (personality, role)</Label>
                <TextArea
                  id="content"
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter the system prompt (e.g., 'You are GreenPulse.AI, an ESG advisor...')"
                  className="min-h-[200px] font-mono text-sm"
                />
                <P className="text-xs text-muted-foreground mt-1">
                  {formData.content.length}/10000 characters - Repeated in every message
                </P>
              </Div>

              <Div className="flex items-center gap-6">
                <Div className="flex items-center gap-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={checked => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </Div>
                <Div className="flex items-center gap-2">
                  <Switch
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={checked => setFormData({ ...formData, isDefault: checked })}
                  />
                  <Label htmlFor="isDefault">Set as default for this type</Label>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.key || !formData.name || !formData.content}
            >
              {editingPrompt ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
