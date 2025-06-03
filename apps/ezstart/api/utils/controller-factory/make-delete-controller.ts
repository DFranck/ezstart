import { mongoIdSchema } from '@ezstart/types/schemas/mongo-id';
import { Request, Response } from 'express';

type DeleteControllerOptions = {
  statusCode?: number;
  sendBody?: boolean;
};

export function makeDeleteController<T>(
  service: (id: string) => Promise<T | null>,
  label: string,
  options: DeleteControllerOptions = {}
) {
  const { statusCode = 204, sendBody = false } = options;

  return async (req: Request, res: Response) => {
    const parseId = mongoIdSchema.safeParse(req.params.id);
    if (!parseId.success) {
      return res
        .status(400)
        .json({ error: 'Invalid ID', details: parseId.error.errors });
    }
    try {
      const deleted = await service(parseId.data);
      if (!deleted) {
        return res.status(404).json({ error: `${label} not found` });
      }
      if (sendBody) {
        return res.status(statusCode).json(deleted);
      } else {
        return res.status(statusCode).send();
      }
    } catch (err) {
      console.error(`[${label}]`, err);
      return res.status(500).json({ error: `Failed to delete ${label}` });
    }
  };
}
