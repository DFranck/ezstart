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
  EnrichedAppProvider as AppProviderData,
  PromptProvider,
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
  // Prompt stats
  totalPrompts?: string
  activeCount?: string
  defaultCount?: string
  defaultLabel?: string
  // Prompt toast messages
  promptUpdated?: string
  promptCreated?: string
  promptDeleted?: string
  savePromptError?: string
  deletePromptError?: string
  loadPromptsError?: string
  // Prompt form placeholders
  promptKeyPlaceholder?: string
  promptNamePlaceholder?: string
  promptDescriptionPlaceholder?: string
  promptContentPlaceholder?: string
  // Providers (global)
  providerName?: string
  providerType?: string
  providerModel?: string
  providerCapabilities?: string
  providerStatus?: string
  loadProvidersError?: string
  // App Providers
  totalProviders?: string
  activeProviders?: string
  inactiveProviders?: string
  addProvider?: string
  editProvider?: string
  deleteProvider?: string
  providerIdLabel?: string
  providerTypeLabel?: string
  priorityLabel?: string
  configLabel?: string
  modelOverride?: string
  temperatureLabel?: string
  maxTokensLabel?: string
  toggleEnabled?: string
  toggleDisabled?: string
  availableProviders?: string
  appProviders?: string
  loadAppProvidersError?: string
  providerCreated?: string
  providerUpdated?: string
  providerDeleted?: string
  providerToggled?: string
  saveProviderError?: string
  deleteProviderError?: string
  toggleProviderError?: string
  deleteProviderConfirm?: string
  // Prompt providers
  promptProviders?: string
  // Conversations
  conversationTitle?: string
  conversationUser?: string
  conversationMessages?: string
  conversationDate?: string
  conversationPreview?: string
  totalConversations?: string
  loadConversationsError?: string
  // Usage
  usageTab?: string
  totalRequests?: string
  totalTokens?: string
  estimatedCost?: string
  byProvider?: string
  loadUsageError?: string
  noUsageData?: string
  requests?: string
  tokens?: string
  // Pagination
  previous?: string
  next?: string
  // App filter
  allAppsPlaceholder?: string
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
  totalPrompts: 'Total Prompts',
  activeCount: 'Active',
  defaultCount: 'Default',
  defaultLabel: 'Default',
  promptUpdated: 'Prompt updated',
  promptCreated: 'Prompt created',
  promptDeleted: 'Prompt deleted',
  savePromptError: 'Failed to save prompt',
  deletePromptError: 'Failed to delete prompt',
  loadPromptsError: 'Failed to load prompts',
  promptKeyPlaceholder: 'my-prompt-key',
  promptNamePlaceholder: 'Prompt name',
  promptDescriptionPlaceholder: 'Optional description',
  promptContentPlaceholder: 'System prompt content...',
  providerName: 'Name',
  providerType: 'Type',
  providerModel: 'Model',
  providerCapabilities: 'Capabilities',
  providerStatus: 'Status',
  loadProvidersError: 'Failed to load providers',
  totalProviders: 'Total Providers',
  activeProviders: 'Active',
  inactiveProviders: 'Inactive',
  addProvider: 'Add Provider',
  editProvider: 'Edit Provider',
  deleteProvider: 'Delete Provider',
  providerIdLabel: 'Provider ID',
  providerTypeLabel: 'Provider Type',
  priorityLabel: 'Priority',
  configLabel: 'Configuration',
  modelOverride: 'Model Override',
  temperatureLabel: 'Temperature',
  maxTokensLabel: 'Max Tokens',
  toggleEnabled: 'Enabled',
  toggleDisabled: 'Disabled',
  availableProviders: 'Available Providers',
  appProviders: 'App Providers',
  loadAppProvidersError: 'Failed to load app providers',
  providerCreated: 'Provider added',
  providerUpdated: 'Provider updated',
  providerDeleted: 'Provider removed',
  providerToggled: 'Provider toggled',
  saveProviderError: 'Failed to save provider',
  deleteProviderError: 'Failed to delete provider',
  toggleProviderError: 'Failed to toggle provider',
  deleteProviderConfirm: 'Are you sure you want to remove this provider?',
  promptProviders: 'Providers',
  conversationTitle: 'Title',
  conversationUser: 'User',
  conversationMessages: 'Messages',
  conversationDate: 'Date',
  conversationPreview: 'Preview',
  totalConversations: 'Total Conversations',
  loadConversationsError: 'Failed to load conversations',
  usageTab: 'Usage',
  totalRequests: 'Total Requests',
  totalTokens: 'Total Tokens',
  estimatedCost: 'Estimated Cost',
  byProvider: 'By Provider',
  loadUsageError: 'Failed to load usage stats',
  noUsageData: 'No usage data',
  requests: 'Requests',
  tokens: 'Tokens',
  previous: 'Previous',
  next: 'Next',
  allAppsPlaceholder: 'All apps',
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

