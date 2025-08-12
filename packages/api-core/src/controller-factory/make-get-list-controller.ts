import { Request, Response } from 'express'

export function makeGetListController<Q, T>(service: (query: Q) => Promise<T[]>, logTag: string) {
  return async (req: Request, res: Response) => {
    // @ts-ignore - Using validated query from middleware
    const query = req.validatedQuery as Q
    try {
      const items = await service(query)
      res.json(items)
    } catch (err) {
      console.error(`[${logTag}]`, err)
      res.status(500).json({ error: `Failed to fetch ${logTag}` })
    }
  }
}
