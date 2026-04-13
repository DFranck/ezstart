/**
 * @ezstart/ai-sdk - AIClient
 * HTTP client for centralized AI endpoints on ezstart-api
 * Follows auth-sdk / pay-sdk pattern
 */

import { getApiUrl } from '@ezstart/config'
import type {
  ConversationListItem,
  Conversation,
  CreateConversationRequest,
  UpdateConversationRequest,
  SystemPrompt,
  CreatePromptRequest,
  UpdatePromptRequest,
  SendMessageRequest,
  SendMessageResponse,
  PromptType,
  ProviderTarget,
  PaginationMeta,
  AppProvider as AppProviderType,
  EnrichedAppProvider,
  CreateAppProviderRequest,
  UpdateAppProviderRequest,
  GlobalProviderAccess as GlobalProviderAccessType,
  CreateGlobalProviderRequest,
  UpdateGlobalProviderRequest,
} from './ai-types.js'
import type { AIProviderInfo } from './server/registry/types.js'

type AIClientConfig = {
  appName: string
  getToken?: () => string | null
}

export class AIClient {
  private appName: string
  private getToken: () => string | null

  constructor(config: AIClientConfig) {
    this.appName = config.appName
    this.getToken =
      config.getToken ||
      (() => {
        if (typeof window === 'undefined') return null
        try {
          const store = localStorage.getItem('ezauth-storage')
          const parsed = store ? JSON.parse(store) : null
          return parsed?.state?.accessToken || null
        } catch {
          return null
        }
      })
  }

  private get baseURL(): string {
    return `${getApiUrl('ezstart')}/api/ai`
  }

