import { z } from 'zod'

/**
 * Field types supported by the form system
 */
export const FieldTypeSchema = z.enum(['text', 'number', 'date', 'select', 'textarea', 'file', 'boolean'])
export type FieldType = z.infer<typeof FieldTypeSchema>

/**
 * Form categories
 */
export const FormCategorySchema = z.enum(['grant', 'report', 'declaration', 'custom'])
export type FormCategory = z.infer<typeof FormCategorySchema>

/**
 * UI layout options
 */
export const FormLayoutSchema = z.enum(['single-column', 'two-columns', 'wizard'])
export type FormLayout = z.infer<typeof FormLayoutSchema>

/**
 * Theme colors
 */
export const FormThemeSchema = z.enum(['green', 'blue', 'purple'])
export type FormTheme = z.infer<typeof FormThemeSchema>

/**
 * Field extraction configuration
 * Defines how AI should extract this field from conversation
 */
export const FieldExtractionSchema = z.object({
  keywords: z.array(z.string()).describe('Keywords to detect in conversation'),
  aliases: z.array(z.string()).describe('Alternative names for this field'),
  format: z.string().optional().describe('Expected format (regex, date format, etc.)'),
  examples: z.array(z.string()).optional().describe('Example values to help AI understand'),
})
export type FieldExtraction = z.infer<typeof FieldExtractionSchema>

/**
 * Field validation rules
 */
export const FieldValidationSchema = z.object({
  min: z.number().optional().describe('Minimum value (for numbers) or length (for strings)'),
  max: z.number().optional().describe('Maximum value (for numbers) or length (for strings)'),
  pattern: z.string().optional().describe('Regex pattern for validation'),
  custom: z.string().optional().describe('Custom validation function name'),
})
export type FieldValidation = z.infer<typeof FieldValidationSchema>

/**
 * Select field option
 */
export const FieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
})
export type FieldOption = z.infer<typeof FieldOptionSchema>

/**
 * Form field definition
 * Defines a single field in the form with extraction hints
 */
export const FieldDefinitionSchema = z.object({
  id: z.string().describe('Unique field identifier'),
  label: z.string().describe('Human-readable label'),
  type: FieldTypeSchema,
  required: z.boolean().optional().default(false),

  // AI Extraction
  extraction: FieldExtractionSchema,

  // Validation
  validation: FieldValidationSchema.optional(),

  // UI
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  options: z.array(FieldOptionSchema).optional().describe('For select fields'),
})
export type FieldDefinition = z.infer<typeof FieldDefinitionSchema>

/**
 * Form validation rule
 * Cross-field validation logic
 */
export const ValidationRuleSchema = z.object({
  rule: z.string().describe('Rule identifier'),
  message: z.string().describe('Error message to display'),
  condition: z.string().describe('Condition expression to evaluate'),
})
export type ValidationRule = z.infer<typeof ValidationRuleSchema>

/**
 * Form modes configuration
 */
export const FormModesSchema = z.object({
  manual: z.boolean().default(true).describe('Allow manual form filling'),
  chat: z.boolean().default(true).describe('Allow chat-based AI extraction'),
  vocal: z.boolean().default(false).describe('Allow vocal conversation'),
  autoSubmit: z.boolean().default(false).describe('Allow auto-submit without review'),
})
export type FormModes = z.infer<typeof FormModesSchema>

/**
 * Form UI configuration
 */
export const FormUIConfigSchema = z.object({
  theme: FormThemeSchema.optional().default('green'),
  layout: FormLayoutSchema.optional().default('single-column'),
  showProgress: z.boolean().optional().default(true),
  showPreview: z.boolean().optional().default(true),
})
export type FormUIConfig = z.infer<typeof FormUIConfigSchema>

/**
 * Form extraction configuration
 */
export const FormExtractionConfigSchema = z.object({
  systemPrompt: z.string().describe('System prompt to guide AI extraction'),
  fields: z.array(FieldDefinitionSchema).describe('Fields to extract from conversation'),
})
export type FormExtractionConfig = z.infer<typeof FormExtractionConfigSchema>

/**
 * Complete form configuration
 * This is the main config object that defines an entire form
 */
export const FormConfigSchema = z.object({
  id: z.string().describe('Unique form identifier'),
  name: z.string().describe('Human-readable form name'),
  description: z.string().describe('Form description'),
  category: FormCategorySchema.describe('Category of the form (grant, report, declaration, custom)'),
  icon: z.string().optional().describe('Emoji or icon'),

  // AI Extraction
  extraction: FormExtractionConfigSchema.describe('AI extraction configuration for fields'),

  // Modes
  modes: FormModesSchema.describe('Enabled form filling modes (manual, chat, vocal)'),

  // UI
  ui: FormUIConfigSchema.describe('UI customization options (theme, layout, progress)'),

  // Validation
  validation: z.array(ValidationRuleSchema).optional().describe('Cross-field validation rules'),

  // Submission
  submitEndpoint: z.string().optional().describe('API endpoint for form submission'),

  // Metadata
  createdBy: z.string().optional().describe('User ID who created this form configuration'),
  version: z.string().optional().describe('Version string for form configuration'),
  tags: z.array(z.string()).optional().describe('Tags for categorizing and searching forms'),

  // Timestamps (added by MongoDB)
  createdAt: z.date().optional().describe('Date when form configuration was created'),
  updatedAt: z.date().optional().describe('Date when form configuration was last updated'),
})
export type FormConfig = z.infer<typeof FormConfigSchema>