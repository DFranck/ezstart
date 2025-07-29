import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';

export function validateParams(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid path params',
        details: result.error.errors,
      });
    }

    (req as any).validatedParams = result.data;

    next();
  };
}