interface PromptProviderEntry {
  providerId: string
  priority: number
  selected: boolean
}

interface PromptFormData {
  key: string
  name: string
  description: string
  content: string
  type: PromptType
  provider: ProviderTarget
  isActive: boolean
  isDefault: boolean
  promptProviders: PromptProviderEntry[]
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
  promptProviders: [],
}

const PROMPTS_PAGE_SIZE = 20

function PromptsTab({
  client,
  t,
  appProviders,
}: {
  client: AIClient
  t: Required<AIAdminDashboardTexts>
  appProviders: AppProviderData[]
}) {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [form, setForm] = useState<PromptFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchPrompts = useCallback(() => {
    setLoading(true)
    client
      .listPrompts({ limit: PROMPTS_PAGE_SIZE, offset })
      .then(result => {
        setPrompts(result.prompts)
        setTotal(result.meta?.total ?? result.prompts.length)
      })
      .catch(() => toast.error(t.loadPromptsError))
      .finally(() => setLoading(false))
  }, [client, offset, t.loadPromptsError])

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
      promptProviders: (prompt.providers || []).map(pp => ({
        providerId: pp.providerId,
        priority: pp.priority,
        selected: true,
      })),
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
      const selectedProviders: PromptProvider[] = form.promptProviders
        .filter(pp => pp.selected)
        .map(pp => ({ providerId: pp.providerId, priority: pp.priority }))

      if (editingPrompt) {
        const { key: _key, promptProviders: _pp, ...updateData } = form
        await client.updatePrompt(editingPrompt.key, {
          ...updateData,
          providers: selectedProviders.length > 0 ? selectedProviders : undefined,
        })
        toast.success(t.promptUpdated)
      } else {
        const { promptProviders: _pp, ...createData } = form
        await client.createPrompt({
          ...createData,
          providers: selectedProviders.length > 0 ? selectedProviders : undefined,
        })
        toast.success(t.promptCreated)
      }
      setDialogOpen(false)
      fetchPrompts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.savePromptError)
    } finally {
      setSaving(false)
    }
  }, [client, editingPrompt, form, fetchPrompts, t])

  const handleDelete = useCallback(async () => {
    if (!deletingKey) return
    try {
      await client.deletePrompt(deletingKey)
      toast.success(t.promptDeleted)
      setDeleteDialogOpen(false)
      fetchPrompts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.deletePromptError)
    }
  }, [client, deletingKey, fetchPrompts, t])

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
        <StatCard label={t.totalPrompts} value={total} loading={loading} />
        <StatCard
          label={t.activeCount}
          value={prompts.filter(p => p.isActive).length}
          loading={loading}
        />
        <StatCard
          label={t.defaultCount}
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
        <DataTable columns={columns} data={prompts} pageSize={PROMPTS_PAGE_SIZE} />
      )}

      {/* Server-side pagination */}
      {!loading && total > PROMPTS_PAGE_SIZE && (
        <Div className="flex items-center justify-between">
          <P className="text-sm text-muted-foreground">
            {offset + 1}-{Math.min(offset + PROMPTS_PAGE_SIZE, total)} / {total}
          </P>
          <Div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(prev => Math.max(0, prev - PROMPTS_PAGE_SIZE))}
            >
              &larr; {t.previous}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PROMPTS_PAGE_SIZE >= total}
              onClick={() => setOffset(prev => prev + PROMPTS_PAGE_SIZE)}
            >
              {t.next} &rarr;
            </Button>
          </Div>
        </Div>
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
                  placeholder={t.promptKeyPlaceholder}
                />
              </Div>
            )}
            <Div className="space-y-2">
              <Label>{t.promptName}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t.promptNamePlaceholder}
              />
            </Div>
            <Div className="space-y-2">
              <Label>{t.promptDescription}</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t.promptDescriptionPlaceholder}
              />
            </Div>
            <Div className="space-y-2">
              <Label>{t.promptContent}</Label>
              <TextArea
                value={form.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setForm(f => ({ ...f, content: e.target.value }))
                }
                placeholder={t.promptContentPlaceholder}
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
            {/* Provider assignment */}
            {appProviders.length > 0 && (
              <Div className="space-y-2 pt-2 border-t">
                <Label>{t.promptProviders}</Label>
                <Div className="space-y-2">
                  {appProviders
                    .filter(ap => form.provider === 'all' || ap.providerType === form.provider)
                    .map(ap => {
                      const entry = form.promptProviders.find(pp => pp.providerId === ap.providerId)
                      const isSelected = entry?.selected ?? false
                      return (
                        <Div key={ap._id} className="flex items-center gap-3 p-2 rounded-md border">
                          <Switch
                            checked={isSelected}
                            onCheckedChange={checked => {
                              setForm(f => {
                                const existing = f.promptProviders.find(
                                  pp => pp.providerId === ap.providerId
                                )
                                if (existing) {
                                  return {
                                    ...f,
                                    promptProviders: f.promptProviders.map(pp =>
                                      pp.providerId === ap.providerId
                                        ? { ...pp, selected: checked }
                                        : pp
                                    ),
                                  }
                                }
                                return {
                                  ...f,
                                  promptProviders: [
                                    ...f.promptProviders,
                                    { providerId: ap.providerId, priority: 1, selected: checked },
                                  ],
                                }
                              })
                            }}
                          />
                          <Div className="flex-1">
                            <Span className="text-sm font-mono">{ap.providerId}</Span>
                            <Badge variant="outline" size="sm" className="ml-2">
                              {ap.providerType}
                            </Badge>
                            {!ap.enabled && (
                              <Badge variant="secondary" size="sm" className="ml-1">
                                {t.inactive}
                              </Badge>
                            )}
                          </Div>
                          {isSelected && (
                            <Div className="flex items-center gap-1">
                              <Label className="text-xs">{t.priorityLabel}</Label>
                              <Input
                                type="number"
                                min={1}
                                max={99}
                                className="w-16 h-7 text-xs"
                                value={entry?.priority ?? 1}
                                onChange={e =>
                                  setForm(f => ({
                                    ...f,
                                    promptProviders: f.promptProviders.map(pp =>
                                      pp.providerId === ap.providerId
                                        ? { ...pp, priority: Number(e.target.value) || 1 }
                                        : pp
                                    ),
                                  }))
                                }
                              />
                            </Div>
                          )}
                        </Div>
                      )
                    })}
                  {appProviders.filter(
                    ap => form.provider === 'all' || ap.providerType === form.provider
                  ).length === 0 && <P className="text-sm text-muted-foreground">{t.noData}</P>}
                </Div>
              </Div>
            )}
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
                <Label>{t.defaultLabel}</Label>
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

