import { Request, Response } from 'express'
import { logger } from '@ezstart/logger/server'
import { sendSuccess, sendError } from '../helpers/api-response.js'

type GetByIdOptions = {
  validateId?: (id: string) => boolean
}

export function makeGetByIdController<T>(
  service: (id: string) => Promise<T | null>,
  logTag: string,
  options: GetByIdOptions = {}
) {
  const { validateId } = options

  return async (req: Request, res: Response) => {
    const id = req.params.id

    if (!id || (validateId && !validateId(id))) {
      return sendError(res, 'Invalid ID', 400)
    }

    try {
      const item = await service(id)

      if (!item) {
        return sendError(res, `${logTag} not found`, 404)
      }

      return sendSuccess(res, item)
    } catch (err) {
      logger.error(`[${logTag}]`, err)
      return sendError(res, `Failed to fetch ${logTag}`)
    }
  }
}
