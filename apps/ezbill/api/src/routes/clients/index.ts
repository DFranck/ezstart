/**
 * Clients Feature Router
 *
 * Consolidates all client-related actions into a single router.
 *
 * Routes:
 * - POST   /api/clients                    -> createClient
 * - GET    /api/clients                    -> listClients
 * - GET    /api/clients/:id                -> getClientById
 * - PUT    /api/clients/:id                -> updateClientById
 * - DELETE /api/clients/:id                -> deleteClientById
 * - POST   /api/clients/:id/restore        -> restoreClientById
 * - DELETE /api/clients/:id/hard-delete    -> hardDeleteClientById
 */

import { Router } from '@ezstart/api-core'

// Import action routers
import createClientRouter, { createClientRegistry } from './createClient.js'
import listClientsRouter, { listClientsRegistry } from './listClients.js'
import getClientByIdRouter, { getClientByIdRegistry } from './getClientById.js'
import updateClientByIdRouter, { updateClientByIdRegistry } from './updateClientById.js'
import deleteClientByIdRouter, { deleteClientByIdRegistry } from './deleteClientById.js'
import restoreClientByIdRouter, { restoreClientByIdRegistry } from './restoreClientById.js'
import hardDeleteClientByIdRouter, { hardDeleteClientByIdRegistry } from './hardDeleteClientById.js'

// Export all registries as an array for OpenAPI documentation
export const clientsRegistries = [
  createClientRegistry,
  listClientsRegistry,
  getClientByIdRegistry,
  updateClientByIdRegistry,
  deleteClientByIdRegistry,
  restoreClientByIdRegistry,
  hardDeleteClientByIdRegistry,
]

// Consolidate all client routers
const router: import('express').Router = Router()

router
  .use('/', createClientRouter)
  .use('/', listClientsRouter)
  .use('/', getClientByIdRouter)
  .use('/', updateClientByIdRouter)
  .use('/', deleteClientByIdRouter)
  .use('/', restoreClientByIdRouter)
  .use('/', hardDeleteClientByIdRouter)

export default router
