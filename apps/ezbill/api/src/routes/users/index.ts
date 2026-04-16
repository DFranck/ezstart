/**
 * Users Feature Router
 *
 * Consolidates all user-related actions into a single router.
 *
 * Routes:
 * - POST /api/users           -> createUser
 * - GET  /api/users/:username -> getUserByUsername
 */

import { Router } from '@ezstart/api-core'

// Import action routers
import createUserRouter, { createUserRegistry } from './createUser.js'
import getUserByUsernameRouter, { getUserByUsernameRegistry } from './getUserByUsername.js'

// Export all registries as an array for OpenAPI documentation
export const usersRegistries = [createUserRegistry, getUserByUsernameRegistry]

// Consolidate all user routers
const router: import('express').Router = Router()

router.use('/', createUserRouter).use('/', getUserByUsernameRouter)

export default router
