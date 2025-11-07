/**
 * GET /api/audits/:type
 *
 * Get specific audit by type
 * Returns detailed information about a specific audit including its content
 */

import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { AUDIT_METADATA, type AuditType } from '@ezstart/monitoring'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { Request, Response } from 'express'
import { z } from 'zod'

export const registry = new OpenAPIRegistry()
export const router: ReturnType<typeof Router> = Router()
const docRouter = createRouterWithDoc(registry, router)

// ========================================
// Zod Schemas
// ========================================

const auditTypeParamSchema = z.object({
  type: z.string().describe('Type of audit (security, performance, architecture, etc.)'),
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
// Route Handler
// ========================================

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
// Route Registration
// ========================================

registry.registerPath({
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

export default router as ReturnType<typeof Router>
