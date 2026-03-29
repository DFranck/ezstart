import { NextFunction, Request, Response } from 'express'
import { AnyZodObject } from 'zod'
import { sendValidationError } from '../helpers/api-response.js'

export function validateParams(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params)

    if (!result.success) {
      return sendValidationError(res, 'Invalid path params', result.error.errors, 400)
    }

    ;(req as Request & { validatedParams: unknown }).validatedParams = result.data

    next()
  }
}
