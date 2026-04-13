/**
 * @ezstart/ai-sdk - TypeScript Types
 * Inferred from Zod schemas for runtime + compile-time safety
 */

import type { z } from 'zod'
import type {
  chatMessageSchema,
  sendMessageRequestSchema,
  sendMessageResponseSchema,
  conversationSchema,
  conversationListItemSchema,
  createConversationSchema,
  updateConversationSchema,
  systemPromptSchema,
  createPromptSchema,
  updatePromptSchema,
  promptTypeSchema,
  providerTargetSchema,
  promptProviderSchema,
  appProviderSchema,
  enrichedAppProviderSchema,
  createAppProviderSchema,
  updateAppProviderSchema,
  providerTypeSchema,
  globalProviderAccessSchema,
  createGlobalProviderSchema,
  updateGlobalProviderSchema,
} from './schemas.js'

// === Chat ===
export type ChatMessage = z.infer<typeof chatMessageSchema>
export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>
export type SendMessageResponse = z.infer<typeof sendMessageResponseSchema>

// === Conversations ===
export type Conversation = z.infer<typeof conversationSchema>
export type ConversationListItem = z.infer<typeof conversationListItemSchema>
export type CreateConversationRequest = z.infer<typeof createConversationSchema>
export type UpdateConversationRequest = z.infer<typeof updateConversationSchema>

// === Prompts ===
export type SystemPrompt = z.infer<typeof systemPromptSchema>
export type CreatePromptRequest = z.infer<typeof createPromptSchema>
export type UpdatePromptRequest = z.infer<typeof updatePromptSchema>
export type PromptType = z.infer<typeof promptTypeSchema>
export type ProviderTarget = z.infer<typeof providerTargetSchema>
export type PromptProvider = z.infer<typeof promptProviderSchema>

// === App Providers ===
export type AppProvider = z.infer<typeof appProviderSchema>
export type EnrichedAppProvider = z.infer<typeof enrichedAppProviderSchema>
export type CreateAppProviderRequest = z.infer<typeof createAppProviderSchema>
export type UpdateAppProviderRequest = z.infer<typeof updateAppProviderSchema>
export type ProviderType = z.infer<typeof providerTypeSchema>

// === Global Provider Access ===
export type GlobalProviderAccess = z.infer<typeof globalProviderAccessSchema>
export type CreateGlobalProviderRequest = z.infer<typeof createGlobalProviderSchema>
export type UpdateGlobalProviderRequest = z.infer<typeof updateGlobalProviderSchema>

// Re-export existing provider types from registry
export type {
  AIProviderInfo,
  AIProviderType,
  ProviderCapabilities,
} from './server/registry/types.js'

// Pagination meta type
export type PaginationMeta = {
  total: number
  limit: number
  offset: number
}