  private async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken()
    const url = `${this.baseURL}${path}`

    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: 'include',
    })

    const json = await res.json()

    if (!res.ok) {
      throw new Error(json.error?.message || json.error || `HTTP ${res.status}`)
    }

    // Auto-unwrap { success, data } format
    return json.data !== undefined ? json.data : json
  }

  // === Chat ===

  async sendMessage(request: Omit<SendMessageRequest, 'appName'>): Promise<SendMessageResponse> {
    return this.fetch('/chat', {
      method: 'POST',
      body: JSON.stringify({ ...request, appName: this.appName }),
    })
  }

  // === Conversations ===

  async listConversations(params?: {
    userId?: string
    limit?: number
    offset?: number
  }): Promise<{ conversations: ConversationListItem[]; meta: PaginationMeta }> {
    const query = new URLSearchParams()
    if (this.appName) query.set('appName', this.appName)
    if (params?.userId) query.set('userId', params.userId)
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.offset) query.set('offset', String(params.offset))
    return this.fetch(`/conversations?${query}`)
  }

  async createConversation(
    data: Omit<CreateConversationRequest, 'appName'>
  ): Promise<Conversation> {
    return this.fetch('/conversations', {
      method: 'POST',
      body: JSON.stringify({ ...data, appName: this.appName }),
    })
  }

  async getConversation(id: string): Promise<Conversation> {
    return this.fetch(`/conversations/${id}`)
  }

  async updateConversation(id: string, data: UpdateConversationRequest): Promise<Conversation> {
    return this.fetch(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteConversation(id: string): Promise<void> {
    return this.fetch(`/conversations/${id}`, { method: 'DELETE' })
  }

  async hardDeleteConversation(id: string): Promise<void> {
    return this.fetch(`/conversations/${id}/hard`, { method: 'DELETE' })
  }

  async restoreConversation(id: string): Promise<void> {
    return this.fetch(`/conversations/${id}/restore`, { method: 'POST' })
  }

  // === Prompts ===

  async listPrompts(params?: {
    type?: PromptType
    provider?: ProviderTarget
    active?: boolean
    limit?: number
    offset?: number
    /** Override default app filter ('*' or empty = all apps). Defaults to client.appName when set. */
    app?: string
  }): Promise<{ prompts: SystemPrompt[]; meta: PaginationMeta }> {
    const query = new URLSearchParams()
    const appFilter = params?.app !== undefined ? params.app : this.appName
    if (appFilter) query.set('app', appFilter)
    if (params?.type) query.set('type', params.type)
    if (params?.provider) query.set('provider', params.provider)
    if (params?.active !== undefined) query.set('active', String(params.active))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.offset) query.set('offset', String(params.offset))
    return this.fetch(`/prompts?${query}`)
  }

  async getPrompt(key: string): Promise<SystemPrompt> {
    const query = this.appName ? `?app=${this.appName}` : ''
    return this.fetch(`/prompts/${key}${query}`)
  }

  async createPrompt(data: CreatePromptRequest): Promise<SystemPrompt> {
    return this.fetch('/prompts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updatePrompt(key: string, data: UpdatePromptRequest): Promise<SystemPrompt> {
    const query = this.appName ? `?app=${this.appName}` : ''
    return this.fetch(`/prompts/${key}${query}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deletePrompt(key: string): Promise<void> {
    const query = this.appName ? `?app=${this.appName}` : ''
    return this.fetch(`/prompts/${key}${query}`, { method: 'DELETE' })
  }

  // === Providers (global registry) ===

  async listProviders(): Promise<AIProviderInfo[]> {
    const result = await this.fetch<{ providers: AIProviderInfo[] } | AIProviderInfo[]>(
      '/providers'
    )
    return Array.isArray(result) ? result : result.providers
  }

  // === App Providers (per-app configuration) ===

  async listAppProviders(params?: {
    enabled?: boolean
    limit?: number
    offset?: number
    /** Override default app filter ('*' or empty = all apps). Defaults to client.appName when set. */
    app?: string
  }): Promise<{ providers: EnrichedAppProvider[]; meta: PaginationMeta }> {
    const query = new URLSearchParams()
    const appFilter = params?.app !== undefined ? params.app : this.appName
    if (appFilter) query.set('app', appFilter)
    if (params?.enabled !== undefined) query.set('enabled', String(params.enabled))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.offset) query.set('offset', String(params.offset))
    return this.fetch(`/app-providers?${query}`)
  }

  async createAppProvider(
    data: Omit<CreateAppProviderRequest, 'apps'> & { apps?: string[] }
  ): Promise<AppProviderType> {
    // Default to the client's current app scope if caller didn't provide apps[].
    const apps = data.apps && data.apps.length > 0 ? data.apps : this.appName ? [this.appName] : []
    return this.fetch('/app-providers', {
      method: 'POST',
      body: JSON.stringify({ ...data, apps }),
    })
  }

  async updateAppProvider(id: string, data: UpdateAppProviderRequest): Promise<AppProviderType> {
    return this.fetch(`/app-providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteAppProvider(id: string): Promise<void> {
    return this.fetch(`/app-providers/${id}`, { method: 'DELETE' })
  }

  async toggleAppProvider(id: string): Promise<AppProviderType> {
    return this.fetch(`/app-providers/${id}/toggle`, { method: 'PATCH' })
  }

  // === Usage Stats ===

  async getUsageStats(params?: { days?: number }): Promise<{
    totalRequests: number
    totalTokens: number
    estimatedCost: number
    byProvider: Record<string, { requests: number; tokens: number; cost: number }>
    byApp?: Record<string, { requests: number; tokens: number; cost: number }>
  }> {
    const query = new URLSearchParams()
    if (this.appName) query.set('appName', this.appName)
    if (params?.days) query.set('days', String(params.days))
    return this.fetch(`/usage/stats?${query}`)
  }

  // === Global Providers (superadmin only) ===

  async listGlobalProviders(params?: {
    isGloballyEnabled?: boolean
    providerType?: string
    limit?: number
    offset?: number
  }): Promise<{ providers: GlobalProviderAccessType[]; meta: PaginationMeta }> {
    const query = new URLSearchParams()
    if (params?.isGloballyEnabled !== undefined)
      query.set('isGloballyEnabled', String(params.isGloballyEnabled))
    if (params?.providerType) query.set('providerType', params.providerType)
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.offset) query.set('offset', String(params.offset))
    return this.fetch(`/global-providers?${query}`)
  }

  async createGlobalProvider(data: CreateGlobalProviderRequest): Promise<GlobalProviderAccessType> {
    return this.fetch('/global-providers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateGlobalProvider(
    id: string,
    data: UpdateGlobalProviderRequest
  ): Promise<GlobalProviderAccessType> {
    return this.fetch(`/global-providers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deleteGlobalProvider(id: string): Promise<void> {
    return this.fetch(`/global-providers/${id}`, { method: 'DELETE' })
  }
}

export function createAIClient(config: AIClientConfig): AIClient {
  return new AIClient(config)
}
