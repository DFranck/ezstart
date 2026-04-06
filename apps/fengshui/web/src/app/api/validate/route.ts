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
 * Max 5 requests per minute per IP (public endpoint).
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 })
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
    // Public endpoint — auth optional (used for auto-save only)
    const user = await getAuthUser(req).catch(() => null)

    // Rate limit by user ID or IP
    const rateLimitKey = user?._id || req.headers.get('x-forwarded-for') || 'anonymous'
    if (!checkRateLimit(rateLimitKey)) {
      return apiError('Too many validation requests. Please wait a minute.', 429)
    }

    const body = await req.json()
    const parsed = validateSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(`Validation error: ${parsed.error.issues[0]?.message}`, 400)
    }

    const result = await validatePlanImage(parsed.data.imageData)

    // If planId provided AND user is authenticated, persist validation result
    if (parsed.data.planId && user) {
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
