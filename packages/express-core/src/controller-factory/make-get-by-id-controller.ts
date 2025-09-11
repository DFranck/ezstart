import { Request, Response } from 'express';

type GetByIdOptions = {
  validateId?: (id: string) => boolean;
};

export function makeGetByIdController<T>(
  service: (id: string) => Promise<T | null>,
  logTag: string,
  options: GetByIdOptions = {}
) {
  const { validateId } = options;

  return async (req: Request, res: Response) => {
    const id = req.params.id;

    if (!id || (validateId && !validateId(id))) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
      const item = await service(id);

      if (!item) {
        return res.status(404).json({ error: `${logTag} not found` });
      }

      return res.json(item);
    } catch (err) {
      console.error(`[${logTag}]`, err);
      return res.status(500).json({ error: `Failed to fetch ${logTag}` });
    }
  };
}
