'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  DataTable,
  DataTableColumnHeader,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Div,
  Icon,
  Input,
  Label,
  P,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Span,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TextArea,
  type ColumnDef,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { AIClient } from '../ai-client.js'
import type {
  SystemPrompt,
  ConversationListItem,
  PromptType,
  ProviderTarget,
  PaginationMeta,
} from '../ai-types.js'
import type { AIProviderInfo } from '../server/registry/types.js'

// ========================================
// Types
// ========================================

export interface AIAdminDashboardTexts {
  // Tabs
  promptsTab?: string
  providersTab?: string
  conversationsTab?: string
  // Prompts
  createPrompt?: string
  editPrompt?: string
  deletePrompt?: string
  promptKey?: string
  promptName?: string
  promptContent?: string
  promptType?: string
  promptProvider?: string
  promptStatus?: string
  promptActions?: string
  promptDescription?: string
  // Providers
  providerName?: string
  providerType?: string
  providerModel?: string
  providerCapabilities?: string
  providerStatus?: string
  // Conversations
  conversationTitle?: string
  conversationUser?: string
  conversationMessages?: string
  conversationDate?: string
  // Common
  noData?: string
  loading?: string
  save?: string
  cancel?: string
  confirm?: string
  deleteConfirm?: string
  active?: string
  inactive?: string
}

export interface AIAdminDashboardProps {
  appName?: string
  className?: string
  texts?: Partial<AIAdminDashboardTexts>
  showAppFilter?: boolean
  appFilterLabel?: string
}

// ========================================
// Defaults
// ========================================

const DEFAULT_TEXTS: Required<AIAdminDashboardTexts> = {
  promptsTab: 'Prompts',
  providersTab: 'Providers',
  conversationsTab: 'Conversations',
  createPrompt: 'Create Prompt',
  editPrompt: 'Edit Prompt',
  deletePrompt: 'Delete Prompt',
  promptKey: 'Key',
  promptName: 'Name',
  promptContent: 'Content',
  promptType: 'Type',
  promptProvider: 'Provider',
  promptStatus: 'Status',
  promptActions: 'Actions',
  promptDescription: 'Description',
  providerName: 'Name',
  providerType: 'Type',
  providerModel: 'Model',
  providerCapabilities: 'Capabilities',
  providerStatus: 'Status',
  conversationTitle: 'Title',
  conversationUser: 'User',
  conversationMessages: 'Messages',
  conversationDate: 'Date',
  noData: 'No data',
  loading: 'Loading...',
  save: 'Save',
  cancel: 'Cancel',
  confirm: 'Confirm',
  deleteConfirm: 'Are you sure you want to delete this prompt?',
  active: 'Active',
  inactive: 'Inactive',
}

// ========================================
// Helpers
// ========================================

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateStr))
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string
  value: string | number
  loading: boolean
}) {
  return (
    <Card className="p-6">
      <P className="text-sm text-muted-foreground mb-1">{label}</P>
      {loading ? <Skeleton className="h-8 w-24" /> : <P className="text-2xl font-bold">{value}</P>}
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Div className="flex flex-col items-center justify-center gap-4 p-12 rounded-lg border-2 border-dashed border-muted-foreground/20">
      <Icon name="lucide:Bot" className="w-12 h-12 text-muted-foreground/40" />
      <P className="text-muted-foreground text-center">{message}</P>
    </Div>
  )
}

// ========================================
// Prompts Tab
// ========================================

const PROMPT_TYPES: PromptType[] = ['general', 'extraction', 'validation', 'vision', 'custom']
const PROVIDER_TARGETS: ProviderTarget[] = ['all', 'gemini', 'openai', 'anthropic']

interface PromptFormData {
  key: string
  name: string
  description: string
  content: string
  type: PromptType
  provider: ProviderTarget
  isActive: boolean
  isDefault: boolean
}

const EMPTY_FORM: PromptFormData = {
  key: '',
  name: '',
  description: '',
  content: '',
  type: 'general',
  provider: 'all',
  isActive: true,
  isDefault: false,
}

