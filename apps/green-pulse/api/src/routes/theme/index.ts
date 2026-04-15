import { Router } from '@ezstart/express-core'
import { authMiddleware } from '../../middleware/auth.js'
import getThemeRouter, { getThemeRegistry } from './getTheme.js'
import updateThemeRouter, { updateThemeRegistry } from './updateTheme.js'
import deleteThemeRouter, { deleteThemeRegistry } from './deleteTheme.js'

const router: import('express').Router = Router()

// This parent is mounted at /api (no /theme prefix) — children own '/theme'
// basePath via createRouterWithDoc. Scope auth middleware to '/theme' so it
// doesn't leak to sibling features (esg, upload, webhooks).
// GET theme is public, update/delete require authentication.
router.use(getThemeRouter)
router.use('/theme', authMiddleware)
router.use(updateThemeRouter)
router.use(deleteThemeRouter)

export const themeRegistries = [getThemeRegistry, updateThemeRegistry, deleteThemeRegistry]

export default router
