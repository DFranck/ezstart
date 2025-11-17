/**
 * GET /api/audits/:type
 *
 * Get specific audit by type
 * Returns detailed information about a specific audit including its content
 *
 * Now reads from docs/audits.json instead of .md files
 */

import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
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

    if (!auditType) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Audit type parameter is required',
      })
    }

    // Read audits.json
    const auditsJsonPath = join(process.cwd(), '../../../docs/audits.json')
    if (!existsSync(auditsJsonPath)) {
      return res.status(404).json({
        error: 'Audits file not found',
        message: 'docs/audits.json does not exist',
      })
    }

    const auditsJson = JSON.parse(readFileSync(auditsJsonPath, 'utf-8'))
    const { domains } = auditsJson

    // Find audit by type (search in domains and categories)
    let auditData: any = null
    let domainKey: string | null = null

    // First check if it's a domain-level audit
    for (const [key, domain] of Object.entries(domains) as [string, any][]) {
      if (key === auditType) {
        auditData = domain
        domainKey = key
        break
      }
      // Then check categories
      if (domain.categories && domain.categories[auditType]) {
        auditData = domain.categories[auditType]
        domainKey = key
        break
      }
    }

    if (!auditData || !domainKey) {
      return res.status(404).json({
        error: 'Audit type not found',
        message: `No audit found for type: ${auditType}`,
      })
    }

    const score = auditData.score || null
    const lastUpdated = auditData.lastUpdate || auditsJson.lastUpdated
    const status = score === null ? 'not-audited' : score >= 90 ? 'complete' : 'partial'

    res.json({
      auditType,
      emoji: domains[domainKey]?.emoji || '📊',
      name: auditType.charAt(0).toUpperCase() + auditType.slice(1),
      description: auditData.description || `${domains[domainKey]?.agent || 'Agent'} - ${auditType}`,
      filePath: `docs/audits.json → domains.${domainKey}${auditData.score ? '' : '.categories.' + auditType}`,
      score,
      lastUpdated,
      status,
      content: JSON.stringify(auditData, null, 2), // Return JSON instead of markdown
      // New human-readable fields
      audited: auditData.audited || [],
      notAudited: auditData.notAudited || [],
      why: auditData.why || '',
      nextSteps: auditData.nextSteps || [],
    })
  } catch (error) {
    console.error('[Audits] Error reading audit by type:', error)
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
