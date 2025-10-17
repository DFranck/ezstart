import { createRouterWithDoc, OpenAPIRegistry, Router } from '@ezstart/express-core'
import { AUDIT_METADATA, type AuditType } from '@ezstart/monitoring'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

export const auditRegistry = new OpenAPIRegistry()
const router = Router()
const docRouter = createRouterWithDoc(auditRegistry, router)
export const auditRoutes = router

/**
 * GET /api/audits
 * Get all audits metadata and status
 */
router.get('/', (_, res) => {
  try {
    const audits = Object.entries(AUDIT_METADATA).map(([auditType, metadata]) => {
      const filePath = join(process.cwd(), '../../', metadata.filePath)
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
})

/**
 * GET /api/audits/:type
 * Get specific audit details
 */
router.get('/:type', (req, res) => {
  try {
    const { type: auditType } = req.params
    const metadata = AUDIT_METADATA[auditType as AuditType]

    if (!metadata) {
      return res.status(404).json({ error: 'Audit type not found' })
    }

    const filePath = join(process.cwd(), '../../', metadata.filePath)
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
})
