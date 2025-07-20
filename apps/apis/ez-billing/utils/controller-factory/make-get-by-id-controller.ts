import { Request, Response } from 'express';

export function makeGetByIdController<T>(
  service: (id: string) => Promise<T | null>,
  logTag: string
) {
  return async (req: Request, res: Response) => {
    const id = (req as any).validatedParams.id as string;

    try {
      const item = await service(id);
      if (!item) {
        return res.status(404).json({ error: `${logTag} not found` });
      }
      res.json(item);
    } catch (err) {
      console.error(`[${logTag}]`, err);
      res.status(500).json({ error: `Failed to fetch ${logTag}` });
    }
  };
}
