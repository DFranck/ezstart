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
