import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/api-auth'
import { apiSuccess, apiError } from '@/lib/api-helpers'
import { listAnalyses, createAnalysis } from '@/services/analysis.service'
import { logger } from '@ezstart/logger'

const createAnalysisSchema = z.object({
  planId: z.string().min(1),
  name: z.string().min(1).max(200),
  bearing: z.number().min(0).max(360),
  results: z.record(z.unknown()),
  imageData: z.string().optional(),
})

/**
 * GET /api/analyses — List user analyses (optionally filtered by planId).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return apiError('Authentication required', 401)
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)
    const planId = searchParams.get('planId') || undefined
    const isAdmin = user.role === 'admin'
    const filterUserId = isAdmin ? (searchParams.get('userId') || undefined) : undefined

    const { data, total } = await listAnalyses(user._id, limit, offset, planId, isAdmin, filterUserId)

    return apiSuccess(data, { total, limit, offset })
  } catch (err) {
    logger.error('[GET /api/analyses]', err instanceof Error ? err.message : String(err))
    return apiError('Failed to list analyses', 500)
  }
}

/**
 * POST /api/analyses — Create a new analysis.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return apiError('Authentication required', 401)
    }

    const body = await req.json()
    const parsed = createAnalysisSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(`Validation error: ${parsed.error.issues[0]?.message}`, 400)
    }

    const analysis = await createAnalysis({
      userId: user._id,
      ...parsed.data,
    })

    return apiSuccess(analysis, undefined, 201)
  } catch (err) {
    logger.error('[POST /api/analyses]', err instanceof Error ? err.message : String(err))
    return apiError('Failed to create analysis', 500)
  }
}
