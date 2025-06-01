import { NextFunction, Request, Response } from 'express';
import { AnyZodObject } from 'zod';

export function validateQuery(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res
        .status(422)
        .json({ error: 'Invalid query params', details: result.error.errors });
    }
    req.validatedQuery = result.data;
    next();
  };
}
