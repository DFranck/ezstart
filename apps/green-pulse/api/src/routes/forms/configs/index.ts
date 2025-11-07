/**
 * Form Configs Sub-Router
 * Aggregates all form config actions
 */

import { Router } from '@ezstart/express-core'
import listFormConfigsRouter, { listFormConfigsRegistry } from './listFormConfigs.js'
import getFormConfigByIdRouter, { getFormConfigByIdRegistry } from './getFormConfigById.js'
import createFormConfigRouter, { createFormConfigRegistry } from './createFormConfig.js'

export const formConfigRegistries = [
  listFormConfigsRegistry,
  getFormConfigByIdRegistry,
  createFormConfigRegistry,
]

const router: any = Router()

router
  .use('/', listFormConfigsRouter)      // GET /configs
  .use('/', getFormConfigByIdRouter)    // GET /configs/:id
  .use('/', createFormConfigRouter)     // POST /configs

export default router
