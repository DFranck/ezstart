/**
 * @ezstart/ai-sdk - Zod Schemas
 * All validation schemas for AI entities (chat, conversations, prompts)
 */

import { z } from 'zod'

// === Chat Message ===
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string().or(z.date()).optional(),
  metadata: z
    .object({
      hasAudio: z.boolean().optional(),
      hasImage: z.boolean().optional(),
      hasDocument: z.boolean().optional(),
      extractedData: z.record(z.unknown()).optional(),
    })
    .optional(),
})

// === Chat Request/Response ===
export const sendMessageRequestSchema = z.object({
  message: z.string().min(1),
  appName: z.string().min(1),
  providerId: z.string().optional(),
  conversationId: z.string().optional(),
  userId: z.string().optional(),
  locale: z.string().optional(),
})

export const sendMessageResponseSchema = z.object({
  response: z.string(),
  conversationId: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
})

// === Conversation ===
export const conversationSchema = z.object({
  id: z.string(),
  appName: z.string(),
  title: z.string(),
  preview: z.string().optional(),
  messages: z.array(chatMessageSchema),
  userId: z.string().optional(),
  deletedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const conversationListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  preview: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  unread: z.boolean().optional(),
})

export const createConversationSchema = z.object({
  title: z.string().min(1).max(100).default('New Chat'),
  userId: z.string().optional(),
  appName: z.string().min(1),
})

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(100),
})

// === Prompt ===
export const promptTypeSchema = z.enum(['general', 'extraction', 'validation', 'vision', 'custom'])
export const providerTargetSchema = z.enum(['all', 'gemini', 'openai', 'anthropic'])

export const promptConfigSchema = z
  .object({
    temperature: z.number().min(0).max(1).optional(),
    maxTokens: z.number().optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.number().optional(),
    rules: z.array(z.string()).optional(),
    constraints: z
      .object({
        maxResponseLength: z.number().optional(),
        allowedTopics: z.array(z.string()).optional(),
        forbiddenTopics: z.array(z.string()).optional(),
        requiredFormat: z.string().optional(),
      })
      .optional(),
    safety: z
      .object({
        blockThreshold: z.enum(['none', 'low', 'medium', 'high']).optional(),
        filterLevel: z.number().min(0).max(10).optional(),
      })
      .optional(),
  })
  .optional()

export const systemPromptSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  content: z.string(),
  config: promptConfigSchema,
  type: promptTypeSchema,
  provider: providerTargetSchema,
  isActive: z.boolean(),
  isDefault: z.boolean(),
  variables: z.array(z.string()).optional(),
  appName: z.string(),
  updatedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createPromptSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-_]+$/),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  content: z.string().min(1).max(10000),
  config: promptConfigSchema,
  type: promptTypeSchema.default('general'),
  provider: providerTargetSchema.default('all'),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  variables: z.array(z.string()).optional(),
  appName: z.string().min(1),
})

export const updatePromptSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  content: z.string().min(1).max(10000).optional(),
  config: promptConfigSchema,
  type: promptTypeSchema.optional(),
  provider: providerTargetSchema.optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  variables: z.array(z.string()).optional(),
})
