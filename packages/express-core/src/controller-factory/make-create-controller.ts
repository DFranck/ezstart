import { Request, Response } from 'express'
import { logger } from '@ezstart/logger/server'
import { ZodSchema } from 'zod'
import { sendSuccess, sendError, sendValidationError } from '../helpers/api-response.js'

export function makeCreateController<TInput, TOutput>(
  schema: ZodSchema<TInput>,
  service: (input: TInput) => Promise<TOutput>,
  logTag: string
) {
  return async (req: Request, res: Response) => {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return sendValidationError(res, 'Validation error', parsed.error.errors)
    }
    try {
      const result = await service(parsed.data)
      return res.status(201).json({ success: true, data: result })
    } catch (err) {
      logger.error(`[${logTag}]`, err instanceof Error ? err.message : String(err))
      return sendError(res, `Failed to create ${logTag}`)
    }
  }
}
