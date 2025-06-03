import { mongoIdSchema } from '@ezstart/types/schemas/mongo-id';
import { Request, Response } from 'express';

export function makeGetByIdController<T>(
  service: (id: string) => Promise<T | null>,
  logTag: string
) {
  return async (req: Request, res: Response) => {
    const parseId = mongoIdSchema.safeParse(req.params.id);
    if (!parseId.success) {
      return res
        .status(400)
        .json({ error: 'Invalid ID', details: parseId.error.errors });
    }
    try {
      const items = await service(parseId.data);
      if (!items) {
        return res.status(404).json({ error: `${logTag} not found` });
      }
      res.json(items);
    } catch (err) {
      console.error(`[${logTag}]`, err);
      res.status(500).json({ error: `Failed to fetch ${logTag}` });
    }
  };
}
