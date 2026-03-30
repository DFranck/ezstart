/**
 * Companies Feature Router
 *
 * Consolidates all company-related actions into a single router.
 *
 * Routes:
 * - GET    /api/companies            -> listCompanies
 * - GET    /api/companies/:id        -> getCompanyById
 * - POST   /api/companies            -> createCompany
 * - PUT    /api/companies/:id        -> updateCompanyById
 * - POST   /api/companies/:id/restore -> restoreCompanyById
 * - DELETE /api/companies/:id        -> deleteCompanyById
 */

import { Router } from '@ezstart/express-core'

// Import action routers
import listCompaniesRouter, { listCompaniesRegistry } from './listCompanies.js'
import getCompanyByIdRouter, { getCompanyByIdRegistry } from './getCompanyById.js'
import createCompanyRouter, { createCompanyRegistry } from './createCompany.js'
import updateCompanyByIdRouter, { updateCompanyByIdRegistry } from './updateCompanyById.js'
import restoreCompanyByIdRouter, { restoreCompanyByIdRegistry } from './restoreCompanyById.js'
import deleteCompanyByIdRouter, { deleteCompanyByIdRegistry } from './deleteCompanyById.js'

// Export all registries as an array for OpenAPI documentation
export const companiesRegistries = [
  listCompaniesRegistry,
  getCompanyByIdRegistry,
  createCompanyRegistry,
  updateCompanyByIdRegistry,
  restoreCompanyByIdRegistry,
  deleteCompanyByIdRegistry,
]

// Consolidate all company routers
const router: import('express').Router = Router()

router
  .use('/', listCompaniesRouter)
  .use('/', getCompanyByIdRouter)
  .use('/', createCompanyRouter)
  .use('/', updateCompanyByIdRouter)
  .use('/', restoreCompanyByIdRouter)
  .use('/', deleteCompanyByIdRouter)

export default router
