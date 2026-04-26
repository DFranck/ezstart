import { Router } from '@ezstart/api-core'
import type { Router as ExpressRouter } from 'express'
import { authRegistries, authRouters } from './auth/index.js'
import { oauthRegistries, oauthRouters } from './oauth/index.js'
import { adminRegistries, adminRouters } from './admin/index.js'
import { apiKeyRegistries, apiKeyRouters } from './api-keys/index.js'
import { applicationRegistries, applicationRouters } from './applications/index.js'
import { subscriptionRegistries, subscriptionRouters } from './subscriptions/index.js'
import maintenanceStatusRouter, { maintenanceStatusRegistry } from './maintenance-status.js'

// Create separate routers for each group
export const authRouter: ExpressRouter = Router()
export const oauthRouter: ExpressRouter = Router()
export const adminRouter: ExpressRouter = Router()
export const apiKeysRouter: ExpressRouter = Router()
export const applicationsRouter: ExpressRouter = Router()
export const subscriptionsRouter: ExpressRouter = Router()
export const publicRouter: ExpressRouter = Router()

export const allRegistries = [
  ...authRegistries,
  ...oauthRegistries,
  ...adminRegistries,
  ...apiKeyRegistries,
  ...applicationRegistries,
  ...subscriptionRegistries,
  maintenanceStatusRegistry,
]

// Mount auth routes (login, register, etc.)
authRouters.forEach(r => authRouter.use('/', r))

// Mount oauth routes (google, callback, etc.)
oauthRouters.forEach(r => oauthRouter.use('/', r))

// Mount admin routes (users management)
adminRouters.forEach(r => adminRouter.use('/', r))

// Mount API key routes (developer key management)
apiKeyRouters.forEach(r => apiKeysRouter.use('/', r))

// Mount Application routes (multi-tenant entity CRUD + lookup/resolve)
applicationRouters.forEach(r => applicationsRouter.use('/', r))

// Mount Subscription routes (cross-service webhook receiver from EZPay)
subscriptionRouters.forEach(r => subscriptionsRouter.use('/', r))

// Mount public maintenance status route
publicRouter.use('/', maintenanceStatusRouter)

// Default export for backward compatibility (auth routes)
export default authRouter
