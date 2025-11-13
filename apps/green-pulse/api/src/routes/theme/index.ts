import { Router } from '@ezstart/express-core'
import getThemeRouter, { getThemeRegistry } from './getTheme.js'
import updateThemeRouter, { updateThemeRegistry } from './updateTheme.js'
import deleteThemeRouter, { deleteThemeRegistry } from './deleteTheme.js'

const router: any = Router()

router.use(getThemeRouter)
router.use(updateThemeRouter)
router.use(deleteThemeRouter)

export const themeRegistries = [getThemeRegistry, updateThemeRegistry, deleteThemeRegistry]

export default router
