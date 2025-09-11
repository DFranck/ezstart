import { Request, Response } from 'express';

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
      return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
      const restored = await service(id);

      if (!restored) {
        return res.status(404).json({ error: `${logTag} not found` });
      }

      return res.json(restored);
    } catch (err) {
      console.error(`[${logTag}]`, err);
      return res.status(500).json({ error: `Failed to restore ${logTag}` });
    }
  };
}
