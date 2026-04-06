import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { apiSuccess, apiError } from '@/lib/api-helpers'
import { getAnalysisById, deleteAnalysis } from '@/services/analysis.service'
import { logger } from '@ezstart/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/analyses/:id — Get a single analysis.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return apiError('Authentication required', 401)
    }

    const { id } = await context.params
    const isAdmin = user.role === 'admin'

    const analysis = isAdmin
      ? await getAnalysisById(id)
      : await getAnalysisById(id, user._id)
    if (!analysis) {
      return apiError('Analysis not found', 404)
    }

    return apiSuccess(analysis)
  } catch (err) {
    logger.error(
      '[GET /api/analyses/:id]',
      err instanceof Error ? err.message : String(err)
    )
    return apiError('Failed to get analysis', 500)
  }
}

/**
 * DELETE /api/analyses/:id — Delete an analysis.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return apiError('Authentication required', 401)
    }

    const { id } = await context.params

    const deleted = await deleteAnalysis(id, user._id)
    if (!deleted) {
      return apiError('Analysis not found', 404)
    }

    return apiSuccess({ deleted: true })
  } catch (err) {
    logger.error(
      '[DELETE /api/analyses/:id]',
      err instanceof Error ? err.message : String(err)
    )
    return apiError('Failed to delete analysis', 500)
  }
}
