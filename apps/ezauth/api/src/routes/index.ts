import { Router } from '@ezstart/api-core'
import type { Router as ExpressRouter } from 'express'
import { authRegistries, authRouters } from './auth/index.js'
import { oauthRegistries, oauthRouters } from './oauth/index.js'
import { adminRegistries, adminRouters } from './admin/index.js'

// Create separate routers for each group
export const authRouter: ExpressRouter = Router()
export const oauthRouter: ExpressRouter = Router()
export const adminRouter: ExpressRouter = Router()

export const allRegistries = [...authRegistries, ...oauthRegistries, ...adminRegistries]

// Mount auth routes (login, register, etc.)
authRouters.forEach(r => authRouter.use('/', r))

// Mount oauth routes (google, callback, etc.)
oauthRouters.forEach(r => oauthRouter.use('/', r))

// Mount admin routes (users management)
adminRouters.forEach(r => adminRouter.use('/', r))

// Default export for backward compatibility (auth routes)
export default authRouter
