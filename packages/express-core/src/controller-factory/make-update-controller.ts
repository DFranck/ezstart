import { Request, Response } from 'express';
import { ZodSchema } from 'zod';

type UpdateControllerOptions = {
  validateId?: (id: string) => boolean;
};

export function makeUpdateController<TInput, TOutput>(
  schema: ZodSchema<TInput>,
  service: (id: string, input: TInput) => Promise<TOutput>,
  logTag: string,
  options: UpdateControllerOptions = {}
) {
  const { validateId } = options;

  return async (req: Request, res: Response) => {
    const id = req.params.id;

    if (!id || (validateId && !validateId(id))) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        error: 'Validation error',
        details: parsed.error.errors,
      });
    }

    try {
      const result = await service(id, parsed.data);
      return res.json(result);
    } catch (err) {
      console.error(`[${logTag}]`, err);
      return res.status(500).json({ error: `Failed to update ${logTag}` });
    }
  };
}
