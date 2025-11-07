import { Router } from '@ezstart/express-core'
import type { Router as ExpressRouter } from 'express'
import { authRegistries, authRouters } from './auth/index.js'
import { oauthRegistries, oauthRouters } from './oauth/index.js'
import { waitlistRegistries, waitlistRouters } from './waitlist/index.js'

const router: ExpressRouter = Router()

export const allRegistries = [
  ...authRegistries,
  ...oauthRegistries,
  ...waitlistRegistries
]

// Mount all auth routes
authRouters.forEach(r => router.use('/', r))

// Mount all oauth routes
oauthRouters.forEach(r => router.use('/', r))

// Mount all waitlist routes (will be under /waitlist in main app)
waitlistRouters.forEach(r => router.use('/', r))

export default router
