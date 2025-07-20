/// <reference types="express" />

import 'express';

declare global {
  namespace Express {
    interface Request {
      validatedQuery?: unknown;
      validatedBody?: unknown;
      validatedParams?: unknown;
    }
  }
}
