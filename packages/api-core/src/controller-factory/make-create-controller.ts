import { Request, Response } from 'express';
import { ZodSchema } from 'zod';

export function makeCreateController<TInput, TOutput>(
  schema: ZodSchema<TInput>,
  service: (input: TInput) => Promise<TOutput>,
  logTag: string
) {
  return async (req: Request, res: Response) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(422)
        .json({ error: 'Validation error', details: parsed.error.errors });
    }
    try {
      const result = await service(parsed.data);
      res.status(201).json(result);
    } catch (err) {
      console.error(`[${logTag}]`, err);
      res.status(500).json({ error: `Failed to create ${logTag}` });
    }
  };
}
