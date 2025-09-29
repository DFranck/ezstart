import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// Chat Message Schema
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string().datetime().optional(),
  metadata: z
    .object({
      hasAudio: z.boolean().optional(),
      hasImage: z.boolean().optional(),
      hasDocument: z.boolean().optional(),
      extractedData: z.any().optional(),
    })
    .optional(),
})

export type ChatMessage = z.infer<typeof ChatMessageSchema>

// Chat Request
export const ChatRequestSchema = z.object({
  message: z.string().min(1).describe('User message or question'),
  session_id: z.string().optional().describe('Session ID for conversation continuity'),
  context: z.array(ChatMessageSchema).optional().describe('Previous conversation context'),
  extract_esg: z.boolean().default(false).describe('Whether to extract ESG data from the message'),
}).openapi({ title: 'Chat Request' })

export type ChatRequest = z.infer<typeof ChatRequestSchema>

// Chat Response
export const ChatResponseSchema = z.object({
  response: z.string().describe('AI assistant response'),
  extracted_data: z.any().optional().describe('Extracted ESG data if requested'),
  session_id: z.string().describe('Session ID'),
  suggestions: z.array(z.string()).optional().describe('Suggested follow-up questions'),
}).openapi({ title: 'Chat Response' })

export type ChatResponse = z.infer<typeof ChatResponseSchema>

// Text Extraction Request
export const TextExtractionRequestSchema = z.object({
  text: z.string().min(1).describe('Text content to extract ESG data from'),
}).openapi({ title: 'Text Extraction Request' })

export type TextExtractionRequest = z.infer<typeof TextExtractionRequestSchema>

// Upload Types
export const UploadTypeSchema = z.enum(['audio', 'image', 'document'])
export type UploadType = z.infer<typeof UploadTypeSchema>

// Upload Response
export const UploadResponseSchema = z.object({
  type: UploadTypeSchema,
  text: z.string().optional(),
  extracted_data: z.any().optional(),
  file_id: z.string(),
  original_name: z.string(),
})

export type UploadResponse = z.infer<typeof UploadResponseSchema>