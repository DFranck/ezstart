/**
 * Zod validation middlewares for `body`, `query` and `params`.
 *
 * On success the parsed payload is assigned to `req.validatedBody` /
 * `req.validatedQuery` / `req.validatedParams` (see the express augmentation
 * shipped with this package). On failure, a `422` envelope with
 * `code: 'VALIDATION_ERROR'` is emitted via `sendValidationError`.
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { ZodTypeAny } from 'zod'
import { sendValidationError } from '../responses.js'

/**
 * Validate `req.body` against a Zod schema.
 *
 * @example
 * ```ts
 * import { z } from 'zod'
 * import { validateBody } from '@ezstart/api-core'
 *
 * const schema = z.object({ email: z.string().email() })
 * app.post('/signup', validateBody(schema), handler)
 * ```
 */
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      sendValidationError(res, result.error, 422, 'Invalid request body')
      return
    }
    req.validatedBody = result.data
    next()
  }
}

/**
 * Validate `req.query` against a Zod schema.
 *
 * @example
 * ```ts
 * const querySchema = z.object({ page: z.coerce.number().min(1).default(1) })
 * app.get('/items', validateQuery(querySchema), handler)
 * ```
 */
export function validateQuery(schema: ZodTypeAny): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      sendValidationError(res, result.error, 400, 'Invalid query params')
      return
    }
    req.validatedQuery = result.data
    next()
  }
}

/**
 * Validate `req.params` against a Zod schema.
 *
 * @example
 * ```ts
 * const paramsSchema = z.object({ id: z.string().uuid() })
 * app.get('/items/:id', validateParams(paramsSchema), handler)
 * ```
 */
export function validateParams(schema: ZodTypeAny): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      sendValidationError(res, result.error, 400, 'Invalid path params')
      return
    }
    req.validatedParams = result.data
    next()
  }
}
