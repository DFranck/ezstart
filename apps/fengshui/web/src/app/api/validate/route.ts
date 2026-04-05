import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/api-auth'
import { apiSuccess, apiError } from '@/lib/api-helpers'
import { validatePlanImage } from '@/services/validate.service'
import { updatePlanValidation } from '@/services/plan.service'
import { logger } from '@ezstart/logger'

const validateSchema = z.object({
  imageData: z.string().min(1),
  planId: z.string().optional(), // If provided, save validation result to plan
})

/**
 * Simple in-memory rate limiter for validation endpoint.
 * Max 5 requests per minute per user.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (entry.count >= 5) {
    return false
  }

  entry.count++
  return true
}

/**
 * POST /api/validate — AI-powered floor plan validation using Gemini Vision.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) {
      return apiError('Authentication required', 401)
    }

    // Rate limit: 5 requests per minute per user
    if (!checkRateLimit(user._id)) {
      return apiError('Too many validation requests. Please wait a minute.', 429)
    }

    const body = await req.json()
    const parsed = validateSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(`Validation error: ${parsed.error.issues[0]?.message}`, 400)
    }

    const result = await validatePlanImage(parsed.data.imageData)

    // If planId provided, persist validation result on the plan
    if (parsed.data.planId) {
      await updatePlanValidation(parsed.data.planId, user._id, {
        ...result,
        validatedAt: new Date(),
      })
    }

    return apiSuccess(result)
  } catch (err) {
    logger.error('[POST /api/validate]', err instanceof Error ? err.message : String(err))

    const message =
      err instanceof Error ? err.message : 'Validation failed. Please try again.'
    return apiError(message, 500)
  }
}