function PromptsTab({ client, t }: { client: AIClient; t: Required<AIAdminDashboardTexts> }) {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [form, setForm] = useState<PromptFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchPrompts = useCallback(() => {
    setLoading(true)
    client
      .listPrompts()
      .then(result => setPrompts(result.prompts))
      .catch(() => toast.error('Failed to load prompts'))
      .finally(() => setLoading(false))
  }, [client])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  const openCreateDialog = useCallback(() => {
    setEditingPrompt(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((prompt: SystemPrompt) => {
    setEditingPrompt(prompt)
    setForm({
      key: prompt.key,
      name: prompt.name,
      description: prompt.description || '',
      content: prompt.content,
      type: prompt.type,
      provider: prompt.provider,
      isActive: prompt.isActive,
      isDefault: prompt.isDefault,
    })
    setDialogOpen(true)
  }, [])

  const openDeleteDialog = useCallback((key: string) => {
    setDeletingKey(key)
    setDeleteDialogOpen(true)
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      if (editingPrompt) {
        const { key: _key, ...updateData } = form
        await client.updatePrompt(editingPrompt.key, updateData)
        toast.success('Prompt updated')
      } else {
        await client.createPrompt(form)
        toast.success('Prompt created')
      }
      setDialogOpen(false)
      fetchPrompts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save prompt')
    } finally {
      setSaving(false)
    }
  }, [client, editingPrompt, form, fetchPrompts])

  const handleDelete = useCallback(async () => {
    if (!deletingKey) return
    try {
      await client.deletePrompt(deletingKey)
      toast.success('Prompt deleted')
      setDeleteDialogOpen(false)
      fetchPrompts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete prompt')
    }
  }, [client, deletingKey, fetchPrompts])

  const columns: ColumnDef<SystemPrompt>[] = useMemo(
    () => [
      {
        accessorKey: 'key',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.promptKey} />,
        cell: ({ row }) => <Span className="text-sm font-mono">{row.original.key}</Span>,
      },
      {
        accessorKey: 'name',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.promptName} />,
        cell: ({ row }) => <Span className="text-sm font-medium">{row.original.name}</Span>,
      },
      {
        accessorKey: 'type',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.promptType} />,
        cell: ({ row }) => (
          <Badge variant="outline" size="sm">
            {row.original.type}
          </Badge>
        ),
      },
      {
        accessorKey: 'provider',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.promptProvider} />,
        cell: ({ row }) => (
          <Badge variant="secondary" size="sm">
            {row.original.provider}
          </Badge>
        ),
      },
      {
        accessorKey: 'isActive',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.promptStatus} />,
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? 'success' : 'secondary'} size="sm" dot>
            {row.original.isActive ? t.active : t.inactive}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: t.promptActions,
        cell: ({ row }) => (
          <Div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => openEditDialog(row.original)}>
              <Icon name="lucide:Pencil" className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(row.original.key)}>
              <Icon name="lucide:Trash2" className="w-4 h-4 text-destructive" />
            </Button>
          </Div>
        ),
      },
    ],
    [t, openEditDialog, openDeleteDialog]
  )

  return (
    <Div className="space-y-4">
      {/* Stats */}
      <Div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Prompts" value={prompts.length} loading={loading} />
        <StatCard label="Active" value={prompts.filter(p => p.isActive).length} loading={loading} />
        <StatCard
          label="Default"
          value={prompts.filter(p => p.isDefault).length}
          loading={loading}
        />
      </Div>

      {/* Actions */}
      <Div className="flex justify-end">
        <Button onClick={openCreateDialog} size="sm">
          <Icon name="lucide:Plus" className="w-4 h-4 mr-2" />
          {t.createPrompt}
        </Button>
      </Div>

      {/* Table */}
      {loading ? (
        <Div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Div>
      ) : prompts.length === 0 ? (
        <EmptyState message={t.noData} />
      ) : (
        <DataTable columns={columns} data={prompts} />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPrompt ? t.editPrompt : t.createPrompt}</DialogTitle>
          </DialogHeader>
          <Div className="space-y-4 py-4">
            {!editingPrompt && (
              <Div className="space-y-2">
                <Label>{t.promptKey}</Label>
                <Input
                  value={form.key}
                  onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
                  placeholder="my-prompt-key"
                />
              </Div>
            )}
            <Div className="space-y-2">
              <Label>{t.promptName}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Prompt name"
              />
            </Div>
            <Div className="space-y-2">
              <Label>{t.promptDescription}</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
              />
            </Div>
            <Div className="space-y-2">
              <Label>{t.promptContent}</Label>
              <TextArea
                value={form.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm(f => ({ ...f, content: e.target.value }))
                }
                placeholder="System prompt content..."
                rows={6}
              />
            </Div>
            <Div className="grid grid-cols-2 gap-4">
              <Div className="space-y-2">
                <Label>{t.promptType}</Label>
                <Select
                  value={form.type}
                  onValueChange={v => setForm(f => ({ ...f, type: v as PromptType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMPT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Div>
              <Div className="space-y-2">
                <Label>{t.promptProvider}</Label>
                <Select
                  value={form.provider}
                  onValueChange={v => setForm(f => ({ ...f, provider: v as ProviderTarget }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_TARGETS.map(provider => (
                      <SelectItem key={provider} value={provider}>
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Div>
            </Div>
            <Div className="flex items-center gap-6">
              <Div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))}
                />
                <Label>{t.active}</Label>
              </Div>
              <Div className="flex items-center gap-2">
                <Switch
                  checked={form.isDefault}
                  onCheckedChange={v => setForm(f => ({ ...f, isDefault: v }))}
                />
                <Label>Default</Label>
              </Div>
            </Div>
          </Div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t.loading : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.deletePrompt}</DialogTitle>
          </DialogHeader>
          <P className="py-4 text-muted-foreground">{t.deleteConfirm}</P>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Div>
  )
}

// ========================================
// Providers Tab
// ========================================

function ProvidersTab({ client, t }: { client: AIClient; t: Required<AIAdminDashboardTexts> }) {
  const [providers, setProviders] = useState<AIProviderInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client
      .listProviders()
      .then(setProviders)
      .catch(() => toast.error('Failed to load providers'))
      .finally(() => setLoading(false))
  }, [client])

  if (loading) {
    return (
      <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </Div>
    )
  }

  if (providers.length === 0) {
    return <EmptyState message={t.noData} />
  }

  return (
    <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {providers.map(provider => (
        <Card key={provider.id} className="p-6 space-y-3">
          <Div className="flex items-center justify-between">
            <Span className="font-semibold text-lg">{provider.name}</Span>
            <Badge variant={provider.enabled ? 'success' : 'secondary'} size="sm" dot>
              {provider.enabled ? t.active : t.inactive}
            </Badge>
          </Div>
          <Div className="space-y-1">
            <Div className="flex items-center gap-2">
              <Span className="text-sm text-muted-foreground">{t.providerType}:</Span>
              <Badge variant="outline" size="sm">
                {provider.type}
              </Badge>
            </Div>
            <Div className="flex items-center gap-2">
              <Span className="text-sm text-muted-foreground">{t.providerModel}:</Span>
              <Span className="text-sm font-mono">{provider.model}</Span>
            </Div>
          </Div>
          {provider.capabilities && (
            <Div className="flex flex-wrap gap-1">
              {provider.capabilities.text && (
                <Badge variant="info" size="sm">
                  text
                </Badge>
              )}
              {provider.capabilities.vision && (
                <Badge variant="info" size="sm">
                  vision
                </Badge>
              )}
              {provider.capabilities.audio && (
                <Badge variant="info" size="sm">
                  audio
                </Badge>
              )}
              {provider.capabilities.streaming && (
                <Badge variant="info" size="sm">
                  streaming
                </Badge>
              )}
            </Div>
          )}
        </Card>
      ))}
    </Div>
  )
}

// ========================================
// Conversations Tab
// ========================================

function ConversationsTab({ client, t }: { client: AIClient; t: Required<AIAdminDashboardTexts> }) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState<PaginationMeta | null>(null)

  useEffect(() => {
    client
      .listConversations({ limit: 50 })
      .then(result => {
        setConversations(result.conversations)
        setMeta(result.meta)
      })
      .catch(() => toast.error('Failed to load conversations'))
      .finally(() => setLoading(false))
  }, [client])

  const columns: ColumnDef<ConversationListItem>[] = useMemo(
    () => [
      {
        accessorKey: 'title',
        header: ({ header }) => (
          <DataTableColumnHeader header={header} title={t.conversationTitle} />
        ),
        cell: ({ row }) => <Span className="text-sm font-medium">{row.original.title}</Span>,
      },
      {
        accessorKey: 'preview',
        header: 'Preview',
        cell: ({ row }) => (
          <Span className="text-sm text-muted-foreground truncate max-w-[200px] block">
            {row.original.preview || '-'}
          </Span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: ({ header }) => (
          <DataTableColumnHeader header={header} title={t.conversationDate} />
        ),
        cell: ({ row }) => <Span className="text-sm">{formatDate(row.original.updatedAt)}</Span>,
      },
    ],
    [t]
  )

  return (
    <Div className="space-y-4">
      {/* Stats */}
      <Div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Total Conversations"
          value={meta?.total ?? conversations.length}
          loading={loading}
        />
      </Div>

      {/* Table */}
      {loading ? (
        <Div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Div>
      ) : conversations.length === 0 ? (
        <EmptyState message={t.noData} />
      ) : (
        <DataTable columns={columns} data={conversations} />
      )}
    </Div>
  )
}

// ========================================
// Main Component
// ========================================

export function AIAdminDashboard({
  appName,
  className,
  texts,
  showAppFilter,
  appFilterLabel,
}: AIAdminDashboardProps) {
  const t: Required<AIAdminDashboardTexts> = { ...DEFAULT_TEXTS, ...texts }
  const [filterAppName, setFilterAppName] = useState(appName || '')

  const client = useMemo(
    () => new AIClient({ appName: showAppFilter ? filterAppName : appName || 'ezstart' }),
    [showAppFilter, filterAppName, appName]
  )

  return (
    <Div className={className}>
      {showAppFilter && (
        <Div className="flex items-center gap-2 mb-4">
          <Label>{appFilterLabel || 'App'}</Label>
          <Input
            value={filterAppName}
            onChange={e => setFilterAppName(e.target.value)}
            placeholder="All apps"
            className="max-w-xs"
          />
        </Div>
      )}
      <Tabs defaultValue="prompts">
        <TabsList>
          <TabsTrigger value="prompts">{t.promptsTab}</TabsTrigger>
          <TabsTrigger value="providers">{t.providersTab}</TabsTrigger>
          <TabsTrigger value="conversations">{t.conversationsTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="prompts" className="mt-4">
          <PromptsTab client={client} t={t} />
        </TabsContent>

        <TabsContent value="providers" className="mt-4">
          <ProvidersTab client={client} t={t} />
        </TabsContent>

        <TabsContent value="conversations" className="mt-4">
          <ConversationsTab client={client} t={t} />
        </TabsContent>
      </Tabs>
    </Div>
  )
}
