import { mongoIdSchema } from '@ezstart/types/schemas/mongo-id';
import { Request, Response } from 'express';

export function makeDeleteController<T>(
  service: (id: string) => Promise<T | null>,
  logTag: string
) {
  return async (req: Request, res: Response) => {
    const parseId = mongoIdSchema.safeParse({ id: req.params.id });
    if (!parseId.success) {
      return res
        .status(400)
        .json({ error: 'Invalid invoice ID', details: parseId.error.errors });
    }
    try {
      const deleted = await service(parseId.data);
      res.json(deleted);
    } catch (err) {
      console.error(`[${logTag}]`, err);
      res.status(500).json({ error: `Failed to delete ${logTag}` });
    }
  };
}
