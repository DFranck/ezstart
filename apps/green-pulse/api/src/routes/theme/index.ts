import { Router } from '@ezstart/express-core'
import { authMiddleware } from '../../middleware/auth.js'
import getThemeRouter, { getThemeRegistry } from './getTheme.js'
import updateThemeRouter, { updateThemeRegistry } from './updateTheme.js'
import deleteThemeRouter, { deleteThemeRegistry } from './deleteTheme.js'

const router: import('express').Router = Router()

// GET theme is public, update/delete require authentication
router.use(getThemeRouter)
router.use(authMiddleware, updateThemeRouter)
router.use(authMiddleware, deleteThemeRouter)

export const themeRegistries = [getThemeRegistry, updateThemeRegistry, deleteThemeRegistry]

export default router
