/**
 * GET /api/companies
 * List Companies (authenticated)
 */

import {
  Router,
  createRouterWithDoc,
  OpenAPIRegistry,
} from '@ezstart/express-core';
import { companySchema } from '@ezbill/types';
import { getCompanies } from '../../controllers/company/index.js';
import { authMiddleware } from '../../middleware/auth.js';

export const listCompaniesRegistry = new OpenAPIRegistry();
const router = Router();
export const listCompaniesRouter = createRouterWithDoc(
  listCompaniesRegistry,
  router,
  '/companies'
);

listCompaniesRouter.get('/', authMiddleware, getCompanies, {
  summary: 'List Companies (authenticated)',
  tags: ['Companies'],
  responseSchema: companySchema.array(),
});

export default router;
