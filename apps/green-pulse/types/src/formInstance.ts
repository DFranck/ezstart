import { z } from 'zod'

/**
 * Form instance status
 */
export const FormStatusSchema = z.enum(['draft', 'review', 'submitted', 'approved', 'rejected'])
export type FormStatus = z.infer<typeof FormStatusSchema>

/**
 * Form filling mode
 */
export const FormModeSchema = z.enum(['manual', 'chat', 'vocal'])
export type FormMode = z.infer<typeof FormModeSchema>

/**
 * History entry for form instance
 */
export const FormHistoryEntrySchema = z.object({
  timestamp: z.date(),
  action: z.string().describe('Action performed (e.g., created, updated, submitted)'),
  userId: z.string().optional(),
  changes: z.any().optional().describe('Changed fields'),
})
export type FormHistoryEntry = z.infer<typeof FormHistoryEntrySchema>

/**
 * Form instance - represents a user's filled form
 */
export const FormInstanceSchema = z.object({
  _id: z.string().optional(),

  // Reference
  formConfigId: z.string().describe('ID of the form configuration'),
  projectId: z.string().optional().describe('Project/case this form belongs to'),
  userId: z.string().optional().describe('User who is filling the form'),

  // Data
  fields: z.record(z.any()).describe('Extracted or manually entered field values'),
  extractedData: z.any().optional().describe('Raw extraction from AI (for audit)'),

  // Status
  status: FormStatusSchema.default('draft'),
  mode: FormModeSchema.default('manual'),

  // Conversation (if using AI mode)
  conversationId: z.string().optional().describe('Link to Conversation model'),
  extractionConfidence: z.record(z.number()).optional().describe('Confidence score per field (0-1)'),

  // Submission
  submittedAt: z.date().optional(),
  submittedData: z.any().optional().describe('Final payload sent to submission endpoint'),

  // Audit
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
  history: z.array(FormHistoryEntrySchema).optional().describe('Change log'),
})
export type FormInstance = z.infer<typeof FormInstanceSchema>

/**
 * Request to create a new form instance
 */
export const CreateFormInstanceRequestSchema = z.object({
  formConfigId: z.string().describe('ID of the form configuration to instantiate'),
  projectId: z.string().optional().describe('Project/case to associate this instance with'),
  userId: z.string().optional().describe('User who will be filling the form'),
  mode: FormModeSchema.optional().default('manual').describe('Form filling mode (manual, chat, or vocal)'),
})
export type CreateFormInstanceRequest = z.infer<typeof CreateFormInstanceRequestSchema>

/**
 * Request to update a form instance
 */
export const UpdateFormInstanceRequestSchema = z.object({
  fields: z.record(z.any()).optional().describe('Updated field values (key-value pairs)'),
  status: FormStatusSchema.optional().describe('Updated form status (draft, review, submitted, etc.)'),
  conversationId: z.string().optional().describe('Conversation ID for chat-based forms'),
  extractionConfidence: z.record(z.number()).optional().describe('AI confidence scores per field (0-1)'),
})
export type UpdateFormInstanceRequest = z.infer<typeof UpdateFormInstanceRequestSchema>

/**
 * Request to submit a form instance
 */
export const SubmitFormInstanceRequestSchema = z.object({
  instanceId: z.string().describe('ID of the form instance to submit'),
  finalData: z.record(z.any()).optional().describe('Override fields if needed'),
})
export type SubmitFormInstanceRequest = z.infer<typeof SubmitFormInstanceRequestSchema>

/**
 * AI extraction request
 */
export const ExtractFormDataRequestSchema = z.object({
  formConfigId: z.string().describe('Form configuration ID defining extraction rules'),
  instanceId: z.string().optional().describe('Form instance ID to update with extracted data'),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ).describe('Conversation messages to extract data from'),
})
export type ExtractFormDataRequest = z.infer<typeof ExtractFormDataRequestSchema>

/**
 * AI extraction response
 */
export const ExtractFormDataResponseSchema = z.object({
  extractedFields: z.record(z.any()).describe('Extracted field values'),
  confidence: z.record(z.number()).describe('Confidence score per field (0-1)'),
  missingFields: z.array(z.string()).describe('Required fields not yet extracted'),
  suggestions: z.array(z.string()).describe('Suggested next questions for user'),
  aiResponse: z.string().describe('AI response to show to user'),
})
export type ExtractFormDataResponse = z.infer<typeof ExtractFormDataResponseSchema>