type AppProviderConfig = {
  model?: string
  temperature?: number
  maxTokens?: number
}

const PROVIDER_TYPE_OPTIONS: Array<'gemini' | 'openai' | 'anthropic'> = [
  'gemini',
  'openai',
  'anthropic',
]

interface AppProviderFormData {
  providerId: string
  providerType: 'gemini' | 'openai' | 'anthropic'
  priority: number
  enabled: boolean
  configModel: string
  configTemperature: number
  configMaxTokens: string
}

const EMPTY_PROVIDER_FORM: AppProviderFormData = {
  providerId: '',
  providerType: 'gemini',
  priority: 1,
  enabled: true,
  configModel: '',
  configTemperature: 0.7,
  configMaxTokens: '',
}

function ProvidersTab({ client, t }: { client: AIClient; t: Required<AIAdminDashboardTexts> }) {
  const [globalProviders, setGlobalProviders] = useState<AIProviderInfo[]>([])
  const [globalLoading, setGlobalLoading] = useState(true)
  const [appProviders, setAppProviders] = useState<AppProviderData[]>([])
  const [appLoading, setAppLoading] = useState(true)
  const [appTotal, setAppTotal] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<AppProviderData | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<AppProviderFormData>(EMPTY_PROVIDER_FORM)
  const [saving, setSaving] = useState(false)

  const fetchGlobalProviders = useCallback(() => {
    setGlobalLoading(true)
    client
      .listProviders()
      .then(setGlobalProviders)
      .catch(() => toast.error(t.loadProvidersError))
      .finally(() => setGlobalLoading(false))
  }, [client, t.loadProvidersError])

  const fetchAppProviders = useCallback(() => {
    setAppLoading(true)
    client
      .listAppProviders()
      .then(result => {
        setAppProviders(result.providers)
        setAppTotal(result.meta?.total ?? result.providers.length)
      })
      .catch(() => toast.error(t.loadAppProvidersError))
      .finally(() => setAppLoading(false))
  }, [client, t.loadAppProvidersError])

  useEffect(() => {
    fetchGlobalProviders()
    fetchAppProviders()
  }, [fetchGlobalProviders, fetchAppProviders])

  const openCreateDialog = useCallback(() => {
    setEditingProvider(null)
    setForm(EMPTY_PROVIDER_FORM)
    setDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((provider: AppProviderData) => {
    setEditingProvider(provider)
    setForm({
      providerId: provider.providerId,
      providerType: provider.providerType,
      priority: provider.priority,
      enabled: provider.enabled,
      configModel: provider.config?.model || '',
      configTemperature: provider.config?.temperature ?? 0.7,
      configMaxTokens: provider.config?.maxTokens ? String(provider.config.maxTokens) : '',
    })
    setDialogOpen(true)
  }, [])

  const openDeleteDialog = useCallback((id: string) => {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }, [])

  const buildConfig = useCallback(
    (formData: AppProviderFormData): AppProviderConfig | undefined => {
      const config: AppProviderConfig = {}
      if (formData.configModel.trim()) config.model = formData.configModel.trim()
      if (formData.configTemperature !== 0.7) config.temperature = formData.configTemperature
      if (formData.configMaxTokens.trim()) config.maxTokens = Number(formData.configMaxTokens)
      return Object.keys(config).length > 0 ? config : undefined
    },
    []
  )

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const config = buildConfig(form)
      if (editingProvider) {
        await client.updateAppProvider(editingProvider._id, {
          enabled: form.enabled,
          priority: form.priority,
          config,
        })
        toast.success(t.providerUpdated)
      } else {
        await client.createAppProvider({
          providerId: form.providerId,
          providerType: form.providerType,
          priority: form.priority,
          enabled: form.enabled,
          config,
        })
        toast.success(t.providerCreated)
      }
      setDialogOpen(false)
      fetchAppProviders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.saveProviderError)
    } finally {
      setSaving(false)
    }
  }, [client, editingProvider, form, buildConfig, fetchAppProviders, t])

  const handleDelete = useCallback(async () => {
    if (!deletingId) return
    try {
      await client.deleteAppProvider(deletingId)
      toast.success(t.providerDeleted)
      setDeleteDialogOpen(false)
      fetchAppProviders()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.deleteProviderError)
    }
  }, [client, deletingId, fetchAppProviders, t])

  const handleToggle = useCallback(
    async (id: string) => {
      try {
        await client.toggleAppProvider(id)
        toast.success(t.providerToggled)
        fetchAppProviders()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t.toggleProviderError)
      }
    },
    [client, fetchAppProviders, t]
  )

  const activeCount = appProviders.filter(p => p.enabled).length
  const inactiveCount = appProviders.filter(p => !p.enabled).length

  const columns: ColumnDef<AppProviderData>[] = useMemo(
    () => [
      {
        accessorKey: 'providerId',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.providerIdLabel} />,
        cell: ({ row }) => <Span className="text-sm font-mono">{row.original.providerId}</Span>,
      },
      {
        accessorKey: 'providerType',
        header: ({ header }) => (
          <DataTableColumnHeader header={header} title={t.providerTypeLabel} />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" size="sm">
            {row.original.providerType}
          </Badge>
        ),
      },
      {
        id: 'modelOverride',
        header: t.modelOverride,
        cell: ({ row }) => (
          <Span className="text-sm font-mono text-muted-foreground">
            {row.original.config?.model || '-'}
          </Span>
        ),
      },
      {
        accessorKey: 'priority',
        header: ({ header }) => <DataTableColumnHeader header={header} title={t.priorityLabel} />,
        cell: ({ row }) => (
          <Badge variant="secondary" size="sm">
            {row.original.priority}
          </Badge>
        ),
      },
      {
        id: 'enabled',
        header: t.providerStatus,
        cell: ({ row }) => (
          <Switch
            checked={row.original.enabled}
            onCheckedChange={() => handleToggle(row.original._id)}
          />
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
            <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(row.original._id)}>
              <Icon name="lucide:Trash2" className="w-4 h-4 text-destructive" />
            </Button>
          </Div>
        ),
      },
    ],
    [t, handleToggle, openEditDialog, openDeleteDialog]
  )

  return (
    <Div className="space-y-6">
      <Div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label={t.totalProviders} value={appTotal} loading={appLoading} />
        <StatCard label={t.activeProviders} value={activeCount} loading={appLoading} />
        <StatCard label={t.inactiveProviders} value={inactiveCount} loading={appLoading} />
      </Div>

      <Div className="space-y-2">
        <P className="text-sm font-medium text-muted-foreground">{t.availableProviders}</P>
        {globalLoading ? (
          <Div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </Div>
        ) : (
          <Div className="flex flex-wrap gap-2">
            {globalProviders.map(gp => (
              <Badge key={gp.id} variant={gp.enabled ? 'info' : 'secondary'} size="sm">
                {gp.name} ({gp.type} - {gp.model})
              </Badge>
            ))}
            {globalProviders.length === 0 && (
              <P className="text-sm text-muted-foreground">{t.noData}</P>
            )}
          </Div>
        )}
      </Div>

      <Div className="space-y-4">
        <Div className="flex items-center justify-between">
          <P className="text-base font-semibold">{t.appProviders}</P>
          <Button onClick={openCreateDialog} size="sm">
            <Icon name="lucide:Plus" className="w-4 h-4 mr-2" />
            {t.addProvider}
          </Button>
        </Div>

        {appLoading ? (
          <Div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </Div>
        ) : appProviders.length === 0 ? (
          <EmptyState message={t.noData} />
        ) : (
          <DataTable columns={columns} data={appProviders} pageSize={20} />
        )}
      </Div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProvider ? t.editProvider : t.addProvider}</DialogTitle>
          </DialogHeader>
          <Div className="space-y-4 py-4">
            {!editingProvider && (
              <>
                <Div className="space-y-2">
                  <Label>{t.providerIdLabel}</Label>
                  <Input
                    value={form.providerId}
                    onChange={e => setForm(f => ({ ...f, providerId: e.target.value }))}
                    placeholder="gemini-flash"
                  />
                </Div>
                <Div className="space-y-2">
                  <Label>{t.providerTypeLabel}</Label>
                  <Select
                    value={form.providerType}
                    onValueChange={v =>
                      setForm(f => ({
                        ...f,
                        providerType: v as 'gemini' | 'openai' | 'anthropic',
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_TYPE_OPTIONS.map(pt => (
                        <SelectItem key={pt} value={pt}>
                          {pt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Div>
              </>
            )}
            <Div className="grid grid-cols-2 gap-4">
              <Div className="space-y-2">
                <Label>{t.priorityLabel}</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) || 1 }))}
                />
              </Div>
              <Div className="flex items-end gap-2 pb-1">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={v => setForm(f => ({ ...f, enabled: v }))}
                />
                <Label>{form.enabled ? t.toggleEnabled : t.toggleDisabled}</Label>
              </Div>
            </Div>
            <Div className="space-y-3 pt-2 border-t">
              <P className="text-sm font-medium">{t.configLabel}</P>
              <Div className="space-y-2">
                <Label>{t.modelOverride}</Label>
                <Input
                  value={form.configModel}
                  onChange={e => setForm(f => ({ ...f, configModel: e.target.value }))}
                  placeholder="gemini-2.0-flash"
                />
              </Div>
              <Div className="grid grid-cols-2 gap-4">
                <Div className="space-y-2">
                  <Label>
                    {t.temperatureLabel}: {form.configTemperature.toFixed(1)}
                  </Label>
                  <Input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={form.configTemperature}
                    onChange={e =>
                      setForm(f => ({ ...f, configTemperature: Number(e.target.value) }))
                    }
                  />
                </Div>
                <Div className="space-y-2">
                  <Label>{t.maxTokensLabel}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.configMaxTokens}
                    onChange={e => setForm(f => ({ ...f, configMaxTokens: e.target.value }))}
                    placeholder="8192"
                  />
                </Div>
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.deleteProvider}</DialogTitle>
          </DialogHeader>
          <P className="py-4 text-muted-foreground">{t.deleteProviderConfirm}</P>
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
// Conversations Tab
// ========================================

