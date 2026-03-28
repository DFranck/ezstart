import { NextFunction, Request, Response } from 'express'
import { AnyZodObject } from 'zod'
import { sendValidationError } from '../helpers/api-response.js'

export function validateQuery(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)

    if (!result.success) {
      return sendValidationError(res, 'Invalid query params', result.error.errors)
    }

    // @ts-ignore - Augmenting request with validated data
    req.validatedQuery = result.data
    next()
  }
}
