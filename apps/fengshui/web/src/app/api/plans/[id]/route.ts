import { NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { apiSuccess, apiError } from '@/lib/api-helpers'
import { getPlanById, deletePlan } from '@/services/plan.service'
import { logger } from '@ezstart/logger'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/plans/:id — Get a single plan (includes imageData).
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return apiError('Authentication required', 401)
    }

    const { id } = await context.params

    const plan = await getPlanById(id, user._id)
    if (!plan) {
      return apiError('Plan not found', 404)
    }

    return apiSuccess(plan)
  } catch (err) {
    logger.error('[GET /api/plans/:id]', err instanceof Error ? err.message : String(err))
    return apiError('Failed to get plan', 500)
  }
}

/**
 * DELETE /api/plans/:id — Delete a plan and its analyses.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return apiError('Authentication required', 401)
    }

    const { id } = await context.params

    const deleted = await deletePlan(id, user._id)
    if (!deleted) {
      return apiError('Plan not found', 404)
    }

    return apiSuccess({ deleted: true })
  } catch (err) {
    logger.error('[DELETE /api/plans/:id]', err instanceof Error ? err.message : String(err))
    return apiError('Failed to delete plan', 500)
  }
}
