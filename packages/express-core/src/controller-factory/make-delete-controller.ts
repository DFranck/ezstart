import { Request, Response } from 'express';

type DeleteControllerOptions = {
  statusCode?: number;
  sendBody?: boolean;
  validateId?: (id: string) => boolean;
};

export function makeDeleteController<T>(
  service: (id: string) => Promise<T | null>,
  label: string,
  options: DeleteControllerOptions = {}
) {
  const {
    statusCode = 204,
    sendBody = false,
    validateId, // facultatif
  } = options;

  return async (req: Request, res: Response) => {
    const id = req.params.id;

    if (!id || (validateId && !validateId(id))) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
      const deleted = await service(id);

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