const CONVERSATIONS_PAGE_SIZE = 20

function ConversationsTab({ client, t }: { client: AIClient; t: Required<AIAdminDashboardTexts> }) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    setLoading(true)
    client
      .listConversations({ limit: CONVERSATIONS_PAGE_SIZE, offset })
      .then(result => {
        setConversations(result.conversations)
        setTotal(result.meta?.total ?? result.conversations.length)
      })
      .catch(() => toast.error(t.loadConversationsError))
      .finally(() => setLoading(false))
  }, [client, offset, t.loadConversationsError])

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
        header: t.conversationPreview,
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
      <Div className="grid grid-cols-2 gap-4">
        <StatCard label={t.totalConversations} value={total} loading={loading} />
      </Div>

      {loading ? (
        <Div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Div>
      ) : conversations.length === 0 ? (
        <EmptyState message={t.noData} />
      ) : (
        <DataTable columns={columns} data={conversations} pageSize={CONVERSATIONS_PAGE_SIZE} />
      )}

      {!loading && total > CONVERSATIONS_PAGE_SIZE && (
        <Div className="flex items-center justify-between">
          <P className="text-sm text-muted-foreground">
            {offset + 1}-{Math.min(offset + CONVERSATIONS_PAGE_SIZE, total)} / {total}
          </P>
          <Div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(prev => Math.max(0, prev - CONVERSATIONS_PAGE_SIZE))}
            >
              &larr; {t.previous}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + CONVERSATIONS_PAGE_SIZE >= total}
              onClick={() => setOffset(prev => prev + CONVERSATIONS_PAGE_SIZE)}
            >
              {t.next} &rarr;
            </Button>
          </Div>
        </Div>
      )}
    </Div>
  )
}

