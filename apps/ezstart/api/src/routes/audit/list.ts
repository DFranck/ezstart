/**
 * GET /api/audits
 *
 * Get all audits with metadata
 * Returns all available audits with their scores, status, and metadata
 *
 * Now reads from docs/audits.json (single JSON file) instead of multiple .md files
 */

import { logger } from '@ezstart/logger/server'
import {
  createRouterWithDoc,
  OpenAPIRegistry,
  Router,
  sendSuccess,
  sendError,
} from '@ezstart/express-core'
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

const errorResponseSchema = z.object({
  error: z.string().describe('Error type or code'),
  message: z.string().describe('Human-readable error message'),
})

// ========================================
// Route Handler
// ========================================

const getAllAuditsHandler = (_: Request, res: Response) => {
  try {
    // Read audits.json file
    const auditsJsonPath = join(process.cwd(), '../../../docs/audits.json')
    const exists = existsSync(auditsJsonPath)

    if (!exists) {
      return sendError(res, 'Audits file not found (docs/audits.json does not exist)', 404)
    }

    const auditsJson = JSON.parse(readFileSync(auditsJsonPath, 'utf-8'))
    const { domains } = auditsJson

    // Transform audits.json structure to match expected API format
    const audits = Object.entries(domains).flatMap(([domainKey, domainData]: [string, any]) => {
      return Object.entries(domainData.categories || {}).map(
        ([categoryKey, categoryData]: [string, any]) => {
          const score = categoryData.score
          const status = score >= 90 ? 'complete' : score >= 70 ? 'partial' : 'not-audited'

          return {
            auditType: categoryKey,
            emoji: domainData.emoji || '📊',
            name: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1),
            description: categoryData.description || `${domainData.agent} - ${categoryKey}`,
            filePath: `docs/audits.json → domains.${domainKey}.categories.${categoryKey}`,
            score,
            lastUpdated: categoryData.lastUpdate || auditsJson.lastUpdated,
            status,
            exists: true,
            // New human-readable fields
            audited: categoryData.audited || [],
            notAudited: categoryData.notAudited || [],
            why: categoryData.why || '',
            nextSteps: categoryData.nextSteps || [],
          }
        }
      )
    })

    // Add domain-level scores as well
    const domainAudits = Object.entries(domains).map(([domainKey, domainData]: [string, any]) => {
      const score = domainData.score
      const status = score >= 90 ? 'complete' : score >= 70 ? 'partial' : 'not-audited'

      return {
        auditType: domainKey,
        emoji: domainData.emoji || '📊',
        name: domainData.domain || domainKey,
        description: domainData.domain || `${domainData.agent} - Overall ${domainKey} score`,
        filePath: `docs/audits.json → domains.${domainKey}`,
        score,
        lastUpdated: auditsJson.lastUpdated,
        status,
        exists: true,
        // Domain-level doesn't have these detailed fields
        audited: [],
        notAudited: [],
        why: `Overall ${domainKey} score aggregated from ${Object.keys(domainData.categories || {}).length} categories`,
        nextSteps: [],
      }
    })

    const allAudits = [...domainAudits, ...audits]

    sendSuccess(res, {
      audits: allAudits,
      summary: {
        total: allAudits.length,
        complete: allAudits.filter(a => a.status === 'complete').length,
        partial: allAudits.filter(a => a.status === 'partial').length,
        notAudited: allAudits.filter(a => a.status === 'not-audited').length,
        averageScore: auditsJson.global?.score || null,
      },
    })
  } catch (error) {
    logger.error('[Audits] Error reading audits.json:', error)
    sendError(res, error instanceof Error ? error.message : 'Failed to get audits')
  }
}

// ========================================
// Route Registration
// ========================================

registry.registerPath({
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

export default router as ReturnType<typeof Router>
