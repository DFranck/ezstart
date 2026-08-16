/**
 * Admin routes — superadmin-only endpoints.
 */

import { Router } from '@ezstart/api-core'
import servicesRouter, { registry as servicesRegistry } from './services.js'

const router = Router()

router.use('/', servicesRouter)

export const adminRegistries = [servicesRegistry]

export default router as ReturnType<typeof Router>
