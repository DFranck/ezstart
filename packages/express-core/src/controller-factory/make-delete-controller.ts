import { Request, Response } from 'express'
import { logger } from '@ezstart/logger/server'
import { sendSuccess, sendError } from '../helpers/api-response.js'

type DeleteControllerOptions = {
  statusCode?: number
  sendBody?: boolean
  validateId?: (id: string) => boolean
}

export function makeDeleteController<T>(
  service: (id: string) => Promise<T | null>,
  label: string,
  options: DeleteControllerOptions = {}
) {
  const {
    statusCode = 204,
    sendBody = false,
    validateId, // facultatif
  } = options

  return async (req: Request, res: Response) => {
    const id = req.params.id

    if (!id || (validateId && !validateId(id))) {
      return sendError(res, 'Invalid ID', 400)
    }

    try {
      const deleted = await service(id)

      if (!deleted) {
        return sendError(res, `${label} not found`, 404)
      }

      if (sendBody) {
        return res.status(statusCode).json({ success: true, data: deleted })
      } else {
        return res.status(statusCode).send()
      }
    } catch (err) {
      logger.error(`[${label}]`, err)
      return sendError(res, `Failed to delete ${label}`)
    }
  }
}
