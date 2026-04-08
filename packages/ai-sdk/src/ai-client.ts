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
    const query = new URLSearchParams({ appName: this.appName })
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
  }): Promise<{ prompts: SystemPrompt[]; meta: PaginationMeta }> {
    const query = new URLSearchParams({ appName: this.appName })
    if (params?.type) query.set('type', params.type)
    if (params?.provider) query.set('provider', params.provider)
    if (params?.active !== undefined) query.set('active', String(params.active))
    if (params?.limit) query.set('limit', String(params.limit))
    if (params?.offset) query.set('offset', String(params.offset))
    return this.fetch(`/prompts?${query}`)
  }

  async getPrompt(key: string): Promise<SystemPrompt> {
    return this.fetch(`/prompts/${key}?appName=${this.appName}`)
  }

  async createPrompt(data: Omit<CreatePromptRequest, 'appName'>): Promise<SystemPrompt> {
    return this.fetch('/prompts', {
      method: 'POST',
      body: JSON.stringify({ ...data, appName: this.appName }),
    })
  }

  async updatePrompt(key: string, data: UpdatePromptRequest): Promise<SystemPrompt> {
    return this.fetch(`/prompts/${key}?appName=${this.appName}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async deletePrompt(key: string): Promise<void> {
    return this.fetch(`/prompts/${key}?appName=${this.appName}`, { method: 'DELETE' })
  }

  // === Providers ===

  async listProviders(): Promise<AIProviderInfo[]> {
    return this.fetch('/providers')
  }
}

export function createAIClient(config: AIClientConfig): AIClient {
  return new AIClient(config)
}