// ========================================
// Usage Tab
// ========================================

interface UsageStatsData {
  totalRequests: number
  totalTokens: number
  estimatedCost: number
  byProvider: Record<string, { requests: number; tokens: number }>
}

function UsageTab({ client, t }: { client: AIClient; t: Required<AIAdminDashboardTexts> }) {
  const [stats, setStats] = useState<UsageStatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    client
      .getUsageStats({ days: 30 })
      .then(result => setStats(result))
      .catch(() => toast.error(t.loadUsageError))
      .finally(() => setLoading(false))
  }, [client, t.loadUsageError])

  const providerEntries = useMemo(() => {
    if (!stats?.byProvider) return []
    return Object.entries(stats.byProvider).sort(([, a], [, b]) => b.requests - a.requests)
  }, [stats])

  return (
    <Div className="space-y-4">
      {/* Stats cards */}
      <Div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label={t.totalRequests} value={stats?.totalRequests ?? 0} loading={loading} />
        <StatCard
          label={t.totalTokens}
          value={stats?.totalTokens?.toLocaleString() ?? '0'}
          loading={loading}
        />
        <StatCard
          label={t.estimatedCost}
          value={`$${(stats?.estimatedCost ?? 0).toFixed(4)}`}
          loading={loading}
        />
      </Div>

      {/* By provider breakdown */}
      <Card className="p-6">
        <P className="text-sm font-medium mb-4">{t.byProvider}</P>
        {loading ? (
          <Div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </Div>
        ) : providerEntries.length === 0 ? (
          <EmptyState message={t.noUsageData} />
        ) : (
          <Div className="space-y-2">
            {providerEntries.map(([providerId, data]) => (
              <Div
                key={providerId}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <Div className="flex items-center gap-2">
                  <Badge variant="outline" size="sm">
                    {providerId}
                  </Badge>
                </Div>
                <Div className="flex items-center gap-4 text-sm">
                  <Span className="text-muted-foreground">
                    {data.requests.toLocaleString()} {t.requests}
                  </Span>
                  <Span className="text-muted-foreground">
                    {data.tokens.toLocaleString()} {t.tokens}
                  </Span>
                </Div>
              </Div>
            ))}
          </Div>
        )}
      </Card>
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
  const [sharedAppProviders, setSharedAppProviders] = useState<AppProviderData[]>([])

  const client = useMemo(
    () => new AIClient({ appName: showAppFilter ? filterAppName : appName || 'ezstart' }),
    [showAppFilter, filterAppName, appName]
  )

  useEffect(() => {
    client
      .listAppProviders()
      .then(result => setSharedAppProviders(result.providers))
      .catch(() => {
        /* ProvidersTab will show its own error */
      })
  }, [client])

  return (
    <Div className={className}>
      {showAppFilter && (
        <Div className="flex items-center gap-2 mb-4">
          <Label>{appFilterLabel || 'App'}</Label>
          <Input
            value={filterAppName}
            onChange={e => setFilterAppName(e.target.value)}
            placeholder={t.allAppsPlaceholder}
            className="max-w-xs"
          />
        </Div>
      )}
      <Tabs defaultValue="prompts">
        <TabsList>
          <TabsTrigger value="prompts">{t.promptsTab}</TabsTrigger>
          <TabsTrigger value="providers">{t.providersTab}</TabsTrigger>
          <TabsTrigger value="conversations">{t.conversationsTab}</TabsTrigger>
          <TabsTrigger value="usage">{t.usageTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="prompts" className="mt-4">
          <PromptsTab client={client} t={t} appProviders={sharedAppProviders} />
        </TabsContent>

        <TabsContent value="providers" className="mt-4">
          <ProvidersTab client={client} t={t} />
        </TabsContent>

        <TabsContent value="conversations" className="mt-4">
          <ConversationsTab client={client} t={t} />
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <UsageTab client={client} t={t} />
        </TabsContent>
      </Tabs>
    </Div>
  )
}
