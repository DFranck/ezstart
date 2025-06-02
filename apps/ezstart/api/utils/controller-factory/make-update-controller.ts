import { mongoIdSchema } from '@ezstart/types/schemas/mongo-id';
import { Request, Response } from 'express';
import { ZodSchema } from 'zod';

export function makeUpdateController<TInput, TOutput>(
  schema: ZodSchema<TInput>,
  service: (id: string, input: TInput) => Promise<TOutput>,
  logTag: string
) {
  return async (req: Request, res: Response) => {
    const parseId = mongoIdSchema.safeParse({ id: req.params.id });
    if (!parseId.success) {
      return res
        .status(400)
        .json({ error: 'Invalid invoice ID', details: parseId.error.errors });
    }
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(422)
        .json({ error: 'Validation error', details: parsed.error.errors });
    }
    try {
      const result = await service(parseId.data, parsed.data);
      res.json(result);
    } catch (err) {
      console.error(`[${logTag}]`, err);
      res.status(500).json({ error: `Failed to update ${logTag}` });
    }
  };
}
