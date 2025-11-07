import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'

extendZodWithOpenApi(z)

// API Response Wrapper
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean().describe('Indicates if the request was successful'),
    data: dataSchema.optional().describe('Response data'),
    error: z.string().optional().describe('Error message if request failed'),
    timestamp: z.string().datetime().describe('ISO timestamp of the response'),
  })

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

// Standard API Schemas for OpenAPI
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.any().optional(),
  timestamp: z.string().datetime(),
}).openapi({ title: 'Success Response' })

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  timestamp: z.string().datetime(),
}).openapi({ title: 'Error Response' })

// Params schemas
export const IdParamsSchema = z.object({
  id: z.string().min(1).describe('Resource ID'),
}).openapi({ title: 'ID Parameters' })

export const JobIdParamsSchema = z.object({
  jobId: z.string().min(1).describe('Job ID for status tracking'),
}).openapi({ title: 'Job ID Parameters' })

// Auth Token Payload
export const TokenPayloadSchema = z.object({
  user_id: z.string(),
  email: z.string().email(),
  company_id: z.string().optional(),
  exp: z.number(),
  iat: z.number(),
})

export type TokenPayload = z.infer<typeof TokenPayloadSchema>

// ESG API Credentials
export const ESGCredentialsSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  base_url: z.string().url(),
})

export type ESGCredentials = z.infer<typeof ESGCredentialsSchema>

// Webhook Event
export const WebhookEventSchema = z.object({
  event_type: z.enum(['report.completed', 'report.failed', 'data.processed']).describe('Type of event that triggered the webhook'),
  job_id: z.string().describe('Unique identifier for the job'),
  status: z.string().describe('Current status of the job'),
  data: z.any().describe('Event-specific payload data'),
  timestamp: z.string().datetime().describe('ISO timestamp when the event occurred'),
})

export type WebhookEvent = z.infer<typeof WebhookEventSchema>

// Project Creation Request
export const ProjectRequestSchema = z.object({
  company_name: z.string(),
  sites: z.array(z.object({
    name: z.string(),
    address: z.string().optional(),
  })),
  reporting_period: z.string(),
})

export type ProjectRequest = z.infer<typeof ProjectRequestSchema>

// Activity Data Request
export const ActivityDataRequestSchema = z.object({
  project_id: z.string(),
  period: z.string(),
  scopes: z.object({
    scope1: z.array(z.any()).optional(),
    scope2: z.array(z.any()).optional(),
    scope3: z.array(z.any()).optional(),
  }),
})

export type ActivityDataRequest = z.infer<typeof ActivityDataRequestSchema>