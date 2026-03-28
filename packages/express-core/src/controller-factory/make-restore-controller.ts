import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../helpers/api-response.js';

type RestoreControllerOptions = {
  validateId?: (id: string) => boolean;
};

export function makeRestoreController<T>(
  service: (id: string) => Promise<T | null>,
  logTag: string,
  options: RestoreControllerOptions = {}
) {
  const { validateId } = options;

  return async (req: Request, res: Response) => {
    const id = req.params.id;

    if (!id || (validateId && !validateId(id))) {
      return sendError(res, 'Invalid ID', 400);
    }

    try {
      const restored = await service(id);

      if (!restored) {
        return sendError(res, `${logTag} not found`, 404);
      }

      return sendSuccess(res, restored);
    } catch (err) {
      console.error(`[${logTag}]`, err);
      return sendError(res, `Failed to restore ${logTag}`);
    }
  };
}
