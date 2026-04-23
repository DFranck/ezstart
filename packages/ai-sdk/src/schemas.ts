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

export const promptProviderSchema = z.object({
  providerId: z.string().min(1),
  priority: z.number().int().min(1).default(1),
})

export const systemPromptSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  content: z.string(),
  config: promptConfigSchema,
  type: promptTypeSchema,
  // New multi-target fields (replaces `provider` single + `appName` single)
  apps: z.array(z.string()),
  providers: z.array(z.string()),
  // Per-app provider assignments (with priority). Renamed from `providers` to free the name.
  providerAssignments: z.array(promptProviderSchema).optional(),
  // Legacy fields kept optional for backward compat with older API responses
  appName: z.string().optional(),
  provider: providerTargetSchema.optional(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  variables: z.array(z.string()).optional(),
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
  content: z.string().min(1).max(50000),
  config: promptConfigSchema,
  type: promptTypeSchema.default('general'),
  apps: z.array(z.string().min(1)).min(1),
  providers: z.array(z.string().min(1)).min(1),
  providerAssignments: z.array(promptProviderSchema).optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  variables: z.array(z.string()).optional(),
})

export const updatePromptSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  content: z.string().min(1).max(50000).optional(),
  config: promptConfigSchema,
  type: promptTypeSchema.optional(),
  apps: z.array(z.string().min(1)).min(1).optional(),
  providers: z.array(z.string().min(1)).min(1).optional(),
  providerAssignments: z.array(promptProviderSchema).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  variables: z.array(z.string()).optional(),
})

// === App Provider ===
export const providerTypeSchema = z.enum(['gemini', 'openai', 'anthropic'])

export const appProviderConfigSchema = z
  .object({
    model: z.string().max(100).optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).optional(),
  })
  .optional()

export const appProviderSchema = z.object({
  _id: z.string(),
  // New multi-app field. '*' entry means "all apps".
  apps: z.array(z.string()),
  // Legacy single-app field kept optional for backward compat with older API responses.
  appName: z.string().optional(),
  providerId: z.string(),
  providerType: providerTypeSchema,
  enabled: z.boolean(),
  priority: z.number(),
  config: appProviderConfigSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

// === Enriched App Provider (app-provider joined with global registry metadata) ===
export const providerCapabilitiesSchema = z.object({
  text: z.boolean(),
  vision: z.boolean(),
  audio: z.boolean(),
  streaming: z.boolean(),
  functionCalling: z.boolean(),
  jsonMode: z.boolean(),
})

export const enrichedAppProviderSchema = appProviderSchema.extend({
  name: z.string(),
  capabilities: providerCapabilitiesSchema,
  model: z.string(),
  registered: z.boolean(),
})

export const createAppProviderSchema = z.object({
  apps: z.array(z.string().min(1).max(50)).min(1),
  providerId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  providerType: providerTypeSchema,
  enabled: z.boolean().default(true),
  priority: z.number().int().min(1).max(99).default(1),
  config: appProviderConfigSchema,
})

export const updateAppProviderSchema = z.object({
  apps: z.array(z.string().min(1).max(50)).min(1).optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(99).optional(),
  config: appProviderConfigSchema,
})

// === Global Provider Access ===

export const globalProviderAccessSchema = z.object({
  _id: z.string(),
  providerId: z.string(),
  providerType: providerTypeSchema,
  displayName: z.string(),
  allowedApps: z.array(z.string()),
  defaultModel: z.string().optional(),
  maxTokensPerDay: z.number().optional(),
  maxCostPerMonth: z.number().optional(),
  isGloballyEnabled: z.boolean(),
  grantedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createGlobalProviderSchema = z.object({
  providerId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  providerType: providerTypeSchema,
  displayName: z.string().min(1).max(100),
  allowedApps: z.array(z.string().min(1).max(50)).min(1),
  defaultModel: z.string().max(100).optional(),
  maxTokensPerDay: z.number().int().min(0).optional(),
  maxCostPerMonth: z.number().min(0).optional(),
  isGloballyEnabled: z.boolean().default(true),
})

export const updateGlobalProviderSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  allowedApps: z.array(z.string().min(1).max(50)).min(1).optional(),
  defaultModel: z.string().max(100).optional(),
  maxTokensPerDay: z.number().int().min(0).optional(),
  maxCostPerMonth: z.number().min(0).optional(),
  isGloballyEnabled: z.boolean().optional(),
})
