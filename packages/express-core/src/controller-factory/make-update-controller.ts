import { Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { sendSuccess, sendError, sendValidationError } from '../helpers/api-response.js';

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
      return sendError(res, 'Invalid ID', 400);
    }

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, 'Validation error', parsed.error.errors);
    }

    try {
      const result = await service(id, parsed.data);
      return sendSuccess(res, result);
    } catch (err) {
      console.error(`[${logTag}]`, err);
      return sendError(res, `Failed to update ${logTag}`);
    }
  };
}
