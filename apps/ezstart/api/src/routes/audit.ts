import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { AUDIT_METADATA, type AuditType } from '@ezstart/monitoring'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { Request, Response, Router as ExpressRouter } from 'express'
import { z } from 'zod'

export const auditRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(auditRegistry, router)
export const auditRoutes = router as ReturnType<typeof Router>

// ========================================
// Zod Schemas
// ========================================

const auditTypeParamSchema = z.object({
  type: z.string().describe('Type of audit (security, performance, architecture, etc.)'),
})

const auditMetadataSchema = z.object({
  auditType: z.string().describe('Type of audit (security, performance, architecture, etc.)'),
  emoji: z.string().describe('Emoji representing the audit category'),
  name: z.string().describe('Human-readable name of the audit'),
  description: z.string().describe('Detailed description of what this audit covers'),
  filePath: z.string().describe('Path to the audit markdown file'),
  score: z.number().nullable().describe('Audit score out of 100 (null if not audited)'),
  lastUpdated: z.string().nullable().describe('Date when the audit was last updated'),
  status: z.enum(['not-audited', 'partial', 'complete']).describe('Current status of the audit'),
  exists: z.boolean().describe('Whether the audit file exists'),
})

const auditSummarySchema = z.object({
  total: z.number().describe('Total number of audits'),
  complete: z.number().describe('Number of completed audits (score >= 90)'),
  partial: z.number().describe('Number of partially completed audits'),
  notAudited: z.number().describe('Number of audits not yet started'),
  averageScore: z.number().nullable().describe('Average score across all audits'),
})

const allAuditsResponseSchema = z.object({
  audits: z.array(auditMetadataSchema).describe('List of all available audits with metadata'),
  summary: auditSummarySchema.describe('Summary statistics of all audits'),
})

const specificAuditResponseSchema = z.object({
  auditType: z.string().describe('Type of audit'),
  emoji: z.string().describe('Emoji representing the audit'),
  name: z.string().describe('Human-readable name'),
  description: z.string().describe('Detailed description'),
  filePath: z.string().describe('Path to the audit file'),
  score: z.number().nullable().describe('Score out of 100 (null if not audited)'),
  lastUpdated: z.string().nullable().describe('Last update date'),
  status: z.enum(['not-audited', 'partial', 'complete']).describe('Current status'),
  content: z.string().nullable().describe('Full markdown content of the audit file'),
})

const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
})

// ========================================
// Route Handlers
// ========================================

const getAllAuditsHandler = (_: Request, res: Response) => {
  try {
    const audits = Object.entries(AUDIT_METADATA).map(([auditType, metadata]) => {
      const filePath = join(process.cwd(), '../../../', metadata.filePath)
      const exists = existsSync(filePath)

      let score: number | null = null
      let lastUpdated: Date | null = null
      let status: 'not-audited' | 'partial' | 'complete' = 'not-audited'

      if (exists) {
        try {
          const content = readFileSync(filePath, 'utf-8')
          const scoreMatch = content.match(/\*\*Total Score:\*\*\s*(\d+)\/100/i)
          if (scoreMatch && scoreMatch[1]) {
            score = parseInt(scoreMatch[1], 10)
            status = score >= 90 ? 'complete' : 'partial'
          }

          const dateMatch = content.match(/\*\*Last Updated:\*\*\s*(\d{4}-\d{2}-\d{2})/i)
          if (dateMatch && dateMatch[1]) {
            lastUpdated = new Date(dateMatch[1])
          }
        } catch (parseError) {
          console.warn(`Failed to parse audit file: ${filePath}`, parseError)
        }
      }

      return {
        auditType,
        ...metadata,
        score,
        lastUpdated,
        status,
        exists,
      }
    })

    res.json({
      audits,
      summary: {
        total: audits.length,
        complete: audits.filter(a => a.status === 'complete').length,
        partial: audits.filter(a => a.status === 'partial').length,
        notAudited: audits.filter(a => a.status === 'not-audited').length,
        averageScore:
          audits.filter(a => a.score !== null).length > 0
            ? Math.round(
                audits.reduce((sum, a) => sum + (a.score || 0), 0) /
                  audits.filter(a => a.score !== null).length
              )
            : null,
      },
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get audits',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

const getSpecificAuditHandler = (req: Request, res: Response) => {
  try {
    const { type: auditType } = req.params
    const metadata = AUDIT_METADATA[auditType as AuditType]

    if (!metadata) {
      return res.status(404).json({ error: 'Audit type not found' })
    }

    const filePath = join(process.cwd(), '../../../', metadata.filePath)
    const exists = existsSync(filePath)

    if (!exists) {
      return res.json({
        auditType,
        ...metadata,
        status: 'not-audited',
        score: null,
        lastUpdated: null,
        content: null,
      })
    }

    const content = readFileSync(filePath, 'utf-8')

    let score: number | null = null
    let lastUpdated: Date | null = null

    const scoreMatch = content.match(/\*\*Total Score:\*\*\s*(\d+)\/100/i)
    if (scoreMatch && scoreMatch[1]) {
      score = parseInt(scoreMatch[1], 10)
    }

    const dateMatch = content.match(/\*\*Last Updated:\*\*\s*(\d{4}-\d{2}-\d{2})/i)
    if (dateMatch && dateMatch[1]) {
      lastUpdated = new Date(dateMatch[1])
    }

    res.json({
      auditType,
      ...metadata,
      score,
      lastUpdated,
      status: score === null ? 'not-audited' : score >= 90 ? 'complete' : 'partial',
      content,
    })
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get audit',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// ========================================
// Route Registrations
// ========================================

auditRegistry.registerPath({
  method: 'get',
  path: '/api/audits',
  summary: 'Get all audits with metadata',
  description: 'Returns all available audits with their scores, status, and metadata',
  tags: ['Audits'],
  responses: {
    200: {
      description: 'List of all audits with summary',
      content: {
        'application/json': {
          schema: allAuditsResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
})

docRouter.get('/', getAllAuditsHandler, {
  summary: 'Get all audits with metadata',
  tags: ['Audits'],
  responseSchema: allAuditsResponseSchema,
})

auditRegistry.registerPath({
  method: 'get',
  path: '/audits/{type}',
  summary: 'Get specific audit by type',
  description: 'Returns detailed information about a specific audit including its content',
  tags: ['Audits'],
  request: {
    params: auditTypeParamSchema,
  },
  responses: {
    200: {
      description: 'Audit details with content',
      content: {
        'application/json': {
          schema: specificAuditResponseSchema,
        },
      },
    },
    404: {
      description: 'Audit type not found',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: errorResponseSchema,
        },
      },
    },
  },
})

docRouter.get('/:type', getSpecificAuditHandler, {
  summary: 'Get specific audit by type',
  tags: ['Audits'],
  responseSchema: specificAuditResponseSchema,
})
