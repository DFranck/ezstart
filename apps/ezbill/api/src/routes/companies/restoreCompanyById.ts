/**
 * POST /api/companies/:id/restore
 * Restore Company (authenticated)
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
} from '@ezstart/express-core';
import { companySchema, paramsMongoIdSchema } from '@ezbill/types';
import { restoreCompany } from '../../controllers/company/index.js';
import { authMiddleware } from '../../middleware/auth.js';

export const restoreCompanyByIdRegistry = new OpenAPIRegistry();
const router = Router();
export const restoreCompanyByIdRouter = createRouterWithDoc(
  restoreCompanyByIdRegistry,
  router,
  '/companies'
);

restoreCompanyByIdRouter.post('/:id/restore', authMiddleware, validateParams(paramsMongoIdSchema), restoreCompany, {
  summary: 'Restore Company (authenticated)',
  tags: ['Companies'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: companySchema,
});

export default router;
