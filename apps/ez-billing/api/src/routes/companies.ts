import {
  createRouterWithDoc,
  OpenAPIRegistry,
  validateParams,
  Router,
} from '@ezstart/express-core'
import {
  createCompany,
  deleteCompany,
  getCompanies,
  getCompanyById,
  restoreCompany,
  updateCompany,
} from '../controllers/company/index.js'
import { authMiddleware } from '../middleware/auth.js'
import {
  companySchema,
  createCompanySchema,
  paramsMongoIdSchema,
} from '@ez-billing/types'

export const companiesRegistry = new OpenAPIRegistry()
const router = Router()
const docRouter = createRouterWithDoc(companiesRegistry, router, '/companies')

// Protected routes with authentication and OpenAPI documentation
docRouter.get('/', authMiddleware, getCompanies, {
  summary: 'List Companies (authenticated)',
  tags: ['Companies'],
  responseSchema: companySchema.array(),
})

docRouter.get('/:id', authMiddleware, validateParams(paramsMongoIdSchema), getCompanyById, {
  summary: 'Get Company by ID (authenticated)',
  tags: ['Companies'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: companySchema,
})

docRouter.post('/', authMiddleware, createCompany, {
  summary: 'Create Company (authenticated)',
  tags: ['Companies'],
  bodySchema: createCompanySchema,
  responseSchema: companySchema,
  status: 201,
})

docRouter.put('/:id', authMiddleware, validateParams(paramsMongoIdSchema), updateCompany, {
  summary: 'Update Company (authenticated)',
  tags: ['Companies'],
  bodySchema: createCompanySchema,
  paramsSchema: paramsMongoIdSchema,
  responseSchema: companySchema,
})

docRouter.post('/:id/restore', authMiddleware, validateParams(paramsMongoIdSchema), restoreCompany, {
  summary: 'Restore Company (authenticated)',
  tags: ['Companies'],
  paramsSchema: paramsMongoIdSchema,
  responseSchema: companySchema,
})

docRouter.delete('/:id', authMiddleware, validateParams(paramsMongoIdSchema), deleteCompany, {
  summary: 'Soft delete Company (authenticated)',
  tags: ['Companies'],
  paramsSchema: paramsMongoIdSchema,
})

export default router
