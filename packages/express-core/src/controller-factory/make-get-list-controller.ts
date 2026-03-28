import { Request, Response } from 'express'
import { sendSuccess, sendError } from '../helpers/api-response.js'

export function makeGetListController<Q, T>(service: (query: Q) => Promise<T[]>, logTag: string) {
  return async (req: Request, res: Response) => {
    // @ts-ignore - Using validated query from middleware
    const query = req.validatedQuery as Q
    try {
      const items = await service(query)
      return sendSuccess(res, items)
    } catch (err) {
      console.error(`[${logTag}]`, err)
      return sendError(res, `Failed to fetch ${logTag}`)
    }
  }
}
